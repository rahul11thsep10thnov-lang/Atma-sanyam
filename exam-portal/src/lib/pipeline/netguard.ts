import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns";

/**
 * SSRF guard for everything the pipeline fetches. Two layers:
 *
 *  1. `validateFetchUrl` — static checks on the URL itself (scheme, port,
 *     credentials, IP literals, "localhost"-style names). Runs before the
 *     first request and on every redirect target.
 *  2. `guardedLookup` — a DNS lookup used by the HTTP connection itself, so
 *     the address that is actually connected to is the one that was
 *     checked (no DNS-rebinding window between "check" and "connect").
 *
 * Setting PIPELINE_ALLOW_PRIVATE_HOSTS=true disables the address checks;
 * that exists only for local integration tests against 127.0.0.1 and must
 * never be set in production.
 */

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockedUrlError";
  }
}

const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa", ".corp"];

export function privateHostsAllowed(): boolean {
  return process.env.PIPELINE_ALLOW_PRIVATE_HOSTS === "true" && process.env.NODE_ENV !== "production";
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local (cloud metadata lives here)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  // Embedded IPv4 tail (::ffff:1.2.3.4)
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4) {
    const n = ipv4ToInt(v4[1]);
    addr = addr.slice(0, -v4[1].length) + ((n >>> 16) & 0xffff).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const parts = [...head, ...Array(Math.max(fill, 0)).fill("0"), ...tail].map((h) => parseInt(h || "0", 16));
  return parts.length === 8 && parts.every((p) => p >= 0 && p <= 0xffff) ? parts : null;
}

function isBlockedV6(ip: string): boolean {
  const p = expandV6(ip);
  if (!p) return true; // unparseable → refuse
  if (p.every((x) => x === 0)) return true; // ::
  if (p.slice(0, 7).every((x) => x === 0) && p[7] === 1) return true; // ::1
  // IPv4-mapped / -compatible / NAT64 well-known prefix → judge the IPv4 part
  const v4of = (hi: number, lo: number) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  if (p.slice(0, 5).every((x) => x === 0) && (p[5] === 0xffff || p[5] === 0)) return isBlockedV4(v4of(p[6], p[7]));
  if (p[0] === 0x64 && p[1] === 0xff9b) return isBlockedV4(v4of(p[6], p[7]));
  if ((p[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((p[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((p[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((p[0] & 0xff00) === 0xff00) return true; // multicast
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // documentation
  if (p[0] === 0x2002) return true; // 6to4 can tunnel to private v4
  if (p[0] === 0x2001 && p[1] === 0) return true; // Teredo
  return false;
}

/** True for loopback, private, link-local, multicast, reserved and other
 * non-public destinations. Unknown formats are treated as blocked. */
export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip.replace(/^\[|\]$/g, ""));
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true;
}

/**
 * Static URL validation. Throws BlockedUrlError with a readable reason.
 * Returns the parsed URL (fragment removed) for convenience.
 */
export function validateFetchUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError(`Not a valid URL: ${raw.slice(0, 200)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError(`Only http(s) URLs can be fetched (got ${url.protocol})`);
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("URLs with embedded credentials are not allowed");
  }
  if (!ALLOWED_PORTS.has(url.port) && !privateHostsAllowed()) {
    throw new BlockedUrlError(`Port ${url.port} is not allowed (only 80, 443, 8080, 8443)`);
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new BlockedUrlError("URL has no host");
  if (!privateHostsAllowed()) {
    const bare = host.replace(/^\[|\]$/g, "");
    if (isIP(bare)) {
      if (isBlockedAddress(bare)) throw new BlockedUrlError(`Destination ${bare} is a private or reserved address`);
    } else {
      if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
        throw new BlockedUrlError(`Destination host ${host} is not a public host`);
      }
      if (!host.includes(".")) throw new BlockedUrlError(`Destination host ${host} is not a public host`);
    }
  }
  url.hash = "";
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void;

/**
 * Drop-in replacement for `dns.lookup` used by the HTTP agent: resolves
 * the name and refuses the connection if *any* returned address is
 * non-public (a mixed answer is a classic rebinding trick).
 */
export function guardedLookup(hostname: string, options: object, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = Array.isArray(addresses) ? addresses : [{ address: String(addresses), family: 4 }];
    if (!privateHostsAllowed()) {
      const bad = list.find((a) => isBlockedAddress(a.address));
      if (bad) {
        const e = new BlockedUrlError(`${hostname} resolves to a private or reserved address (${bad.address}); refusing to connect`) as NodeJS.ErrnoException;
        e.code = "ESSRFBLOCKED";
        return callback(e, []);
      }
    }
    const wantsAll = (options as { all?: boolean }).all;
    if (wantsAll) return callback(null, list);
    const first = list[0];
    if (!first) return callback(Object.assign(new Error(`No address for ${hostname}`), { code: "ENOTFOUND" }), []);
    callback(null, first.address, first.family);
  });
}

/** Removes credentials and secret-looking query parameters before a URL
 * is written to logs, errors or diagnostics. */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/(token|key|secret|password|passwd|sig|signature|auth|session|otp)/i.test(key)) url.searchParams.set(key, "REDACTED");
    }
    return url.toString();
  } catch {
    return raw.slice(0, 200);
  }
}

/**
 * "Same site" unit. Under the government zones (gov.in, nic.in) each
 * subdomain is a different body — bpsc.bihar.gov.in and bssc.bihar.gov.in
 * are separate commissions — so the whole host is the site. Elsewhere it is
 * the registrable domain, with the Indian second-level zones (co.in, ac.in,
 * org.in, …) and com.cm handled.
 */
export function siteOf(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (h.endsWith(".gov.in") || h.endsWith(".nic.in")) return h;
  const parts = h.split(".");
  const twoLevel = /^(co|ac|edu|org|net|res|ernet|mil|com)\.(in|cm|uk)$/;
  const lastTwo = parts.slice(-2).join(".");
  if (parts.length >= 3 && twoLevel.test(lastTwo)) return parts.slice(-3).join(".");
  return lastTwo;
}

export function sameSite(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname;
    const hb = new URL(b).hostname;
    return siteOf(ha) === siteOf(hb);
  } catch {
    return false;
  }
}

/** Government / public-institution suffixes the discovery workflow may
 * follow without an explicit allowlist entry. */
export const OFFICIAL_SUFFIXES = [".gov.in", ".nic.in", ".ac.in", ".edu.in", ".res.in", ".gov"];

export function isOfficialHost(host: string, extraAllowed: string[] = []): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (OFFICIAL_SUFFIXES.some((s) => h.endsWith(s))) return true;
  return extraAllowed.some((d) => {
    const dd = d.toLowerCase().trim().replace(/^www\./, "");
    return dd && (h === dd || h.endsWith("." + dd));
  });
}
