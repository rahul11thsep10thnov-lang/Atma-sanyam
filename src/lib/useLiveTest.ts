"use client";

import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet, liveApi, liveApiEnabled, LiveApiError, type LiveTest } from "@/lib/liveApi";

/** Loads a published test; falls back to the last copy on this device when offline. */
export function useLiveTest(id: string) {
  const [test, setTest] = useState<LiveTest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const t = await liveApi.getTest(id);
      cacheSet(`test_${id}`, t);
      setTest(t);
    } catch (e) {
      const cached = cacheGet<LiveTest>(`test_${id}`);
      if (cached && !(e instanceof LiveApiError && e.status === 404)) setTest(cached);
      else setError(e instanceof LiveApiError && e.status === 404 ? "Yeh mock test ab available nahi hai." : "Unable to load questions. Try again.");
    }
  }, [id]);

  useEffect(() => {
    if (!liveApiEnabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { test, error, reload: load };
}

export const LANGUAGE_LABEL: Record<string, string> = { "hi-Latn": "Hinglish", hi: "Hindi", en: "English" };
