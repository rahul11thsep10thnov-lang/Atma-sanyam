import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { uniqueSlug } from "@/lib/slug";
import { recordAuditLog, PIPELINE_ACTOR } from "@/lib/services/auditLog";
import type { NoticeExtraction } from "../extract/schema";
import {
  acronymOf,
  canonicalCase,
  FALLBACK_CATEGORY,
  inferCategories,
  inferOrganizationType,
  nameMatchScore,
  normalizeName,
  stripYear,
  yearOf,
} from "./names";

export * from "./names";

/**
 * Entity resolution (spec §10–§12): map the free-text organization / exam
 * / recruitment names an extractor produced onto canonical rows, creating
 * them (flagged `isAutoCreated`) only when nothing matches. Every match
 * records how it was made and how sure we are, so the review UI can show
 * "matched by alias" vs "created new organization" and the confidence
 * engine can refuse to auto-publish anything that created an entity.
 */
export type MatchMethod = "source" | "alias" | "exact" | "fuzzy" | "same-source" | "created" | "none";

export interface EntityMatch {
  id: string | null;
  method: MatchMethod;
  confidence: number;
  name: string | null;
}

export interface ResolutionResult {
  organization: EntityMatch;
  exam: EntityMatch;
  recruitment: EntityMatch;
  categoryIds: string[];
  primaryCategoryId: string | null;
  year: number | null;
  /** True when any canonical row was created for this notice. */
  createdAny: boolean;
}

export interface ResolveInput {
  data: NoticeExtraction;
  title: string;
  sourceId?: string | null;
  /** Organization the admin attached to the source — highest trust. */
  sourceOrganizationId?: string | null;
  sourceDomain?: string | null;
  /** Links an earlier version of this notice already had; kept stable. */
  existing?: { organizationId?: string | null; examId?: string | null; recruitmentId?: string | null } | null;
}

const ORG_FUZZY_MIN = 0.92;
const EXAM_FUZZY_MIN = 0.85;
const RECRUITMENT_FUZZY_MIN = 0.85;

// ---------------------------------------------------------------- orgs --

async function addOrganizationAlias(organizationId: string, alias: string) {
  const normalized = normalizeName(alias);
  if (normalized.length < 2) return;
  await prisma.organizationAlias.upsert({
    where: { normalized },
    update: {},
    create: { organizationId, alias: alias.trim(), normalized },
  });
}

async function addExamAlias(examId: string, alias: string) {
  const normalized = normalizeName(alias);
  if (normalized.length < 2) return;
  await prisma.examAlias.upsert({ where: { normalized }, update: {}, create: { examId, alias: alias.trim(), normalized } });
}

async function findStateIn(name: string): Promise<string | null> {
  const states = await prisma.state.findMany({ select: { id: true, name: true, code: true } });
  const n = name.toLowerCase();
  const hits = states.filter((s) => s.code !== "ALL_INDIA" && n.includes(s.name.toLowerCase()));
  if (!hits.length) return null;
  hits.sort((a, b) => b.name.length - a.name.length);
  return hits[0].id;
}

