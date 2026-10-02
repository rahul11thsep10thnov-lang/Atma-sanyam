import { prisma } from "@/lib/db/prisma";
import type { OrganizationType } from "@/generated/prisma/enums";
import { slugify, uniqueSlug } from "@/lib/slug";
import { recordAuditLog } from "@/lib/services/auditLog";
import { normalizeName } from "@/lib/pipeline/resolve/names";

/** Admin maintenance of the catalogue the pipeline builds: organizations
 * (with aliases and merging), categories, recruitments. */
export const ORGANIZATION_TYPES: OrganizationType[] = ["CENTRAL", "STATE", "PSU", "UNIVERSITY", "COURT", "DEFENCE", "MUNICIPAL", "AUTONOMOUS", "OTHER"];

export function listOrganizationsForAdmin(q?: string) {
  return prisma.organization.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { shortName: { contains: q, mode: "insensitive" } }, { aliases: { some: { alias: { contains: q, mode: "insensitive" } } } }] } : undefined,
    orderBy: [{ isAutoCreated: "desc" }, { name: "asc" }],
    include: { state: { select: { name: true } }, _count: { select: { aliases: true, exams: true, recruitments: true, notices: true, sources: true } } },
    take: 300,
  });
}

export function getOrganizationForAdmin(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: { state: true, aliases: { orderBy: { alias: "asc" } }, parent: { select: { id: true, name: true } }, _count: { select: { exams: true, recruitments: true, notices: true, sources: true, jobs: true } } },
  });
}

export interface OrganizationPatch {
  name: string;
  shortName?: string | null;
  organizationType?: OrganizationType | null;
  stateId?: string | null;
  website?: string | null;
  description?: string | null;
}

export async function updateOrganization(id: string, patch: OrganizationPatch, adminId: string) {
  const before = await prisma.organization.findUniqueOrThrow({ where: { id } });
  const slug = slugify(patch.name) === before.slug ? before.slug : await uniqueSlug(patch.name, async (c) => (await prisma.organization.count({ where: { slug: c, NOT: { id } } })) > 0);
  const org = await prisma.organization.update({ where: { id }, data: { ...patch, slug, isAutoCreated: false } });
  for (const alias of [patch.name, patch.shortName].filter((x): x is string => !!x)) {
    const normalized = normalizeName(alias);
    if (normalized.length >= 2) await prisma.organizationAlias.upsert({ where: { normalized }, update: {}, create: { organizationId: id, alias, normalized } });
  }
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Organization", contentId: id, previousValue: { name: before.name, shortName: before.shortName, organizationType: before.organizationType }, newValue: { name: org.name, shortName: org.shortName, organizationType: org.organizationType } });
  return org;
}

export async function addOrganizationAlias(id: string, alias: string, adminId: string) {
  const normalized = normalizeName(alias);
  if (normalized.length < 2) throw new Error("Alias is too short.");
  const clash = await prisma.organizationAlias.findUnique({ where: { normalized }, include: { organization: { select: { name: true } } } });
  if (clash && clash.organizationId !== id) throw new Error(`"${alias}" already points at ${clash.organization.name}.`);
  if (!clash) await prisma.organizationAlias.create({ data: { organizationId: id, alias: alias.trim(), normalized } });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Organization", contentId: id, newValue: { aliasAdded: alias } });
}

export async function removeOrganizationAlias(aliasId: string, adminId: string) {
  const a = await prisma.organizationAlias.delete({ where: { id: aliasId } });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Organization", contentId: a.organizationId, newValue: { aliasRemoved: a.alias } });
}

/** Merge `fromId` into `intoId`: everything that pointed at the duplicate
 * organization now points at the canonical one, its name becomes an alias,
 * and the duplicate row is deleted. */
export async function mergeOrganizations(fromId: string, intoId: string, adminId: string) {
  if (fromId === intoId) throw new Error("Pick a different organization to merge into.");
  const [from, into] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: fromId } }),
    prisma.organization.findUniqueOrThrow({ where: { id: intoId } }),
  ]);
  await prisma.$transaction(async (tx) => {
    await tx.exam.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.recruitment.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.recruitmentNotice.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.job.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.admission.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.scholarship.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.document.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.source.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    await tx.organization.updateMany({ where: { parentId: fromId }, data: { parentId: intoId } });
    await tx.organizationAlias.updateMany({ where: { organizationId: fromId }, data: { organizationId: intoId } });
    for (const alias of [from.name, from.shortName].filter((x): x is string => !!x)) {
      const normalized = normalizeName(alias);
      if (normalized.length >= 2) await tx.organizationAlias.upsert({ where: { normalized }, update: { organizationId: intoId }, create: { organizationId: intoId, alias, normalized } });
    }
    await tx.organization.delete({ where: { id: fromId } });
  });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Organization", contentId: intoId, newValue: { mergedFrom: { id: fromId, name: from.name } }, previousValue: { name: into.name } });
}

// ------------------------------------------------------------ categories --

export function listCategoriesForAdmin() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, include: { parent: { select: { name: true } }, _count: { select: { exams: true, recruitmentCategories: true } } } });
}

export async function createCategory(name: string, adminId: string, parentId?: string | null) {
  const slug = await uniqueSlug(name, async (c) => (await prisma.category.count({ where: { slug: c } })) > 0);
  const cat = await prisma.category.create({ data: { name: name.trim(), slug, parentId: parentId || null } });
  await recordAuditLog({ adminUserId: adminId, action: "CREATE", contentType: "Category", contentId: cat.id, newValue: { name: cat.name, slug } });
  return cat;
}

export async function renameCategory(id: string, name: string, adminId: string) {
  const before = await prisma.category.findUniqueOrThrow({ where: { id } });
  const cat = await prisma.category.update({ where: { id }, data: { name: name.trim(), isAutoCreated: false } });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Category", contentId: id, previousValue: { name: before.name }, newValue: { name: cat.name } });
}

// ---------------------------------------------------------- recruitments --

export function listRecruitmentsForAdmin(filter: { q?: string; status?: string; page?: number } = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const where = {
    ...(filter.status && ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"].includes(filter.status) ? { status: filter.status as "DRAFT" } : {}),
    ...(filter.q ? { OR: [{ title: { contains: filter.q, mode: "insensitive" as const } }, { organization: { name: { contains: filter.q, mode: "insensitive" as const } } }] } : {}),
  };
  return Promise.all([
    prisma.recruitment.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * 50,
      take: 50,
      include: { organization: { select: { id: true, name: true } }, exam: { select: { id: true, title: true } }, categories: { include: { category: { select: { name: true } } } }, _count: { select: { notices: true, jobs: true, admitCards: true, results: true, answerKeys: true } } },
    }),
    prisma.recruitment.count({ where }),
  ]).then(([rows, total]) => ({ rows, total, page, pages: Math.max(1, Math.ceil(total / 50)) }));
}

export async function setRecruitmentStatus(id: string, status: "PUBLISHED" | "ARCHIVED" | "DRAFT", adminId: string) {
  const before = await prisma.recruitment.findUniqueOrThrow({ where: { id } });
  await prisma.recruitment.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt } });
  await recordAuditLog({ adminUserId: adminId, action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "UNPUBLISH" : "UPDATE", contentType: "Recruitment", contentId: id, previousValue: { status: before.status }, newValue: { status } });
}
