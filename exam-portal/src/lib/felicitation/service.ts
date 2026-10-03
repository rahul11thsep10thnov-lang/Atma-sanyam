import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { FelicitationStatus, Prisma } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/services/auditLog";
import { assertTransition, isEligible, LIVE_STATUSES, timeStatus } from "./state";
import { getFelicitationSettings } from "./settings";

export const PUBLIC_FIELDS = { id: true, candidateName: true, locality: true, city: true, examName: true } as const;
export type PublicFelicitation = { id: string; candidateName: string; locality: string; city: string; examName: string };

export function newRefCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[b[i] % alphabet.length];
  return `FB-${s}`;
}

async function logAction(entryId: string, action: string, from: FelicitationStatus | null, to: FelicitationStatus | null, by: { adminId?: string | null; actor?: string }, note?: string | null) {
  await prisma.felicitationAdminAction.create({ data: { entryId, adminUserId: by.adminId ?? null, actor: by.adminId ? "admin" : (by.actor ?? "system"), action, fromStatus: from, toStatus: to, note: note ?? null } });
  if (by.adminId) await recordAuditLog({ adminUserId: by.adminId, action: action === "approve" ? "APPROVE" : action === "reject" ? "REJECT" : action === "delete" ? "DELETE" : "UPDATE", contentType: "FelicitationEntry", contentId: entryId, previousValue: from ? { status: from } : undefined, newValue: { status: to, action, note: note ?? null } });
}

/**
 * Moves time-driven statuses in the database (not only in the browser):
 * APPROVED/SCHEDULED → BROADCASTING when the start time passes, any live
 * entry → EXPIRED at its expiry. Also purges identity ciphertext 30 days
 * after expiry. Called by every read path and by the pipeline runner.
 */
