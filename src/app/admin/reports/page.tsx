"use client";

import { useEffect, useState } from "react";
import { QuestionReport } from "@/types";
import { getAdminQuestions, getQuestionReports, updateReportStatus } from "@/lib/localStore";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  wrong_answer: "Wrong Answer",
  wrong_question: "Wrong Question",
  poor_explanation: "Poor Explanation",
  out_of_syllabus: "Out of Syllabus",
  too_difficult: "Too Difficult",
  other: "Other",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Hydrate from the browser-only localStorage admin store after mount.
    const qs = getAdminQuestions();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReports(getQuestionReports());
     
    setQuestionMap(Object.fromEntries(qs.map((q) => [q.id, q.question])));
  }, []);

  function setStatus(id: string, status: QuestionReport["status"]) {
    updateReportStatus(id, status);
    setReports(getQuestionReports());
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Question Reports</h2>
      <p className="text-xs text-gray-500 mb-4">
        Users dwara &quot;Report Question&quot; button se submit ki gayi reports.
      </p>

      {reports.length === 0 ? (
        <p className="text-sm text-gray-500">Abhi koi report nahi hai.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <Badge tone="red">{REASON_LABELS[r.reason]}</Badge>
                <span className="text-[11px] text-gray-400">{formatDate(r.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-gray-800">
                {questionMap[r.questionId] ?? r.questionId}
              </p>
              {r.note && <p className="text-xs text-gray-500 mt-1">{r.note}</p>}
              <div className="mt-2 flex gap-1.5">
                {(["open", "reviewed", "dismissed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r.id, s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                      r.status === s ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
