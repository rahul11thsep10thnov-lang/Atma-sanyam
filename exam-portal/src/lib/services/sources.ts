import { prisma } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import type { SourceInput } from "@/lib/validation/source";
import type { Prisma } from "@/generated/prisma/client";
import type { SourceCategory, SourceType } from "@/generated/prisma/enums";
import { canonicalizeUrl } from "@/lib/pipeline/dedup";
import { sourceHealth, NEEDS_ATTENTION, type SourceHealth } from "@/lib/sources/health";

export { sourceHealth, type SourceHealth };

/** Thrown for a request the registry refuses on policy grounds (duplicate
 * URL, enabling an unapproved or unverified aggregator…). The message is
 * meant for the admin. */
export class SourcePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourcePolicyError";
  }
}

/** One source per canonical URL: scheme, "www.", default ports, tracking
 * parameters, fragments and a trailing slash don't make a new source. */
export function canonicalSourceKey(url: string): string {
  const c = canonicalizeUrl(url) ?? url.trim().toLowerCase();
  return c.replace(/\/$/, "");
}

function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

function writeData(input: SourceInput) {
  return {
    name: input.name,
    organizationId: input.organizationId || null,
    listingUrl: input.listingUrl,
    canonicalUrl: canonicalSourceKey(input.listingUrl),
    officialDomain: input.officialDomain || domainOf(input.listingUrl),
    sourceType: input.sourceType,
    category: input.isAggregator ? ("AGGREGATOR" as const) : input.category,
    stateCode: input.stateCode ?? null,
    groupName: input.groupName || null,
    rssUrl: input.rssUrl ?? null,
    apiUrl: input.apiUrl ?? null,
    parserType: input.parserType || null,
    parserConfig: (input.parserConfig ?? undefined) as Prisma.InputJsonValue | undefined,
    paginationConfig: (input.paginationConfig ?? undefined) as Prisma.InputJsonValue | undefined,
    priority: input.priority,
    checkFrequencyMinutes: input.checkFrequencyMinutes,
    requestTimeoutMs: input.requestTimeoutMs,
    minRequestIntervalMs: input.minRequestIntervalMs,
    isAggregator: input.isAggregator,
    active: input.active,
  };
}

async function assertNoDuplicate(canonicalUrl: string, exceptId?: string) {
  const clash = await prisma.source.findFirst({
    where: { canonicalUrl, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true, name: true },
  });
  if (clash) throw new SourcePolicyError(`A source for this URL already exists: "${clash.name}".`);
}

/** Enabling rules: approved first; an aggregator additionally needs a
 * successful verification (reachable, intended site, terms reviewed). */
export function enablePolicyError(s: { approvalStatus: string; isAggregator: boolean; verificationStatus: string }): string | null {
  if (s.approvalStatus !== "APPROVED") return "Approve this source before enabling it.";
  if (s.isAggregator && s.verificationStatus !== "VERIFIED") {
    return "Aggregator sources stay disabled until verified: run Test, review the site's terms of use, then use “Terms reviewed — verify”.";
  }
  return null;
}

// ---------------------------------------------------------------- queries

export interface SourceFilters {
  q?: string;
  category?: SourceCategory;
  stateCode?: string;
  sourceType?: SourceType;
  health?: SourceHealth;
  enabled?: "yes" | "no";
  approval?: "PENDING" | "APPROVED" | "REJECTED";
  group?: string;
}

/** Health is derived in code; for filtering it is mapped onto the stored
 * outcome fields so the database can do the work (and paginate). */
function healthWhere(health: SourceHealth, now: Date): Prisma.SourceWhereInput {
  switch (health) {
    case "pending":
      return { approvalStatus: { not: "APPROVED" } };
    case "disabled":
      return { approvalStatus: "APPROVED", active: false };
    case "never":
      return { approvalStatus: "APPROVED", active: true, lastCheckedAt: null };
    case "blocked":
      return { approvalStatus: "APPROVED", active: true, OR: [{ blockedUntil: { gt: now } }, { lastOutcome: { in: ["BLOCKED", "RATE_LIMITED"] } }] };
    case "attention":
      return { approvalStatus: "APPROVED", active: true, lastOutcome: { in: ["EMPTY", "PARSE_ERROR"] } };
    case "failing":
      return { approvalStatus: "APPROVED", active: true, lastOutcome: { in: ["HTTP_ERROR", "NETWORK", "ROBOTS", "INVALID_URL"] } };
    case "healthy":
    case "stale":
      return { approvalStatus: "APPROVED", active: true, lastOutcome: { in: ["OK", "NOT_MODIFIED", "UNCHANGED"] } };
  }
}