export async function resolveOrganization(input: ResolveInput): Promise<{ match: EntityMatch; created: boolean }> {
  const rawName = input.data.organization?.replace(/\s+/g, " ").trim() || null;
  const extractedNorm = rawName ? normalizeName(rawName) : "";

  // 0. an earlier version of the same notice already resolved it
  if (input.existing?.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: input.existing.organizationId }, select: { id: true, name: true } });
    if (org) {
      if (rawName) await addOrganizationAlias(org.id, rawName);
      return { match: { id: org.id, method: "exact", confidence: 1, name: org.name }, created: false };
    }
  }

  // 1. the source is pinned to an organization by an admin
  if (input.sourceOrganizationId) {
    const org = await prisma.organization.findUnique({ where: { id: input.sourceOrganizationId }, select: { id: true, name: true } });
    if (org) {
      if (rawName && extractedNorm !== normalizeName(org.name)) await addOrganizationAlias(org.id, rawName);
      return { match: { id: org.id, method: "source", confidence: 1, name: org.name }, created: false };
    }
  }

  if (rawName && extractedNorm.length >= 2) {
    // 2. alias table (exact, normalised)
    const alias = await prisma.organizationAlias.findUnique({ where: { normalized: extractedNorm }, include: { organization: { select: { id: true, name: true } } } });
    if (alias) return { match: { id: alias.organization.id, method: "alias", confidence: 0.98, name: alias.organization.name }, created: false };

    // 3. organization name / short name, normalised
    const all = await prisma.organization.findMany({ select: { id: true, name: true, shortName: true, aliases: { select: { alias: true } } } });
    const exact = all.find((o) => normalizeName(o.name) === extractedNorm || (o.shortName && normalizeName(o.shortName) === extractedNorm));
    if (exact) {
      await addOrganizationAlias(exact.id, rawName);
      return { match: { id: exact.id, method: "exact", confidence: 0.97, name: exact.name }, created: false };
    }

    // 4. fuzzy against names + aliases
    let best: { id: string; name: string; score: number } | null = null;
    for (const o of all) {
      const names = [o.name, o.shortName, ...o.aliases.map((a) => a.alias)].filter((x): x is string => !!x);
      for (const n of names) {
        const score = nameMatchScore(rawName, n);
        if (!best || score > best.score) best = { id: o.id, name: o.name, score };
      }
    }
    if (best && best.score >= ORG_FUZZY_MIN) {
      await addOrganizationAlias(best.id, rawName);
      return { match: { id: best.id, method: "fuzzy", confidence: Math.min(0.9, best.score), name: best.name }, created: false };
    }
  }

  // 5. no name at all: a notice from a source that has been feeding one
  // organization almost certainly belongs to it (admit cards rarely
  // repeat the board's full name).
  if (!rawName && input.sourceId) {
    const recent = await prisma.recruitmentNotice.groupBy({
      by: ["organizationId"],
      where: { sourceId: input.sourceId, organizationId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { organizationId: "desc" } },
      take: 1,
    });
    const orgId = recent[0]?.organizationId;
    if (orgId) {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } });
      if (org) return { match: { id: org.id, method: "same-source", confidence: 0.7, name: org.name }, created: false };
    }
  }

  if (!rawName) return { match: { id: null, method: "none", confidence: 0, name: null }, created: false };

  // 6. create, flagged
  const name = canonicalCase(rawName).slice(0, 200);
  const slug = await uniqueSlug(name, async (c) => (await prisma.organization.count({ where: { slug: c } })) > 0);
  const stateId = await findStateIn(name);
  const organizationType = inferOrganizationType(name, input.sourceDomain);
  const acronym = acronymOf(name);
  const website = input.sourceDomain ? `https://${input.sourceDomain}` : null;
  const org = await prisma.organization.create({
    data: { name, slug, shortName: acronym, organizationType, stateId, website, isAutoCreated: true },
    select: { id: true, name: true },
  });
  await addOrganizationAlias(org.id, rawName);
  if (acronym) await addOrganizationAlias(org.id, acronym);
  await recordAuditLog({ actor: PIPELINE_ACTOR, action: "CREATE", contentType: "Organization", contentId: org.id, newValue: { name, slug, organizationType, stateId, from: rawName } });
  return { match: { id: org.id, method: "created", confidence: 0.6, name: org.name }, created: true };
}

// ---------------------------------------------------------- categories --

export async function resolveCategories(input: ResolveInput, organizationName: string | null): Promise<{ ids: string[]; primaryId: string | null; created: boolean }> {
  const rules = inferCategories([organizationName, input.data.organization, input.data.exam_name, input.title, input.data.department, ...input.data.post_names]);
  const wanted = rules.length ? rules : [{ ...FALLBACK_CATEGORY }];
  const ids: string[] = [];
  let created = false;
  for (const rule of wanted) {
    const existing = await prisma.category.findUnique({ where: { slug: rule.slug }, select: { id: true } });
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const row = await prisma.category.create({ data: { name: rule.name, slug: rule.slug, isAutoCreated: true }, select: { id: true } });
    await recordAuditLog({ actor: PIPELINE_ACTOR, action: "CREATE", contentType: "Category", contentId: row.id, newValue: { name: rule.name, slug: rule.slug } });
    ids.push(row.id);
    created = true;
  }
  return { ids, primaryId: ids[0] ?? null, created };
}

// --------------------------------------------------------------- exams --

