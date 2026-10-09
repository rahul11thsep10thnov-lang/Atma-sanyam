import type { CandidateItem } from "../types";
import type { ParserConfig } from "./config";
import { isPdfUrl, parseIndianDate } from "./html";

function at(obj: unknown, path: string | undefined): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((cur, key) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[key] : undefined), obj);
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  if (typeof v === "string") {
    const indian = parseIndianDate(v);
    if (indian && !/^\d{4}-\d{2}-\d{2}T/.test(v)) return indian;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * JSON API listing. Needs the shape spelled out in parserConfig — guessing
 * field names across arbitrary APIs is how wrong data gets published:
 *   { itemsPath: "data.notices", urlField: "link", titleField: "title", dateField: "date" }
 * With no itemsPath the document itself must be the array. Items without a
 * usable http(s) URL are skipped.
 */
export function parseJsonListing(body: string, baseUrl: string, config: ParserConfig): CandidateItem[] {
  const doc = JSON.parse(body) as unknown;
  const list = at(doc, config.itemsPath);
  if (!Array.isArray(list)) {
    throw new Error(config.itemsPath ? `JSON path "${config.itemsPath}" is not an array` : "JSON document is not an array; set parserConfig.itemsPath");
  }
  const urlField = config.urlField ?? "url";
  const titleField = config.titleField ?? "title";
  const out: CandidateItem[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const raw = at(item, urlField);
    if (typeof raw !== "string" || !raw.trim()) continue;
    let url: string;
    try {
      const u = new URL(raw.trim(), baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      url = u.toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    const title = String(at(item, titleField) ?? "").replace(/\s+/g, " ").trim() || url.split("/").pop() || url;
    out.push({ url, title, isPdf: isPdfUrl(url), publishedAt: toDate(at(item, config.dateField ?? "date")) });
    if (config.maxItems && out.length >= config.maxItems) break;
  }
  return out;
}
