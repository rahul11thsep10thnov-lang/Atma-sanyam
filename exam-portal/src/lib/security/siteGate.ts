/**
 * Private-preview gate. When SITE_ACCESS_PASSWORD is set, the public site
 * asks for that password (HTTP Basic auth, any user name) and tells search
 * engines to stay away. Unset → the site is public and nothing changes.
 *
 * Not gated, on purpose: /admin (it has its own login), server-to-server
 * calls that carry their own secret (payment webhook, the cron route), and
 * robots.txt (which says "disallow everything" while the gate is on).
 */
const OPEN_PREFIXES = ["/admin", "/api/payments/razorpay/webhook", "/api/admin/pipeline/run", "/robots.txt"];

export function isGateEnabled(password = process.env.SITE_ACCESS_PASSWORD): boolean {
  return !!password && password.length > 0;
}

/** Compares without bailing out at the first different character. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function checkSiteGate(input: { pathname: string; authorization: string | null; password: string | undefined }): "allow" | "challenge" {
  const { pathname, authorization, password } = input;
  if (!isGateEnabled(password)) return "allow";
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "allow";
  if (!authorization?.startsWith("Basic ")) return "challenge";
  let decoded = "";
  try {
    decoded = atob(authorization.slice(6).trim());
  } catch {
    return "challenge";
  }
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  return safeEqual(supplied, password!) ? "allow" : "challenge";
}
