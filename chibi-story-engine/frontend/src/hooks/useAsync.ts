import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../services/api";

/** Load data when `deps` change; expose a reload function and the last error message. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(loader);
  latest.current = loader;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    latest
      .current()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: unknown) => alive && setError(describe(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, loading, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function describe(e: unknown): string {
  if (e instanceof ApiError) {
    const issues = e.issues();
    return issues.length ? `${e.message}: ${issues.slice(0, 4).join("; ")}` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Run an action with busy and error state: `const [run, busy, error] = useAction()`. */
export function useAction(): [(fn: () => Promise<unknown>) => Promise<void>, boolean, string | null, (m: string | null) => void] {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }, []);
  return [run, busy, error, setError];
}

/** Call `fn` every `ms` while `active`. */
export function usePoll(fn: () => void, ms: number, active: boolean): void {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => latest.current(), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
}
