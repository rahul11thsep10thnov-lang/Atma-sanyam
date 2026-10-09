import { fetchUrl, FetchError } from "./http";
import type { FetchImpl } from "./types";

export const BOT_TOKEN = "NaukriChayanBot";

interface RobotsRules {
  allow: string[];
  disallow: string[];
  /** Crawl-delay in seconds, when the group sets one. */
  crawlDelaySec?: number;
  /** Sitemap: lines (file-wide, not per group). */
  sitemaps?: string[];
}

/**
 * Minimal robots.txt reader: the group for our token wins over `*`;
 * within a group the longest matching Allow/Disallow prefix decides
 * (Allow wins a tie). Enough to honour the rules the spec requires
 * without pulling in a dependency.
 */
export function parseRobots(text: string, token = BOT_TOKEN): RobotsRules {
  const groups = new Map<string, RobotsRules>();
  const sitemaps: string[] = [];
  let current: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      const agent = value.toLowerCase();
      if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [] });
      // Consecutive user-agent lines share the following rules.
      if (current.length && current.every((a) => (groups.get(a)?.allow.length ?? 0) + (groups.get(a)?.disallow.length ?? 0) === 0)) {
        current.push(agent);
      } else {
        current = [agent];
      }
    } else if (field === "disallow" || field === "allow") {
      for (const agent of current) {
        const rules = groups.get(agent)!;
        if (value) rules[field].push(value);
      }
    } else if (field === "sitemap") {
      if (/^https?:\/\//i.test(value) && sitemaps.length < 20) sitemaps.push(value);
    } else if (field === "crawl-delay") {
      const sec = Number(value);
      if (Number.isFinite(sec) && sec > 0) for (const agent of current) groups.get(agent)!.crawlDelaySec = Math.min(sec, 120);
    }
  }
  const rules = groups.get(token.toLowerCase()) ?? groups.get("*") ?? { allow: [], disallow: [] };
  return { ...rules, sitemaps };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

export function isAllowedByRules(rules: RobotsRules, url: string): boolean {
  const path = new URL(url).pathname + new URL(url).search;
  let best: { allow: boolean; len: number } | null = null;
  for (const p of rules.disallow) {
    if (matches(p, path) && (!best || p.length > best.len)) best = { allow: false, len: p.length };
  }
  for (const p of rules.allow) {
    if (matches(p, path) && (!best || p.length >= best.len)) best = { allow: true, len: p.length };
  }
  return best ? best.allow : true;
}

const cache = new Map<string, { rules: RobotsRules; fetchedAt: number; status: string }>();
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Fetches and caches `/robots.txt` per origin (through the same SSRF-guarded
 * fetcher as everything else). Per RFC 9309: a missing file (4xx) allows
 * everything; a server error (5xx) means "assume disallowed" until it
 * recovers; a network failure is reported but allows, because the listing
 * fetch will fail on its own with a clearer error. Returns the status
 * text stored on `Source.robotsStatus`, any Crawl-delay and Sitemap lines.
 */
export async function checkRobots(
  url: string,
  fetchImpl?: FetchImpl,
): Promise<{ allowed: boolean; status: string; crawlDelayMs: number | null; sitemaps: string[] }> {
  const origin = new URL(url).origin;
  let entry = cache.get(origin);
  if (!entry || Date.now() - entry.fetchedAt > TTL_MS) {
    try {
      const res = await fetchUrl(`${origin}/robots.txt`, { fetchImpl, retries: 0, timeoutMs: 10_000, maxBytes: 512 * 1024, minHostIntervalMs: 0 });
      entry = { rules: parseRobots(res.body.toString("utf8")), fetchedAt: Date.now(), status: "robots.txt applied" };
    } catch (err) {
      const status = err instanceof FetchError ? err.status : undefined;
      // Failures are cached for 15 minutes only, so a recovered site is re-read soon.
      const shortLived = Date.now() - TTL_MS + 15 * 60 * 1000;
      if (status && status >= 500) {
        entry = { rules: { allow: [], disallow: ["/"] }, fetchedAt: shortLived, status: `robots.txt server error (HTTP ${status}); treated as disallow` };
      } else if (status) {
        entry = { rules: { allow: [], disallow: [] }, fetchedAt: Date.now(), status: `no robots.txt (HTTP ${status})` };
      } else {
        entry = { rules: { allow: [], disallow: [] }, fetchedAt: shortLived, status: "robots.txt unreachable" };
      }
    }
    cache.set(origin, entry);
  }
  const allowed = isAllowedByRules(entry.rules, url);
  const crawlDelayMs = entry.rules.crawlDelaySec ? entry.rules.crawlDelaySec * 1000 : null;
  return { allowed, status: allowed ? entry.status : `blocked by robots.txt (${entry.status})`, crawlDelayMs, sitemaps: entry.rules.sitemaps ?? [] };
}

export function _resetRobotsCache() {
  cache.clear();
}
