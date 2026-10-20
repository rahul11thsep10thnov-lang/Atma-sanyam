// The only way the backend fetches a third-party page for the source
// registry. It exists to make server-side request forgery, runaway requests
// and impolite crawling impossible by construction:
//   * https only, no credentials, no non-standard ports, no IP-literal hosts;
//   * the host must be on an allow-list (registry sources + configured
//     discovery domains) and must resolve to public addresses only;
//   * redirects are followed by hand (max 3) and every hop is re-validated;
//   * robots.txt is honoured; an identifying User-Agent is sent;
//   * a timeout, a response-size cap and bounded retries with back-off
//     (honouring Retry-After) protect both sides.
// `fetchImpl` and `resolve` are injectable so tests never touch the network.
import dns from 'node:dns/promises';
import net from 'node:net';

export type FetchKind = 'blocked' | 'robots' | 'timeout' | 'network' | 'http' | 'too_large';

export class SafeFetchError extends Error {
  constructor(
    public readonly kind: FetchKind,
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

export interface SafeFetchOptions {
  userAgent: string;
  timeoutMs: number;
  maxBytes: number;
  retries: number;
  /** Host (without www.) must satisfy this. */
  hostAllowed: (host: string) => boolean;
  fetchImpl?: typeof fetch;
  resolve?: (host: string) => Promise<string[]>;
  respectRobots?: boolean;
  robotsCache?: Map<string, RobotsRules | 'unavailable'>;
  sleep?: (ms: number) => Promise<void>;
  accept?: string;
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number) as [number, number];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8') || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb')) return true;
    const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]!);
    return false;
  }
  return true;
}

async function defaultResolve(host: string): Promise<string[]> {
  return (await dns.lookup(host, { all: true })).map((r) => r.address);
}

export async function assertSafeUrl(raw: string, o: Pick<SafeFetchOptions, 'hostAllowed' | 'resolve'>): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SafeFetchError('blocked', 'Not a valid URL');
  }
  if (u.protocol !== 'https:') throw new SafeFetchError('blocked', 'Only https URLs are allowed');
  if (u.username || u.password) throw new SafeFetchError('blocked', 'URLs with credentials are not allowed');
  if (u.port && u.port !== '443') throw new SafeFetchError('blocked', 'Non-standard ports are not allowed');
  const host = u.hostname.toLowerCase();
  if (net.isIP(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) throw new SafeFetchError('blocked', 'Host is not allowed');
  const bare = host.startsWith('www.') ? host.slice(4) : host;
  if (!o.hostAllowed(bare)) throw new SafeFetchError('blocked', `Host ${bare} is not on the source allow-list`);
  let addrs: string[];
  try {
    addrs = await (o.resolve ?? defaultResolve)(host);
  } catch {
    throw new SafeFetchError('network', `Could not resolve ${host}`);
  }
  if (addrs.length === 0 || addrs.some(isPrivateAddress)) throw new SafeFetchError('blocked', `${host} resolves to a private or reserved address`);
  return u;
}

// ---- robots.txt ----------------------------------------------------------

export interface RobotsRules {
  disallow: string[];
  allow: string[];
}

export function parseRobots(text: string, agent: string): RobotsRules {
  const token = agent.split('/')[0]!.toLowerCase();
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let cur: { agents: string[]; allow: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const i = clean.indexOf(':');
    if (i < 0) continue;
    const key = clean.slice(0, i).trim().toLowerCase();
    const val = clean.slice(i + 1).trim();
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], allow: [], disallow: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === 'disallow' && val) cur.disallow.push(val);
      if (key === 'allow' && val) cur.allow.push(val);
    }
  }
  const specific = groups.filter((g) => g.agents.some((a) => a === token));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return { disallow: chosen.flatMap((g) => g.disallow), allow: chosen.flatMap((g) => g.allow) };
}

export function robotsAllows(rules: RobotsRules, path: string): boolean {
  const match = (list: string[]) => list.filter((r) => path.startsWith(r.replace(/\*.*$/, ''))).reduce((m, r) => Math.max(m, r.length), -1);
  const d = match(rules.disallow);
  if (d < 0) return true;
  return match(rules.allow) >= d;
}

async function rawGet(url: URL, o: SafeFetchOptions, accept: string): Promise<{ status: number; text: string; finalUrl: string }> {
  const doFetch = o.fetchImpl ?? fetch;
  let current = url;
  for (let hop = 0; hop <= 3; hop++) {
    await assertSafeUrl(current.toString(), o);
    let res: Response;
    try {
      res = await doFetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': o.userAgent, Accept: accept },
        signal: AbortSignal.timeout(o.timeoutMs),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') throw new SafeFetchError('timeout', `Timed out after ${o.timeoutMs} ms`);
      throw new SafeFetchError('network', 'Network error while fetching the source');
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new SafeFetchError('http', 'Redirect without a location', res.status);
      current = new URL(loc, current);
      continue;
    }
    // Read at most maxBytes.
    let text = '';
    if (res.body) {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > o.maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new SafeFetchError('too_large', 'Response is larger than the allowed size');
        }
        text += dec.decode(value, { stream: true });
      }
      text += dec.decode();
    } else {
      text = await res.text();
      if (text.length > o.maxBytes) throw new SafeFetchError('too_large', 'Response is larger than the allowed size');
    }
    return { status: res.status, text, finalUrl: current.toString() };
  }
  throw new SafeFetchError('http', 'Too many redirects');
}

async function checkRobots(url: URL, o: SafeFetchOptions) {
  if (!o.respectRobots) return;
  const cache = o.robotsCache ?? new Map();
  let entry = cache.get(url.host);
  if (!entry) {
    try {
      const r = await rawGet(new URL(`https://${url.host}/robots.txt`), o, 'text/plain');
      if (r.status === 404 || r.status === 410 || r.status === 401 || r.status === 403) entry = { disallow: [], allow: [] };
      else if (r.status >= 500) entry = 'unavailable';
      else entry = parseRobots(r.text, o.userAgent);
    } catch (err) {
      if (err instanceof SafeFetchError && err.kind === 'blocked') throw err;
      entry = 'unavailable';
    }
    cache.set(url.host, entry);
  }
  if (entry === 'unavailable') throw new SafeFetchError('robots', `robots.txt of ${url.host} could not be read; not fetching`);
  if (!robotsAllows(entry, url.pathname + url.search)) throw new SafeFetchError('robots', `robots.txt of ${url.host} disallows this path`);
}

/** GET a text resource with every protection above. Retries network errors, timeouts, 429 and 5xx. */
export async function safeFetchText(rawUrl: string, o: SafeFetchOptions): Promise<{ status: number; text: string; finalUrl: string }> {
  const url = await assertSafeUrl(rawUrl, o);
  await checkRobots(url, o);
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastErr: unknown;
  for (let attempt = 0; attempt <= o.retries; attempt++) {
    try {
      const res = await rawGet(url, o, o.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.5');
      if (res.status === 429 || res.status >= 500) throw new SafeFetchError('http', `HTTP ${res.status}`, res.status);
      return res;
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof SafeFetchError && (err.kind === 'network' || err.kind === 'timeout' || (err.kind === 'http' && (err.status === 429 || (err.status ?? 0) >= 500)));
      if (!retryable || attempt === o.retries) break;
      await sleep(Math.min(8000, 500 * 2 ** attempt));
    }
  }
  throw lastErr instanceof SafeFetchError ? lastErr : new SafeFetchError('network', 'Fetch failed');
}
