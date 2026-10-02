import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { NoticePriority, NoticeStatus, NoticeType } from "@/generated/prisma/enums";
import { recordAuditLog, PIPELINE_ACTOR } from "@/lib/services/auditLog";
import { recordPipelineError } from "./errors";
import { extractNotice, validateExtraction, decideStatus, type ExtractedNotice, type ProvenanceMap } from "./extract";
import type { IngestResult } from "./ingest";
import { resolveEntities, type ResolutionResult } from "./resolve";
import { canonicalizeUrl, findDuplicate } from "./dedup";

/**
 * Turns an ingested document (or a new version of one) into a
 * RecruitmentNotice row carrying the structured extraction, per-field
 * provenance, validation errors and the status the confidence engine
 * decided (spec §16). One notice per document: a changed document
 * re-extracts and *updates* its notice with a change summary instead of
 * creating a second one, which is what keeps "deadline extended" from
 * showing up as a duplicate (§42).
 */
export interface NoticeContext {
  sourceId?: string | null;
  pipelineRunId?: string | null;
}

export interface NoticeResult {
  noticeId: string;
  status: NoticeStatus;
  noticeType: NoticeType;
  created: boolean;
  overallConfidence: number;
  duplicateOfId?: string | null;
}

const OFFICIAL_TLDS = [".gov.in", ".nic.in", ".gov", ".ac.in", ".edu.in", ".res.in"];

/** 1.0 for the organization's own official domain, 0.85 for everything else. */
export function sourceAuthority(url: string | null | undefined, officialDomain?: string | null): number {
  if (!url) return 0.85;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 0.85;
  }
  if (officialDomain) {
    const d = officialDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (host === d || host.endsWith("." + d)) return 1;
  }
  if (OFFICIAL_TLDS.some((tld) => host.endsWith(tld))) return 1;
  return 0.85;
}

const URGENT_TYPES: NoticeType[] = ["DEADLINE_EXTENSION", "EXAM_POSTPONED", "EXAM_CANCELLED", "CORRIGENDUM"];
const HIGH_TYPES: NoticeType[] = ["ADMIT_CARD", "EXAM_DATE", "INTERVIEW", "DOCUMENT_VERIFICATION"];

/** Priority (spec §24): time-sensitive changes first, then dated events,
 * then everything whose deadline is inside a week. */
export function decidePriority(noticeType: NoticeType, applicationEndDate: string | null, now = new Date()): NoticePriority {
  if (URGENT_TYPES.includes(noticeType)) return "URGENT";
  if (HIGH_TYPES.includes(noticeType)) return "HIGH";
  if (applicationEndDate) {
    const end = new Date(applicationEndDate + "T23:59:59Z").getTime();
    const days = (end - now.getTime()) / 86_400_000;
    if (days >= 0 && days <= 7) return "HIGH";
    if (days < 0) return "LOW";
  }
  return "NORMAL";
}

function hasUnverified(provenance: ProvenanceMap): boolean {
  return Object.values(provenance).some((p) => p && !p.verified);
}

function fieldConfidence(provenance: ProvenanceMap): Prisma.InputJsonValue {
  const out: Record<string, { confidence: number; extractor: string; verified: boolean; sourcePage: number | null; sourceText: string | null }> = {};
  for (const [k, p] of Object.entries(provenance)) {
    if (!p) continue;
    out[k] = { confidence: p.confidence, extractor: p.extractor, verified: p.verified, sourcePage: p.sourcePage, sourceText: p.sourceText };
  }
  return out;
}

