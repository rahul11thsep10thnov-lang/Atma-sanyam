/**
 * Deadline engine (spec §25): one place that turns an application end
 * date into "open / closing soon / closed", the number of days left and
 * a bilingual label. Dates are stored as UTC midnight; "today" counts as
 * a full day, so a deadline today reads "last day today", not "closed".
 */
export type DeadlineState = "open" | "closing" | "last-day" | "closed" | "unknown";

export interface DeadlineInfo {
  state: DeadlineState;
  daysLeft: number | null;
  label: string;
  labelHi: string;
  /** Tailwind classes for a badge. */
  tone: "green" | "amber" | "red" | "slate";
}

export const CLOSING_SOON_DAYS = 7;
const DAY = 86_400_000;

function utcDay(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
}

export function deadlineInfo(endDate: Date | null | undefined, now: Date = new Date()): DeadlineInfo {
  if (!endDate) return { state: "unknown", daysLeft: null, label: "Last date not announced", labelHi: "अंतिम तिथि घोषित नहीं", tone: "slate" };
  const daysLeft = utcDay(endDate) - utcDay(now);
  if (daysLeft < 0) return { state: "closed", daysLeft, label: "Applications closed", labelHi: "आवेदन बंद", tone: "slate" };
  if (daysLeft === 0) return { state: "last-day", daysLeft, label: "Last day to apply — today", labelHi: "आवेदन का आज अंतिम दिन", tone: "red" };
  if (daysLeft <= CLOSING_SOON_DAYS) return { state: "closing", daysLeft, label: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to apply`, labelHi: `आवेदन के लिए ${daysLeft} दिन शेष`, tone: "amber" };
  return { state: "open", daysLeft, label: `${daysLeft} days left to apply`, labelHi: `आवेदन के लिए ${daysLeft} दिन शेष`, tone: "green" };
}
