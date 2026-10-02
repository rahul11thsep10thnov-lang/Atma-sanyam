import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { NoticePriority, NoticeStatus, NoticeType } from "@/generated/prisma/enums";
import { recordAuditLog } from "@/lib/services/auditLog";
import { reprocessDocument } from "./notices";
import { checkSource } from "./sourceCheck";
import type { NoticeExtraction } from "./extract/schema";

/**
 * Admin review operations on pipeline notices (spec §18): list/filter,
 * approve, reject, edit, publish (see publish.ts), mark/unmark duplicate,
 * merge, re-extract, retry/resolve failed items. Every action is audited
 * with the admin's id; nothing here is reachable without a session.
 */
export const NOTICE_STATUSES: NoticeStatus[] = ["NEW", "NEEDS_REVIEW", "AUTO_APPROVED", "APPROVED", "PUBLISHED", "REJECTED", "DUPLICATE", "FAILED"];
export const NOTICE_TYPES_ALL: NoticeType[] = ["JOB", "ADMIT_CARD", "EXAM_DATE", "ANSWER_KEY", "RESULT", "MERIT_LIST", "SELECTION_LIST", "INTERVIEW", "DOCUMENT_VERIFICATION", "CORRIGENDUM", "DEADLINE_EXTENSION", "EXAM_POSTPONED", "EXAM_CANCELLED", "OTHER"];
export const NOTICE_PRIORITIES: NoticePriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

export interface NoticeFilter {
  status?: NoticeStatus | "INBOX";
  noticeType?: NoticeType;
  q?: string;
  sourceId?: string;
  page?: number;
  pageSize?: number;
}

const INBOX_STATUSES: NoticeStatus[] = ["NEW", "NEEDS_REVIEW", "AUTO_APPROVED", "APPROVED"];

export async function listNotices(filter: NoticeFilter = {}) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 25));
  const where: Prisma.RecruitmentNoticeWhereInput = {
    ...(filter.status === "INBOX" ? { status: { in: INBOX_STATUSES } } : filter.status ? { status: filter.status } : {}),
    ...(filter.noticeType ? { noticeType: filter.noticeType } : {}),
    ...(filter.sourceId ? { sourceId: filter.sourceId } : {}),
    ...(filter.q
      ? {
          OR: [
            { title: { contains: filter.q, mode: "insensitive" } },
            { organization: { name: { contains: filter.q, mode: "insensitive" } } },
            { recruitment: { title: { contains: filter.q, mode: "insensitive" } } },
            { sourceUrl: { contains: filter.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.recruitmentNotice.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        organization: { select: { id: true, name: true, isAutoCreated: true } },
        recruitment: { select: { id: true, title: true, slug: true, status: true } },
        source: { select: { id: true, name: true } },
        duplicateOf: { select: { id: true, title: true } },
        _count: { select: { duplicates: true, errors: true } },
      },
    }),
    prisma.recruitmentNotice.count({ where }),
  ]);
  return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function inboxCounts() {
  const grouped = await prisma.recruitmentNotice.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = Object.fromEntries(NOTICE_STATUSES.map((s) => [s, 0])) as Record<NoticeStatus, number>;
  for (const g of grouped) byStatus[g.status] = g._count._all;
  const [failedItems, running, lastRun, sourcesTotal, sourcesFailing, paused] = await Promise.all([
    prisma.pipelineError.count({ where: { resolvedAt: null } }),
    prisma.pipelineRun.findFirst({ where: { status: "RUNNING" }, select: { id: true, startedAt: true } }),
    prisma.pipelineRun.findFirst({ where: { status: { not: "RUNNING" } }, orderBy: { startedAt: "desc" } }),
    prisma.source.count({ where: { active: true } }),
    prisma.source.count({ where: { active: true, lastError: { not: null }, OR: [{ lastSuccessAt: null }, { lastSuccessAt: { lt: new Date(Date.now() - 48 * 3600_000) } }] } }),
    prisma.appSetting.findUnique({ where: { key: "pipeline.paused" } }),
  ]);
  return {
    byStatus,
    inbox: INBOX_STATUSES.reduce((n, s) => n + byStatus[s], 0),
    failedItems,
    running,
    lastRun,
    sourcesTotal,
    sourcesFailing,
    paused: paused?.value === true,
  };
}

export function getNoticeDetail(id: string) {
  return prisma.recruitmentNotice.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true, slug: true, isAutoCreated: true, organizationType: true } },
      exam: { select: { id: true, title: true, slug: true, status: true, isAutoCreated: true } },
      recruitment: { select: { id: true, title: true, slug: true, status: true, year: true, applicationEndDate: true, examDate: true, isAutoCreated: true } },
      source: { select: { id: true, name: true, officialDomain: true } },
      document: { select: { id: true, filename: true, storageUrl: true, sourceUrl: true, mimeType: true, pageCount: true, versions: { orderBy: { versionNumber: "desc" }, select: { id: true, versionNumber: true, fetchedAt: true, diff: true, checksum: true } } } },
      documentVersion: { select: { id: true, versionNumber: true } },
      duplicateOf: { select: { id: true, title: true, status: true } },
      duplicates: { select: { id: true, title: true, sourceUrl: true, createdAt: true } },
      errors: { where: { resolvedAt: null }, orderBy: { lastAttemptAt: "desc" } },
    },
  });
}

