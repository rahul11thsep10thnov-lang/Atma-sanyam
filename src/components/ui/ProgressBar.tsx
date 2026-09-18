import { cn } from "@/lib/utils";

export default function ProgressBar({
  value,
  max = 100,
  label,
  tone = "navy",
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "navy" | "green" | "gold" | "red";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor =
    tone === "green"
      ? "bg-brand-green"
      : tone === "gold"
        ? "bg-brand-gold"
        : tone === "red"
          ? "bg-brand-red"
          : "bg-brand-navy";

  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs font-medium text-gray-600">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
