"use client";

import { useEffect, useState } from "react";
import { getDisplayName, getPoints } from "@/lib/localStore";
import { STATES } from "@/data/states";
import DisclaimerBanner from "@/components/ui/DisclaimerBanner";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "weekly" | "monthly" | "state";

interface Row {
  rank: number;
  name: string;
  points: number;
  questionsAttempted: number;
  accuracy: number;
  isYou?: boolean;
}

// Illustrative anonymous sample rows so the leaderboard UI has something to
// show before real multi-user data exists (once Supabase is wired up,
// leaderboard_entries will be populated from real test_attempts).
const SAMPLE_NAMES = [
  "PoliceAspirant214",
  "ConstableReady99",
  "SI_Fighter22",
  "DaudBhaiDaud",
  "GKGuru88",
  "NextBatch2026",
  "MehnatiAspirant",
  "FocusMode11",
];

function buildSampleRows(youPoints: number, youName: string): Row[] {
  const sample: Row[] = SAMPLE_NAMES.map((name, i) => ({
    rank: 0,
    name,
    points: Math.max(20, 800 - i * 85),
    questionsAttempted: Math.max(10, 200 - i * 18),
    accuracy: Math.max(55, 92 - i * 3),
  }));
  sample.push({
    rank: 0,
    name: `${youName} (Aap)`,
    points: youPoints,
    questionsAttempted: 0,
    accuracy: 0,
    isYou: true,
  });
  return sample
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [state, setState] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    // Hydrate from browser-only localStorage after mount (SSR can't see it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(buildSampleRows(getPoints(), getDisplayName()));
  }, []);

  // period/state pickers are demo-mode UI only — real filtering happens
  // once leaderboard_entries is backed by Supabase (see leaderboard_period).
  const filtered = rows;

  return (
    <div className="container-page py-8 max-w-xl">
      <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Leaderboard</h1>
      <p className="mt-1 text-sm text-gray-600 mb-4">Weekly, monthly aur state-wise rank dekhein.</p>

      <DisclaimerBanner>
        Yeh sample/demo leaderboard hai (anonymous display names ke saath).
        Real-time multi-user ranking Supabase project configure karne ke
        baad live data se banegi.
      </DisclaimerBanner>

      <div className="mt-4 flex gap-2">
        {(["weekly", "monthly", "state"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold capitalize",
              period === p ? "border-brand-navy bg-blue-50 text-brand-navy" : "border-gray-200 text-gray-600"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {period === "state" && (
        <select className="select mt-3" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Sabhi States</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.hinglishName}
            </option>
          ))}
        </select>
      )}

      <div className="mt-5 space-y-1.5">
        {filtered.map((r) => (
          <div
            key={r.rank}
            className={cn(
              "card p-3.5 flex items-center gap-3",
              r.isYou && "border-brand-navy bg-blue-50"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                r.rank <= 3 ? "bg-brand-gold text-[#3a2600]" : "bg-gray-100 text-gray-600"
              )}
            >
              {r.rank <= 3 ? <Medal size={14} /> : r.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
              {!r.isYou && (
                <p className="text-[11px] text-gray-400">
                  {r.questionsAttempted} questions · {r.accuracy}% accuracy
                </p>
              )}
            </div>
            <span className="flex items-center gap-1 text-sm font-bold text-brand-navy">
              <Trophy size={13} /> {r.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
