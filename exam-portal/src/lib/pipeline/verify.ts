import { prisma } from "@/lib/db/prisma";
import { checkSource } from "./sourceCheck";
import type { FetchOptions } from "./http";
import { siteOf } from "./netguard";

export interface VerificationResult {
  sourceId: string;
  name: string;
  url: string;
  status: "VERIFIED" | "FAILED" | "UNVERIFIED";
  httpStatus: number | null;
  finalUrl: string | null;
  candidates: number;
  robots: string;
  note: string;
  sample: Array<{ title: string; url: string }>;
}

/**
 * Verifies that a source's URL is reachable, really is the intended
 * official site, is allowed by robots.txt, and yields notices with its
 * parser configuration. Nothing is stored except the verification fields;
 * nothing is enabled — enabling stays an admin decision.
 *
 *  - VERIFIED: HTTP 2xx, final URL on the configured official domain's
 *    site, robots allows, at least one candidate parsed.
 *  - FAILED: any of those not met; the note says which.
 *  - Aggregators stay UNVERIFIED after a technically successful check
 *    until an admin confirms the site's terms permit automated access
 *    (`termsReviewedBy`), because reachability says nothing about terms.
 */
export async function verifySource(
  sourceId: string,
  opts: { fetchOptions?: FetchOptions; termsReviewedBy?: string | null } = {},
): Promise<VerificationResult> {
  const source = await prisma.source.findUniqueOrThrow({ where: { id: sourceId } });
  const r = await checkSource(sourceId, { dryRun: true, force: true, fetchOptions: opts.fetchOptions });
  const out: VerificationResult = {
    sourceId,
    name: source.name,
    url: source.listingUrl,
    status: "FAILED",
    httpStatus: r.httpStatus,
    finalUrl: r.finalUrl,
    candidates: r.itemsFound,
    robots: r.robotsStatus,
    note: "",
    sample: r.candidates.slice(0, 5).map((c) => ({ title: c.title.slice(0, 120), url: c.url })),
  };

  const official = source.officialDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const finalHost = r.finalUrl ? new URL(r.finalUrl).hostname : null;
  if (r.error && r.outcome !== "OK") {
    out.note = `${r.outcome}: ${r.error}`;
  } else if (finalHost && siteOf(finalHost) !== siteOf(official)) {
    // Never silently accept a different (possibly look-alike) domain.
    out.note = `Final URL is on ${finalHost}, not on the configured official domain ${official}. Check which site is intended before approving.`;
  } else if (r.itemsFound === 0) {
    out.note = "Reachable, but no notice links were parsed. Adjust the parser configuration or listing URL.";
  } else if (source.isAggregator && !opts.termsReviewedBy) {
    out.status = "UNVERIFIED";
    out.note = `Reachable and parseable (${r.itemsFound} items, HTTP ${r.httpStatus}). Aggregator: an admin must review the site's published terms of use and confirm before it can be enabled.`;
  } else {
    out.status = "VERIFIED";
    out.note = `Reachable (HTTP ${r.httpStatus}), on ${finalHost ?? official}, robots: ${r.robotsStatus}; ${r.itemsFound} notice links parsed.${opts.termsReviewedBy ? " Terms of use reviewed by an admin." : ""}`;
  }

  await prisma.source.update({
    where: { id: sourceId },
    data: { verificationStatus: out.status, verificationNote: out.note.slice(0, 1000), lastVerifiedAt: new Date(), robotsStatus: r.robotsStatus || undefined },
  });
  return out;
}
