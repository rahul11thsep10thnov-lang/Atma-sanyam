// URL normalisation. Two URLs that name the same page must produce the same
// canonical string, so a source can never be registered twice.
const TRACKING = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i;

export function canonicalizeUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  u.protocol = 'https:'; // sources are https-only; http and https are the same source
  u.hash = '';
  u.username = '';
  u.password = '';
  if (u.port === '443' || u.port === '80') u.port = '';
  let host = u.hostname.toLowerCase();
  if (host.startsWith('www.')) host = host.slice(4);
  u.hostname = host;
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  let path = u.pathname.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  u.pathname = path;
  const query = u.searchParams.toString();
  // Host is case-insensitive; paths are not (wiki titles are case-sensitive).
  return `https://${u.host}${path === '/' ? '' : path}${query ? `?${query}` : ''}`;
}

/** The registrable-looking host used for allow-listing: lower-case, no leading www. */
export function hostOf(input: string): string | null {
  try {
    const h = new URL(input).hostname.toLowerCase();
    return h.startsWith('www.') ? h.slice(4) : h;
  } catch {
    return null;
  }
}
