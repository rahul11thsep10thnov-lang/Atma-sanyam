import "@/lib/cms/server-guard";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProviderRunStatus } from "../types";
import { getSettings } from "../store";

/**
 * HTTP for the image providers. Requests are made from the server with a
 * descriptive User-Agent (Wikimedia's API policy asks for contact details),
 * successful JSON responses are cached on disk for 24 hours (Pixabay's API
 * terms require it and it spares every provider repeat queries), and any
 * failure is returned as data — never thrown — so one provider failing can
 * never stop the pipeline. A 403/429 is recorded and the provider is skipped;
 * nothing here retries through other routes or alters headers to get past it.
 */

const CACHE_DIR = join(process.cwd(), "data", "cms", "cache", "discovery");
const DAY = 24 * 60 * 60 * 1000;

export function userAgent(): string {
  const s = getSettings();
  const contact = process.env.WIKIMEDIA_CONTACT_EMAIL || s.contact_email || "contact-not-configured";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://budgettourism.com";
  return `budgettourism-image-discovery/1.0 (${site}; ${contact})`;
}

export interface HttpResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Response body text when the request failed (provider error message), trimmed. */
  error: string | null;
  headers: Headers | null;
  cached: boolean;
}

interface CacheEntry {
  at: number;
  data: unknown;
}

const keyFile = (cacheKey: string) => join(CACHE_DIR, `${createHash("sha1").update(cacheKey).digest("hex")}.json`);

function readCache<T>(cacheKey: string, ttlMs: number): T | null {
  try {
    const f = keyFile(cacheKey);
    if (!existsSync(f)) return null;
    const e = JSON.parse(readFileSync(f, "utf8")) as CacheEntry;
    return Date.now() - e.at < ttlMs ? (e.data as T) : null;
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, data: unknown) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    const f = keyFile(cacheKey);
    const tmp = `${f}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify({ at: Date.now(), data } satisfies CacheEntry));
    renameSync(tmp, f);
  } catch {
    /* the cache is an optimisation only */
  }
}

/**
 * GET a JSON document. `cacheKey` must not contain secrets (pass the URL without its key);
 * pass `ttlMs: 0` to bypass the cache.
 */
export async function getJson<T>(url: string, opts: { headers?: Record<string, string>; cacheKey?: string; ttlMs?: number; timeoutMs?: number } = {}): Promise<HttpResult<T>> {
  const ttl = process.env.CMS_DISCOVERY_NO_CACHE ? 0 : opts.ttlMs ?? DAY;
  const cacheKey = opts.cacheKey ?? url;
  if (ttl > 0) {
    const hit = readCache<T>(cacheKey, ttl);
    if (hit !== null) return { ok: true, status: 200, data: hit, error: null, headers: null, cached: true };
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json", ...(opts.headers ?? {}) },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20000),
      cache: "no-store"
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 200);
      return { ok: false, status: res.status, data: null, error: body || `HTTP ${res.status}`, headers: res.headers, cached: false };
    }
    const data = (await res.json()) as T;
    if (ttl > 0) writeCache(cacheKey, data);
    return { ok: true, status: res.status, data, error: null, headers: res.headers, cached: false };
  } catch (e) {
    const cause = e instanceof Error && "cause" in e && e.cause instanceof Error ? `: ${e.cause.message}` : "";
    return { ok: false, status: 0, data: null, error: `${e instanceof Error ? e.message : String(e)}${cause}`.slice(0, 200), headers: null, cached: false };
  }
}

/** Maps a failed response to the provider status recorded on the attraction. */
export function failureStatus(status: number, body: string | null): ProviderRunStatus {
  if (status === 429 || /rate limit/i.test(body ?? "")) return "RATE_LIMITED";
  if (status === 401) return "ERROR";
  if (status === 400 && /key/i.test(body ?? "")) return "ERROR";
  if (status === 0 || status === 403 || status === 404 || status >= 500) return "PROVIDER_UNAVAILABLE";
  return "ERROR";
}

/** Checks that an image URL actually answers with an image (used on the final candidates only). */
export async function imageReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": userAgent(), Range: "bytes=0-1023" }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    await res.body?.cancel().catch(() => undefined);
    return (res.ok || res.status === 206) && type.startsWith("image/");
  } catch {
    return false;
  }
}