export async function syncFelicitationStatuses(now = new Date()) {
  await prisma.felicitationEntry.updateMany({ where: { status: { in: LIVE_STATUSES }, expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
  await prisma.felicitationEntry.updateMany({ where: { status: { in: ["APPROVED", "SCHEDULED"] }, startAt: { lte: now }, expiresAt: { gt: now } }, data: { status: "BROADCASTING" } });
  await prisma.felicitationEntry.updateMany({ where: { status: "APPROVED", startAt: { gt: now } }, data: { status: "SCHEDULED" } });
  await prisma.felicitationEntry.updateMany({
    where: { identityLast4Enc: { not: null }, OR: [{ expiresAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } }, { status: { in: ["REJECTED", "PAYMENT_FAILED"] }, updatedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } }] },
    data: { identityLast4Enc: null, identityPurgedAt: now },
  });
  // Abandoned checkouts: no payment within 24 h → PAYMENT_FAILED.
  await prisma.felicitationEntry.updateMany({ where: { status: { in: ["DRAFT", "PAYMENT_PENDING"] }, createdAt: { lt: new Date(now.getTime() - 86_400_000) } }, data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
}

/** Public board data: only eligible entries, only public fields. */
export async function getBoardState(now = new Date()) {
  await syncFelicitationStatuses(now);
  const settings = await getFelicitationSettings();
  const base = { serverNow: now.getTime(), durationMs: settings.broadcastSeconds * 1000, enabled: settings.enabled, paused: settings.pausedAll, animations: settings.animationsEnabled, intensity: settings.celebrationIntensity, priceRupees: settings.priceRupees, referencePriceRupees: settings.referencePriceRupees };
  if (!settings.enabled || settings.pausedAll) return { ...base, entries: [] as PublicFelicitation[] };
  const rows = await prisma.felicitationEntry.findMany({
    where: { paymentStatus: "PAID", approvedAt: { not: null }, status: { in: LIVE_STATUSES }, startAt: { lte: now }, expiresAt: { gt: now } },
    orderBy: [{ displayOrder: "asc" }, { approvedAt: "asc" }, { id: "asc" }],
    take: settings.maxEntriesPerCycle,
    select: { ...PUBLIC_FIELDS, status: true, paymentStatus: true, approvedAt: true, startAt: true, expiresAt: true },
  });
  let eligible = rows.filter((r) => isEligible(r, now));
  if (settings.featuredEntryId) {
    const f = eligible.find((e) => e.id === settings.featuredEntryId);
    if (f) eligible = [f];
  }
  if (!settings.autoRotate) eligible = eligible.slice(0, 1);
  return { ...base, entries: eligible.map(({ id, candidateName, locality, city, examName }) => ({ id, candidateName, locality, city, examName })) };
}

// ------------------------------------------------------------- submission --

export interface SubmissionInput {
  candidateName: string;
  examName: string;
  examId?: string | null;
  mobile: string;
  locality: string;
  city: string;
  state: string;
  identityLast4Enc: string | null;
  userId?: string | null;
}

/** Creates (or reuses, to prevent duplicates) an unpaid entry. */
export async function createDraftEntry(input: SubmissionInput, now = new Date()) {
  const recent = await prisma.felicitationEntry.findFirst({
    where: { mobile: input.mobile, status: { in: ["DRAFT", "PAYMENT_PENDING", "PAYMENT_FAILED"] }, createdAt: { gt: new Date(now.getTime() - 2 * 3_600_000) } },
    orderBy: { createdAt: "desc" },
  });
  const data = { candidateName: input.candidateName, examName: input.examName, examId: input.examId ?? null, locality: input.locality, city: input.city, state: input.state, identityLast4Enc: input.identityLast4Enc, identityConsentAt: now, userId: input.userId ?? null };
  if (recent) return prisma.felicitationEntry.update({ where: { id: recent.id }, data });
  const entry = await prisma.felicitationEntry.create({ data: { ...data, mobile: input.mobile, refCode: newRefCode(), status: "DRAFT" } });
  await logAction(entry.id, "submitted", null, "DRAFT", { actor: "candidate" });
  return entry;
}

export async function markEntryPaymentPending(entryId: string) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (e.status === "PAYMENT_PENDING") return e;
  assertTransition(e.status, "PAYMENT_PENDING");
  return prisma.felicitationEntry.update({ where: { id: entryId }, data: { status: "PAYMENT_PENDING", paymentStatus: "CREATED" } });
}

/** Called only from the verified payment path. Idempotent. */
export async function onFelicitationPaid(entryId: string, tx: Prisma.TransactionClient = prisma) {
  const e = await tx.felicitationEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (e.paymentStatus === "PAID") return e;
  if (!["DRAFT", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(e.status)) return e;
  const updated = await tx.felicitationEntry.update({ where: { id: entryId }, data: { status: "PAID_PENDING_APPROVAL", paymentStatus: "PAID" } });
  await tx.felicitationAdminAction.create({ data: { entryId, actor: "payment", action: "payment_verified", fromStatus: e.status, toStatus: "PAID_PENDING_APPROVAL" } });
  return updated;
}

export async function onFelicitationPaymentFailed(entryId: string, reason: string) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (e.paymentStatus === "PAID" || e.status === "PAYMENT_FAILED") return e;
  if (e.status !== "PAYMENT_PENDING" && e.status !== "DRAFT") return e;
  const u = await prisma.felicitationEntry.update({ where: { id: entryId }, data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" } });
  await logAction(entryId, "payment_failed", e.status, "PAYMENT_FAILED", { actor: "payment" }, reason);
  return u;
}

// ------------------------------------------------------------ admin ops --

export async function approveEntry(id: string, adminId: string, startAt?: Date | null, now = new Date()) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id } });
  if (e.paymentStatus !== "PAID") throw new Error("Only paid entries can be approved.");
  const settings = await getFelicitationSettings();
  const start = startAt && startAt > now ? startAt : now;
  const expires = new Date(start.getTime() + settings.listingHours * 3_600_000);
  const to = timeStatus(start, expires, now);
  assertTransition(e.status, to);
  await prisma.felicitationEntry.update({ where: { id }, data: { status: to, approvedAt: now, approvedBy: adminId, startAt: start, expiresAt: expires, rejectedReason: null } });
  await logAction(id, "approve", e.status, to, { adminId });
}

export async function rejectEntry(id: string, adminId: string, reason: string | null) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id } });
  assertTransition(e.status, "REJECTED");
  await prisma.felicitationEntry.update({ where: { id }, data: { status: "REJECTED", rejectedReason: reason } });
  await logAction(id, "reject", e.status, "REJECTED", { adminId }, reason);
}

export async function pauseEntry(id: string, adminId: string, now = new Date()) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id } });
  assertTransition(e.status, "PAUSED");
  const remaining = e.expiresAt ? Math.max(0, e.expiresAt.getTime() - Math.max(now.getTime(), e.startAt?.getTime() ?? now.getTime())) : null;
  await prisma.felicitationEntry.update({ where: { id }, data: { status: "PAUSED", pausedAt: now, pausedRemainingMs: remaining } });
  await logAction(id, "pause", e.status, "PAUSED", { adminId });
}

