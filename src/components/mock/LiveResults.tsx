"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { liveApi, liveApiEnabled, type AttemptSummary } from "@/lib/liveApi";
import { formatDate } from "@/lib/utils";

/** The user's server-scored test results (published mock tests). */
export default function LiveResults() {
  const [items, setItems] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!liveApiEnabled) return;
    liveApi
      .attempts()
      .then((r) => setItems(r.items))
      .catch(() => setError(true));
  }, []);

  if (!liveApiEnabled || error || !items || items.length === 0) return null;
  const avg = items.reduce((s, a) => s + a.percentage, 0) / items.length;

  return (
    <section className="card p-4 mt-6">
      <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
        <ShieldCheck size={16} className="text-brand-green" /> Test Results
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        {items.length} test{items.length === 1 ? "" : "s"} · average {Math.round(avg)}% · server par check kiye gaye
      </p>
      <ul className="divide-y divide-[var(--card-border)]">
        {items.slice(0, 10).map((a) => (
          <li key={a.attemptId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{a.title}</p>
              <p className="text-xs text-gray-500">
                {a.examName} · {formatDate(a.submittedAt)} · ✓{a.correct} ✗{a.incorrect} –{a.unanswered}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-base font-bold text-brand-dark">
                {a.score}/{a.maxScore}
              </p>
              <p className="text-xs text-gray-500">{Math.round(a.percentage)}%</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
