import type { AnswerKeySummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

export function AnswerKeyCard({ answerKey }: { answerKey: AnswerKeySummary }) {
  const date = formatDate(answerKey.answerKeyDate);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">
        {answerKey.title}
      </h3>
      <p className="text-xs text-slate-500">{answerKey.examTitle}</p>
      {date ? (
        <p className="mt-1 text-xs text-slate-500">Released {date}</p>
      ) : null}
    </article>
  );
}
