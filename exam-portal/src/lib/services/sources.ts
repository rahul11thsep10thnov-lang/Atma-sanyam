import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import type { SourceInput } from "@/lib/validation/source";
import type { Source } from "@/generated/prisma/client";

export type SourceHealth = "never" | "healthy" | "stale" | "failing";

/**
 * Health is derived, never stored, so it can't drift: a source whose
 * last check errored is failing; one that hasn't succeeded within three
 * check intervals is stale; one never checked is "never".
 */
export function sourceHealth(
  source: Pick<Source, "lastCheckedAt" | "lastSuccessAt" | "lastError" | "checkFrequencyMinutes">,
  now = new Date(),
): SourceHealth {
  if (!source.lastCheckedAt) return "never";
  if (source.lastError && (!source.lastSuccessAt || source.lastSuccessAt < source.lastCheckedAt)) {
    return "failing";
  }
  if (!source.lastSuccessAt) return "failing";
  const staleAfterMs = source.checkFrequencyMinutes * 3 * 60 * 1000;
  if (now.getTime() - source.lastSuccessAt.getTime() > staleAfterMs) return "stale";
  return "healthy";
}

function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function writeData(input: SourceInput) {
  return {
    name: input.name,
    organizationId: input.organizationId || null,
    listingUrl: input.listingUrl,
    officialDomain: input.officialDomain || domainOf(input.listingUrl),
    sourceType: input.sourceType,
    rssUrl: input.rssUrl ?? null,
    apiUrl: input.apiUrl ?? null,
    parserType: input.parserType || null,
    priority: input.priority,
    checkFrequencyMinutes: input.checkFrequencyMinutes,
    active: input.active,
  };
}

export function listSourcesForAdmin() {
  return prisma.source.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { name: "asc" }],
    include: {
      organization: { select: { name: true } },
      _count: { select: { notices: true, documents: true } },
    },
  });
}

export function getSourceForAdmin(id: string) {
  return prisma.source.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      checks: { orderBy: { startedAt: "desc" }, take: 10 },
      errors: { where: { resolvedAt: null }, orderBy: { lastAttemptAt: "desc" }, take: 10 },
    },
  });
}

export function listSourcesForSelect() {
  return prisma.source.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, officialDomain: true },
  });
}

export async function createSource(input: SourceInput, adminId: string) {
  const source = await prisma.source.create({ data: writeData(input) });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Source",
    contentId: source.id,
    newValue: { name: source.name, listingUrl: source.listingUrl },
  });
  return source;
}

export async function updateSource(id: string, input: SourceInput, adminId: string) {
  const existing = await prisma.source.findUniqueOrThrow({ where: { id } });
  const source = await prisma.source.update({ where: { id }, data: writeData(input) });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Source",
    contentId: id,
    previousValue: { name: existing.name, listingUrl: existing.listingUrl, active: existing.active },
    newValue: { name: source.name, listingUrl: source.listingUrl, active: source.active },
  });
  return source;
}

export async function setSourceActive(id: string, active: boolean, adminId: string) {
  const source = await prisma.source.update({ where: { id }, data: { active } });
  await recordAuditLog({
    adminUserId: adminId,
    action: "UPDATE",
    contentType: "Source",
    contentId: id,
    newValue: { active },
  });
  return source;
}

export async function deleteSource(id: string, adminId: string) {
  const existing = await prisma.source.findUniqueOrThrow({ where: { id } });
  // Documents/notices keep their rows (sourceId is nullable); only the
  // watch itself is removed.
  await prisma.$transaction([
    prisma.document.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.recruitmentNotice.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.pipelineError.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.source.delete({ where: { id } }),
  ]);
  await recordAuditLog({
    adminUserId: adminId,
    action: "DELETE",
    contentType: "Source",
    contentId: id,
    previousValue: { name: existing.name, listingUrl: existing.listingUrl },
  });
}
