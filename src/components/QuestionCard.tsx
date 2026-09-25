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
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white px-4 py-1.5 font-display text-[15px] font-semibold uppercase tracking-wider text-brand-dark">
          Question <span className="text-brand-orange">{index + 1}</span> of {total}
        </span>
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            aria-label={bookmarked ? "Remove saved question" : "Save question"}
            aria-pressed={!!bookmarked}
            className="exam-btn exam-btn-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px]"
          >
            <Star size={15} className="text-amber-500" fill={bookmarked ? "currentColor" : "none"} />
            {bookmarked ? "Saved" : "Save"}
          </button>
        )}
      </div>
      <div className="mt-3 rounded-3xl border border-[var(--card-border)] bg-white p-5">
        <p className="rounded-r-2xl border-l-4 border-brand-orange bg-[#f6f8fc] px-4 py-3.5 font-display text-[19px] font-medium leading-relaxed text-brand-dark">
          {question.question}
        </p>
      </div>
      <div className="mt-4 space-y-3" role="radiogroup" aria-label="Options">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctAnswer;
          const isSelected = i === selected;
          let box = "border-[var(--card-border)] bg-white hover:border-brand-orange/40";
          let tile = "bg-[#f1f4f9] text-slate-600";
          if (revealed) {
            if (isCorrect) {
              box = "border-brand-green bg-brand-green-light";
              tile = "bg-brand-green text-white";
            } else if (isSelected) {
              box = "border-brand-red bg-brand-red-light";
              tile = "bg-brand-red text-white";
            } else {
              box = "border-[var(--card-border)] bg-white opacity-60";
            }
          } else if (isSelected) {
            box = "border-brand-orange bg-[#fff6ee]";
            tile = "bg-brand-orange text-white";
          }
          return (
            <button
              key={i}
              role="radio"
              aria-checked={isSelected}
              disabled={revealed}
              onClick={() => onSelect(i)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border-[1.5px] px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange",
                box
              )}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-[17px] font-bold", tile)}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 font-display text-[18px] text-brand-dark">{opt}</span>
              {revealed && isCorrect && <CheckCircle2 size={20} className="shrink-0 text-brand-green" />}
              {revealed && isSelected && !isCorrect && <XCircle size={20} className="shrink-0 text-brand-red" />}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-4 rounded-2xl border border-[#c6dcf8] bg-[#eff6ff] p-4">
          <p className="eyebrow mb-1 text-[#1d64c4]">Explanation</p>
          <p className="text-[16px] leading-relaxed text-slate-700">{question.explanation}</p>
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
