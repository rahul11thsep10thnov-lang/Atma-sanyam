"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import QuestionPalette, { PaletteEntry, QuestionStatus } from "@/components/exam/QuestionPalette";
import ExamBottomSheet from "@/components/exam/ExamBottomSheet";
import { CheckCircle2, Flag, Clock, ArrowLeft, LayoutGrid, X } from "lucide-react";

export interface RunnerQuestion {
  id: string;
  /** Groups questions into the subject tabs. */
  subjectKey: string;
  subjectLabel: string;
  text: string;
  options: string[];
}

export interface RunnerAnswer {
  selected: number | null;
  marked: boolean;
  visited: boolean;
}

export type RunnerAnswers = Record<string, RunnerAnswer>;

function questionStatus(a: RunnerAnswer | undefined): QuestionStatus {
  if (!a || !a.visited) return "not-visited";
  const answered = a.selected !== null && a.selected !== undefined;
  if (answered && a.marked) return "answered-marked";
  if (answered) return "answered";
  if (a.marked) return "marked";
  return "skipped";
}

/**
 * The live test screen: one continuous timer (auto-submits at zero),
 * subject tabs, palette, mark-for-review and keyboard shortcuts. It only
 * collects answers — scoring is done by whoever handles `onSubmit`
 * (the API for published tests, the browser for the built-in demo tests).
 */
