"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PyqPaper, StateInfo } from "@/types";
import { getQuestion } from "@/data/questions";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ui/ProgressBar";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { addPoints, isBookmarked, recordAnswer, toggleBookmark } from "@/lib/localStore";
import { RotateCcw, Home } from "lucide-react";

export default function PyqAttemptClient({ paper, state }: { paper: PyqPaper; state: StateInfo }) {
  const questions = useMemo(
    () => paper.questionIds.map((qid) => getQuestion(qid)).filter(Boolean),
    [paper]
  ) as NonNullable<ReturnType<typeof getQuestion>>[];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bookmarkTick, setBookmarkTick] = useState(0);

  if (questions.length === 0) {
    return (
      <div className="container-page py-10 text-center">
        <p className="text-sm text-gray-600">Is paper me questions available nahi hain.</p>
        <Link href="/pyq" className="btn-primary inline-flex mt-4 px-5 py-2.5 text-sm">
          Sabhi PYQ
        </Link>
      </div>
    );
  }

  const current = questions[index];

  function handleCheck() {
    if (selected === null) return;
    const isCorrect = selected === current.correctAnswer;
    recordAnswer(current.id, isCorrect);
    if (isCorrect) {
      addPoints(10);
      setCorrectCount((c) => c + 1);
    }
    setRevealed(true);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  if (finished) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="container-page py-8 max-w-xl">
        <h1 className="text-2xl font-extrabold text-gray-900">{paper.title} — Complete!</h1>
        <div className="card p-5 mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl font-extrabold text-brand-navy">
              {correctCount}/{questions.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Correct</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-navy">{accuracy}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Accuracy</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary bg-white flex-1 py-3 text-sm text-center inline-flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={15} /> Retry
          </button>
          <Link href="/pyq" className="btn-primary flex-1 py-3 text-sm text-center inline-flex items-center justify-center gap-1.5">
            <Home size={15} /> Sabhi PYQ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 max-w-xl">
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500">
          {state.hinglishName} · {paper.exam.toUpperCase()} · Year {paper.year}
        </p>
        <h1 className="text-lg font-bold text-gray-900">{paper.title}</h1>
      </div>
      <DisclaimerBanner>Sample/practice paper hai — official PYQ nahi.</DisclaimerBanner>
      <div className="my-4">
        <ProgressBar value={index + 1} max={questions.length} label="Progress" />
      </div>
      <QuestionCard
        key={current.id}
        question={current}
        index={index}
        total={questions.length}
        selected={selected}
        onSelect={(i) => !revealed && setSelected(i)}
        revealed={revealed}
        bookmarked={isBookmarked(current.id)}
        onToggleBookmark={() => {
          toggleBookmark(current.id);
          setBookmarkTick((t) => t + 1);
        }}
      />
      <div className="mt-4">
        {!revealed ? (
          <button onClick={handleCheck} disabled={selected === null} className="btn-primary w-full py-3 text-sm disabled:opacity-40">
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
