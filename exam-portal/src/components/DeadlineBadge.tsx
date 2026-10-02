import { deadlineInfo } from "@/lib/deadline";
import { formatDate } from "@/lib/format";

const TONE = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200",
};

/** "12 days left to apply · Apply by 16 Jan 2027" — the deadline engine's
 * output for cards and detail pages. Renders nothing misleading when the
 * date is unknown. */
export function DeadlineBadge({ endDate, withDate = true, lang = "en" }: { endDate: Date | null | undefined; withDate?: boolean; lang?: "en" | "hi" }) {
  const info = deadlineInfo(endDate);
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 rounded-md border px-2 py-0.5 text-xs font-medium ${TONE[info.tone]}`} lang={lang}>
      <span>{lang === "hi" ? info.labelHi : info.label}</span>
      {withDate && endDate ? <span className="font-normal opacity-80">· {lang === "hi" ? "अंतिम तिथि" : "Apply by"} {formatDate(endDate)}</span> : null}
    </span>
  );
}
