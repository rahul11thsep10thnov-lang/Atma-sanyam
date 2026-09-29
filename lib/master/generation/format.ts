const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const monthName = (m: number) => MONTH_NAMES[m - 1] ?? String(m);

/** Indian digit grouping: 1234567 → ₹12,34,567 */
export function formatINR(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function rangeINR(min: number, max: number): string {
  return min === max ? formatINR(min) : `${formatINR(min)}–${formatINR(max)}`;
}

/** "A", "A and B", "A, B and C" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function monthRangeText(start: number | null, end: number | null): string | null {
  if (!start || !end) return null;
  return start === end ? monthName(start) : `${monthName(start)} to ${monthName(end)}`;
}

export function yearText(year: number | null): string {
  if (year === null) return "present";
  return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
}

export function hoursText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}

export const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function labelize(value: string): string {
  return sentenceCase(value.toLowerCase().replace(/_/g, " "));
}

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getUTCDate()} ${monthName(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`;
}
