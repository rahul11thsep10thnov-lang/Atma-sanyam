/**
 * Pure scheduling and health rules for sources, shared by the pipeline
 * (which writes the fields) and the admin dashboard (which reads them).
 * No database access here so every rule is unit-testable.
 */

export type SourceOutcome =
  | "OK"
  | "NOT_MODIFIED"
  | "UNCHANGED"
  | "EMPTY"
  | "PARSE_ERROR"
  | "HTTP_ERROR"
  | "NETWORK"
  | "BLOCKED"
  | "RATE_LIMITED"
  | "ROBOTS"
  | "INVALID_URL"
  | "NOT_APPROVED";

/** Outcomes where both the fetch and the extraction worked. */
export const EXTRACTION_OK: SourceOutcome[] = ["OK", "NOT_MODIFIED", "UNCHANGED"];
/** Outcomes where the fetch worked but nothing usable came out. */
export const EXTRACTION_BROKEN: SourceOutcome[] = ["EMPTY", "PARSE_ERROR"];

export type SourceHealth = "healthy" | "attention" | "failing" | "blocked" | "stale" | "never" | "disabled" | "pending";

export interface HealthInput {
  active: boolean;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | string | null;
  lastCheckedAt: Date | null;
  lastSuccessAt: Date | null;
  lastExtractionAt?: Date | null;
  lastError: string | null;
  lastOutcome?: string | null;
  consecutiveFailures?: number | null;
  blockedUntil?: Date | null;
  checkFrequencyMinutes: number;
}

/**
 * Health is derived, never stored, so it can't drift.
 *  - pending/disabled: not in rotation (approval first, then the switch).
 *  - blocked: the site refused us (403/429-with-long-Retry-After) and the
 *    scheduler is holding off.
 *  - attention: the page downloads but parsing/extraction produced nothing —
 *    an HTTP 200 alone is *not* healthy.
 *  - failing: the last check failed outright (network, 5xx, 404 …).
 *  - stale: no good extraction within three check intervals.
 *  - healthy: the latest check fetched and extracted successfully.
 */
export function sourceHealth(s: HealthInput, now = new Date()): SourceHealth {
  if (s.approvalStatus && s.approvalStatus !== "APPROVED") return "pending";
  if (!s.active) return "disabled";
  if (!s.lastCheckedAt) return "never";
  if (s.lastOutcome === "BLOCKED" || s.lastOutcome === "RATE_LIMITED" || (s.blockedUntil && s.blockedUntil > now)) return "blocked";
  if (s.lastOutcome && (EXTRACTION_BROKEN as string[]).includes(s.lastOutcome)) return "attention";
  const lastGood = s.lastExtractionAt ?? (s.lastOutcome ? null : s.lastSuccessAt);
  if (s.lastOutcome && !(EXTRACTION_OK as string[]).includes(s.lastOutcome)) return "failing";
  if (!s.lastOutcome && s.lastError && (!s.lastSuccessAt || s.lastSuccessAt < s.lastCheckedAt)) return "failing";
  if (!lastGood) return s.lastOutcome ? "attention" : "failing";
  const staleAfterMs = s.checkFrequencyMinutes * 3 * 60 * 1000;
  if (now.getTime() - lastGood.getTime() > staleAfterMs) return "stale";
  return "healthy";
}

/** Health values that belong in the "Sources requiring attention" count. */
export const NEEDS_ATTENTION: SourceHealth[] = ["attention", "failing", "blocked", "stale"];

export const DAY_MS = 24 * 60 * 60 * 1000;
/** A refused (401/403/451) source waits a day, then two, then up to a week. */
export function blockedPauseMs(consecutiveFailures: number): number {
  return Math.min(DAY_MS * 2 ** Math.max(0, consecutiveFailures - 1), 7 * DAY_MS);
}

/**
 * When the scheduler should look at the source again.
 *  - success: one normal interval.
 *  - failure: the interval doubled per consecutive failure (capped at 24 h,
 *    never sooner than 15 min), with ±10 % jitter so failing sources spread
 *    out instead of retrying in lockstep.
 *  - blocked / rate-limited: not before `blockedUntil`.
 */
export function computeNextCheck(input: {
  now: Date;
  frequencyMinutes: number;
  ok: boolean;
  consecutiveFailures: number;
  blockedUntil?: Date | null;
  random?: () => number;
}): Date {
  const { now, frequencyMinutes, ok, consecutiveFailures } = input;
  const random = input.random ?? Math.random;
  const base = frequencyMinutes * 60_000;
  let delay = ok ? base : Math.max(15 * 60_000, Math.min(base * 2 ** Math.max(0, consecutiveFailures - 1), DAY_MS));
  delay = Math.round(delay * (0.9 + random() * 0.2));
  const next = new Date(now.getTime() + delay);
  if (input.blockedUntil && input.blockedUntil > next) return input.blockedUntil;
  return next;
}

/** Due = enabled, approved, not paused by a block, and its time has come. */
export function isDue(
  s: { active: boolean; approvalStatus?: string | null; nextCheckAt?: Date | null; lastCheckedAt: Date | null; checkFrequencyMinutes: number; blockedUntil?: Date | null },
  now = new Date(),
): boolean {
  if (!s.active || (s.approvalStatus && s.approvalStatus !== "APPROVED")) return false;
  if (s.blockedUntil && s.blockedUntil > now) return false;
  if (s.nextCheckAt) return s.nextCheckAt <= now;
  return !s.lastCheckedAt || s.lastCheckedAt.getTime() + s.checkFrequencyMinutes * 60_000 <= now.getTime();
}

/** Consecutive failures after which a source raises an admin alert. */
export const ALERT_AFTER_FAILURES = 3;
