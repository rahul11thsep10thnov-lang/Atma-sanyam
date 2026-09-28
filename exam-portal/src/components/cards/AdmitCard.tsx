import Link from "next/link";
import type { AdmitCardSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

/** Named `AdmitCard` per Section 33's component list — this is a UI
 * component in `src/components/cards`, unrelated to and never importing
 * the Prisma `AdmitCard` model, so the identical name doesn't collide. */
export function AdmitCard({ admitCard }: { admitCard: AdmitCardSummary }) {
  const release = formatDate(admitCard.releaseDate);
  const examDate = formatDate(admitCard.examDate);
  return (
    <Link
      href={`/admit-card/${admitCard.slug}`}
      className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600"
    >
      <h3 className="text-sm font-medium text-slate-900">
        {admitCard.title}
      </h3>
      <p className="text-xs text-slate-500">{admitCard.examTitle}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {release ? <span>Released {release}</span> : null}
        {examDate ? <span>Exam on {examDate}</span> : null}
      </div>
    </Link>
  );
}
