import "@/lib/cms/server-guard";

/**
 * Small HTTP helper for the research pipeline. Every call identifies the
 * crawler, times out, and returns a result object instead of throwing, so a
 * blocked or unreachable source becomes a recorded "SOURCE_UNAVAILABLE"
 * rather than a crashed job.
 */
export const USER_AGENT = "budgettourism-content-pipeline/1.0 (+https://budgettourism.com; admin content research; contact via site)";

export interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, data: (await res.json()) as T, error: null };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchText(url: string, timeoutMs = 15000): Promise<FetchResult<string>> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` };
    return { ok: true, status: res.status, data: await res.text(), error: null };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export const nowIso = () => new Date().toISOString();

/** Strips tags and collapses whitespace from an HTML fragment. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/h\d>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
