"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QUESTIONS } from "@/data/questions";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { addPoints, getPoints, getStreak, isBookmarked, recordAnswer, recordDailyQuizCompletion, toggleBookmark } from "@/lib/localStore";
import { Flame, Trophy } from "lucide-react";

const DAILY_SUBJECTS = ["police-law", "gk", "state-gk", "current-affairs", "reasoning", "maths", "science"];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dateSeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  return d.split("-").reduce((acc, part) => acc + Number(part), 0) * 7919;
}

export default function DailyQuizPage() {
  const questions = useMemo(() => {
    const pool = QUESTIONS.filter((q) => DAILY_SUBJECTS.includes(q.subject));
    return seededShuffle(pool, dateSeed()).slice(0, 10);
  }, []);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [streakInfo, setStreakInfo] = useState<{ streak: number; alreadyDoneToday: boolean } | null>(null);
  const [bookmarkTick, setBookmarkTick] = useState(0);

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
      setStreakInfo(recordDailyQuizCompletion());
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
      <div className="container-page py-8 max-w-xl text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">Aaj ka Quiz Complete!</h1>
        <div className="card p-5 mt-4 grid grid-cols-3 gap-4">
          <Stat label="Aaj ka Score" value={`${correctCount * 10}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Streak" value={`${streakInfo?.streak ?? getStreak()}🔥`} />
        </div>
        {streakInfo?.alreadyDoneToday && (
          <p className="mt-3 text-xs text-amber-700">Aapne aaj ka quiz pehle hi complete kar liya hai!</p>
        )}
        <div className="flex gap-3 mt-6">
          <Link href="/" className="btn-primary flex-1 py-3 text-sm text-center">
            Home
          </Link>
          <Link href="/leaderboard" className="btn-secondary bg-white flex-1 py-3 text-sm text-center">
            Leaderboard Dekhein
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 max-w-xl">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">Aaj ka Police Quiz</h1>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-amber-600">
            <Flame size={14} /> {getStreak()} din
          </span>
          <span className="flex items-center gap-1 text-brand-navy">
            <Trophy size={14} /> {getPoints()} pts
          </span>
        </div>
      </div>
      <div className="mb-4">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-extrabold text-brand-navy">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