async function audit(adminId: string, action: "APPROVE" | "REJECT" | "UPDATE" | "PUBLISH" | "UNPUBLISH", noticeId: string, previousValue?: Prisma.InputJsonValue, newValue?: Prisma.InputJsonValue) {
  await recordAuditLog({ adminUserId: adminId, action, contentType: "RecruitmentNotice", contentId: noticeId, previousValue, newValue });
}

export async function approveNotice(id: string, adminId: string, note?: string | null) {
  const before = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id }, select: { status: true } });
  if (before.status === "PUBLISHED") return;
  await prisma.recruitmentNotice.update({ where: { id }, data: { status: "APPROVED", reviewedBy: adminId, reviewedAt: new Date(), reviewNote: note ?? undefined, duplicateOfId: null } });
  await audit(adminId, "APPROVE", id, { status: before.status }, { status: "APPROVED" });
}

export async function rejectNotice(id: string, adminId: string, note?: string | null) {
  const before = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.recruitmentNotice.update({ where: { id }, data: { status: "REJECTED", reviewedBy: adminId, reviewedAt: new Date(), reviewNote: note ?? undefined } });
  await audit(adminId, "REJECT", id, { status: before.status }, { status: "REJECTED", note: note ?? null });
}

export async function reopenNotice(id: string, adminId: string) {
  const before = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.recruitmentNotice.update({ where: { id }, data: { status: "NEEDS_REVIEW", duplicateOfId: null, reviewedBy: adminId, reviewedAt: new Date() } });
  await audit(adminId, "UPDATE", id, { status: before.status }, { status: "NEEDS_REVIEW" });
}

export interface NoticePatch {
  title?: string;
  titleHi?: string | null;
  summary?: string | null;
  summaryHi?: string | null;
  noticeType?: NoticeType;
  priority?: NoticePriority;
  organizationId?: string | null;
  examId?: string | null;
  recruitmentId?: string | null;
  /** Corrections to extracted scalar fields. */
  extracted?: Partial<Pick<NoticeExtraction, "advertisement_number" | "vacancies" | "application_start_date" | "application_end_date" | "exam_date" | "admit_card_date" | "result_date" | "application_fee" | "salary" | "official_notification_url" | "official_apply_url">>;
}

/** Admin edit: human-corrected values win and are marked verified at 1.0. */
export async function updateNotice(id: string, adminId: string, patch: NoticePatch) {
  const before = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id } });
  const extracted = { ...((before.extracted ?? {}) as Record<string, unknown>) };
  const fieldConfidence = { ...((before.fieldConfidence ?? {}) as Record<string, unknown>) };
  if (patch.extracted) {
    for (const [k, v] of Object.entries(patch.extracted)) {
      if (v === undefined) continue;
      extracted[k] = v;
      fieldConfidence[k] = { value: v, confidence: 1, sourcePage: null, sourceText: null, extractor: "admin", verified: true };
    }
  }
  const { extracted: _e, ...scalar } = patch;
  void _e;
  const hindiEdited = (patch.titleHi !== undefined && patch.titleHi !== before.titleHi) || (patch.summaryHi !== undefined && patch.summaryHi !== before.summaryHi);
  const updated = await prisma.recruitmentNotice.update({
    where: { id },
    data: {
      ...scalar,
      ...(hindiEdited ? { translationSource: patch.titleHi || patch.summaryHi ? "admin" : null } : {}),
      extracted: extracted as Prisma.InputJsonValue,
      fieldConfidence: fieldConfidence as Prisma.InputJsonValue,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });
  await audit(adminId, "UPDATE", id, { title: before.title, noticeType: before.noticeType, priority: before.priority, extracted: before.extracted as Prisma.InputJsonValue }, { title: updated.title, noticeType: updated.noticeType, priority: updated.priority, patch: patch as unknown as Prisma.InputJsonValue });
  return updated;
}

export async function markDuplicate(id: string, ofId: string, adminId: string) {
  if (id === ofId) throw new Error("A notice cannot be a duplicate of itself.");
  const target = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: ofId }, select: { id: true, duplicateOfId: true, status: true } });
  const canonical = target.duplicateOfId ?? target.id; // always point at the root
  const before = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await prisma.recruitmentNotice.update({ where: { id }, data: { status: "DUPLICATE", duplicateOfId: canonical, reviewedBy: adminId, reviewedAt: new Date() } });
  // Anything that pointed at this notice now points at the root too.
  await prisma.recruitmentNotice.updateMany({ where: { duplicateOfId: id }, data: { duplicateOfId: canonical } });
  await audit(adminId, "UPDATE", id, { status: before.status }, { status: "DUPLICATE", duplicateOf: canonical });
}

