import Link from "next/link";
import { formatDate } from "@/lib/format";
import { deadlineInfo } from "@/lib/deadline";

export interface NoticeListItem {
  href: string;
  title: string;
  subtitle?: string | null;
  date?: Date | null;
  dateLabel?: string;
  deadline?: Date | null;
}

/** Full-width list of links, newest first (the caller passes them sorted). */
export function NoticeList({ items, empty }: { items: NoticeListItem[]; empty: string }) {
  if (items.length === 0) return <p className="rounded-xl border border-orange-200 bg-white/85 px-4 py-8 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="flex w-full flex-col divide-y divide-orange-100 overflow-hidden rounded-xl border border-orange-200 bg-white/90">
      {items.map((it) => {
        const d = it.deadline !== undefined ? deadlineInfo(it.deadline) : null;
        return (
          <li key={it.href}>
            <Link href={it.href} className="group flex w-full flex-col gap-1 px-4 py-3 hover:bg-orange-50 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <span className="flex-1">
                <span className="block text-base font-semibold text-[#4a220a] group-hover:underline">{it.title}</span>
                {it.subtitle ? <span className="block text-xs text-slate-500">{it.subtitle}</span> : null}
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-slate-600">
                {d && d.state !== "unknown" ? <span className={`rounded-md border px-2 py-0.5 font-medium ${d.tone === "red" ? "border-red-200 bg-red-50 text-red-700" : d.tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" : d.tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{d.label}</span> : null}
                {it.date ? <span>{it.dateLabel ?? "Posted"} {formatDate(it.date)}</span> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
