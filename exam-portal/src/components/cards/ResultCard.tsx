import type { ResultSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

export function ResultCard({ result }: { result: ResultSummary }) {
  const date = formatDate(result.resultDate);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">{result.title}</h3>
      <p className="text-xs text-slate-500">{result.examTitle}</p>
      {date ? (
        <p className="mt-1 text-xs text-slate-500">Declared {date}</p>
      ) : null}
    </article>
  );
}
