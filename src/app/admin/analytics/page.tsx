"use client";

import { useEffect, useState } from "react";
import { getAdminQuestions } from "@/lib/localStore";
import { Question } from "@/types";
import { STATE_MAP } from "@/data/states";
import { SUBJECT_MAP } from "@/data/subjects";
import ProgressBar from "@/components/ui/ProgressBar";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";

export default function AdminAnalyticsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    // Hydrate from the browser-only localStorage admin store after mount
    // (unavailable during SSR, so this can't be a lazy useState initializer).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuestions(getAdminQuestions());
  }, []);

  const total = questions.length || 1;

  function countBy<T extends string>(fn: (q: Question) => T): [T, number][] {
    const map = new Map<T, number>();
    questions.forEach((q) => {
      const key = fn(q);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]) as [T, number][];
  }

  const byState = countBy((q) => q.state);
  const bySubject = countBy((q) => q.subject);
  const byDifficulty = countBy((q) => q.difficulty);

  return (
    <div>
      <DisclaimerBanner>
        Analytics abhi question-bank composition par based hain (local demo
        data). Live user activity analytics (most attempted exam, DAU,
        search queries) Supabase se attempts/search-log tables connect
        hone par yahan dikhenge.
      </DisclaimerBanner>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <AnalyticsCard title="Questions by State">
          {byState.map(([k, v]) => (
            <ProgressBar key={k} label={STATE_MAP[k as keyof typeof STATE_MAP]?.hinglishName ?? k} value={v} max={total} />
          ))}
        </AnalyticsCard>

        <AnalyticsCard title="Questions by Subject">
          {bySubject.map(([k, v]) => (
            <ProgressBar key={k} label={SUBJECT_MAP[k]?.hinglishName ?? k} value={v} max={total} tone="gold" />
          ))}
        </AnalyticsCard>

        <AnalyticsCard title="Questions by Difficulty">
          {byDifficulty.map(([k, v]) => (
            <ProgressBar key={k} label={k} value={v} max={total} tone={k === "easy" ? "green" : "red"} />
          ))}
        </AnalyticsCard>
      </div>
    </div>
  );
}

function AnalyticsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
