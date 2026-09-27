"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Radio } from "lucide-react";
import { TestRowItem } from "@/components/app/TestList";
import { liveApi, liveApiEnabled, type LiveTestSummary } from "@/lib/liveApi";

const LANG: Record<string, string> = { "hi-Latn": "Hinglish", hi: "Hindi", en: "English" };

/**
 * Mock tests published from the admin console, fetched from the API so new
 * tests appear without a new website build. Renders nothing when the API
 * isn't configured (demo mode).
 */
export default function LiveMockTests({ state, examType }: { state?: string; examType: string }) {
  const [tests, setTests] = useState<LiveTestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await liveApi.listTests({ state, examType });
      setTests(r.items);
    } catch {
      setError("Unable to load mock tests. Try again.");
    }
  }, [state, examType]);

  useEffect(() => {
    if (!liveApiEnabled) return;
    // Fetch published tests whenever the state/exam filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!liveApiEnabled) return null;

  return (
    <section aria-labelledby="live-tests" className="card overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0fa35e] to-[#16b86c] text-white">
          <Radio size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="live-tests" className="font-display text-[1.2rem] font-semibold leading-snug text-brand-dark">
            Latest Mock Tests
          </h2>
          <p className="text-[14px] text-slate-500">Naye tests yahan apne aap aa jaate hain · result server par check hota hai</p>
        </div>
        {tests && (
          <span className="hidden shrink-0 rounded-full bg-[#eef1f6] px-3 py-1.5 font-display text-sm font-medium text-slate-600 sm:inline">
            {tests.length} tests
          </span>
        )}
      </div>
      <div className="border-t border-[var(--card-border)]">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <p className="text-[15px] text-slate-600">{error}</p>
            <button onClick={() => void load()} className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-[15px]">
              <RefreshCw size={16} /> Try again
            </button>
          </div>
        ) : tests === null ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading tests">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#eef1f6]" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <p className="px-4 py-6 text-center text-[15px] text-slate-600">
            No mock tests available yet. Questions are being prepared — jaldi aayenge!
          </p>
        ) : (
          tests.map((t) => (
            <TestRowItem
              key={t.id}
              row={{
                id: t.id,
                href: `/mock-test/live/${t.id}`,
                title: t.title,
                chip: LANG[t.language] ?? t.language,
                sub: t.sections.map((s) => `${s.subjectName} ${s.count}`).join(" · "),
                questions: t.totalQuestions,
                minutes: t.durationMinutes,
                marks: t.totalQuestions * t.marksPerQuestion,
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}