export async function resolveExam(input: ResolveInput, organizationId: string, categoryId: string): Promise<{ match: EntityMatch; created: boolean }> {
  if (input.existing?.examId) {
    const exam = await prisma.exam.findUnique({ where: { id: input.existing.examId }, select: { id: true, title: true } });
    if (exam) return { match: { id: exam.id, method: "exact", confidence: 1, name: exam.title }, created: false };
  }
  const rawName = input.data.exam_name?.replace(/\s+/g, " ").trim() || null;
  if (!rawName) return { match: { id: null, method: "none", confidence: 0, name: null }, created: false };
  const examTitle = stripYear(rawName) || rawName;
  const norm = normalizeName(examTitle);
  if (norm.length < 3) return { match: { id: null, method: "none", confidence: 0, name: null }, created: false };

  const alias = await prisma.examAlias.findUnique({ where: { normalized: norm }, include: { exam: { select: { id: true, title: true, organizationId: true } } } });
  if (alias && alias.exam.organizationId === organizationId) return { match: { id: alias.exam.id, method: "alias", confidence: 0.98, name: alias.exam.title }, created: false };

  const candidates = await prisma.exam.findMany({ where: { organizationId }, select: { id: true, title: true, aliases: { select: { alias: true } } } });
  let best: { id: string; title: string; score: number } | null = null;
  for (const e of candidates) {
    for (const n of [e.title, ...e.aliases.map((a) => a.alias)]) {
      const score = nameMatchScore(examTitle, stripYear(n) || n);
      if (!best || score > best.score) best = { id: e.id, title: e.title, score };
    }
  }
  if (best && best.score >= 0.999) {
    await addExamAlias(best.id, examTitle);
    return { match: { id: best.id, method: "exact", confidence: 0.97, name: best.title }, created: false };
  }
  if (best && best.score >= EXAM_FUZZY_MIN) {
    await addExamAlias(best.id, examTitle);
    return { match: { id: best.id, method: "fuzzy", confidence: Math.min(0.9, best.score), name: best.title }, created: false };
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { stateId: true } });
  const slug = await uniqueSlug(examTitle, async (c) => (await prisma.exam.count({ where: { slug: c } })) > 0);
  const exam = await prisma.exam.create({
    data: {
      title: examTitle.slice(0, 200),
      slug,
      organizationId,
      categoryId,
      stateId: org?.stateId ?? null,
      status: "DRAFT",
      isAutoCreated: true,
      createdBy: PIPELINE_ACTOR,
      updatedBy: PIPELINE_ACTOR,
    },
    select: { id: true, title: true },
  });
  await addExamAlias(exam.id, examTitle);
  if (rawName !== examTitle) await addExamAlias(exam.id, rawName);
  await recordAuditLog({ actor: PIPELINE_ACTOR, action: "CREATE", contentType: "Exam", contentId: exam.id, newValue: { title: exam.title, slug, organizationId, categoryId, from: rawName } });
  return { match: { id: exam.id, method: "created", confidence: 0.6, name: exam.title }, created: true };
}

// --------------------------------------------------------- recruitments --

function toDate(iso: string | null): Date | null {
  return iso ? new Date(iso + "T00:00:00Z") : null;
}

/** Which recruitment dates a notice of this type is allowed to set. */
function recruitmentDateUpdates(data: NoticeExtraction): Prisma.RecruitmentUpdateInput {
  const out: Prisma.RecruitmentUpdateInput = {};
  const t = data.notice_type;
  if (t === "JOB" || t === "CORRIGENDUM") {
    if (data.application_start_date) out.applicationStartDate = toDate(data.application_start_date);
    if (data.application_end_date) out.applicationEndDate = toDate(data.application_end_date);
    if (data.exam_date) out.examDate = toDate(data.exam_date);
  } else if (t === "APPLICATION_STARTED") {
    if (data.application_start_date) out.applicationStartDate = toDate(data.application_start_date);
    if (data.application_end_date) out.applicationEndDate = toDate(data.application_end_date);
  } else if (t === "DEADLINE_EXTENSION") {
    if (data.application_end_date) out.applicationEndDate = toDate(data.application_end_date);
  } else if (t === "ADMIT_CARD" || t === "EXAM_DATE" || t === "EXAM_POSTPONED") {
    if (data.exam_date) out.examDate = toDate(data.exam_date);
  }
  return out;
}