export function sourceWhere(f: SourceFilters, now = new Date()): Prisma.SourceWhereInput {
  const and: Prisma.SourceWhereInput[] = [];
  if (f.q) and.push({ OR: [{ name: { contains: f.q, mode: "insensitive" } }, { listingUrl: { contains: f.q, mode: "insensitive" } }, { officialDomain: { contains: f.q, mode: "insensitive" } }] });
  if (f.category) and.push({ category: f.category });
  if (f.stateCode) and.push({ stateCode: f.stateCode });
  if (f.sourceType) and.push({ sourceType: f.sourceType });
  if (f.enabled) and.push({ active: f.enabled === "yes" });
  if (f.approval) and.push({ approvalStatus: f.approval });
  if (f.group) and.push({ groupName: f.group });
  if (f.health) and.push(healthWhere(f.health, now));
  return and.length ? { AND: and } : {};
}

export const SOURCE_PAGE_SIZE = 50;

export async function listSourcesPage(filters: SourceFilters, page = 1, pageSize = SOURCE_PAGE_SIZE) {
  const where = sourceWhere(filters);
  const [total, items] = await Promise.all([
    prisma.source.count({ where }),
    prisma.source.findMany({
      where,
      orderBy: [{ approvalStatus: "asc" }, { active: "desc" }, { priority: "asc" }, { name: "asc" }],
      skip: (Math.max(1, page) - 1) * pageSize,
      take: pageSize,
      include: {
        organization: { select: { name: true } },
        _count: { select: { notices: true, documents: true } },
        checks: { orderBy: { startedAt: "desc" }, take: 1, select: { id: true, startedAt: true, durationMs: true, itemsFound: true, noticesExtracted: true, duplicatesSkipped: true, outcome: true, newItems: true } },
      },
    }),
  ]);
  // "stale" can't be expressed in SQL without the per-source interval;
  // narrow the page in code (the count stays an upper bound).
  const shown = filters.health === "healthy" || filters.health === "stale" ? items.filter((s) => sourceHealth(s) === filters.health) : items;
  return { total, items: shown, page, pageSize };
}

/** Whole registry, unpaginated — for the automation overview counters. */
export function listSourcesForAdmin() {
  return prisma.source.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { name: "asc" }],
    include: {
      organization: { select: { name: true } },
      _count: { select: { notices: true, documents: true } },
    },
  });
}

export async function sourceDashboardStats(now = new Date()) {
  const [rows, lastRun, lastSuccessfulRun, noticesFromSources] = await Promise.all([
    prisma.source.findMany({
      select: { active: true, approvalStatus: true, lastCheckedAt: true, lastSuccessAt: true, lastExtractionAt: true, lastError: true, lastOutcome: true, consecutiveFailures: true, blockedUntil: true, checkFrequencyMinutes: true },
    }),
    prisma.pipelineRun.findFirst({ where: { status: { in: ["COMPLETED", "FAILED"] } }, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, newNotices: true, status: true } }),
    prisma.pipelineRun.findFirst({ where: { status: "COMPLETED" }, orderBy: { startedAt: "desc" }, select: { id: true, startedAt: true, finishedAt: true } }),
    prisma.recruitmentNotice.count({ where: { sourceId: { not: null } } }),
  ]);
  const health = rows.map((r) => sourceHealth(r, now));
  return {
    total: rows.length,
    active: rows.filter((r) => r.active && r.approvalStatus === "APPROVED").length,
    healthy: health.filter((h) => h === "healthy").length,
    needsAttention: health.filter((h) => NEEDS_ATTENTION.includes(h)).length,
    disabled: health.filter((h) => h === "disabled").length,
    awaitingApproval: rows.filter((r) => r.approvalStatus === "PENDING").length,
    lastSuccessfulRun,
    noticesDiscovered: noticesFromSources,
    newNoticesLatestRun: lastRun?.newNotices ?? 0,
    latestRun: lastRun,
  };
}

export async function sourceFilterOptions() {
  const [states, groups] = await Promise.all([
    prisma.source.findMany({ where: { stateCode: { not: null } }, distinct: ["stateCode"], select: { stateCode: true }, orderBy: { stateCode: "asc" } }),
    prisma.source.findMany({ where: { groupName: { not: null } }, distinct: ["groupName"], select: { groupName: true }, orderBy: { groupName: "asc" } }),
  ]);
  return { states: states.map((s) => s.stateCode!), groups: groups.map((g) => g.groupName!) };
}

