import Link from "next/link";
import type { RecruitmentCardData } from "@/lib/services/recruitments";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { formatDate } from "@/lib/format";

export function RecruitmentCard({ recruitment: r, lang = "en" }: { recruitment: RecruitmentCardData; lang?: "en" | "hi" }) {
  const primary = r.categories[0]?.category;
  const title = lang === "hi" && r.titleHi ? r.titleHi : r.title;
  return (
    <Link href={`/recruitments/${r.slug}`} className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600">
      <h3 className="text-sm font-medium text-slate-900" lang={lang === "hi" && r.titleHi ? "hi" : undefined}>{title}</h3>
      <p className="text-xs text-slate-500">
        {r.organization.name}
        {primary ? <> · {primary.name}</> : null}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <DeadlineBadge endDate={r.applicationEndDate} withDate={false} lang={lang} />
        {r.examDate ? <span className="text-xs text-slate-500">{lang === "hi" ? "परीक्षा" : "Exam"} {formatDate(r.examDate)}</span> : null}
      </div>
      <p className="text-[11px] text-slate-400">{r._count.notices} {lang === "hi" ? "सूचनाएँ" : `update${r._count.notices === 1 ? "" : "s"}`} · {formatDate(r.updatedAt)}</p>
    </Link>
  );
}
