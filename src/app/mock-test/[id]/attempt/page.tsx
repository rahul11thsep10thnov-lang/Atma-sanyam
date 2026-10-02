"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { demoCanStart, openEnrollPopup, recordDemoTestStart } from "@/lib/enroll";
import { getMockTest } from "@/data/mockTests";
import { getQuestion } from "@/data/questions";
import { SUBJECT_MAP } from "@/data/subjects";
import { saveAttempt } from "@/lib/localStore";
import ExamRunner, { type RunnerAnswers } from "@/components/exam/ExamRunner";
import ExamResult from "@/components/exam/ExamResult";

// Built-in demo tests (bundled sample questions). Scored in the browser and
// kept in localStorage. Tests published from the admin console run under
// /mock-test/live/[id] and are scored by the API instead.
export default function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const mock = getMockTest(id);
  const questions = useMemo(
    () => (mock ? mock.questionIds.map((qid) => getQuestion(qid)).filter(Boolean) : []),
    [mock]
  ) as NonNullable<ReturnType<typeof getQuestion>>[];
  const [startedAt] = useState(() => Date.now());
  const [result, setResult] = useState<{ answers: RunnerAnswers; timeTaken: number } | null>(null);
  // Free quota (2 full + 2 subject-wise), then the Mock Test Pass is needed.
  const [gate, setGate] = useState<{ ok: true } | { ok: false; message: string } | null>(null);

  useEffect(() => {
    if (!mock) return;
    let cancelled = false;
    void demoCanStart(mock.id).then((g) => {
      if (cancelled) return;
      if (g.ok) recordDemoTestStart(mock.id);
      else openEnrollPopup(g.message);
      setGate(g);
    });
    return () => {
      cancelled = true;
    };
  }, [mock]);

  const runnerQuestions = useMemo(
    () =>
      questions.map((q) => ({
        id: q.id,
        subjectKey: q.subject,
        subjectLabel: SUBJECT_MAP[q.subject]?.hinglishName ?? q.subject,
        text: q.question,
        options: q.options,
      })),
    [questions]
  );

  function handleSubmit(answers: RunnerAnswers) {
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
    const timeTaken = Math.round((Date.now() - startedAt) / 1000);
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
      timeTakenSeconds: timeTaken,
      submittedAt: new Date().toISOString(),
    });
    setResult({ answers, timeTaken });
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

  if (gate === null) {
    return <div className="exam-shell container-page py-10 text-center text-sm text-gray-600">Test taiyar ho raha hai…</div>;
  }

  if (!gate.ok) {
    return (
      <div className="exam-shell container-page container-narrow py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ffece9] text-brand-coral">
          <Lock size={26} />
        </span>
        <h1 className="mt-4 font-display text-[1.5rem] font-bold">Yeh test Mock Test Pass ke saath available hai</h1>
        <p className="mt-2 text-[16px] text-slate-600">{gate.message}</p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button onClick={() => openEnrollPopup(gate.message)} className="btn-cta px-6 py-3 text-[16px]">
            Enrol karein →
          </button>
          <Link href="/mock-test" className="btn-secondary px-6 py-3 text-[16px]">
            Sabhi Mock Tests
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    const { answers, timeTaken } = result;
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
    const subjectStats = new Map<string, { total: number; correct: number }>();
    questions.forEach((q) => {
      const key = SUBJECT_MAP[q.subject]?.hinglishName ?? q.subject;
      const s = subjectStats.get(key) ?? { total: 0, correct: 0 };
      s.total += 1;
      if (answers[q.id]?.selected === q.correctAnswer) s.correct += 1;
      subjectStats.set(key, s);
    });

    return (
      <ExamResult
        title={mock.title}
        exitHref="/mock-test"
        retryHref={`/mock-test/${mock.id}`}
        score={score}
        accuracy={correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0}
        percentage={(correct / questions.length) * 100}
        timeTaken={timeTaken}
        correct={correct}
        incorrect={incorrect}
        skipped={skipped}
        subjects={[...subjectStats.entries()].map(([label, s]) => ({ label, ...s }))}
        solutions={questions.map((q) => ({
          id: q.id,
          text: q.question,
          options: q.options,
          correctIndex: q.correctAnswer,
          selected: answers[q.id]?.selected ?? null,
          explanation: q.explanation,
        }))}
      />
    );
  }

  return (
    <ExamRunner
      title={mock.title}
      exitHref={`/mock-test/${mock.id}`}
      questions={runnerQuestions}
      initialSeconds={mock.durationMinutes * 60}
      onSubmit={handleSubmit}
    />
  );
}
