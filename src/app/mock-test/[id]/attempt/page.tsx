"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getMockTest } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { SUBJECT_MAP } from "@/data/subjects";
import { saveAttempt } from "@/lib/localStore";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Flag, Clock } from "lucide-react";

interface AnswerState {
  selected: number | null;
  marked: boolean;
  visited: boolean;
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

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  useEffect(() => {
    if (secondsLeft === 0 && !submitted) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  if (!mock || questions.length === 0) {
    return (
      <div className="container-page py-10 text-center">
        <p className="text-sm text-gray-600">Mock test nahi mila.</p>
        <Link href="/mock-test" className="btn-primary inline-flex mt-4 px-5 py-2.5 text-sm">
          Sabhi Mock Tests
        </Link>
      </div>
    );
  }

  const current = questions[index];
  const currentAnswer = answers[current.id] ?? { selected: null, marked: false, visited: true };

  function updateAnswer(qid: string, patch: Partial<AnswerState>) {
    setAnswers((prev) => {
      const base: AnswerState = prev[qid] ?? { selected: null, marked: false, visited: false };
      return { ...prev, [qid]: { ...base, ...patch } };
    });
  }

  function goTo(i: number) {
    updateAnswer(current.id, { visited: true });
    setIndex(i);
    updateAnswer(questions[i].id, { visited: true });
  }

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
      <div className="container-page py-8 max-w-2xl">
        <h1 className="text-2xl font-extrabold text-gray-900">{mock.title} — Result</h1>
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

        <div className="flex gap-3 mt-6">
          <Link href={`/mock-test/${mock.id}`} className="btn-secondary bg-white flex-1 py-3 text-sm text-center">
            Retry Test
          </Link>
          <Link href="/mock-test" className="btn-primary flex-1 py-3 text-sm text-center">
            Sabhi Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter((a) => a.selected !== null).length;
  const markedCount = Object.values(answers).filter((a) => a.marked).length;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="container-page py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900 truncate pr-2">{mock.title}</h1>
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold", secondsLeft < 60 ? "bg-red-50 text-brand-red" : "bg-blue-50 text-brand-navy")}>
          <Clock size={15} />
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
        <div>
          <div className="card p-4 sm:p-5">
            <p className="text-xs font-semibold text-gray-500">
              Question {index + 1} / {questions.length}
            </p>
            <p className="mt-2 text-base font-semibold text-gray-900 leading-relaxed">{current.question}</p>
            <div className="mt-4 space-y-2">
              {current.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => updateAnswer(current.id, { selected: i })}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 text-sm font-medium",
                    currentAnswer.selected === i
                      ? "border-brand-navy bg-blue-50 text-brand-navy"
                      : "border-gray-200 text-gray-800 hover:border-brand-navy"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => goTo(Math.max(0, index - 1))}
              disabled={index === 0}
              className="btn-secondary bg-white px-4 py-2.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => updateAnswer(current.id, { marked: !currentAnswer.marked })}
              className="btn-secondary bg-white px-4 py-2.5 text-sm inline-flex items-center gap-1.5"
            >
              <Flag size={14} /> {currentAnswer.marked ? "Unmark" : "Mark for Review"}
            </button>
            {index + 1 < questions.length ? (
              <button onClick={() => goTo(index + 1)} className="btn-primary px-4 py-2.5 text-sm ml-auto">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-gold px-4 py-2.5 text-sm ml-auto">
                Submit Test
              </button>
            )}
          </div>
        </div>

        <div className="card p-4 h-fit">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Question Palette</p>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const a = answers[q.id];
              const answeredQ = a?.selected !== null && a?.selected !== undefined;
              let style = "bg-gray-100 text-gray-500";
              if (a?.marked && answeredQ) style = "bg-purple-500 text-white";
              else if (a?.marked) style = "bg-purple-200 text-purple-800";
              else if (answeredQ) style = "bg-brand-green text-white";
              else if (a?.visited) style = "bg-red-100 text-red-600";
              if (i === index) style += " ring-2 ring-brand-navy ring-offset-1";
              return (
                <button
                  key={q.id}
                  onClick={() => goTo(i)}
                  className={cn("h-8 w-8 rounded-md text-xs font-bold", style)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-gray-500">
            <p>Answered: {answeredCount}</p>
            <p>Marked: {markedCount}</p>
            <p>Remaining: {questions.length - answeredCount}</p>
          </div>
          <button onClick={handleSubmit} className="btn-primary w-full mt-3 py-2.5 text-xs">
            Submit Test
          </button>
        </div>
      </div>
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
