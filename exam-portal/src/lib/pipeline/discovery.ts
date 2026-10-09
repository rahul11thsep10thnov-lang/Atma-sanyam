import * as cheerio from "cheerio";
import { prisma } from "@/lib/db/prisma";
import type { SourceType } from "@/generated/prisma/enums";
import { fetchUrl, FetchError, type FetchOptions } from "./http";
import { checkRobots } from "./robots";
import { canonicalizeUrl } from "./dedup";
import { isOfficialHost, redactUrl, sameSite, validateFetchUrl } from "./netguard";
import { isPdfUrl } from "./parsers/html";

/**
 * Controlled source discovery. Starts only from an approved *root* source
 * (one that was not itself discovered — no recursion), reads that one page
 * plus the feeds/sitemaps it advertises, and proposes new sources:
 *
 *  - recruitment/notice sections on the same site,
 *  - RSS/Atom feeds and sitemaps the site links to,
 *  - other *official* authorities (gov.in, nic.in, ac.in, …) linked from
 *    the page with an authority-like name.
 *
 * Proposals are saved as PENDING + disabled for an admin to approve,
 * unless SOURCE_DISCOVERY_TRUST_SAME_SITE=true and the parent is VERIFIED,
 * in which case same-site sections are approved and enabled directly.
 * Never: off-site non-official links, aggregator → elsewhere, PDFs as
 * sources, unsafe URLs, or URLs that already have a source.
 */

export const SECTION_LINK_TEXT =
  /\b(recruitment|recruitments|careers?|vacanc(y|ies)|jobs?|employment|notifications?|notices?|what'?s\s*new|latest\s*(news|updates)|advertisements?|advt|results?|admit\s*cards?|answer\s*keys?|exam(ination)?\s*(calendar|schedule|dates?)|syllabus|admissions?|scholarships?|counsell?ing|cut[-\s]?off|merit\s*lists?|interviews?|apply\s*online|application\s*status|correction|documents?|10th|iti|outsourcing)\b/i;

const AUTHORITY_TEXT = /\b(commission|board|selection|recruitment|service|university|police|court|railway|bank|institute|council|corporation|authority|vidyalaya|sangathan|agency)\b/i;

const MAX_FROM_ONE_PAGE = 40;

export interface DiscoveredSource {
  url: string;
  name: string;
  sourceType: SourceType;
  kind: "section" | "feed" | "sitemap" | "authority";
  linkText: string;
}

export interface DiscoveryReport {
  parentId: string;
  scanned: string | null;
  proposals: DiscoveredSource[];
  created: Array<{ id: string; name: string; url: string; approvalStatus: string }>;
  skipped: Array<{ url: string; reason: string }>;
  error: string | null;
}

function cleanText(t: string) {
  return t.replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Pure part: what a page proposes. Exported for tests (saved HTML in, list
 * out). `aggregator` restricts proposals to the same site.
 */
export function proposeSources(html: string, pageUrl: string, opts: { aggregator?: boolean; extraOfficialDomains?: string[] } = {}): { proposals: DiscoveredSource[]; skipped: Array<{ url: string; reason: string }> } {
  const $ = cheerio.load(html);
  const proposals = new Map<string, DiscoveredSource>();
  const skipped: Array<{ url: string; reason: string }> = [];
  const add = (raw: string | undefined, text: string, kind: DiscoveredSource["kind"], type: SourceType) => {
    if (!raw || proposals.size >= MAX_FROM_ONE_PAGE) return;
    let url: URL;
    try {
      url = validateFetchUrl(new URL(raw.trim(), pageUrl).toString());
    } catch (err) {
      if (/^(https?:)?\/\//i.test(raw.trim()) || raw.trim().startsWith("/")) skipped.push({ url: raw.slice(0, 200), reason: err instanceof Error ? err.message : "invalid URL" });
      return;
    }
    const href = url.toString();
    if (isPdfUrl(href)) return; // a PDF is a notice, not a source
    const key = canonicalizeUrl(href)!;
    if (key === canonicalizeUrl(pageUrl) || proposals.has(key)) return;
    const onSite = sameSite(pageUrl, href);
    if (!onSite) {
      if (opts.aggregator) {
        skipped.push({ url: redactUrl(href), reason: "aggregators only propose pages on their own site" });
        return;
      }
      if (!isOfficialHost(url.hostname, opts.extraOfficialDomains)) {
        skipped.push({ url: redactUrl(href), reason: "external link to a non-official domain" });
        return;
      }
      if (kind === "section" && !AUTHORITY_TEXT.test(text)) {
        skipped.push({ url: redactUrl(href), reason: "external official link without an authority-like name" });
        return;
      }
      kind = kind === "section" ? "authority" : kind;
      // An authority is proposed at its own home page, never a deep link
      // we'd have to trust blindly.
      if (kind === "authority") {
        const home = `${url.protocol}//${url.host}/`;
        const homeKey = canonicalizeUrl(home)!;
        if (proposals.has(homeKey)) return;
        proposals.set(homeKey, { url: home, name: text || url.hostname, sourceType: "HTML", kind, linkText: text });
        return;
      }
    }
    proposals.set(key, { url: href, name: text || url.pathname, sourceType: type, kind, linkText: text });
  };

  $('link[rel="alternate"][href]').each((_, el) => {
    const type = ($(el).attr("type") ?? "").toLowerCase();
    if (type.includes("rss")) add($(el).attr("href"), cleanText($(el).attr("title") ?? "RSS feed"), "feed", "RSS");
    else if (type.includes("atom")) add($(el).attr("href"), cleanText($(el).attr("title") ?? "Atom feed"), "feed", "ATOM");
  });

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href || href.startsWith("#") || /^(javascript|mailto|tel|data):/i.test(href)) return;
    const text = cleanText($(el).text() || $(el).attr("title") || "");
    if (/\.(rss|xml)(\?|$)/i.test(href) && /rss|feed/i.test(`${text} ${href}`)) {
      add(href, text || "Feed", "feed", "RSS");
      return;
    }
    if (!SECTION_LINK_TEXT.test(text)) return;
    add(href, text, "section", "HTML");
  });

  return { proposals: [...proposals.values()], skipped };
}