/** Merge = mark `id` as a duplicate of `intoId` and copy any value the
 * canonical notice is missing from the merged one (with its provenance). */
export async function mergeNotices(id: string, intoId: string, adminId: string) {
  const [from, into] = await Promise.all([
    prisma.recruitmentNotice.findUniqueOrThrow({ where: { id } }),
    prisma.recruitmentNotice.findUniqueOrThrow({ where: { id: intoId } }),
  ]);
  const fromData = (from.extracted ?? {}) as Record<string, unknown>;
  const intoData = { ...((into.extracted ?? {}) as Record<string, unknown>) };
  const fromConf = (from.fieldConfidence ?? {}) as Record<string, unknown>;
  const intoConf = { ...((into.fieldConfidence ?? {}) as Record<string, unknown>) };
  const filled: string[] = [];
  for (const [k, v] of Object.entries(fromData)) {
    const cur = intoData[k];
    const empty = cur === null || cur === undefined || (Array.isArray(cur) && cur.length === 0);
    const has = v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
    if (empty && has) {
      intoData[k] = v;
      if (fromConf[k]) intoConf[k] = fromConf[k];
      filled.push(k);
    }
  }
  await prisma.recruitmentNotice.update({
    where: { id: intoId },
    data: {
      extracted: intoData as Prisma.InputJsonValue,
      fieldConfidence: intoConf as Prisma.InputJsonValue,
      summary: into.summary ?? from.summary,
      organizationId: into.organizationId ?? from.organizationId,
      examId: into.examId ?? from.examId,
      recruitmentId: into.recruitmentId ?? from.recruitmentId,
    },
  });
  await markDuplicate(id, intoId, adminId);
  await audit(adminId, "UPDATE", intoId, undefined, { mergedFrom: id, filledFields: filled });
  return filled;
}

export async function reextractNotice(id: string, adminId: string) {
  const notice = await prisma.recruitmentNotice.findUniqueOrThrow({ where: { id }, select: { documentId: true, sourceId: true } });
  if (!notice.documentId) throw new Error("This notice has no stored document to re-extract from.");
  const res = await reprocessDocument(notice.documentId, { sourceId: notice.sourceId });
  await audit(adminId, "UPDATE", id, undefined, { reextracted: true, status: res?.status ?? null });
  return res;
}

// ------------------------------------------------------------ failed items --

export function listFailedItems(take = 100) {
  return prisma.pipelineError.findMany({
    where: { resolvedAt: null },
    orderBy: [{ lastAttemptAt: "desc" }],
    take,
    include: {
      source: { select: { id: true, name: true } },
      document: { select: { id: true, filename: true, sourceUrl: true } },
      notice: { select: { id: true, title: true } },
    },
  });
}

/** "Retry now": run the retry for one error immediately, ignoring backoff. */
export async function retryFailedItem(errorId: string, adminId: string) {
  const err = await prisma.pipelineError.findUniqueOrThrow({ where: { id: errorId } });
  let ok = false;
  let message: string | null = null;
  if (err.documentId) {
    const res = await reprocessDocument(err.documentId, { sourceId: err.sourceId });
    ok = !!res;
    message = res ? `${res.created ? "Created" : "Updated"} notice (${res.status}).` : "Still no notice produced — see the newest error.";
  } else if (err.sourceId) {
    const r = await checkSource(err.sourceId, { force: true });
    ok = r.ok;
    message = r.ok ? `Source checked: ${r.newItems} new of ${r.itemsFound}.` : r.error;
  }
  if (ok) await prisma.pipelineError.update({ where: { id: errorId }, data: { resolvedAt: new Date() } });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "PipelineError", contentId: errorId, newValue: { retried: true, ok, message } });
  return { ok, message };
}

export async function resolveFailedItem(errorId: string, adminId: string) {
  await prisma.pipelineError.update({ where: { id: errorId }, data: { resolvedAt: new Date() } });
  await recordAuditLog({ adminUserId: adminId, action: "UPDATE", contentType: "PipelineError", contentId: errorId, newValue: { resolvedManually: true } });
}

// -------------------------------------------------------------- duplicates --

export function listDuplicateGroups(take = 100) {
  return prisma.recruitmentNotice.findMany({
    where: { status: "DUPLICATE" },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      duplicateOf: { select: { id: true, title: true, status: true, sourceUrl: true, source: { select: { name: true } } } },
      source: { select: { id: true, name: true } },
    },
  });
}
