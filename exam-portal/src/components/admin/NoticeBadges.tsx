import type { NoticePriority, NoticeStatus, NoticeType } from "@/generated/prisma/enums";

const STATUS: Record<NoticeStatus, string> = {
  NEW: "bg-slate-100 text-slate-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-800",
  AUTO_APPROVED: "bg-teal-100 text-teal-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-700",
  DUPLICATE: "bg-purple-100 text-purple-800",
  FAILED: "bg-red-100 text-red-700",
};
const PRIORITY: Record<NoticePriority, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-100 text-orange-800",
  NORMAL: "bg-slate-100 text-slate-600",
  LOW: "bg-slate-50 text-slate-400",
};

const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function NoticeStatusBadge({ status }: { status: NoticeStatus }) {
  return <span className={`${pill} ${STATUS[status]}`}>{status.replace(/_/g, " ")}</span>;
}

export function NoticeTypeBadge({ type }: { type: NoticeType }) {
  return <span className={`${pill} border border-slate-200 bg-white text-slate-700`}>{type.replace(/_/g, " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: NoticePriority }) {
  return <span className={`${pill} ${PRIORITY[priority]}`}>{priority}</span>;
}

export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <span className="inline-flex items-center gap-2" title={`${pct}% confidence`}>
      <span className="h-1.5 w-16 overflow-hidden rounded bg-slate-200">
        <span className={`block h-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs text-slate-600">{pct}%</span>
    </span>
  );
}
