"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getMockTest } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { SUBJECT_MAP } from "@/data/subjects";
import { saveAttempt } from "@/lib/localStore";
import { cn } from "@/lib/utils";
import QuestionPalette, { PaletteEntry, QuestionStatus } from "@/components/exam/QuestionPalette";
import ExamBottomSheet from "@/components/exam/ExamBottomSheet";
import { CheckCircle2, XCircle, Flag, Clock, ArrowLeft, LayoutGrid, X } from "lucide-react";

interface AnswerState {
  selected: number | null;
  marked: boolean;
  visited: boolean;
}

function questionStatus(a: AnswerState | undefined): QuestionStatus {
  if (!a || !a.visited) return "not-visited";
  const answered = a.selected !== null && a.selected !== undefined;
  if (answered && a.marked) return "answered-marked";
  if (answered) return "answered";
  if (a.marked) return "marked";
  return "skipped";
}

export default function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const mock = getMockTest(id);
  const questions = useMemo(
    () => (mock ? mock.questionIds.map((qid) => getQuestion(qid)).filter(Boolean) : []),
    [mock]
  ) as NonNullable<ReturnType<typeof getQuestion>>[];

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [secondsLeft, setSecondsLeft] = useState((mock?.durationMinutes ?? 20) * 60);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  useEffect(() => {
    if (secondsLeft === 0 && !submitted) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const current = questions[index];

  const updateAnswer = useCallback((qid: string, patch: Partial<AnswerState>) => {
    setAnswers((prev) => {
      const base: AnswerState = prev[qid] ?? { selected: null, marked: false, visited: false };
      return { ...prev, [qid]: { ...base, ...patch } };
    });
  }, []);

  // The very first question is on screen before any Next/palette click, so
  // it needs to be marked visited on mount — every later question gets
  // marked visited by goTo().
  useEffect(() => {
    if (questions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updateAnswer(questions[0].id, { visited: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (submitted || !current) return;
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
  }, [submitted, current, index, answers, updateAnswer, goTo]);

  function handleSubmit() {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    questions.forEach((q) => {
      const a = answers[q.id];
      if (!a || a.selected === null || a.selected === undefined) skipped++;
      else if (a.selected === q.correctAnswer) correct++;
      else incorrect++;
    });
    const score = correct * mock!.marksPerQuestion - incorrect * mock!.negativeMarks;
    saveAttempt({
      id: `mock-${mock!.id}-${Date.now()}`,
      userId: null,
      mockId: mock!.id,
      answers: questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id]?.selected ?? null,
        markedForReview: answers[q.id]?.marked ?? false,
        timeTakenSeconds: 0,
      })),
      score,
      correct,
      incorrect,
      skipped,
      accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0,
      timeTakenSeconds: Math.round((Date.now() - startedAt) / 1000),
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  }

  if (!mock || questions.length === 0) {
    return (
      <div className="exam-shell container-page py-10 text-center">
        <p className="text-sm text-gray-600">Mock test nahi mila.</p>
        <Link href="/mock-test" className="exam-btn exam-btn-primary inline-flex mt-4 px-5 py-2.5 text-sm">
          Sabhi Mock Tests
        </Link>
      </div>
    );
  }

  if (submitted) {
    let correct = 0,
      incorrect = 0,
      skipped = 0;
    questions.forEach((q) => {
      const a = answers[q.id];
      if (!a || a.selected === null || a.selected === undefined) skipped++;
      else if (a.selected === q.correctAnswer) correct++;
      else incorrect++;
    });
    const score = correct * mock.marksPerQuestion - incorrect * mock.negativeMarks;
    const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
    const timeTaken = Math.round((Date.now() - startedAt) / 1000);

    const subjectStats = new Map<string, { total: number; correct: number }>();
    questions.forEach((q) => {
      const key = SUBJECT_MAP[q.subject]?.hinglishName ?? q.subject;
      const s = subjectStats.get(key) ?? { total: 0, correct: 0 };
      s.total += 1;
      if (answers[q.id]?.selected === q.correctAnswer) s.correct += 1;
      subjectStats.set(key, s);
    });

    return (
      <div className="exam-shell min-h-dvh bg-gray-50">
        <ExamTopBar exitHref="/mock-test" />
        <div className="container-page py-6 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900">{mock.title} — Result</h1>
          <div className="card p-5 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <Stat label="Score" value={String(score)} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Time Taken" value={`${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`} />
            <Stat label="Percentage" value={`${Math.round((correct / questions.length) * 100)}%`} />
          </div>
          <div className="card p-5 mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Correct" value={String(correct)} tone="text-brand-green" />
            <Stat label="Incorrect" value={String(incorrect)} tone="text-brand-red" />
            <Stat label="Skipped" value={String(skipped)} tone="text-gray-500" />
          </div>

          <div className="card p-5 mt-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Subject-wise Performance</p>
            <div className="space-y-2">
              {Array.from(subjectStats.entries()).map(([subj, s]) => (
                <div key={subj} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{subj}</span>
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
              {questions.map((q, i) => {
                const a = answers[q.id];
                const isCorrect = a?.selected === q.correctAnswer;
                return (
                  <div key={q.id} className="card p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                            oi === q.correctAnswer
                              ? "border-green-500 bg-green-50"
                              : oi === a?.selected
                                ? "border-red-500 bg-red-50"
                                : "border-gray-100"
                          )}
                        >
                          {oi === q.correctAnswer && <CheckCircle2 size={14} className="text-green-600 shrink-0" />}
                          {oi === a?.selected && oi !== q.correctAnswer && <XCircle size={14} className="text-red-600 shrink-0" />}
                          <span>{opt}</span>
                          {!isCorrect && a?.selected == null && oi === q.correctAnswer && (
                            <span className="text-[11px] text-gray-400 ml-auto">Skipped</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-md p-2">{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pb-8">
            <Link href={`/mock-test/${mock.id}`} className="exam-btn exam-btn-secondary flex-1 py-3 text-sm text-center">
              Retry Test
            </Link>
            <Link href="/mock-test" className="exam-btn exam-btn-primary flex-1 py-3 text-sm text-center">
              Sabhi Mock Tests
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
  const subjects = Array.from(new Set(questions.map((q) => q.subject)));
  const { context, ask } = splitQuestion(current.question);

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
            href={`/mock-test/${mock.id}`}
            aria-label="Exit test"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold text-brand-dark">{mock.title}</p>
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
              const qs = questions.filter((q) => q.subject === subj);
              const done = qs.filter((q) => answers[q.id]?.selected !== null && answers[q.id]?.selected !== undefined).length;
              const active = subj === current.subject;
              return (
                <button
                  key={subj}
                  role="tab"
                  aria-selected={active}
                  onClick={() => goTo(questions.findIndex((q) => q.subject === subj))}
                  className={cn(
                    "relative flex shrink-0 flex-col items-center gap-1.5 px-4 pt-2 pb-3",
                    active ? "text-brand-orange" : "text-slate-400"
                  )}
                >
                  <span className="whitespace-nowrap font-display text-[16px] font-medium">
                    {SUBJECT_MAP[subj]?.hinglishName ?? subj}
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
              <button onClick={handleSubmit} className="exam-btn exam-btn-dark py-3.5 text-[17px]">
                Submit Test →
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
          className="exam-btn exam-btn-dark mt-4 w-full py-3.5 text-[16px]"
        >
          Submit Test →
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
