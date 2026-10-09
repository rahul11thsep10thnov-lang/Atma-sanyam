import type { FetchImpl } from "./types";
import { BlockedUrlError, guardedLookup, redactUrl, validateFetchUrl } from "./netguard";

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
  /** Redirect hops followed (each one re-validated). */
  maxRedirects?: number;
  /** A Retry-After up to this long is waited out inline; longer ones end
   * the fetch and are reported so the scheduler can pause the source. */
  maxInlineRetryAfterMs?: number;
  /** Jitter source, injectable for deterministic tests. */
  random?: () => number;
  /** Extra policy for redirect targets (e.g. "stay on the same site").
   * Returns a reason to refuse, or null to allow. */
  allowRedirect?: (from: URL, to: URL) => string | null;
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
  redirects: string[];
  durationMs: number;
}

/**
 * What went wrong, in terms the scheduler acts on:
 *  - blocked: 401/403/451 — never retried, never worked around.
 *  - rate_limited: 429/503 with a long Retry-After — pause until then.
 *  - http: any other status (5xx are transient, 4xx are not).
 *  - network / timeout: connection-level problems (mostly transient).
 *  - invalid_url: refused by the SSRF guard or malformed.
 *  - redirect: too many hops or a refused redirect target.
 *  - too_large: response exceeded the byte cap.
 */
export type FetchErrorKind = "blocked" | "rate_limited" | "http" | "network" | "timeout" | "invalid_url" | "redirect" | "too_large";

export class FetchError extends Error {
  readonly kind: FetchErrorKind;
  readonly transient: boolean;
  readonly retryAfterMs: number | null;
  constructor(
    message: string,
    public readonly status?: number,
    opts: { kind?: FetchErrorKind; transient?: boolean; retryAfterMs?: number | null } = {},
  ) {
    super(message);
    this.name = "FetchError";
    this.kind = opts.kind ?? "http";
    this.transient = opts.transient ?? (status ? isTransientStatus(status) : true);
    this.retryAfterMs = opts.retryAfterMs ?? null;
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

/** Per-domain concurrency limit (PIPELINE_PER_DOMAIN_CONCURRENCY, default 1),
 * so a parallel run never opens several connections to one small site. */
const domainSlots = new Map<string, { active: number; queue: Array<() => void> }>();
function perDomainLimit(): number {
  const n = Number(process.env.PIPELINE_PER_DOMAIN_CONCURRENCY ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
async function acquireDomain(host: string): Promise<() => void> {
  let slot = domainSlots.get(host);
  if (!slot) {
    slot = { active: 0, queue: [] };
    domainSlots.set(host, slot);
  }
  const s = slot;
  if (s.active >= perDomainLimit()) await new Promise<void>((resolve) => s.queue.push(resolve));
  s.active += 1;
  return () => {
    s.active -= 1;
    const next = s.queue.shift();
    if (next) next();
    else if (s.active === 0) domainSlots.delete(host);
  };
}

export function isTransientStatus(status: number) {
  return status === 429 || status === 408 || status >= 500;
}

const BLOCKED_STATUSES = new Set([401, 403, 451]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Exponential backoff with "equal jitter": half the window fixed, half
 * random, so retries from many workers don't line up. */
export function backoffDelay(attempt: number, random: () => number = Math.random, baseMs = 1000, capMs = 15_000): number {
  const window = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(window / 2 + random() * (window / 2));
}

/** Retry-After is either delta-seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const at = Date.parse(v);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

let guardedFetch: FetchImpl | null = null;

/**
 * The production fetch: undici with a connection-time DNS check, so every
 * socket — including the ones opened for redirect targets — is refused if
 * the name resolves to a loopback/private/link-local address.
 */
export async function getGuardedFetch(): Promise<FetchImpl> {
  if (guardedFetch) return guardedFetch;
  const undici = await import("undici");
  const dispatcher = new undici.Agent({
    connect: { lookup: guardedLookup as never, timeout: 15_000 },
    headersTimeout: 30_000,
    bodyTimeout: 60_000,
  });
  guardedFetch = ((input: string | URL | Request, init?: RequestInit) =>
    undici.fetch(input as never, { ...(init as object), dispatcher } as never)) as unknown as FetchImpl;
  return guardedFetch;
}

async function readCapped(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    await res.body?.cancel().catch(() => {});
    throw new FetchError(`Response too large (${declared} bytes > ${maxBytes})`, res.status, { kind: "too_large", transient: false });
  }
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new FetchError(`Response too large (more than ${maxBytes} bytes)`, res.status, { kind: "too_large", transient: false });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/** Certificate and DNS failures don't fix themselves in a few seconds. */
const PERSISTENT_NET_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_HAS_EXPIRED",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "ENOTFOUND",
  "ESSRFBLOCKED",
]);

function errorCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string; cause?: { code?: string } } };
  return e?.cause?.cause?.code ?? e?.cause?.code ?? e?.code;
}

