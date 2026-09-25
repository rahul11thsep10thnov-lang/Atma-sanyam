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
import { CheckCircle2, XCircle, Flag, Clock, ArrowLeft, LayoutGrid, ChevronLeft, ChevronRight, Eraser } from "lucide-react";

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

  const paletteEntries: PaletteEntry[] = questions.map((q) => ({
    id: q.id,
    status: questionStatus(answers[q.id]),
  }));

  // Subjects present in this test, in first-appearance order — shown as an
  // informational navigation aid. Unlike TrickySSC's SSC-CGL sections, this
  // is one continuous timer for the whole test: subjects are not separately
  // timed or locked (see the PR summary for why).
  const subjects = Array.from(new Set(questions.map((q) => q.subject)));
  const currentSubjectIndex = subjects.indexOf(current.subject);

  return (
    <div className="exam-shell min-h-dvh flex flex-col bg-gray-50">
      <ExamTopBar exitHref={`/mock-test/${mock.id}`} />

      {/* Header: title + timer, always visible */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-5 h-14">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{mock.title}</p>
            <p className="text-[11px] text-gray-500">
              Q{index + 1}/{questions.length} · {answeredCount} answered
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div
              role="timer"
              aria-live="polite"
              aria-label={`Time remaining ${minutes} minutes ${seconds} seconds`}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-bold tabular-nums",
                timerState === "critical" && "border-brand-red bg-brand-red-light text-brand-red motion-safe:animate-pulse",
                timerState === "warning" && "border-brand-gold bg-brand-gold-light text-[#8a5a00]",
                timerState === "normal" && "border-gray-200 bg-gray-50 text-gray-700"
              )}
            >
              <Clock size={14} />
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            <button
              onClick={handleSubmit}
              className="exam-btn exam-btn-primary hidden sm:inline-flex px-4 py-1.5 text-sm"
            >
              Submit Test
            </button>
          </div>
        </div>
        {/* Subject navigation chips */}
        {subjects.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 sm:px-5 pb-2">
            {subjects.map((subj, i) => {
              const qs = questions.filter((q) => q.subject === subj);
              const answeredInSubj = qs.filter((q) => answers[q.id]?.selected !== null && answers[q.id]?.selected !== undefined).length;
              return (
                <button
                  key={subj}
                  onClick={() => goTo(questions.findIndex((q) => q.subject === subj))}
                  className={cn(
                    "exam-btn shrink-0 whitespace-nowrap px-3 py-1.5 text-xs",
                    i === currentSubjectIndex ? "exam-btn-primary" : "exam-btn-ghost"
                  )}
                >
                  {SUBJECT_MAP[subj]?.hinglishName ?? subj}
                  <span className="ml-1.5 opacity-75">{answeredInSubj}/{qs.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 py-4 lg:py-6 flex flex-col lg:flex-row lg:gap-5 lg:items-start">
        {/* Main question area */}
        <div className="flex-1 min-w-0 pb-24 lg:pb-0">
          <div className="card p-4 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Question {index + 1} of {questions.length}
            </p>
            <p id="question-text" className="text-[17px] sm:text-xl font-semibold text-gray-900 leading-relaxed">
              {current.question}
            </p>

            <div role="radiogroup" aria-labelledby="question-text" className="mt-5 space-y-2.5">
              {current.options.map((opt, i) => {
                const selected = currentAnswer?.selected === i;
                return (
                  <button
                    key={i}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => updateAnswer(current.id, { selected: i, visited: true })}
                    className={cn(
                      "exam-btn flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-[15px] sm:text-base",
                      selected
                        ? "border-brand-orange bg-brand-orange-light text-gray-900"
                        : "border-gray-200 text-gray-800 hover:border-brand-orange/50 hover:bg-orange-50/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                        selected ? "border-brand-orange bg-brand-orange text-white" : "border-gray-300 text-gray-500"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop controls (mobile uses the sticky bottom bar instead) */}
          <div className="mt-4 hidden lg:flex flex-wrap gap-2">
            <button onClick={() => updateAnswer(current.id, { selected: null })} className="exam-btn exam-btn-ghost px-4 py-2.5 text-sm inline-flex items-center gap-1.5">
              <Eraser size={14} /> Clear Response
            </button>
            <button
              onClick={() => updateAnswer(current.id, { marked: !currentAnswer?.marked, visited: true })}
              className={cn("exam-btn px-4 py-2.5 text-sm inline-flex items-center gap-1.5", currentAnswer?.marked ? "exam-btn-marked" : "exam-btn-ghost")}
            >
              <Flag size={14} /> {currentAnswer?.marked ? "Unmark" : "Mark for Review"}
            </button>
            <div className="ml-auto flex gap-2">
              <button onClick={() => goTo(index - 1)} disabled={index === 0} className="exam-btn exam-btn-secondary px-4 py-2.5 text-sm">
                Previous
              </button>
              <button onClick={() => goTo(index + 1)} disabled={index + 1 >= questions.length} className="exam-btn exam-btn-primary px-4 py-2.5 text-sm">
                Save &amp; Next
              </button>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[300px] shrink-0">
          <div className="card p-4 sticky top-20">
            <QuestionPalette
              entries={paletteEntries}
              currentIndex={index}
              onJump={goTo}
              answeredCount={answeredCount}
              markedCount={markedCount}
              totalCount={questions.length}
            />
            <button onClick={handleSubmit} className="exam-btn exam-btn-primary w-full mt-4 py-2.5 text-sm">
              Submit Test
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white pb-safe">
        <div className="grid grid-cols-5 gap-1.5 p-2">
          <button
            onClick={() => updateAnswer(current.id, { selected: null })}
            aria-label="Clear response"
            className="exam-btn exam-btn-ghost flex flex-col items-center gap-0.5 py-2 text-[10px]"
          >
            <Eraser size={16} />
            Clear
          </button>
          <button
            onClick={() => updateAnswer(current.id, { marked: !currentAnswer?.marked, visited: true })}
            aria-label="Mark for review"
            className={cn("exam-btn flex flex-col items-center gap-0.5 py-2 text-[10px]", currentAnswer?.marked ? "exam-btn-marked" : "exam-btn-ghost")}
          >
            <Flag size={16} />
            Mark
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Open question palette"
            className="exam-btn exam-btn-ghost relative flex flex-col items-center gap-0.5 py-2 text-[10px]"
          >
            <LayoutGrid size={16} />
            Palette
            <span className="absolute top-0.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-orange px-0.5 text-[8px] font-bold text-white">
              {answeredCount}
            </span>
          </button>
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous question"
            className="exam-btn exam-btn-secondary flex flex-col items-center gap-0.5 py-2 text-[10px]"
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          {index + 1 >= questions.length ? (
            <button onClick={handleSubmit} aria-label="Submit test" className="exam-btn exam-btn-primary flex flex-col items-center gap-0.5 py-2 text-[10px]">
              <CheckCircle2 size={16} />
              Submit
            </button>
          ) : (
            <button onClick={() => goTo(index + 1)} aria-label="Next question" className="exam-btn exam-btn-primary flex flex-col items-center gap-0.5 py-2 text-[10px]">
              <ChevronRight size={16} />
              Next
            </button>
          )}
        </div>
      </div>

      <ExamBottomSheet open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question Palette">
        <QuestionPalette
          entries={paletteEntries}
          currentIndex={index}
          onJump={goTo}
          answeredCount={answeredCount}
          markedCount={markedCount}
          totalCount={questions.length}
        />
        <button
          onClick={() => {
            setPaletteOpen(false);
            handleSubmit();
          }}
          className="exam-btn exam-btn-primary w-full mt-4 py-3 text-sm"
        >
          Submit Test
        </button>
      </ExamBottomSheet>
    </div>
  );
}

function ExamTopBar({ exitHref }: { exitHref: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-5 h-11 shrink-0">
      <Link href={exitHref} className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900">
        <ArrowLeft size={14} /> Exit Test
      </Link>
      <span className="text-xs font-bold text-brand-navy">
        Police<span className="text-brand-orange">Exams</span>
      </span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className={cn("text-xl font-extrabold", tone ?? "text-brand-navy")}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
