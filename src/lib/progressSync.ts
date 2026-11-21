"use client";

import { useEffect } from "react";
import { hasApiSession, liveApi, liveApiEnabled, type ProgressEventPayload } from "@/lib/liveApi";
import { applyServerProgress, localProgressSnapshot } from "@/lib/localStore";

// Progress sync: bookmarks, the mistake notebook, points and streak are kept
// on the server for students with an API session, so they follow the student
// to another device. Every change is queued here as an event with its own id
// and uploaded when online; the server applies each id once, so retries are
// safe. After the queue is empty, the server's copy replaces this browser's.

const OUTBOX = "pc_progress_outbox";
const IMPORTED = "pc_progress_imported";
const MAX_OUTBOX = 2000;
export const PROGRESS_EVENT = "pc-progress";

type NewEvent = ProgressEventPayload extends infer E ? (E extends unknown ? Omit<E, "id" | "at"> : never) : never;

function readOutbox(): ProgressEventPayload[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX) ?? "[]") as ProgressEventPayload[];
  } catch {
    return [];
  }
}
function writeOutbox(items: ProgressEventPayload[]) {
  try {
    localStorage.setItem(OUTBOX, JSON.stringify(items.slice(-MAX_OUTBOX)));
  } catch {
    // Storage full / blocked: the change stays on this device only.
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** The first time, what this browser already had is queued as events too. */
function ensureImported() {
  try {
    if (localStorage.getItem(IMPORTED)) return;
    localStorage.setItem(IMPORTED, "1");
  } catch {
    return;
  }
  const s = localProgressSnapshot();
  const at = new Date().toISOString();
  const ev: ProgressEventPayload[] = [];
  for (const q of s.bookmarks) ev.push({ id: newId(), at, kind: "bookmark", questionKey: q, on: true });
  for (const m of s.mistakes)
    for (let i = 0; i < Math.min(m.wrongCount, 5); i++) ev.push({ id: newId(), at: m.lastWrongAt, kind: "answer", questionKey: m.questionId, correct: false });
  if (s.lastQuizDate) ev.push({ id: newId(), at, kind: "daily_quiz", date: s.lastQuizDate, importedStreak: Math.min(366, Math.max(1, s.streak)) });
  // Points beyond the daily-quiz share go up in the server's normal steps.
  let rest = Math.max(0, s.points - (s.lastQuizDate ? 20 : 0));
  while (rest > 0 && ev.length < 400) {
    const amount = Math.min(20, rest);
    ev.push({ id: newId(), at, kind: "points", amount });
    rest -= amount;
  }
  if (ev.length) writeOutbox([...ev, ...readOutbox()]);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;

/** Records one progress change for upload (call before changing local data). */
export function queueProgress(e: NewEvent) {
  if (!liveApiEnabled || typeof window === "undefined") return;
  ensureImported();
  writeOutbox([...readOutbox(), { ...e, id: newId(), at: new Date().toISOString() } as ProgressEventPayload]);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncProgress(), 2000);
}

/** Uploads the queue, then takes the server's copy. Does nothing without an
 * API session (reading a page never creates an account). */
export function syncProgress(): Promise<void> {
  if (!liveApiEnabled || typeof window === "undefined" || !hasApiSession()) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      ensureImported();
      let progress = null;
      for (let round = 0; round < 20; round++) {
        const batch = readOutbox().slice(0, 200);
        if (!batch.length) break;
        const r = await liveApi.progressEvents(batch);
        const done = new Set([...r.applied, ...r.duplicate, ...r.rejected]);
        writeOutbox(readOutbox().filter((e) => !done.has(e.id)));
        progress = r.progress;
      }
      if (readOutbox().length) return; // more than one sync's worth: next time
      progress ??= await liveApi.progress();
      applyServerProgress(progress);
      window.dispatchEvent(new Event(PROGRESS_EVENT));
    } catch {
      // Offline or server error: the queue stays and is retried later.
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Mount once (site chrome): syncs on load, when back online and on focus. */
export function useProgressSync() {
  useEffect(() => {
    void syncProgress();
    const again = () => void syncProgress();
    const onVisible = () => document.visibilityState === "visible" && again();
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

/** Calls `refresh` whenever synced progress has arrived from the server. */
export function useProgressRefresh(refresh: () => void) {
  useEffect(() => {
    window.addEventListener(PROGRESS_EVENT, refresh);
    return () => window.removeEventListener(PROGRESS_EVENT, refresh);
  }, [refresh]);
}