/** Resume keeps the unused part of the 24 hours (pause time is not charged). */
export async function resumeEntry(id: string, adminId: string, now = new Date()) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id } });
  if (e.status !== "PAUSED") throw new Error("Entry is not paused.");
  const remaining = e.pausedRemainingMs ?? 0;
  const start = e.startAt && e.startAt > now ? e.startAt : now;
  const expires = new Date(start.getTime() + remaining);
  const to = remaining <= 0 ? "EXPIRED" : timeStatus(start, expires, now);
  assertTransition("PAUSED", to);
  await prisma.felicitationEntry.update({ where: { id }, data: { status: to, startAt: start, expiresAt: expires, pausedAt: null, pausedRemainingMs: null } });
  await logAction(id, "resume", "PAUSED", to, { adminId });
}

export async function extendEntry(id: string, adminId: string, hours: number, now = new Date()) {
  if (!(hours > 0 && hours <= 24 * 30)) throw new Error("Extension must be between 1 hour and 30 days.");
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id } });
  if (!e.approvedAt || !e.startAt || !e.expiresAt) throw new Error("Only approved entries can be extended.");
  if (e.status === "PAUSED") {
    await prisma.felicitationEntry.update({ where: { id }, data: { pausedRemainingMs: (e.pausedRemainingMs ?? 0) + hours * 3_600_000 } });
  } else {
    const base = e.expiresAt > now ? e.expiresAt : now;
    const expires = new Date(base.getTime() + hours * 3_600_000);
    const start = e.expiresAt > now ? e.startAt : now;
    const to = timeStatus(start, expires, now);
    assertTransition(e.status, to);
    await prisma.felicitationEntry.update({ where: { id }, data: { status: to, startAt: start, expiresAt: expires } });
  }
  await logAction(id, "extend", e.status, null, { adminId }, `+${hours}h`);
}

export async function setDisplayOrder(id: string, adminId: string, order: number) {
  await prisma.felicitationEntry.update({ where: { id }, data: { displayOrder: Math.max(-1000, Math.min(1000, Math.trunc(order))) } });
  await logAction(id, "display_order", null, null, { adminId }, String(order));
}

export async function editEntry(id: string, adminId: string, patch: { candidateName: string; locality: string; city: string; state: string; examName: string }) {
  await prisma.felicitationEntry.update({ where: { id }, data: patch });
  await logAction(id, "edit", null, null, { adminId }, JSON.stringify(patch).slice(0, 500));
}

export async function deleteEntry(id: string, adminId: string) {
  const e = await prisma.felicitationEntry.findUniqueOrThrow({ where: { id }, select: { status: true, refCode: true } });
  await recordAuditLog({ adminUserId: adminId, action: "DELETE", contentType: "FelicitationEntry", contentId: id, previousValue: { status: e.status, refCode: e.refCode } });
  await prisma.felicitationEntry.delete({ where: { id } });
}

export function statusCounts(now = new Date()) {
  return Promise.all([
    prisma.felicitationEntry.count({ where: { status: { notIn: ["DRAFT"] } } }),
    prisma.felicitationEntry.count({ where: { status: "PAID_PENDING_APPROVAL" } }),
    prisma.felicitationEntry.count({ where: { approvedAt: { not: null } } }),
    prisma.felicitationEntry.count({ where: { status: "BROADCASTING", paymentStatus: "PAID", startAt: { lte: now }, expiresAt: { gt: now } } }),
    prisma.felicitationEntry.count({ where: { status: "SCHEDULED" } }),
    prisma.felicitationEntry.count({ where: { status: "EXPIRED" } }),
    prisma.felicitationEntry.count({ where: { paymentStatus: "PAID" } }),
    prisma.felicitationEntry.count({ where: { status: "PAYMENT_FAILED" } }),
    prisma.felicitationEntry.count({ where: { status: "REJECTED" } }),
    prisma.felicitationEntry.count({ where: { status: "PAUSED" } }),
  ]).then(([total, pending, approved, broadcasting, scheduled, expired, paid, failed, rejected, paused]) => ({ total, pending, approved, broadcasting, scheduled, expired, paid, failed, rejected, paused }));
}
