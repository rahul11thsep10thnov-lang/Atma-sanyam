import type { FelicitationStatus } from "@/generated/prisma/enums";

/** Allowed transitions. SCHEDULED / BROADCASTING / EXPIRED are also
 * derived from start/expiry times by the sweep. */
export const TRANSITIONS: Record<FelicitationStatus, FelicitationStatus[]> = {
  DRAFT: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAID_PENDING_APPROVAL", "PAYMENT_FAILED"],
  PAYMENT_FAILED: ["PAYMENT_PENDING"],
  PAID_PENDING_APPROVAL: ["APPROVED", "SCHEDULED", "BROADCASTING", "REJECTED"],
  APPROVED: ["SCHEDULED", "BROADCASTING", "PAUSED", "REJECTED", "EXPIRED"],
  SCHEDULED: ["BROADCASTING", "PAUSED", "REJECTED", "EXPIRED"],
  BROADCASTING: ["PAUSED", "EXPIRED", "REJECTED", "SCHEDULED"],
  PAUSED: ["SCHEDULED", "BROADCASTING", "REJECTED", "EXPIRED"],
  EXPIRED: ["BROADCASTING", "SCHEDULED"],
  REJECTED: ["PAID_PENDING_APPROVAL"],
};

export class InvalidFelicitationTransition extends Error {}

export function assertTransition(from: FelicitationStatus, to: FelicitationStatus) {
  if (from === to) return;
  if (!TRANSITIONS[from].includes(to)) throw new InvalidFelicitationTransition(`Cannot move an entry from ${from} to ${to}.`);
}

/** Status implied by the time window for an approved, unpaused entry. */
export function timeStatus(startAt: Date, expiresAt: Date, now: Date): "SCHEDULED" | "BROADCASTING" | "EXPIRED" {
  if (now < startAt) return "SCHEDULED";
  if (now < expiresAt) return "BROADCASTING";
  return "EXPIRED";
}

export const LIVE_STATUSES: FelicitationStatus[] = ["APPROVED", "SCHEDULED", "BROADCASTING"];

export interface EligibilityInput {
  status: FelicitationStatus;
  paymentStatus: string | null;
  approvedAt: Date | null;
  startAt: Date | null;
  expiresAt: Date | null;
}
/** payment PAID AND approved AND start <= now < expiry AND not paused. */
export function isEligible(e: EligibilityInput, now: Date): boolean {
  return (
    e.paymentStatus === "PAID" &&
    !!e.approvedAt &&
    LIVE_STATUSES.includes(e.status) &&
    !!e.startAt &&
    !!e.expiresAt &&
    e.startAt <= now &&
    now < e.expiresAt
  );
}

/** Deterministic, synchronized slot: every visitor computes the same
 * index from server time, so everyone sees the same entry at once. */
export function currentSlot(count: number, serverNowMs: number, durationMs: number): { index: number; msIntoSlot: number; msLeft: number } {
  if (count <= 0) return { index: -1, msIntoSlot: 0, msLeft: durationMs };
  const slot = Math.floor(serverNowMs / durationMs);
  const msIntoSlot = serverNowMs - slot * durationMs;
  return { index: slot % count, msIntoSlot, msLeft: durationMs - msIntoSlot };
}
