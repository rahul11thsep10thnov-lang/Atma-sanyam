import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { VerificationStatus } from "@/lib/master/generation/types";

const STYLES: Record<VerificationStatus, string> = {
  VERIFIED: "bg-forest-100 text-forest-700",
  PARTIAL: "bg-saffron-100 text-saffron-700",
  UNVERIFIED: "bg-terracotta-100 text-terracotta-700",
  NO_DATA: "bg-charcoal/10 text-charcoal-light"
};

/** Shows how much of a section's data has been checked against an official source. Never hidden: unverified data says so. */
export function VerificationBadge({ status, ui }: { status: VerificationStatus; ui: Dictionary["common"]["ui"] }) {
  const label = { VERIFIED: ui.verifiedBadge, PARTIAL: ui.partialBadge, UNVERIFIED: ui.draftBadge, NO_DATA: ui.noDataBadge }[status];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLES[status]}`}>{label}</span>;
}
