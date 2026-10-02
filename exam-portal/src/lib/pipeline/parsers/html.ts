import * as cheerio from "cheerio";
import type { CandidateItem } from "../types";

/** Words that mark a link as recruitment-related. Deliberately broad —
 * the extractor/classifier downstream decides what a notice really is;
 * this only keeps "About us" and "Contact" links out of the queue. */
export const NOTICE_KEYWORDS =
  /\b(recruit|recruitment|notification|notice|advertisement|advt|vacanc|admit\s*card|hall\s*ticket|result|answer\s*key|merit\s*list|select(ed|ion)\s*list|interview|document\s*verification|corrigend|addend|extension|postpone|cancel|exam(ination)?\s*(date|schedule|calendar)|syllabus|apply\s*online|application|cut[-\s]*off|scorecard|marks)\b/i;

const DATE_RE =
  /(?<!\d)(\d{1,2})[-/.\s]([A-Za-z]{3,9}|\d{1,2})[-/.\s](\d{4})(?!\d)|(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;

/** Element text with a space at every tag boundary — `.text()` alone glues
 * adjacent cells together ("12-01-2027Notification"). */
function spacedText($: cheerio.CheerioAPI, el: cheerio.Cheerio<import("domhandler").AnyNode>): string {
  const html = el.html() ?? "";
  return cheerio.load(html.replace(/<[^>]+>/g, " ")).root().text().replace(/\s+/g, " ").trim();
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** dd-mm-yyyy, dd/mm/yyyy, dd Month yyyy, yyyy-mm-dd → Date (UTC midnight) or null. */
export function parseIndianDate(text: string): Date | null {
  const m = DATE_RE.exec(text);
  if (!m) return null;
  let d: number, mo: number, y: number;
  if (m[4]) {
    y = Number(m[4]); mo = Number(m[5]) - 1; d = Number(m[6]);
  } else {
    d = Number(m[1]); y = Number(m[3]);
    const monthPart = m[2];
    mo = /^\d+$/.test(monthPart) ? Number(monthPart) - 1 : (MONTHS[monthPart.slice(0, 4).toLowerCase()] ?? MONTHS[monthPart.slice(0, 3).toLowerCase()]);
    if (mo === undefined) return null;
  }
  if (d < 1 || d > 31 || mo < 0 || mo > 11 || y < 1990 || y > 2100) return null;
  const date = new Date(Date.UTC(y, mo, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/**
 * Finds candidate notice links on a listing page: every PDF link, plus
 * any link whose text/URL carries a recruitment keyword. An optional
 * CSS `hint` (Source.parserType) narrows the search to one region.
 */
export function extractCandidates(html: string, baseUrl: string, hint?: string | null): CandidateItem[] {
  const $ = cheerio.load(html);
  const scope = hint && hint.trim() ? $(hint) : $("body");
  const seen = new Set<string>();
  const items: CandidateItem[] = [];

  scope.find("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href)) return;
    let url: string;
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    const title = $(el).text().replace(/\s+/g, " ").trim() || $(el).attr("title")?.trim() || "";
    const pdf = isPdfUrl(url);
    if (!pdf && !NOTICE_KEYWORDS.test(`${title} ${href}`)) return;
    if (seen.has(url)) return;
    seen.add(url);
    // Dates usually sit in a sibling cell/span of the same row or list item.
    const container = $(el).closest("tr, li, p, article, div");
    const context = `${title} ${spacedText($, container.length ? container : $(el).parent())}`;
    items.push({ url, title: title || url.split("/").pop() || url, isPdf: pdf, publishedAt: parseIndianDate(context) });
  });

  return items;
}

/** Visible text of a page, scripts/styles/nav removed, whitespace collapsed. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, iframe").remove();
  return $("body").text().replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

export function htmlTitle(html: string): string | null {
  const $ = cheerio.load(html);
  const t = $("title").first().text().trim() || $("h1").first().text().trim();
  return t || null;
}
