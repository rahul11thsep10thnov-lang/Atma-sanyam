import type { ExamSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

export function ExamCard({ exam }: { exam: ExamSummary }) {
  const deadline = formatDate(exam.applicationEndDate);
  const examDate = formatDate(exam.examDate);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">{exam.title}</h3>
      <p className="text-xs text-slate-500">{exam.organizationName}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {deadline ? (
          <span className="font-medium text-brand-700">
            Apply by {deadline}
          </span>
        ) : null}
        {examDate ? <span>Exam on {examDate}</span> : null}
      </div>
    </article>
  );
}
