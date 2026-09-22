const STATUS_COLORS: Record<string, string> = {
  UPLOADED: "bg-slate-100 text-slate-700",
  EXTRACTING: "bg-amber-100 text-amber-800",
  ANALYZING: "bg-amber-100 text-amber-800",
  TRANSFORMING: "bg-amber-100 text-amber-800",
  AWAITING_REVIEW: "bg-blue-100 text-blue-800",
  GENERATING_AUDIO: "bg-amber-100 text-amber-800",
  RENDERING: "bg-amber-100 text-amber-800",
  QUALITY_CHECK: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  PASS: "bg-green-100 text-green-800",
  WARNING: "bg-amber-100 text-amber-800",
  FAIL: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  return <span className={`badge ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