export function getSourceForAdmin(id: string) {
  return prisma.source.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      discoveredFrom: { select: { id: true, name: true } },
      checks: { orderBy: { startedAt: "desc" }, take: 10 },
      errors: { where: { resolvedAt: null }, orderBy: { lastAttemptAt: "desc" }, take: 10 },
    },
  });
}

export function getSourceCheck(sourceId: string, checkId: string) {
  return prisma.sourceCheck.findFirst({ where: { id: checkId, sourceId }, include: { source: { select: { id: true, name: true, listingUrl: true } } } });
}

export function listSourcesForSelect() {
  return prisma.source.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, officialDomain: true },
  });
}

// ---------------------------------------------------------------- writes

export async function createSource(input: SourceInput, adminId: string) {
  const data = writeData(input);
  await assertNoDuplicate(data.canonicalUrl);
  // Aggregators start disabled and pending verification, whatever the form said.
  const aggregatorGate = input.isAggregator ? { active: false, approvalStatus: "PENDING" as const } : {};
  const source = await prisma.source.create({ data: { ...data, ...aggregatorGate, nextCheckAt: new Date() } });
  await recordAuditLog({
    adminUserId: adminId,
    action: "CREATE",
    contentType: "Source",
    contentId: source.id,
    newValue: { name: source.name, listingUrl: source.listingUrl, category: source.category, approvalStatus: source.approvalStatus },
  });
  return source;
}

export async function updateSource(id: string, input: SourceInput, adminId: string) {
  const existing = await prisma.source.findUniqueOrThrow({ where: { id } });
  const data = writeData(input);
  await assertNoDuplicate(data.canonicalUrl, id);
  const urlChanged = data.canonicalUrl !== existing.canonicalUrl;
  if (data.active && !existing.active) {
    const why = enablePolicyError({ approvalStatus: existing.approvalStatus, isAggregator: data.isAggregator, verificationStatus: urlChanged ? "UNVERIFIED" : existing.verificationStatus });
    if (why) throw new SourcePolicyError(why);
  }
  if (data.isAggregator && urlChanged) data.active = false;
  const source = await prisma.source.update({
    where: { id },
    data: {
      ...data,
      // A new URL invalidates what we knew about the old one.
      ...(urlChanged ? { etag: null, lastModified: null, lastContentHash: null, verificationStatus: "UNVERIFIED" as const, lastVerifiedAt: null, blockedUntil: null, nextCheckAt: new Date() } : {}),
    },
  });
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
  const existing = await prisma.source.findUniqueOrThrow({ where: { id } });
  if (active) {
    const why = enablePolicyError(existing);
    if (why) throw new SourcePolicyError(why);
  }
  const source = await prisma.source.update({
    where: { id },
    // Re-enabling clears a block so the admin's decision takes effect now.
    data: { active, ...(active ? { blockedUntil: null, nextCheckAt: new Date() } : {}) },
  });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Source", contentId: id, newValue: { active } });
  return source;
}

export async function setSourceApproval(id: string, decision: "APPROVED" | "REJECTED", adminId: string) {
  const source = await prisma.source.update({
    where: { id },
    data: { approvalStatus: decision, ...(decision === "REJECTED" ? { active: false } : {}) },
  });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "Source", contentId: id, newValue: { approvalStatus: decision } });
  return source;
}

/** Bulk enable/disable/approve/reject. Each source is judged on its own;
 * refusals are reported, not thrown, so one bad row doesn't stop the rest. */
export async function bulkSourceUpdate(ids: string[], op: "enable" | "disable" | "approve" | "reject", adminId: string) {
  const done: string[] = [];
  const refused: Array<{ id: string; name: string; reason: string }> = [];
  const sources = await prisma.source.findMany({ where: { id: { in: ids.slice(0, 200) } } });
  for (const s of sources) {
    try {
      if (op === "enable") await setSourceActive(s.id, true, adminId);
      else if (op === "disable") await setSourceActive(s.id, false, adminId);
      else await setSourceApproval(s.id, op === "approve" ? "APPROVED" : "REJECTED", adminId);
      done.push(s.id);
    } catch (err) {
      refused.push({ id: s.id, name: s.name, reason: err instanceof Error ? err.message : String(err) });
    }
  }
  return { done, refused };
}

export async function deleteSource(id: string, adminId: string) {
  const existing = await prisma.source.findUniqueOrThrow({ where: { id } });
  // Documents/notices keep their rows (sourceId is nullable); only the
  // watch itself is removed.
  await prisma.$transaction([
    prisma.document.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.recruitmentNotice.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.pipelineError.updateMany({ where: { sourceId: id }, data: { sourceId: null } }),
    prisma.source.updateMany({ where: { discoveredFromId: id }, data: { discoveredFromId: null } }),
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
