"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAttempts, getBookmarks, getDisplayName, getEarnedBadgeCodes, getPoints, getStreak, getWrongQuestions } from "@/lib/localStore";
import { TestAttemptResult } from "@/types";
import { getMockTest } from "@/data/mockTests";
import { PYQ_MAP } from "@/data/pyq";
import { BADGES } from "@/data/badges";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Flame, Trophy, Star, AlertCircle, Timer, Award } from "lucide-react";

export default function DashboardPage() {
  const [attempts, setAttempts] = useState<TestAttemptResult[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [name, setName] = useState("");
  const [badgeCodes, setBadgeCodes] = useState<string[]>([]);

  useEffect(() => {
    // Hydrate from browser-only localStorage after mount (SSR can't see it).
    /* eslint-disable react-hooks/set-state-in-effect */
    setAttempts(getAttempts());
    setPoints(getPoints());
    setStreak(getStreak());
    setBookmarksCount(getBookmarks().length);
    setMistakesCount(getWrongQuestions().length);
    setName(getDisplayName());
    setBadgeCodes(getEarnedBadgeCodes());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const totalAttempted = attempts.reduce((sum, a) => sum + a.correct + a.incorrect + a.skipped, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correct, 0);
  const avgAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, a) => sum + a.accuracy, 0) / attempts.length)
    : 0;

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Namaste, {name}!</h1>
      <p className="mt-1 text-sm text-gray-600">Yahan aapki poori progress ek jagah hai.</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<Trophy size={16} />} label="Points" value={String(points)} />
        <Stat icon={<Flame size={16} />} label="Daily Streak" value={`${streak} din`} />
        <Stat icon={<Star size={16} />} label="Bookmarks" value={String(bookmarksCount)} />
        <Stat icon={<AlertCircle size={16} />} label="Meri Mistakes" value={String(mistakesCount)} />
      </div>

      <div className="card p-5 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Overall Performance</h2>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-lg font-extrabold text-brand-navy">{totalAttempted}</p>
            <p className="text-xs text-gray-500">Questions Attempted</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-brand-navy">{totalCorrect}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-brand-navy">{avgAccuracy}%</p>
            <p className="text-xs text-gray-500">Avg Accuracy</p>
          </div>
        </div>
        <ProgressBar value={avgAccuracy} label="Overall Accuracy" tone={avgAccuracy >= 60 ? "green" : "gold"} />
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/dashboard/bookmarks" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">My Saved Questions</p>
          <p className="text-xs text-gray-500 mt-1">{bookmarksCount} questions bookmarked</p>
        </Link>
        <Link href="/dashboard/mistakes" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">Meri Mistakes</p>
          <p className="text-xs text-gray-500 mt-1">{mistakesCount} questions revise karein</p>
        </Link>
        <Link href="/leaderboard" className="card p-4 hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-900">Leaderboard</p>
          <p className="text-xs text-gray-500 mt-1">Apna rank check karein</p>
        </Link>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Award size={16} className="text-brand-gold" /> Badges
        </h2>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <Badge key={b.code} tone={badgeCodes.includes(b.code) ? "gold" : "gray"}>
              {b.name}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {badgeCodes.length}/{BADGES.length} badges earned. Practice karte rahein!
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Tests</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-gray-500">Abhi tak koi test attempt nahi kiya. Practice ya Mock Test start karein!</p>
        ) : (
          <div className="space-y-2">
            {attempts.slice(0, 8).map((a) => {
              const mock = getMockTest(a.mockId);
              return (
                <div key={a.id} className="card p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{mock?.title ?? PYQ_MAP[a.mockId]?.title ?? (a.mockId === "quick-practice" ? "Quick Practice" : a.mockId)}</p>
                    <p className="text-xs text-gray-400">{formatDate(a.submittedAt)}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-brand-navy">{a.score} marks</p>
                    <p className="text-gray-400 flex items-center gap-1 justify-end">
                      <Timer size={11} /> {a.accuracy}% accuracy
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-brand-navy">{icon}</div>
      <p className="mt-1.5 text-lg font-extrabold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
