import { NextResponse } from "next/server";
import { LANG_COOKIE } from "@/lib/i18n/lang";

/** GET /lang/hi?to=/recruitments — remembers the language and goes back.
 * Only same-site paths are accepted as the return target. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lang = code === "hi" ? "hi" : "en";
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? "/";
  const safe = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  // Strip any explicit ?lang= so the cookie takes effect.
  const target = new URL(safe, url.origin);
  target.searchParams.delete("lang");
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
