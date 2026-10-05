import type { FetchImpl } from "./types";

export const USER_AGENT =
  "NaukriChayanBot/1.0 (+government notice monitor; respects robots.txt)";

export interface FetchOptions {
  etag?: string | null;
  lastModified?: string | null;
  timeoutMs?: number;
  maxBytes?: number;
  retries?: number;
  fetchImpl?: FetchImpl;
  /** Minimum gap between two requests to the same host (politeness). */
  minHostIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  notModified: boolean;
  body: Buffer;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  finalUrl: string;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

const lastRequestByHost = new Map<string, number>();
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Per-host politeness gate, shared process-wide. */
async function throttle(host: string, minIntervalMs: number, sleep: (ms: number) => Promise<void>) {
  const last = lastRequestByHost.get(host) ?? 0;
  const wait = last + minIntervalMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestByHost.set(host, Date.now());
}

function isRetryable(status: number) {
  return status === 429 || status === 408 || status >= 500;
}

/**
 * One HTTP GET with everything the spec asks for: timeout, retries with
 * exponential backoff (network errors, 429, 5xx), a byte cap, conditional
 * headers (ETag / Last-Modified → 304 handled as "not modified"), a
 * truthful User-Agent, and a per-host minimum interval so no site is
 * hammered. `fetchImpl` is injectable for tests.
 */
export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    etag,
    lastModified,
    timeoutMs = 20_000,
    maxBytes = 25 * 1024 * 1024,
    retries = 2,
    fetchImpl = fetch,
    minHostIntervalMs = 1500,
    sleep = defaultSleep,
  } = options;

  const host = new URL(url).host;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    if (attempt > 0) await sleep(Math.min(1000 * 2 ** (attempt - 1), 15_000));
    await throttle(host, minHostIntervalMs, sleep);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/pdf,*/*;q=0.8",
      };
      if (etag) headers["If-None-Match"] = etag;
      if (lastModified) headers["If-Modified-Since"] = lastModified;

      const res = await fetchImpl(url, { headers, signal: controller.signal, redirect: "follow" });

      if (res.status === 304) {
        return {
          ok: true,
          status: 304,
          notModified: true,
          body: Buffer.alloc(0),
          contentType: res.headers.get("content-type"),
          etag: res.headers.get("etag") ?? etag ?? null,
          lastModified: res.headers.get("last-modified") ?? lastModified ?? null,
          finalUrl: res.url || url,
        };
      }

      if (!res.ok) {
        if (isRetryable(res.status) && attempt < retries) {
          attempt += 1;
          lastError = new FetchError(`HTTP ${res.status}`, res.status);
          continue;
        }
        throw new FetchError(`HTTP ${res.status} fetching ${url}`, res.status);
      }

      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > maxBytes) {
        throw new FetchError(`Response too large (${declared} bytes > ${maxBytes})`, res.status);
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > maxBytes) {
        throw new FetchError(`Response too large (${bytes.length} bytes > ${maxBytes})`, res.status);
      }

      return {
        ok: true,
        status: res.status,
        notModified: false,
        body: bytes,
        contentType: res.headers.get("content-type"),
        etag: res.headers.get("etag"),
        lastModified: res.headers.get("last-modified"),
        finalUrl: res.url || url,
      };
    } catch (err) {
      if (err instanceof FetchError && !(err.status && isRetryable(err.status))) throw err;
      lastError = err;
      if (attempt >= retries) break;
      attempt += 1;
    } finally {
      clearTimeout(timer);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new FetchError(`Failed after ${retries + 1} attempt(s): ${message}`);
}

/** Test hook: forget per-host timing so tests don't wait on each other. */
export function _resetThrottle() {
  lastRequestByHost.clear();
}