export async function resolveRecruitment(
  input: ResolveInput,
  organizationId: string,
  examId: string | null,
  categoryIds: string[],
  year: number | null,
): Promise<{ match: EntityMatch; created: boolean }> {
  const dateUpdates = recruitmentDateUpdates(input.data);

  if (input.existing?.recruitmentId) {
    const rec = await prisma.recruitment.findUnique({ where: { id: input.existing.recruitmentId }, select: { id: true, title: true } });
    if (rec) {
      if (Object.keys(dateUpdates).length) await prisma.recruitment.update({ where: { id: rec.id }, data: dateUpdates });
      return { match: { id: rec.id, method: "exact", confidence: 1, name: rec.title }, created: false };
    }
  }

  const baseName = input.data.exam_name?.trim() || (input.data.post_names.length ? `Recruitment of ${input.data.post_names.slice(0, 3).join(", ")}` : null) || stripYear(input.title) || input.title;
  const title = (year && !new RegExp(String(year)).test(baseName) ? `${baseName} ${year}` : baseName).replace(/\s+/g, " ").trim().slice(0, 300);

  // Match inside the organization: same exam + same year, or a near-identical title.
  const candidates = await prisma.recruitment.findMany({
    where: { organizationId, ...(year ? { OR: [{ year }, { year: null }] } : {}) },
    select: { id: true, title: true, year: true, examId: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  let best: { id: string; title: string; score: number; method: MatchMethod } | null = null;
  for (const r of candidates) {
    if (examId && r.examId === examId && (!year || !r.year || r.year === year)) {
      best = { id: r.id, title: r.title, score: 1, method: "exact" };
      break;
    }
    const score = nameMatchScore(title, r.title);
    const yearOk = !year || !r.year || r.year === year;
    if (yearOk && score >= RECRUITMENT_FUZZY_MIN && (!best || score > best.score)) best = { id: r.id, title: r.title, score, method: score >= 0.999 ? "exact" : "fuzzy" };
  }
  if (best) {
    const data: Prisma.RecruitmentUpdateInput = { ...dateUpdates };
    if (examId) data.exam = { connect: { id: examId } };
    if (year) data.year = year;
    await prisma.recruitment.update({ where: { id: best.id }, data });
    for (const categoryId of categoryIds) {
      await prisma.recruitmentCategory.upsert({ where: { recruitmentId_categoryId: { recruitmentId: best.id, categoryId } }, update: {}, create: { recruitmentId: best.id, categoryId, isPrimary: false } });
    }
    return { match: { id: best.id, method: best.method, confidence: best.method === "exact" ? 0.97 : Math.min(0.9, best.score), name: best.title }, created: false };
  }

  const slug = await uniqueSlug(title, async (c) => (await prisma.recruitment.count({ where: { slug: c } })) > 0);
  const rec = await prisma.recruitment.create({
    data: {
      title,
      slug,
      year,
      summary: input.data.summary,
      status: "DRAFT",
      isAutoCreated: true,
      createdBy: PIPELINE_ACTOR,
      organizationId,
      examId,
      applicationStartDate: toDate(input.data.application_start_date),
      applicationEndDate: toDate(input.data.application_end_date),
      examDate: toDate(input.data.exam_date),
      categories: { create: categoryIds.map((categoryId, i) => ({ categoryId, isPrimary: i === 0 })) },
    },
    select: { id: true, title: true },
  });
  await recordAuditLog({ actor: PIPELINE_ACTOR, action: "CREATE", contentType: "Recruitment", contentId: rec.id, newValue: { title, slug, organizationId, examId, year } });
  return { match: { id: rec.id, method: "created", confidence: 0.6, name: rec.title }, created: true };
}

// ------------------------------------------------------------ pipeline --

export async function resolveEntities(input: ResolveInput): Promise<ResolutionResult> {
  const year = yearOf(input.data.exam_name, input.data.advertisement_number, input.title, input.data.application_end_date, input.data.application_start_date, input.data.exam_date);
  const org = await resolveOrganization(input);
  if (!org.match.id) {
    return {
      organization: org.match,
      exam: { id: null, method: "none", confidence: 0, name: null },
      recruitment: { id: null, method: "none", confidence: 0, name: null },
      categoryIds: [],
      primaryCategoryId: null,
      year,
      createdAny: false,
    };
  }
  const categories = await resolveCategories(input, org.match.name);
  const exam = categories.primaryId ? await resolveExam(input, org.match.id, categories.primaryId) : { match: { id: null, method: "none" as MatchMethod, confidence: 0, name: null }, created: false };
  const recruitment = await resolveRecruitment(input, org.match.id, exam.match.id, categories.ids, year);
  return {
    organization: org.match,
    exam: exam.match,
    recruitment: recruitment.match,
    categoryIds: categories.ids,
    primaryCategoryId: categories.primaryId,
    year,
    createdAny: org.created || categories.created || exam.created || recruitment.created,
  };
}
