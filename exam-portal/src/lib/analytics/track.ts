import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";

/**
 * Records that a piece of published content was viewed (Section 17/29).
 * Deliberately minimal: no IP address, no user agent, no cookie/session
 * id, and only a referrer *hostname* (never the full URL, which can
 * carry query strings/PII from the referring page) — enough to rank
 * popular content, not enough to reconstruct who looked at it.
 *
 * Called directly from a public detail page's Server Component render,
 * not from client JS — so it also captures visitors with JavaScript
 * disabled, and never adds a network round trip. Failures are swallowed
 * (logged, never thrown) so a database hiccup here can never break a
 * page that would otherwise render fine.
 */
export async function recordView(contentType: string, contentId: string, path: string) {
  try {
    const headerList = await headers();
    const referrer = headerList.get("referer");
    let referrerHost: string | null = null;
    if (referrer) {
      try {
        referrerHost = new URL(referrer).hostname;
      } catch {
        referrerHost = null;
      }
    }
    await prisma.contentViewEvent.create({
      data: { contentType, contentId, path, referrerHost },
    });
  } catch (err) {
    console.error("Failed to record content view:", err);
  }
}