export default function ExamRunner({
  title,
  exitHref,
  questions,
  initialSeconds,
  initialAnswers,
  onAnswersChange,
  onSubmit,
  locked = false,
}: {
  title: string;
  exitHref: string;
  questions: RunnerQuestion[];
  initialSeconds: number;
  initialAnswers?: RunnerAnswers;
  onAnswersChange?: (answers: RunnerAnswers) => void;
  onSubmit: (answers: RunnerAnswers) => void;
  /** True while a submission is in flight: the timer stops and submit is disabled. */
  locked?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<RunnerAnswers>(() => {
    const first = questions[0];
    const base = initialAnswers ?? {};
    return first && !base[first.id]?.visited
      ? { ...base, [first.id]: { ...(base[first.id] ?? { selected: null, marked: false }), visited: true } }
      : base;
  });
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, Math.floor(initialSeconds)));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (locked) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [locked]);

  useEffect(() => {
    onAnswersChange?.(answers);
  }, [answers, onAnswersChange]);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current || locked) return;
    submittedRef.current = true;
    onSubmit(answers);
  }, [answers, locked, onSubmit]);

  // A failed submission unlocks the runner so it can be tried again.
  useEffect(() => {
    if (!locked) submittedRef.current = false;
  }, [locked]);

  useEffect(() => {
    if (secondsLeft === 0) handleSubmit();
  }, [secondsLeft, handleSubmit]);

  const current = questions[index];

  const updateAnswer = useCallback((qid: string, patch: Partial<RunnerAnswer>) => {
    setAnswers((prev) => {
      const base: RunnerAnswer = prev[qid] ?? { selected: null, marked: false, visited: false };
      return { ...prev, [qid]: { ...base, ...patch } };
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= questions.length) return;
      setIndex(i);
      updateAnswer(questions[i].id, { visited: true });
      setPaletteOpen(false);
    },
    [questions, updateAnswer]
  );

  // Keyboard shortcuts: 1-4 select an option, arrows move between
  // questions, M toggles mark-for-review, C clears the current answer.
  useEffect(() => {
    if (locked || !current) return;
    function handleKey(e: KeyboardEvent) {
      if (!current) return;
      if (["1", "2", "3", "4"].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (i < current.options.length) updateAnswer(current.id, { selected: i, visited: true });
      } else if (e.key === "ArrowRight") {
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        goTo(index - 1);
      } else if (e.key.toLowerCase() === "m") {
        const a = answers[current.id];
        updateAnswer(current.id, { marked: !a?.marked, visited: true });
      } else if (e.key.toLowerCase() === "c") {
        updateAnswer(current.id, { selected: null });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [locked, current, index, answers, updateAnswer, goTo]);

  if (!current) return null;

  const answeredCount = Object.values(answers).filter((a) => a.selected !== null && a.selected !== undefined).length;
  const markedCount = Object.values(answers).filter((a) => a.marked).length;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerState = secondsLeft < 60 ? "critical" : secondsLeft < 300 ? "warning" : "normal";
  const currentAnswer = answers[current.id];
  const isLast = index + 1 >= questions.length;

  const paletteEntries: PaletteEntry[] = questions.map((q) => ({
    id: q.id,
    status: questionStatus(answers[q.id]),
  }));

  // Subjects in first-appearance order, shown as tabs. This is one
  // continuous timer for the whole test: tabs are a navigation aid, not
  // separately timed or locked sections.
  const subjects = Array.from(new Set(questions.map((q) => q.subjectKey)));
  const { context, ask } = splitQuestion(current.text);

  const paletteProps = {
    entries: paletteEntries,
    currentIndex: index,
    onJump: goTo,
    answeredCount,
    markedCount,
    totalCount: questions.length,
  };

  return (
    <div className="exam-shell min-h-dvh">
      {/* Top bar: exit · title · timer · palette */}
      <div className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-5">
          <Link
            href={exitHref}
            aria-label="Exit test"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold text-brand-dark">{title}</p>
            <p className="font-display text-[13px] text-slate-500">
              {answeredCount}/{questions.length} answered
            </p>
          </div>
          <div
            role="timer"
            aria-live="off"
            aria-label={`Time remaining ${minutes} minutes ${seconds} seconds`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 font-display text-[17px] font-bold tabular-nums",
              timerState === "critical" && "border-brand-red bg-brand-red-light text-brand-red motion-safe:animate-pulse",
              timerState === "warning" && "border-[#f5dd9a] bg-[#fffaeb] text-[#a16207]",
              timerState === "normal" && "border-[var(--card-border)] bg-[#f8faff] text-brand-dark"
            )}
          >
            <Clock size={16} />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Open question palette"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--card-border)] text-brand-dark lg:hidden"
          >
            <LayoutGrid size={20} />
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 font-display text-[11px] font-bold text-white">
              {answeredCount}
            </span>
          </button>
        </div>

        {/* Subject tabs */}
        <div className="border-b border-[var(--card-border)]">
          <div className="no-scrollbar mx-auto flex max-w-6xl overflow-x-auto px-1 sm:px-3" role="tablist" aria-label="Subjects">
            {subjects.map((subj) => {
              const qs = questions.filter((q) => q.subjectKey === subj);
              const done = qs.filter((q) => answers[q.id]?.selected !== null && answers[q.id]?.selected !== undefined).length;
              const active = subj === current.subjectKey;
              return (
                <button
                  key={subj}
                  role="tab"
                  aria-selected={active}
                  onClick={() => goTo(questions.findIndex((q) => q.subjectKey === subj))}
                  className={cn(
                    "relative flex shrink-0 flex-col items-center gap-1.5 px-4 pt-2 pb-3",
                    active ? "text-brand-orange" : "text-slate-400"
                  )}
                >
                  <span className="whitespace-nowrap font-display text-[16px] font-medium">
                    {qs[0]?.subjectLabel ?? subj}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-display text-[13px] font-semibold tabular-nums",
                      active ? "bg-brand-orange-light text-brand-orange" : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {done}/{qs.length}
                  </span>
                  <span className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-brand-orange transition-all"
                      style={{ width: `${(done / qs.length) * 100}%` }}
                    />
                  </span>
                  {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-brand-orange" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col px-3 pt-4 sm:px-5 lg:flex-row lg:items-start lg:gap-6 lg:pt-6">
        {/* Question column */}
        <div className="min-w-0 flex-1 pb-40 lg:pb-8">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-white px-4 py-1.5 font-display text-[15px] font-semibold uppercase tracking-wider text-brand-dark">
              Question <span className="text-brand-orange">{index + 1}</span> of {questions.length}
            </span>
            <button
              onClick={() => updateAnswer(current.id, { marked: !currentAnswer?.marked, visited: true })}
              aria-pressed={!!currentAnswer?.marked}
              className={cn(
                "exam-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px]",
                currentAnswer?.marked ? "exam-btn-marked" : "exam-btn-ghost"
              )}
            >
              <Flag size={15} fill={currentAnswer?.marked ? "currentColor" : "none"} />
              {currentAnswer?.marked ? "Marked" : "Mark for Review"}
            </button>
          </div>

          <div className="mt-3 rounded-3xl border border-[var(--card-border)] bg-white p-5 sm:p-6">
            {context && (
              <p className="mb-4 font-display text-[19px] leading-relaxed text-slate-700">{context}</p>
            )}
            <p
              id="question-text"
              className="rounded-r-2xl border-l-4 border-brand-orange bg-[#f6f8fc] px-4 py-3.5 font-display text-[19px] font-medium leading-relaxed text-brand-dark"
            >
              {ask}
            </p>
          </div>

          <div role="radiogroup" aria-labelledby="question-text" className="mt-4 space-y-3">
            {current.options.map((opt, i) => {
              const selected = currentAnswer?.selected === i;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => updateAnswer(current.id, { selected: i, visited: true })}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border-[1.5px] bg-white px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange",
                    selected ? "border-brand-orange bg-[#fff6ee]" : "border-[var(--card-border)] hover:border-brand-orange/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-[17px] font-bold",
                      selected ? "bg-brand-orange text-white" : "bg-[#f1f4f9] text-slate-600"
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 font-display text-[18px] text-brand-dark">{opt}</span>
                  {selected && <CheckCircle2 size={20} className="shrink-0 text-brand-orange" />}
                </button>
              );
            })}
          </div>

          {/* Action bar: fixed on mobile, in-flow on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--card-border)] bg-white pb-safe lg:static lg:mt-6 lg:border-0 lg:bg-transparent">
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2.5 px-3 py-3 lg:max-w-none lg:px-0 lg:py-0">
              <button onClick={() => goTo(index - 1)} disabled={index === 0} className="exam-btn exam-btn-ghost py-3.5 text-[17px]">
                ← Prev
              </button>
              <button onClick={() => goTo(index + 1)} disabled={isLast} className="exam-btn exam-btn-primary py-3.5 text-[17px]">
                Next →
              </button>
              <button
                onClick={() => updateAnswer(current.id, { selected: null })}
                disabled={currentAnswer?.selected === null || currentAnswer?.selected === undefined}
                className="exam-btn exam-btn-ghost inline-flex items-center justify-center gap-1.5 py-3.5 text-[17px]"
              >
                <X size={18} /> Clear
              </button>
              <button onClick={handleSubmit} disabled={locked} className="exam-btn exam-btn-dark py-3.5 text-[17px]">
                {locked ? "Submitting…" : "Submit Test →"}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop palette */}
        <aside className="hidden w-[310px] shrink-0 lg:block">
          <div className="card sticky top-40 p-4">
            <QuestionPalette {...paletteProps} />
          </div>
        </aside>
      </div>

      <ExamBottomSheet open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question Palette">
        <QuestionPalette {...paletteProps} />
        <button
          onClick={() => {
            setPaletteOpen(false);
            handleSubmit();
          }}
          disabled={locked}
          className="exam-btn exam-btn-dark mt-4 w-full py-3.5 text-[16px]"
        >
          {locked ? "Submitting…" : "Submit Test →"}
        </button>
      </ExamBottomSheet>
    </div>
  );
}

// Show the final sentence (the actual ask) in the highlighted box and any
// preceding context above it, like "context … / When was the event?".
function splitQuestion(text: string): { context: string | null; ask: string } {
  const trimmed = text.trim();
  const cut = trimmed.lastIndexOf(". ", trimmed.length - 2);
  if (cut > 20 && cut < trimmed.length - 10) {
    return { context: trimmed.slice(0, cut + 1), ask: trimmed.slice(cut + 2) };
  }
  return { context: null, ask: trimmed };
}

