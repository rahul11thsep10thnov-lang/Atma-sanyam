import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { checkSiteGate, isGateEnabled } from "@/lib/security/siteGate";

/**
 * 1. `/admin/*` (except the login page): redirect signed-out visitors to the
 *    login page before anything renders. A UX layer only — every admin
 *    Server Component/Action/API route still calls `requireAdmin` itself.
 * 2. Everything else: when SITE_ACCESS_PASSWORD is set, the whole public
 *    site sits behind that password and is marked noindex (private preview).
 */
const adminAuth = withAuth({ pages: { signIn: "/admin/login" } });

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login"))) {
    // withAuth's types expect NextRequestWithAuth; the request is the same object.
    return (adminAuth as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response> | Response)(req, event);
  }
  const verdict = checkSiteGate({ pathname, authorization: req.headers.get("authorization"), password: process.env.SITE_ACCESS_PASSWORD });
  if (verdict === "challenge") {
    return new NextResponse("This site is a private preview. Enter the access password.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Naukri Chayan preview", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" },
    });
  }
  const res = NextResponse.next();
  if (isGateEnabled()) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
