"use client";

import { useEffect, useState } from "react";
import { getAttempts } from "@/lib/localStore";

/** "○ Not Attempted" / "✓ Attempted · score" pill, read from this browser's saved attempts. */
export default function AttemptBadge({ testId }: { testId: string }) {
  const [best, setBest] = useState<{ score: number; accuracy: number } | null | undefined>(undefined);

  useEffect(() => {
    const attempts = getAttempts().filter((a) => a.mockId === testId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(attempts.length ? { score: attempts[0].score, accuracy: attempts[0].accuracy } : null);
  }, [testId]);

  if (best === undefined) {
    return <span className="inline-block h-7 w-32 rounded-full bg-slate-100" aria-hidden />;
  }

  if (best === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe4ee] bg-[#f3f5f9] px-3 py-1 font-display text-[13px] font-semibold text-slate-600">
        <span className="h-2 w-2 rounded-full border-[1.5px] border-slate-500" /> Not Attempted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfe9d2] bg-brand-green-light px-3 py-1 font-display text-[13px] font-semibold text-[#0b7a45]">
      ✓ Attempted · {best.accuracy}%
    </span>
  );
}
