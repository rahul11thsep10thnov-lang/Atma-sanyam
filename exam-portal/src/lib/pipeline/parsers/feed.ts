import { XMLParser } from "fast-xml-parser";
import type { CandidateItem } from "../types";
import { isPdfUrl, NOTICE_KEYWORDS } from "./html";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && "#text" in (v as object)) return String((v as { "#text": unknown })["#text"]).trim();
  return String(v).trim();
}

function toDate(v: unknown): Date | null {
  const s = text(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** RSS 2.0 (`rss.channel.item[]`) and Atom (`feed.entry[]`). */
export function parseFeed(xml: string, baseUrl?: string): CandidateItem[] {
  const doc = parser.parse(xml);
  const out: CandidateItem[] = [];

  for (const item of asArray(doc?.rss?.channel?.item)) {
    const link = text(item.link) || text(item.guid);
    if (!link) continue;
    const url = baseUrl ? new URL(link, baseUrl).toString() : link;
    out.push({
      url,
      title: text(item.title) || url,
      isPdf: isPdfUrl(url),
      publishedAt: toDate(item.pubDate) ?? toDate(item["dc:date"]),
      summary: text(item.description) || null,
    });
  }

  for (const entry of asArray(doc?.feed?.entry)) {
    const links = asArray(entry.link);
    const alt = links.find((l: Record<string, string>) => !l["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
    const href = alt?.["@_href"] ?? text(alt);
    if (!href) continue;
    const url = baseUrl ? new URL(href, baseUrl).toString() : href;
    out.push({
      url,
      title: text(entry.title) || url,
      isPdf: isPdfUrl(url),
      publishedAt: toDate(entry.published) ?? toDate(entry.updated),
      summary: text(entry.summary) || text(entry.content) || null,
    });
  }

  return out;
}

/** `<urlset><url><loc>` entries that look recruitment-related (or are PDFs). */
export function parseSitemap(xml: string): CandidateItem[] {
  const doc = parser.parse(xml);
  const out: CandidateItem[] = [];
  for (const u of asArray(doc?.urlset?.url)) {
    const loc = text(u.loc);
    if (!loc) continue;
    if (!isPdfUrl(loc) && !NOTICE_KEYWORDS.test(loc)) continue;
    out.push({ url: loc, title: decodeURIComponent(loc.split("/").pop() ?? loc), isPdf: isPdfUrl(loc), publishedAt: toDate(u.lastmod) });
  }
  return out;
}
