import Link from "next/link";
import FigureImage from "@/components/exam/FigureImage";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export interface ResultSolution {
  id: string;
  text: string;
  options: string[];
  figure?: string | null;
  optionFigures?: (string | null)[];
  correctIndex: number;
  selected: number | null;
  explanation: string | null;
}

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
  solutions,
  note,
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
  solutions: ResultSolution[];
  note?: React.ReactNode;
}) {
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

          <div className="mt-6">
            <p className="text-sm font-bold text-gray-900 mb-3">Question-wise Solutions</p>
            <div className="space-y-4">
              {solutions.map((q, i) => {
                const isCorrect = q.selected === q.correctIndex;
                return (
                  <div key={q.id} className="card p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {i + 1}. {q.text}
                    </p>
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
          <span className="text-brand-orange">Exams</span>
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
