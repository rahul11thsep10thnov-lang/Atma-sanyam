"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import FigureImage from "@/components/exam/FigureImage";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowLeft, Bookmark, Clock } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/localStore";

export interface ResultSolution {
  id: string;
  text: string;
  options: string[];
  figure?: string | null;
  optionFigures?: (string | null)[];
  correctIndex: number;
  selected: number | null;
  explanation: string | null;
  /** Seconds spent on this question, when known. */
  seconds?: number | null;
}

export interface ResultTopic {
  label: string;
  correct: number;
  incorrect: number;
  total: number;
}

type Filter = "all" | "incorrect" | "skipped" | "correct";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));

/** Result screen after a test: score, accuracy, subject breakdown and
 * question-wise solutions. Pure display — the numbers are passed in. */
export default function ExamResult({
  title,
  exitHref,
  retryHref,
  score,
  maxScore,
  accuracy,
  percentage,
  timeTaken,
  correct,
  incorrect,
  skipped,
  subjects,
  topics,
  solutions,
  note,
  negativeMarksLost,
  averageSeconds,
}: {
  title: string;
  exitHref: string;
  retryHref: string;
  score: number;
  maxScore?: number;
  /** Correct ÷ attempted, 0–100. */
  accuracy: number;
  /** Score ÷ max score, 0–100. */
  percentage: number;
  timeTaken: number;
  correct: number;
  incorrect: number;
  skipped: number;
  subjects: { label: string; correct: number; total: number }[];
  /** Chapter-wise breakdown; the weakest chapters are listed first. */
  topics?: ResultTopic[];
  solutions: ResultSolution[];
  note?: React.ReactNode;
  negativeMarksLost?: number;
  averageSeconds?: number | null;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const status = (q: ResultSolution): Exclude<Filter, "all"> =>
    q.selected == null ? "skipped" : q.selected === q.correctIndex ? "correct" : "incorrect";
  const counts = useMemo(() => {
    const c = { all: solutions.length, incorrect: 0, skipped: 0, correct: 0 };
    for (const q of solutions) c[status(q)]++;
    return c;
  }, [solutions]);
  const shown = solutions.map((q, i) => ({ q, i })).filter(({ q }) => filter === "all" || status(q) === filter);
  const weak = useMemo(
    () =>
      (topics ?? [])
        .filter((t) => t.total > 0)
        .map((t) => ({ ...t, pct: Math.round((t.correct / t.total) * 100) }))
        .sort((a, b) => a.pct - b.pct || b.total - a.total),
    [topics]
  );
  const bookmarked = (id: string) => marks[id] ?? isBookmarked(id);
  return (
      <div className="exam-shell min-h-dvh bg-gray-50">
        <ExamTopBar exitHref={exitHref} />
        <div className="container-page py-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">{title} — Result</h1>
          <div className="card p-5 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Stat label="Score" value={maxScore ? `${fmt(score)}/${fmt(maxScore)}` : fmt(score)} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Time Taken" value={`${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`} />
            <Stat label="Percentage" value={`${Math.round(percentage)}%`} />
          </div>
          {note}
          <div className="card p-5 mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Correct" value={String(correct)} tone="text-brand-green" />
            <Stat label="Incorrect" value={String(incorrect)} tone="text-brand-red" />
            <Stat label="Skipped" value={String(skipped)} tone="text-gray-500" />
          </div>
          {(negativeMarksLost !== undefined || averageSeconds != null) && (
            <div className="card p-5 mt-4 grid grid-cols-2 gap-3 text-center">
              <Stat label="Negative marks" value={negativeMarksLost ? `−${fmt(negativeMarksLost)}` : "0"} tone={negativeMarksLost ? "text-brand-red" : "text-gray-500"} />
              <Stat label="Avg time / answered" value={averageSeconds != null ? `${Math.round(averageSeconds)}s` : "—"} />
            </div>
          )}

          <div className="card p-5 mt-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Subject-wise Performance</p>
            <div className="space-y-2">
              {subjects.map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.label}</span>
                  <span className="font-medium text-gray-900">
                    {s.correct}/{s.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {weak.length > 0 && (
            <div className="card p-5 mt-4">
              <p className="text-sm font-bold text-gray-900 mb-1">Chapter-wise Performance</p>
              <p className="mb-3 text-xs text-gray-500">Kamzor chapters upar — inki practice pehle karein.</p>
              <div className="space-y-2.5">
                {weak.map((t) => (
                  <div key={t.label} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-gray-700">{t.label}</span>
                      <span className="shrink-0 font-medium text-gray-900">
                        {t.correct}/{t.total} · {t.pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn("h-full rounded-full", t.pct >= 70 ? "bg-green-500" : t.pct >= 40 ? "bg-amber-400" : "bg-red-500")}
                        style={{ width: `${Math.max(4, t.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm font-bold text-gray-900 mb-3">Question-wise Solutions</p>
            <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter solutions">
              {(["all", "incorrect", "skipped", "correct"] as const).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-display text-[13px] font-semibold",
                    filter === f ? "border-brand-dark bg-brand-dark text-white" : "border-gray-200 bg-white text-slate-600"
                  )}
                >
                  {{ all: "Sabhi", incorrect: "Galat", skipped: "Chhode", correct: "Sahi" }[f]} ({counts[f]})
                </button>
              ))}
            </div>
            {shown.length === 0 && <p className="card p-4 text-sm text-gray-500">Is filter mein koi question nahi.</p>}
            <div className="space-y-4">
              {shown.map(({ q, i }) => {
                const isCorrect = q.selected === q.correctIndex;
                return (
                  <div key={q.id} className="card p-4">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
                        {i + 1}. {q.text}
                      </p>
                      <button
                        onClick={() => {
                          // Side effect outside the state updater (React may run updaters twice).
                          const on = toggleBookmark(q.id);
                          setMarks((m) => ({ ...m, [q.id]: on }));
                        }}
                        aria-pressed={bookmarked(q.id)}
                        aria-label={bookmarked(q.id) ? "Bookmark hatayein" : "Bookmark karein"}
                        className="-m-1 shrink-0 p-1"
                      >
                        <Bookmark size={18} className={bookmarked(q.id) ? "fill-brand-orange text-brand-orange" : "text-gray-400"} />
                      </button>
                    </div>
                    {q.seconds != null && q.seconds > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[12px] text-gray-500">
                        <Clock size={12} /> {q.seconds}s
                      </p>
                    )}
                    {q.figure && <FigureImage svg={q.figure} alt={`Question ${i + 1} figure`} className="mt-2 w-full max-w-[min(100%,560px)] rounded-md border border-gray-100" />}
                    <div className={cn("mt-2", q.optionFigures?.some(Boolean) ? "grid grid-cols-2 gap-1.5 sm:grid-cols-4" : "space-y-1.5")}>
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            oi === q.correctIndex
                              ? "border-green-500 bg-green-50"
                              : oi === q.selected
                                ? "border-red-500 bg-red-50"
                                : "border-gray-100"
                          )}
                        >
                          {oi === q.correctIndex && <CheckCircle2 size={14} className="text-green-600 shrink-0" />}
                          {oi === q.selected && oi !== q.correctIndex && <XCircle size={14} className="text-red-600 shrink-0" />}
                          {q.optionFigures?.[oi] ? (
                            <FigureImage svg={q.optionFigures[oi]!} alt={`Option ${String.fromCharCode(65 + oi)}`} className="w-full max-w-[110px]" />
                          ) : (
                            <span>{opt}</span>
                          )}
                          {!isCorrect && q.selected == null && oi === q.correctIndex && (
                            <span className="text-[11px] text-gray-400 ml-auto">Skipped</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.explanation && <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-md p-2">{q.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pb-8">
            <Link href={retryHref} className="exam-btn exam-btn-secondary flex-1 py-3 text-sm text-center">
              Retry Test
            </Link>
            <Link href={exitHref} className="exam-btn exam-btn-primary flex-1 py-3 text-sm text-center">
              Sabhi Mock Tests
            </Link>
          </div>
        </div>
      </div>
    );
}

function ExamTopBar({ exitHref }: { exitHref: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-white">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href={exitHref} className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-slate-600 hover:text-brand-dark">
          <ArrowLeft size={18} /> Mock Tests
        </Link>
        <span className="font-display text-lg font-extrabold">
          <span className="text-brand-dark">Police</span>
          <span className="text-brand-orange">Chayan</span>
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className={cn("font-display text-2xl font-bold", tone ?? "text-brand-dark")}>{value}</p>
      <p className="mt-0.5 font-display text-[13px] text-slate-500">{label}</p>
    </div>
  );
}
