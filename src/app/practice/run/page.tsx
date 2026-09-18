"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { filterQuestions, getQuestion, pick } from "@/data/questions";
import { Difficulty, ExamType, StateCode, TestAnswer } from "@/types";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { addPoints, isBookmarked, recordAnswer, saveAttempt, toggleBookmark } from "@/lib/localStore";
import { SUBJECT_MAP } from "@/data/subjects";
import { RotateCcw, Home } from "lucide-react";

function PracticeRun() {
  const params = useSearchParams();
  const state = params.get("state") as StateCode | null;
  const exam = params.get("exam") as ExamType | null;
  const subject = params.get("subject") || undefined;
  const topic = params.get("topic") || undefined;
  const count = Number(params.get("count") || 10);
  const difficulty = (params.get("difficulty") as Difficulty | "mixed") || "mixed";
  const ids = params.get("ids") || undefined; // comma-separated question ids, e.g. "Meri Mistakes" replay

  const questions = useMemo(() => {
    if (ids) {
      return ids
        .split(",")
        .map((id) => getQuestion(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q));
    }
    if (!state || !exam) return [];
    const all = filterQuestions({ state, exam, subject, topic, difficulty });
    return pick(all, Math.min(count, all.length));
  }, [ids, state, exam, subject, topic, count, difficulty]);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<TestAnswer[]>([]);
  const [bookmarkTick, setBookmarkTick] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(() => Date.now());

  if (!ids && (!state || !exam)) {
    return (
      <div className="container-page py-10 text-center">
        <p className="text-sm text-gray-600">Pehle State aur Exam select karein.</p>
        <Link href="/practice" className="btn-primary inline-flex mt-4 px-5 py-2.5 text-sm">
          Practice Setup par jaayein
        </Link>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container-page py-10 text-center">
        <p className="text-sm text-gray-600">Is filter ke liye questions available nahi hain.</p>
        <Link href="/practice" className="btn-primary inline-flex mt-4 px-5 py-2.5 text-sm">
          Filter Change Karein
        </Link>
      </div>
    );
  }

  const current = questions[index];

  function handleSelect(i: number) {
    if (revealed) return;
    setSelected(i);
  }

  function handleCheck() {
    if (selected === null) return;
    const isCorrect = selected === current.correctAnswer;
    recordAnswer(current.id, isCorrect);
    setAnswers((prev) => [
      ...prev,
      { questionId: current.id, selected, markedForReview: false, timeTakenSeconds: 0 },
    ]);
    if (isCorrect) addPoints(10);
    setRevealed(true);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      const correct = answers.filter((a, i) => a.selected === questions[i].correctAnswer).length;
      saveAttempt({
        id: `practice-${Date.now()}`,
        userId: null,
        mockId: "quick-practice",
        answers,
        score: correct * 2,
        correct,
        incorrect: answers.length - correct,
        skipped: questions.length - answers.length,
        accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
        timeTakenSeconds: Math.round((Date.now() - startedAt) / 1000),
        submittedAt: new Date().toISOString(),
      });
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  if (finished) {
    const correct = answers.filter((a, i) => a.selected === questions[i].correctAnswer).length;
    const incorrect = answers.length - correct;
    const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;

    const weakBySubjectTopic = new Map<string, { total: number; wrong: number }>();
    questions.forEach((q, i) => {
      const key = `${SUBJECT_MAP[q.subject]?.hinglishName ?? q.subject} — ${q.topic}`;
      const entry = weakBySubjectTopic.get(key) ?? { total: 0, wrong: 0 };
      entry.total += 1;
      if (answers[i] && answers[i].selected !== q.correctAnswer) entry.wrong += 1;
      weakBySubjectTopic.set(key, entry);
    });
    const weakTopics = Array.from(weakBySubjectTopic.entries())
      .filter(([, v]) => v.wrong > 0)
      .sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total);

    return (
      <div className="container-page py-8 max-w-xl">
        <h1 className="text-2xl font-extrabold text-gray-900">Practice Complete!</h1>
        <div className="card p-5 mt-4 grid grid-cols-3 gap-4 text-center">
          <Stat label="Score" value={`${correct * 2}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Correct" value={`${correct}/${questions.length}`} />
        </div>
        <div className="card p-5 mt-4 space-y-3">
          <p className="text-sm font-bold text-gray-900">Result Breakdown</p>
          <ProgressBar label="Correct" value={correct} max={questions.length} tone="green" />
          <ProgressBar label="Incorrect" value={incorrect} max={questions.length} tone="red" />
        </div>
        {weakTopics.length > 0 && (
          <div className="card p-5 mt-4">
            <p className="text-sm font-bold text-gray-900 mb-2">Weak Topics</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {weakTopics.map(([topic, v]) => (
                <li key={topic} className="flex justify-between">
                  <span>{topic}</span>
                  <span className="text-red-600 font-medium">{v.wrong}/{v.total} galat</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Link href="/practice" className="btn-secondary bg-white flex-1 py-3 text-sm text-center inline-flex items-center justify-center gap-1.5">
            <RotateCcw size={15} /> Retry / New Practice
          </Link>
          <Link href="/" className="btn-primary flex-1 py-3 text-sm text-center inline-flex items-center justify-center gap-1.5">
            <Home size={15} /> Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 max-w-xl">
      <div className="mb-4">
        <ProgressBar value={index + 1} max={questions.length} label={`Progress`} />
      </div>
      <QuestionCard
        key={current.id}
        question={current}
        index={index}
        total={questions.length}
        selected={selected}
        onSelect={handleSelect}
        revealed={revealed}
        bookmarked={isBookmarked(current.id)}
        onToggleBookmark={() => {
          toggleBookmark(current.id);
          setBookmarkTick((t) => t + 1);
        }}
      />
      <div className="mt-4">
        {!revealed ? (
          <button
            onClick={handleCheck}
            disabled={selected === null}
            className="btn-primary w-full py-3 text-sm disabled:opacity-40"
          >
            Check Answer
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary w-full py-3 text-sm">
            {index + 1 >= questions.length ? "Finish" : "Next Question"}
          </button>
        )}
      </div>
      <span className="hidden">{bookmarkTick}</span>
    </div>
  );
}

export default function PracticeRunPage() {
  return (
    <Suspense fallback={null}>
      <PracticeRun />
    </Suspense>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-extrabold text-brand-navy">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
