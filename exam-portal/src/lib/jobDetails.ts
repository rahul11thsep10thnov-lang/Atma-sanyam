/** Parsers for the structured job-page fields that admins enter as plain
 * text (one row per line) and the pipeline fills from extraction. */
export interface PostRow { name: string; eligibility: string; vacancies: number | null }
export interface FeeRow { category: string; fee: string }
export interface DateRow { label: string; date: string }

const splitLine = (l: string) => l.split("|").map((x) => x.trim());

export function parsePostsText(text: string | null | undefined): PostRow[] {
  return (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, eligibility = "", vac = ""] = splitLine(l);
    const n = Number(vac.replace(/[^\d]/g, ""));
    return { name, eligibility, vacancies: vac && Number.isFinite(n) ? n : null };
  }).filter((r) => r.name);
}
export function parseFeesText(text: string | null | undefined): FeeRow[] {
  return (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [category, fee = ""] = l.includes("|") ? splitLine(l) : [l.slice(0, l.lastIndexOf(":")).trim() || l, l.slice(l.lastIndexOf(":") + 1).trim()];
    return { category, fee };
  }).filter((r) => r.category);
}
export function parseDatesText(text: string | null | undefined): DateRow[] {
  return (text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [label, date = ""] = splitLine(l);
    return { label, date };
  }).filter((r) => r.label);
}

const asArray = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Record<string, unknown>[]) : []);

export function readPosts(v: unknown): PostRow[] {
  return asArray(v).map((r) => ({ name: String(r.name ?? ""), eligibility: String(r.eligibility ?? ""), vacancies: typeof r.vacancies === "number" ? r.vacancies : null })).filter((r) => r.name);
}
export function readFees(v: unknown): FeeRow[] {
  if (v && typeof v === "object" && !Array.isArray(v)) return Object.entries(v as Record<string, unknown>).map(([category, fee]) => ({ category, fee: String(fee) }));
  return asArray(v).map((r) => ({ category: String(r.category ?? ""), fee: String(r.fee ?? "") })).filter((r) => r.category);
}
export function readDates(v: unknown): DateRow[] {
  return asArray(v).map((r) => ({ label: String(r.label ?? ""), date: String(r.date ?? "") })).filter((r) => r.label);
}

export const postsToText = (rows: PostRow[]) => rows.map((r) => [r.name, r.eligibility, r.vacancies ?? ""].join(" | ")).join("\n");
export const feesToText = (rows: FeeRow[]) => rows.map((r) => `${r.category} | ${r.fee}`).join("\n");
export const datesToText = (rows: DateRow[]) => rows.map((r) => `${r.label} | ${r.date}`).join("\n");

export function totalVacancies(rows: PostRow[]): number | null {
  const known = rows.filter((r) => r.vacancies !== null);
  return known.length ? known.reduce((a, r) => a + (r.vacancies ?? 0), 0) : null;
}
