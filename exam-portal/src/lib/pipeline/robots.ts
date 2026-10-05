import { USER_AGENT } from "./http";
import type { FetchImpl } from "./types";

export const BOT_TOKEN = "NaukriChayanBot";

interface RobotsRules {
  allow: string[];
  disallow: string[];
}

/**
 * Minimal robots.txt reader: the group for our token wins over `*`;
 * within a group the longest matching Allow/Disallow prefix decides
 * (Allow wins a tie). Enough to honour the rules the spec requires
 * without pulling in a dependency.
 */
export function parseRobots(text: string, token = BOT_TOKEN): RobotsRules {
  const groups = new Map<string, RobotsRules>();
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
    }
  }
  return groups.get(token.toLowerCase()) ?? groups.get("*") ?? { allow: [], disallow: [] };
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
 * Fetches and caches `/robots.txt` per origin. A missing or unreachable
 * file allows everything (the conventional reading); a present file is
 * applied. Returns the status text stored on `Source.robotsStatus`.
 */
export async function checkRobots(
  url: string,
  fetchImpl: FetchImpl = fetch,
): Promise<{ allowed: boolean; status: string }> {
  const origin = new URL(url).origin;
  let entry = cache.get(origin);
  if (!entry || Date.now() - entry.fetchedAt > TTL_MS) {
    try {
      const res = await fetchImpl(`${origin}/robots.txt`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        entry = { rules: parseRobots(await res.text()), fetchedAt: Date.now(), status: "robots.txt applied" };
      } else {
        entry = { rules: { allow: [], disallow: [] }, fetchedAt: Date.now(), status: `no robots.txt (HTTP ${res.status})` };
      }
    } catch {
      entry = { rules: { allow: [], disallow: [] }, fetchedAt: Date.now(), status: "robots.txt unreachable" };
    }
    cache.set(origin, entry);
  }
  const allowed = isAllowedByRules(entry.rules, url);
  return { allowed, status: allowed ? entry.status : `blocked by robots.txt (${entry.status})` };
}

export function _resetRobotsCache() {
  cache.clear();
}
