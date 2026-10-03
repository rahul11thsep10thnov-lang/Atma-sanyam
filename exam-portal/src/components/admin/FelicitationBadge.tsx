import type { FelicitationStatus } from "@/generated/prisma/enums";

const C: Record<FelicitationStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PAYMENT_PENDING: "bg-slate-100 text-slate-700",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
  PAID_PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  SCHEDULED: "bg-indigo-100 text-indigo-800",
  BROADCASTING: "bg-emerald-100 text-emerald-800",
  PAUSED: "bg-purple-100 text-purple-800",
  EXPIRED: "bg-slate-200 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
};
export function FelicitationBadge({ status }: { status: FelicitationStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${C[status]}`}>{status.replace(/_/g, " ")}</span>;
}
