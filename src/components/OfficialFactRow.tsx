import { OfficialFact } from "@/types";
import { AlertCircle, Info } from "lucide-react";

export default function OfficialFactRow<T>({
  label,
  fact,
  format,
}: {
  label: string;
  fact: OfficialFact<T>;
  format?: (v: T) => string;
}) {
  const hasValue = fact.value !== null && fact.value !== undefined;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      {hasValue ? (
        <span className="text-sm font-semibold text-gray-900 text-right flex items-center gap-1">
          {format ? format(fact.value as T) : String(fact.value)}
          <Info size={13} className="text-amber-500 shrink-0" />
        </span>
      ) : (
        <span className="text-sm font-medium text-amber-700 text-right flex items-center gap-1">
          <AlertCircle size={13} className="shrink-0" />
          {fact.sourceNote}
        </span>
      )}
    </div>
  );
}