/**
 * One HTTP GET with everything the spec asks for: SSRF validation of the
 * URL and of every redirect hop, a timeout, retries only for transient
 * failures (network, 408, 429, 5xx) with jittered exponential backoff,
 * Retry-After honoured, no retry at all for 401/403/451, a streamed byte
 * cap, conditional headers (ETag / Last-Modified → 304), a truthful
 * User-Agent, a per-host minimum interval and a per-domain concurrency
 * limit. `fetchImpl` is injectable for tests.
 */
export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<FetchResult> {
  const {
    etag,
    lastModified,
    timeoutMs = 20_000,
    maxBytes = 25 * 1024 * 1024,
    retries = 2,
    minHostIntervalMs = 1500,
    sleep = defaultSleep,
    maxRedirects = 5,
    maxInlineRetryAfterMs = 60_000,
    random = Math.random,
    allowRedirect,
  } = options;
  const startedAt = Date.now();

  let start: URL;
  try {
    start = validateFetchUrl(url);
  } catch (err) {
    throw new FetchError(err instanceof Error ? err.message : String(err), undefined, { kind: "invalid_url", transient: false });
  }
  const fetchImpl = options.fetchImpl ?? (await getGuardedFetch());
  const host = start.host;
  const release = await acquireDomain(host);

  try {
    let attempt = 0;
    let lastError: unknown;
    let waitMs = 0;

    while (attempt <= retries) {
      if (attempt > 0) await sleep(waitMs || backoffDelay(attempt, random));
      waitMs = 0;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers: Record<string, string> = {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,application/json,application/pdf,*/*;q=0.8",
        };
        if (etag) headers["If-None-Match"] = etag;
        if (lastModified) headers["If-Modified-Since"] = lastModified;

        // Redirects are followed by hand so each hop is validated before
        // anything is sent to it.
        let current = start;
        const redirects: string[] = [];
        let res: Response;
        for (;;) {
          await throttle(current.host, minHostIntervalMs, sleep);
          res = await fetchImpl(current.toString(), { headers, signal: controller.signal, redirect: "manual" });
          if (!REDIRECT_STATUSES.has(res.status)) break;
          const location = res.headers.get("location");
          await res.body?.cancel().catch(() => {});
          if (!location) throw new FetchError(`HTTP ${res.status} redirect without a Location header`, res.status, { kind: "redirect", transient: false });
          if (redirects.length >= maxRedirects) {
            throw new FetchError(`Too many redirects (more than ${maxRedirects}) starting at ${redactUrl(start.toString())}`, res.status, { kind: "redirect", transient: false });
          }
          let next: URL;
          try {
            next = validateFetchUrl(new URL(location, current).toString());
          } catch (err) {
            const why = err instanceof BlockedUrlError ? err.message : "invalid Location header";
            throw new FetchError(`Redirect from ${redactUrl(current.toString())} refused: ${why}`, res.status, { kind: "redirect", transient: false });
          }
          const policy = allowRedirect?.(current, next);
          if (policy) throw new FetchError(`Redirect to ${redactUrl(next.toString())} refused: ${policy}`, res.status, { kind: "redirect", transient: false });
          redirects.push(next.toString());
          current = next;
        }
        const finalUrl = current.toString();

        if (res.status === 304) {
          return {
            ok: true,
            status: 304,
            notModified: true,
            body: Buffer.alloc(0),
            contentType: res.headers.get("content-type"),
            etag: res.headers.get("etag") ?? etag ?? null,
            lastModified: res.headers.get("last-modified") ?? lastModified ?? null,
            finalUrl,
            redirects,
            durationMs: Date.now() - startedAt,
          };
        }

        if (!res.ok) {
          await res.body?.cancel().catch(() => {});
          if (BLOCKED_STATUSES.has(res.status)) {
            throw new FetchError(
              `HTTP ${res.status}: the site refused access to ${redactUrl(finalUrl)}. Not retried and not worked around; the source is paused and needs a human to check the site's access policy.`,
              res.status,
              { kind: "blocked", transient: false },
            );
          }
          const retryAfter = res.status === 429 || res.status === 503 ? parseRetryAfter(res.headers.get("retry-after")) : null;
          if (retryAfter !== null && retryAfter > maxInlineRetryAfterMs) {
            throw new FetchError(`HTTP ${res.status}: the site asked us to come back in ${Math.ceil(retryAfter / 60_000)} min (Retry-After)`, res.status, {
              kind: "rate_limited",
              transient: true,
              retryAfterMs: retryAfter,
            });
          }
          if (isTransientStatus(res.status) && attempt < retries) {
            attempt += 1;
            waitMs = retryAfter ?? 0;
            lastError = new FetchError(`HTTP ${res.status}`, res.status);
            continue;
          }
          throw new FetchError(`HTTP ${res.status} fetching ${redactUrl(finalUrl)}`, res.status, {
            kind: res.status === 429 ? "rate_limited" : "http",
            retryAfterMs: retryAfter,
          });
        }

        const body = await readCapped(res, maxBytes);
        return {
          ok: true,
          status: res.status,
          notModified: false,
          body,
          contentType: res.headers.get("content-type"),
          etag: res.headers.get("etag"),
          lastModified: res.headers.get("last-modified"),
          finalUrl,
          redirects,
          durationMs: Date.now() - startedAt,
        };
      } catch (err) {
        if (err instanceof FetchError) {
          if (!err.transient || err.kind === "rate_limited" || attempt >= retries) throw err;
          lastError = err;
          attempt += 1;
          continue;
        }
        const code = errorCode(err);
        if (code && PERSISTENT_NET_CODES.has(code)) {
          throw new FetchError(describeNetworkError(err), undefined, { kind: code === "ESSRFBLOCKED" ? "invalid_url" : "network", transient: false });
        }
        lastError = controller.signal.aborted ? Object.assign(new Error(`Timed out after ${timeoutMs} ms`), { code: "ETIMEDOUT" }) : err;
        if (attempt >= retries) break;
        attempt += 1;
      } finally {
        clearTimeout(timer);
      }
    }

    if (lastError instanceof FetchError) {
      throw new FetchError(`Failed after ${retries + 1} attempt(s): ${lastError.message}`, lastError.status, { kind: lastError.kind, transient: true, retryAfterMs: lastError.retryAfterMs });
    }
    const timedOut = errorCode(lastError) === "ETIMEDOUT";
    throw new FetchError(`Failed after ${retries + 1} attempt(s): ${describeNetworkError(lastError)}`, undefined, { kind: timedOut ? "timeout" : "network", transient: true });
  } finally {
    release();
  }
}

/** Test hook: forget per-host timing so tests don't wait on each other. */
export function _resetThrottle() {
  lastRequestByHost.clear();
  domainSlots.clear();
}

/** Node's fetch hides the real reason behind "fetch failed"; the cause
 * (certificate problem, DNS, reset, timeout) is what an admin needs. */
export function describeNetworkError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: unknown }).cause as { code?: string; message?: string; cause?: { code?: string; message?: string } } | undefined;
  const inner = cause?.cause ?? cause;
  const code = inner?.code ?? cause?.code ?? (err as Error & { code?: string }).code;
  const detail = inner?.message ?? cause?.message;
  const hints: Record<string, string> = {
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: "the site's certificate chain is incomplete (browsers repair this, Node does not)",
    UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "the site's certificate chain is incomplete (browsers repair this, Node does not)",
    CERT_HAS_EXPIRED: "the site's certificate has expired",
    ERR_TLS_CERT_ALTNAME_INVALID: "the certificate does not match this address (try the address without or with www)",
    DEPTH_ZERO_SELF_SIGNED_CERT: "the site uses a self-signed certificate",
    ENOTFOUND: "the address does not exist (DNS)",
    ECONNRESET: "the site closed the connection, usually a bot block",
    ECONNREFUSED: "the site refused the connection",
    ETIMEDOUT: "the connection timed out",
    UND_ERR_CONNECT_TIMEOUT: "the connection timed out",
    ESSRFBLOCKED: "the address points to a private or internal network and was refused",
  };
  const hint = code ? hints[code] : undefined;
  if (!code && !detail) return err.message;
  return `${err.message} [${code ?? "no code"}${hint ? `: ${hint}` : detail ? `: ${detail}` : ""}]`;
}
