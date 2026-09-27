"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/localStore";

// Client for the PoliceExams API (backend/). Only public data and the
// user's own attempts pass through here — no keys: the API holds every
// secret. When NEXT_PUBLIC_API_URL is empty the website runs on its
// built-in demo tests exactly as before.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
export const liveApiEnabled = API_URL !== "";

const SESSION_KEY = "pe_api_session";

interface StoredSession {
  token: string;
  /** Supabase user this session belongs to (null for a guest session). */
  supabaseUserId: string | null;
}

export class LiveApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode / blocked storage: the session simply won't persist.
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new LiveApiError(0, "Network error. Check your internet connection.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new LiveApiError(res.status, (body as { error?: { message?: string } } | null)?.error?.message ?? `Request failed (${res.status})`);
  }
  return body as T;
}

let pending: Promise<string> | null = null;

/** Returns a valid API session token, creating a guest session or linking
 * the user's Supabase login (Google / mobile OTP) as needed. */
export function ensureSession(): Promise<string> {
  pending ??= (async () => {
    const stored = readSession();
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      if (s && stored?.supabaseUserId !== s.user.id) {
        // Signed in on the website: link it. A guest's results move over.
        const r = await request<{ token: string }>("/auth/supabase", {
          method: "POST",
          token: stored?.token,
          body: JSON.stringify({ accessToken: s.access_token }),
        });
        writeSession({ token: r.token, supabaseUserId: s.user.id });
        return r.token;
      }
    }
    if (stored?.token) return stored.token;
    const name = getDisplayName();
    const r = await request<{ token: string }>("/auth/guest", {
      method: "POST",
      body: JSON.stringify(name ? { displayName: name.slice(0, 60) } : {}),
    });
    writeSession({ token: r.token, supabaseUserId: null });
    return r.token;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

/** Authenticated request; an expired session is replaced once and retried. */
async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureSession();
  try {
    return await request<T>(path, { ...init, token });
  } catch (e) {
    if (e instanceof LiveApiError && e.status === 401) {
      writeSession(null);
      return request<T>(path, { ...init, token: await ensureSession() });
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Types returned by the public API
// ---------------------------------------------------------------------------

export interface LiveTestSummary {
  id: string;
  title: string;
  description: string | null;
  examName: string;
  stateCode: string | null;
  examType: string | null;
  language: string;
  durationMinutes: number;
  totalQuestions: number;
  marksPerQuestion: number;
  negativeMarks: number;
  publishedAt: string | null;
  sections: { subjectId: string | null; subjectName: string; count: number }[];
}

export interface LiveTest extends Omit<LiveTestSummary, "sections"> {
  questions: {
    id: string;
    position: number;
    subjectId: string | null;
    subjectName: string;
    questionText: string;
    options: { label: string; text: string }[];
  }[];
}

export interface StartedAttempt {
  attemptId: string;
  startedAt: string;
  deadlineAt: string;
  serverTime: string;
  resumed: boolean;
  totalQuestions: number;
}

export interface LiveResult {
  attemptId: string;
  mockTestId: string;
  title: string;
  timeTakenSeconds: number | null;
  late: boolean;
  summary: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    maxScore: number;
    percentage: number;
  };
  sections: { subjectName: string; total: number; correct: number }[];
  questions: {
    questionId: string;
    questionText: string;
    options: { label: string; text: string }[];
    selectedOption: string | null;
    correctOption: string;
    explanation: string | null;
  }[];
}

export interface AttemptSummary {
  attemptId: string;
  mockTestId: string;
  title: string;
  examName: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
}

export const liveApi = {
  listTests: (q: { state?: string; examType?: string }) => {
    const p = new URLSearchParams();
    if (q.state) p.set("state", q.state);
    if (q.examType) p.set("examType", q.examType);
    p.set("pageSize", "100");
    return request<{ items: LiveTestSummary[]; total: number }>(`/mock-tests?${p}`);
  },
  getTest: (id: string) => request<LiveTest>(`/mock-tests/${encodeURIComponent(id)}`),
  start: (id: string) => authed<StartedAttempt>(`/mock-tests/${encodeURIComponent(id)}/start`, { method: "POST" }),
  submit: (id: string, attemptId: string, answers: { questionId: string; selectedOption: string | null; markedForReview: boolean }[]) =>
    authed<LiveResult>(`/mock-tests/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    }),
  attempts: () => authed<{ items: AttemptSummary[] }>("/attempts"),
  result: (attemptId: string) => authed<LiveResult>(`/attempts/${encodeURIComponent(attemptId)}`),
};

// ---------------------------------------------------------------------------
// Local cache for the test in progress: survives a refresh or a dropped
// connection; a submission that failed is kept until it goes through.
// ---------------------------------------------------------------------------

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`pe_live_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown) {
  try {
    localStorage.setItem(`pe_live_${key}`, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the test still works, it just won't survive a refresh.
  }
}

export function cacheDelete(key: string) {
  try {
    localStorage.removeItem(`pe_live_${key}`);
  } catch {
    // ignore
  }
}
