/**
 * Small, deterministic parsers used when normalising free-text source
 * data into structured fields. A parser returns `null` whenever the text
 * is ambiguous — it never guesses.
 */

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

export function monthNumber(name: string): number | null {
  const idx = MONTHS.findIndex((m) => m.startsWith(name.trim().toLowerCase().slice(0, 3)));
  return idx === -1 ? null : idx + 1;
}

/** "October to March" → [10, 3]. Only the first range is used ("April to June, and September to November" → [4, 6]). */
export function parseMonthRange(text: string | null | undefined): [number, number] | null {
  if (!text) return null;
  const m = text.match(/([A-Za-z]{3,9})\s+to\s+([A-Za-z]{3,9})/);
  if (!m) return null;
  const a = monthNumber(m[1]);
  const b = monthNumber(m[2]);
  return a && b ? [a, b] : null;
}

/** True if `month` (1–12) falls inside the (possibly year-wrapping) range. */
export function monthInRange(month: number, start: number | null, end: number | null): boolean {
  if (!start || !end) return true; // unknown season → do not exclude
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

export function parseDays(text: string | null | undefined): { min: number; max: number; rec: number } | null {
  if (!text) return null;
  const range = text.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return { min, max, rec: Math.round((min + max) / 2) };
  }
  const single = text.match(/(\d+)/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n, rec: n };
  }
  return null;
}

/** "1–2 hours" → {avg:90, min:60}; "30 minutes" → {avg:30, min:30}. */
export function parseVisitDuration(text: string | null | undefined): { avg: number; min: number } | null {
  if (!text) return null;
  const isHours = /hour/i.test(text);
  const isMinutes = /min/i.test(text);
  if (!isHours && !isMinutes) return null;
  const unit = isHours ? 60 : 1;
  const range = text.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const lo = Number(range[1]) * unit;
    const hi = Number(range[2]) * unit;
    return { avg: Math.round((lo + hi) / 2), min: Math.round(lo) };
  }
  const single = text.match(/(\d+(?:\.\d+)?)/);
  if (!single) return null;
  const v = Math.round(Number(single[1]) * unit);
  return { avg: v, min: v };
}

function to24h(hour: string, minute: string | undefined, meridiem: string): string {
  let h = Number(hour) % 12;
  if (/p/i.test(meridiem)) h += 12;
  return `${String(h).padStart(2, "0")}:${minute ?? "00"}`;
}

export interface ParsedHours {
  opening_time: string | null;
  closing_time: string | null;
  weekly_closed_day: string | null;
  open_24h: boolean;
}

/**
 * Parses reported opening-hours text. Takes the LAST clock range in the
 * string (so "Site: dawn to dusk; Museum: 9:00 AM – 5:00 PM" → museum hours)
 * and reports it — callers keep the original text alongside as the source of truth.
 */
export function parseHours(text: string | null | undefined): ParsedHours {
  const empty: ParsedHours = { opening_time: null, closing_time: null, weekly_closed_day: null, open_24h: false };
  if (!text) return empty;

  const closed = text.match(/closed\s+(?:on\s+)?(mon|tues|wednes|thurs|fri|satur|sun)day?s?/i);
  const closedDay = closed
    ? { mon: "MONDAY", tue: "TUESDAY", wed: "WEDNESDAY", thu: "THURSDAY", fri: "FRIDAY", sat: "SATURDAY", sun: "SUNDAY" }[
        closed[1].slice(0, 3).toLowerCase() as "mon"
      ] ?? null
    : null;

  if (/open\s*24\s*hours|24\s*hours/i.test(text)) {
    return { opening_time: "00:00", closing_time: "23:59", weekly_closed_day: closedDay, open_24h: true };
  }

  const re = /(\d{1,2})(?::(\d{2}))?\s*([AP]M)\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*([AP]M)/gi;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) last = match;
  if (!last) return { ...empty, weekly_closed_day: closedDay };

  return {
    opening_time: to24h(last[1], last[2], last[3]),
    closing_time: to24h(last[4], last[5], last[6]),
    weekly_closed_day: closedDay,
    open_24h: false
  };
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  const t = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** First rupee range in a string: "₹1,500–₹6,000 per day" → [1500, 6000]. */
export function parseRupeeRange(text: string | null | undefined): [number, number] | null {
  if (!text) return null;
  const nums = [...text.matchAll(/₹\s*([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  if (nums.length === 0) return null;
  return [nums[0], nums[1] ?? nums[0]];
}

/** "Free …" with no mention of a paid option → 0; anything else stays unknown. */
export function parseEntryFee(text: string | null | undefined): { fee: number | null; required: boolean | null } {
  if (!text) return { fee: null, required: null };
  if (/^\s*free\b/i.test(text) && !/paid/i.test(text)) return { fee: 0, required: false };
  const rupee = parseRupeeRange(text);
  if (rupee) return { fee: rupee[0], required: true };
  if (/paid|fee|ticket|nominal/i.test(text)) return { fee: null, required: true };
  return { fee: null, required: null };
}

export function parseKm(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/~?\s*(\d+(?:\.\d+)?)\s*km/i);
  return m ? Number(m[1]) : null;
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
