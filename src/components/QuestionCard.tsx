"use client";

import { useState } from "react";
import { Question, ReportReason } from "@/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Star, Flag } from "lucide-react";
import { addQuestionReport } from "@/lib/localStore";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "wrong_answer", label: "Wrong Answer" },
  { value: "wrong_question", label: "Wrong Question" },
  { value: "poor_explanation", label: "Poor Explanation" },
  { value: "out_of_syllabus", label: "Out of Syllabus" },
  { value: "too_difficult", label: "Too Difficult" },
  { value: "other", label: "Other" },
];

export default function QuestionCard({
  question,
  index,
  total,
  selected,
  onSelect,
  revealed,
  bookmarked,
  onToggleBookmark,
}: {
  question: Question;
  index: number;
  total: number;
  selected: number | null;
  onSelect: (i: number) => void;
  revealed: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500">
          Question {index + 1} / {total}
        </p>
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            aria-label="Save Question"
            className="text-amber-500"
          >
            <Star size={18} fill={bookmarked ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <p className="mt-2 text-base font-semibold text-gray-900 leading-relaxed">
        {question.question}
      </p>
      <div className="mt-4 space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctAnswer;
          const isSelected = i === selected;
          let style =
            "border-gray-200 hover:border-brand-navy hover:bg-blue-50/50";
          if (revealed) {
            if (isCorrect) style = "border-green-500 bg-green-50";
            else if (isSelected && !isCorrect) style = "border-red-500 bg-red-50";
            else style = "border-gray-200 opacity-70";
          } else if (isSelected) {
            style = "border-brand-navy bg-blue-50";
          }
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => onSelect(i)}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-sm font-medium text-gray-800 transition-colors",
                style
              )}
            >
              <span>{opt}</span>
              {revealed && isCorrect && <CheckCircle2 size={18} className="text-green-600 shrink-0" />}
              {revealed && isSelected && !isCorrect && <XCircle size={18} className="text-red-600 shrink-0" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Explanation</p>
          <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        {reported ? (
          <span className="text-xs text-brand-green font-medium">Report submit ho gayi, dhanyavaad!</span>
        ) : reportOpen ? (
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  addQuestionReport(question.id, r.value);
                  setReported(true);
                  setReportOpen(false);
                }}
                className="rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600 hover:border-brand-red hover:text-brand-red"
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-red"
          >
            <Flag size={12} /> Report Question
          </button>
        )}
      </div>
    </div>
  );
}
