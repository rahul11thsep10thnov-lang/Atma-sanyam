import * as cheerio from "cheerio";
import type { CandidateItem } from "../types";
import type { ParserConfig } from "./config";
import { isOfficialHost, siteOf } from "../netguard";

/** Words that mark a link as recruitment-related. Deliberately broad —
 * the extractor/classifier downstream decides what a notice really is;
 * this only keeps "About us" and "Contact" links out of the queue. */
export const NOTICE_KEYWORDS =
  /\b(recruit|recruitment|notification|notice|advertisement|advt|vacanc|admit[\s_-]*card|hall[\s_-]*ticket|result|answer[\s_-]*key|merit[\s_-]*list|select(ed|ion)[\s_-]*list|interview|document\s*verification|corrigend|addend|extension|postpone|cancel|exam(ination)?\s*(date|schedule|calendar)|syllabus|apply\s*online|application|cut[-\s]*off|scorecard|marks)\b/i;

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

/**
 * Configurable listing parser (Source.parserConfig). With an itemSelector
 * each matching row/card yields at most one candidate, its title and date
 * read from the configured sub-elements; without one it falls back to the
 * generic scan above. Include/exclude patterns and same-site filtering
 * apply either way.
 */
export function extractConfiguredCandidates(html: string, baseUrl: string, config: ParserConfig, hint?: string | null): CandidateItem[] {
  const include = config.includeUrlPattern ? new RegExp(config.includeUrlPattern, "i") : null;
  const exclude = config.excludeUrlPattern ? new RegExp(config.excludeUrlPattern, "i") : null;
  const keywordFilter = config.keywordFilter ?? true;
  let baseSite = "";
  try {
    baseSite = siteOf(new URL(baseUrl).hostname);
  } catch {
    baseSite = "";
  }
  const keep = (c: CandidateItem) => {
    if (include && !include.test(c.url)) return false;
    if (exclude && exclude.test(c.url)) return false;
    if (config.sameSiteOnly) {
      try {
        if (siteOf(new URL(c.url).hostname) !== baseSite) return false;
      } catch {
        return false;
      }
    }
    return true;
  };

  let items: CandidateItem[];
  if (!config.itemSelector) {
    if (keywordFilter) {
      items = extractCandidates(html, baseUrl, hint);
    } else {
      const $ = cheerio.load(html);
      const scope = hint && hint.trim() ? $(hint) : $("body");
      items = [];
      const seen = new Set<string>();
      scope.find("a[href]").each((_, el) => {
        const url = resolveHref($(el).attr("href"), baseUrl);
        if (!url || seen.has(url)) return;
        seen.add(url);
        const title = $(el).text().replace(/\s+/g, " ").trim() || url.split("/").pop() || url;
        const row = $(el).closest("tr, li, article, div");
        items.push({ url, title, isPdf: isPdfUrl(url), publishedAt: parseIndianDate(`${title} ${spacedText($, row.length ? row : $(el).parent())}`) });
      });
    }
  } else {
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    items = [];
    $(config.itemSelector).each((_, row) => {
      const $row = $(row);
      const link = config.linkSelector ? $row.find(config.linkSelector).first() : $row.is("a[href]") ? $row : $row.find("a[href]").first();
      const url = resolveHref(link.attr("href"), baseUrl);
      if (!url || seen.has(url)) return;
      const titleEl = config.titleSelector ? $row.find(config.titleSelector).first() : link;
      const title = titleEl.text().replace(/\s+/g, " ").trim() || link.attr("title")?.trim() || url.split("/").pop() || url;
      if (keywordFilter && !isPdfUrl(url) && !NOTICE_KEYWORDS.test(`${title} ${url}`)) return;
      seen.add(url);
      const dateText = config.dateSelector ? $row.find(config.dateSelector).first().text() : spacedText($, $row);
      items.push({ url, title, isPdf: isPdfUrl(url), publishedAt: parseIndianDate(dateText) });
    });
  }
  const filtered = items.filter(keep);
  return config.maxItems ? filtered.slice(0, config.maxItems) : filtered;
}

function resolveHref(href: string | undefined, baseUrl: string): string | null {
  const h = (href ?? "").trim();
  if (!h || h.startsWith("#") || /^(javascript|mailto|tel|data):/i.test(h)) return null;
  try {
    const u = new URL(h, baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

const NEXT_TEXT = /^(next|next\s*page|›|»|>|>>|view\s*more|more|older\s*(posts|entries)?|अगला)$/i;

/** Next-page URL for "nextLink" pagination: an explicit selector, then
 * rel="next", then a link whose whole text reads like "Next"/"View More". */
export function findNextPageUrl(html: string, baseUrl: string, selector?: string): string | null {
  const $ = cheerio.load(html);
  if (selector) {
    const el = $(selector).first();
    const a = el.is("a[href]") ? el : el.find("a[href]").first();
    return resolveHref(a.attr("href"), baseUrl);
  }
  const rel = $('a[rel~="next"][href], link[rel~="next"][href]').first();
  if (rel.length) return resolveHref(rel.attr("href"), baseUrl);
  let found: string | null = null;
  $("a[href]").each((_, el) => {
    if (found) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (NEXT_TEXT.test(text)) found = resolveHref($(el).attr("href"), baseUrl);
  });
  return found;
}

/** Links on a page that point at official government/institution hosts
 * (gov.in, nic.in, ac.in, …), notification PDFs first. Used to recover the
 * original notice URL from an aggregator's write-up. */
export function officialLinksIn(html: string, baseUrl: string, limit = 10): string[] {
  const $ = cheerio.load(html);
  const pdfs: string[] = [];
  const pages: string[] = [];
  $("a[href]").each((_, el) => {
    const url = resolveHref($(el).attr("href"), baseUrl);
    if (!url) return;
    if (!isOfficialHost(new URL(url).hostname)) return;
    const bucket = isPdfUrl(url) ? pdfs : pages;
    if (!bucket.includes(url)) bucket.push(url);
  });
  return [...pdfs, ...pages].slice(0, limit);
}