function noticeTitle(extracted: ExtractedNotice, fallback: string): string {
  const d = extracted.data;
  const base = d.exam_name || (d.post_names.length ? `Recruitment of ${d.post_names.slice(0, 3).join(", ")}` : null) || fallback;
  const suffix: Record<string, string> = {
    ADMIT_CARD: "Admit Card",
    ANSWER_KEY: "Answer Key",
    RESULT: "Result",
    MERIT_LIST: "Merit List",
    SELECTION_LIST: "Selection List",
    INTERVIEW: "Interview Schedule",
    DOCUMENT_VERIFICATION: "Document Verification",
    DEADLINE_EXTENSION: "Last Date Extended",
    EXAM_POSTPONED: "Exam Postponed",
    EXAM_CANCELLED: "Exam Cancelled",
    CORRIGENDUM: "Corrigendum",
    EXAM_DATE: "Exam Date",
  };
  const s = suffix[d.notice_type];
  const title = s && !new RegExp(s, "i").test(base) ? `${base} — ${s}` : base;
  return title.replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function createNoticeFromIngest(ingested: IngestResult, ctx: NoticeContext = {}): Promise<NoticeResult | null> {
  const document = await prisma.document.findUnique({
    where: { id: ingested.documentId },
    select: { id: true, sourceId: true, sourceUrl: true, filename: true, checksum: true, sourcePublishedAt: true, source: { select: { id: true, officialDomain: true, organizationId: true } } },
  });
  if (!document) return null;
  const sourceId = ctx.sourceId ?? document.sourceId ?? null;

  if (!ingested.extractedText || ingested.extractedText.trim().length < 20) {
    await recordPipelineError({
      errorType: "EXTRACTION",
      message: `${document.sourceUrl ?? document.filename}: no text to extract (scanned PDF without OCR, or empty document)`,
      sourceId,
      documentId: document.id,
      pipelineRunId: ctx.pipelineRunId ?? null,
    });
    return null;
  }

  const extracted = await extractNotice({ text: ingested.extractedText, title: ingested.title, sourceUrl: document.sourceUrl });
  const validationErrors = validateExtraction(extracted.data, document.sourcePublishedAt);
  const authority = sourceAuthority(document.sourceUrl, document.source?.officialDomain);
  const unverified = hasUnverified(extracted.provenance);
  const priority = decidePriority(extracted.data.notice_type, extracted.data.application_end_date);

  let sourceDomain: string | null = null;
  try {
    sourceDomain = document.sourceUrl ? new URL(document.sourceUrl).hostname : null;
  } catch {
    sourceDomain = null;
  }

  const existing = await prisma.recruitmentNotice.findFirst({
    where: { documentId: document.id, duplicateOfId: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, recruitmentId: true, organizationId: true, examId: true },
  });

  // Phase 5: organization → categories → exam → recruitment. Resolution
  // problems are recorded but never lose the notice itself.
  let resolution: ResolutionResult | null = null;
  try {
    resolution = await resolveEntities({
      data: extracted.data,
      title: ingested.title,
      sourceId,
      sourceOrganizationId: document.source?.organizationId ?? null,
      sourceDomain,
      existing,
    });
  } catch (err) {
    await recordPipelineError({
      errorType: "RESOLUTION",
      message: `${document.sourceUrl ?? document.filename}: ${err instanceof Error ? err.message : String(err)}`,
      sourceId,
      documentId: document.id,
      pipelineRunId: ctx.pipelineRunId ?? null,
    });
  }
  const resolutionErrors = resolution && !resolution.organization.id ? ["Organization could not be resolved or created."] : [];
  const decided = decideStatus({
    overallConfidence: extracted.overallConfidence,
    validationErrors: [...validationErrors, ...resolutionErrors],
    sourceAuthority: authority,
    hasUnverifiedFields: unverified,
    entitiesCreated: resolution?.createdAny ?? true,
  });

  const common = {
    noticeType: extracted.data.notice_type,
    priority,
    title: noticeTitle(extracted, ingested.title),
    summary: extracted.data.summary,
    sourceUrl: document.sourceUrl,
    canonicalUrl: canonicalizeUrl(extracted.data.official_notification_url ?? document.sourceUrl),
    sourceDomain,
    sourcePublishedAt: document.sourcePublishedAt,
    extracted: extracted.data as unknown as Prisma.InputJsonValue,
    overallConfidence: extracted.overallConfidence,
    fieldConfidence: {
      ...(fieldConfidence(extracted.provenance) as Record<string, unknown>),
      // How each canonical link was made (alias / exact / fuzzy / created…)
      // so the review screen can show it next to the field confidences.
      __resolution: resolution
        ? { organization: resolution.organization, exam: resolution.exam, recruitment: resolution.recruitment, year: resolution.year, createdAny: resolution.createdAny }
        : null,
    } as Prisma.InputJsonValue,
    validationErrors: [...validationErrors, ...resolutionErrors],
    sourceId,
    documentId: document.id,
    documentVersionId: ingested.versionId,
    organizationId: resolution?.organization.id ?? existing?.organizationId ?? document.source?.organizationId ?? null,
    examId: resolution?.exam.id ?? existing?.examId ?? null,
    recruitmentId: resolution?.recruitment.id ?? existing?.recruitmentId ?? null,
  };

  if (existing) {
    // A document that changed after its notice was approved/published must
    // be looked at again; one that was still unreviewed just gets re-scored.
    const settled: NoticeStatus[] = ["APPROVED", "AUTO_APPROVED", "PUBLISHED"];
    const keep: NoticeStatus[] = ["REJECTED", "DUPLICATE"];
    const status: NoticeStatus = settled.includes(existing.status) ? "NEEDS_REVIEW" : keep.includes(existing.status) ? existing.status : decided;
    const changeSummary: Prisma.InputJsonValue = {
      versionNumber: ingested.versionNumber,
      changedAt: new Date().toISOString(),
      previousStatus: existing.status,
      diff: (ingested.diff ?? []).slice(0, 50),
    };
    await prisma.recruitmentNotice.update({
      where: { id: existing.id },
      data: { ...common, status, changeSummary },
    });
    await recordAuditLog({ actor: PIPELINE_ACTOR, action: "UPDATE", contentType: "RecruitmentNotice", contentId: existing.id, newValue: { versionNumber: ingested.versionNumber, status, overallConfidence: extracted.overallConfidence } });
    return { noticeId: existing.id, status, noticeType: extracted.data.notice_type, created: false, overallConfidence: extracted.overallConfidence };
  }

  // Phase 6: the same notice through another door becomes a DUPLICATE row
  // pointing at the canonical one (kept, so the admin can undo a wrong call).
  let duplicate: Awaited<ReturnType<typeof findDuplicate>> = null;
  try {
    duplicate = await findDuplicate({
      documentId: document.id,
      documentChecksum: document.checksum,
      canonicalUrl: common.canonicalUrl,
      sourceUrl: document.sourceUrl,
      organizationId: common.organizationId,
      recruitmentId: common.recruitmentId,
      noticeType: extracted.data.notice_type,
      title: common.title,
      advertisementNumber: extracted.data.advertisement_number,
      applicationEndDate: extracted.data.application_end_date,
      examDate: extracted.data.exam_date,
    });
  } catch (err) {
    await recordPipelineError({
      errorType: "VALIDATION",
      message: `${document.sourceUrl ?? document.filename}: duplicate check failed: ${err instanceof Error ? err.message : String(err)}`,
      sourceId,
      documentId: document.id,
      pipelineRunId: ctx.pipelineRunId ?? null,
    });
  }
  const status: NoticeStatus = duplicate ? "DUPLICATE" : decided;
  const created = await prisma.recruitmentNotice.create({
    data: {
      ...common,
      status,
      duplicateOfId: duplicate?.duplicateOfId ?? null,
      ...(duplicate ? { changeSummary: { duplicate: { of: duplicate.duplicateOfId, reason: duplicate.reason, score: duplicate.score } } } : {}),
    },
    select: { id: true },
  });
  await recordAuditLog({
    actor: PIPELINE_ACTOR,
    action: "CREATE",
    contentType: "RecruitmentNotice",
    contentId: created.id,
    newValue: { status, noticeType: extracted.data.notice_type, overallConfidence: extracted.overallConfidence, extractors: extracted.extractors, ...(duplicate ? { duplicateOf: duplicate.duplicateOfId, reason: duplicate.reason } : {}) },
  });
  return { noticeId: created.id, status, noticeType: extracted.data.notice_type, created: true, overallConfidence: extracted.overallConfidence, duplicateOfId: duplicate?.duplicateOfId ?? null };
}

/**
 * Re-runs the notice stage for a stored document from its latest version
 * (used by the retry loop after an extraction/resolution failure, and by
 * the admin "re-extract" button). No network access.
 */
export async function reprocessDocument(documentId: string, ctx: NoticeContext = {}): Promise<NoticeResult | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, filename: true, mimeType: true, extractedText: true, sourceId: true, versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { id: true, versionNumber: true, extractedText: true } } },
  });
  if (!doc) return null;
  const latest = doc.versions[0];
  if (!latest) return null;
  return createNoticeFromIngest(
    {
      documentId: doc.id,
      versionId: latest.id,
      versionNumber: latest.versionNumber,
      isNew: false,
      changed: false,
      diff: null,
      extractedText: latest.extractedText ?? doc.extractedText,
      title: doc.filename.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "),
      mimeType: doc.mimeType ?? "application/octet-stream",
    },
    { sourceId: ctx.sourceId ?? doc.sourceId, pipelineRunId: ctx.pipelineRunId ?? null },
  );
}