export async function discoverFromSource(
  parentId: string,
  opts: { fetchOptions?: FetchOptions; maxNew?: number; dryRun?: boolean } = {},
): Promise<DiscoveryReport> {
  const parent = await prisma.source.findUniqueOrThrow({ where: { id: parentId } });
  const report: DiscoveryReport = { parentId, scanned: null, proposals: [], created: [], skipped: [], error: null };
  if (parent.approvalStatus !== "APPROVED") {
    report.error = "Discovery only starts from approved sources.";
    return report;
  }
  if (parent.discoveredFromId) {
    report.error = "Discovery runs only from root sources (not from sources that were themselves discovered), so it never crawls outward.";
    return report;
  }

  const fetchImpl = opts.fetchOptions?.fetchImpl;
  const robots = await checkRobots(parent.listingUrl, fetchImpl);
  if (!robots.allowed) {
    report.error = `robots.txt disallows ${redactUrl(parent.listingUrl)}`;
    return report;
  }
  let html: string;
  let pageUrl: string;
  try {
    const res = await fetchUrl(parent.listingUrl, {
      timeoutMs: parent.requestTimeoutMs,
      minHostIntervalMs: Math.max(parent.minRequestIntervalMs, robots.crawlDelayMs ?? 0),
      maxBytes: 5 * 1024 * 1024,
      allowRedirect: (_from, to) => (sameSite(parent.listingUrl, to.toString()) ? null : `it leaves the site for ${to.hostname}`),
      ...opts.fetchOptions,
    });
    html = res.body.toString("utf8");
    pageUrl = res.finalUrl;
    report.scanned = redactUrl(pageUrl);
  } catch (err) {
    report.error = err instanceof FetchError ? err.message : String(err);
    return report;
  }

  const extra = (process.env.SOURCE_DISCOVERY_ALLOWED_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const { proposals, skipped } = proposeSources(html, pageUrl, { aggregator: parent.isAggregator, extraOfficialDomains: extra });
  for (const sm of robots.sitemaps) {
    if (sameSite(parent.listingUrl, sm)) {
      try {
        validateFetchUrl(sm);
        proposals.push({ url: sm, name: "Sitemap", sourceType: "SITEMAP", kind: "sitemap", linkText: "Sitemap (robots.txt)" });
      } catch {
        skipped.push({ url: redactUrl(sm), reason: "unsafe sitemap URL" });
      }
    }
  }
  report.proposals = proposals;
  report.skipped = skipped;
  if (opts.dryRun) return report;

  const trustSameSite = process.env.SOURCE_DISCOVERY_TRUST_SAME_SITE === "true" && parent.verificationStatus === "VERIFIED" && !parent.isAggregator;
  const max = opts.maxNew ?? 15;
  for (const p of proposals) {
    if (report.created.length >= max) {
      report.skipped.push({ url: redactUrl(p.url), reason: `limit of ${max} new sources per discovery reached` });
      continue;
    }
    const canonicalUrl = (canonicalizeUrl(p.url) ?? p.url).replace(/\/$/, "");
    const exists = await prisma.source.findFirst({ where: { OR: [{ canonicalUrl }, { listingUrl: p.url }] }, select: { id: true } });
    if (exists) {
      report.skipped.push({ url: redactUrl(p.url), reason: "already a source" });
      continue;
    }
    const sameSiteProposal = sameSite(parent.listingUrl, p.url);
    const trusted = trustSameSite && sameSiteProposal;
    const host = new URL(p.url).hostname.replace(/^www\./, "");
    try {
      const created = await prisma.source.create({
        data: {
          name: `${sameSiteProposal ? parent.name.replace(/\s+—.*$/, "") : host} — ${p.linkText || p.kind}`.slice(0, 200),
          listingUrl: p.url,
          canonicalUrl,
          officialDomain: host,
          organizationId: sameSiteProposal ? parent.organizationId : null,
          sourceType: p.sourceType,
          category: parent.category,
          stateCode: sameSiteProposal ? parent.stateCode : null,
          groupName: parent.groupName,
          isAggregator: parent.isAggregator,
          parserConfig: parent.isAggregator ? { sameSiteOnly: true } : undefined,
          priority: "NORMAL",
          checkFrequencyMinutes: parent.checkFrequencyMinutes,
          requestTimeoutMs: parent.requestTimeoutMs,
          minRequestIntervalMs: parent.minRequestIntervalMs,
          approvalStatus: trusted ? "APPROVED" : "PENDING",
          active: trusted,
          verificationStatus: "UNVERIFIED",
          verificationNote: `Discovered (${p.kind}) from "${parent.name}" via link "${p.linkText}". ${trusted ? "Auto-approved by SOURCE_DISCOVERY_TRUST_SAME_SITE." : "Awaiting admin approval."}`.slice(0, 1000),
          discoveredFromId: parent.id,
          nextCheckAt: new Date(),
        },
        select: { id: true, name: true, listingUrl: true, approvalStatus: true },
      });
      report.created.push({ id: created.id, name: created.name, url: created.listingUrl, approvalStatus: created.approvalStatus });
    } catch (err) {
      // Unique-constraint race with a parallel discovery: same outcome as "exists".
      report.skipped.push({ url: redactUrl(p.url), reason: (err as { code?: string }).code === "P2002" ? "already a source" : String(err).slice(0, 200) });
    }
  }
  return report;
}
