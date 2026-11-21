"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/localStore";

// Client for the PoliceChayan API (backend/). Only public data and the
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
    message: string,
    /** Machine-readable code from the API, e.g. `subscription_required`. */
    public code?: string,
    public details?: unknown
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

const DEVICE_KEY = "pc_device_id";

/** A random id for this browser, sent as X-Device-Id. The server stores only
 * a keyed hash of it (free-test protection); it identifies nobody. */
export function deviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const device = typeof window !== "undefined" ? deviceId() : null;
  if (device) headers["X-Device-Id"] = device;
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
    const err = (body as { error?: { message?: string; code?: string; details?: unknown } } | null)?.error;
    throw new LiveApiError(res.status, err?.message ?? `Request failed (${res.status})`, err?.code, err?.details);
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
  kind?: "full" | "subject";
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
    /** Non-verbal questions: problem figure (SVG) — shown with <img>, never inlined. */
    figureSvg?: string | null;
    options: { label: string; text: string; svg?: string | null }[];
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
  /** submitted = by the candidate; auto_submitted = closed by the server at the deadline. */
  status?: "submitted" | "auto_submitted";
  timeTakenSeconds: number | null;
  late: boolean;
  marksPerQuestion?: number;
  negativeMarks?: number;
  summary: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    maxScore: number;
    percentage: number;
    negativeMarksLost?: number;
    accuracy?: number;
    averageSecondsPerAnswered?: number | null;
  };
  sections: { subjectName: string; total: number; correct: number; incorrect?: number; unanswered?: number; timeSeconds?: number }[];
  topics?: { chapterId: string; subjectName: string; chapterName: string; total: number; correct: number; incorrect: number; unanswered: number }[];
  questions: {
    questionId: string;
    questionText: string;
    subjectName?: string;
    chapterName?: string | null;
    figureSvg?: string | null;
    options: { label: string; text: string; svg?: string | null }[];
    selectedOption: string | null;
    correctOption: string;
    isCorrect?: boolean | null;
    timeSpentSeconds?: number | null;
    explanation: string | null;
  }[];
}

export interface AnswerPayload {
  questionId: string;
  selectedOption: string | null;
  markedForReview: boolean;
  timeSpentSeconds?: number | null;
  version?: number;
}

export interface AttemptState {
  attemptId: string;
  mockTestId: string;
  status: "in_progress" | "submitted" | "auto_submitted";
  startedAt: string;
  deadlineAt: string;
  serverTime: string;
  graceSeconds: number;
  answers: { questionId: string; selectedOption: string | null; markedForReview: boolean; timeSpentSeconds: number | null; version: number }[];
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

export interface Entitlement {
  subscribed: boolean;
  expiresAt: string | null;
  plan: { name: string; priceInr: number; listPriceInr: number; durationDays: number };
  freeQuota: Record<"full" | "subject", { used: number; limit: number; remaining: number }>;
}

export interface EnrollOrder {
  provider: "razorpay" | "dev";
  orderId: string;
  amountInr: number;
  listPriceInr: number;
  currency: "INR";
  planName: string;
  durationDays: number;
  keyId?: string;
  providerOrderId?: string;
}

export const liveApi = {
  me: () => authed<{ id: string; displayName: string | null; authProvider: string; entitlement: Entitlement }>("/me"),
  enrollOrder: () => authed<EnrollOrder>("/enroll/order", { method: "POST" }),
  enrollConfirm: (body: { orderId: string; paymentId?: string; signature?: string }) =>
    authed<{ subscription: { status: string; expiresAt: string | null }; entitlement: Entitlement }>("/enroll/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listTests: (q: { state?: string; examType?: string }) => {
    const p = new URLSearchParams();
    if (q.state) p.set("state", q.state);
    if (q.examType) p.set("examType", q.examType);
    p.set("pageSize", "100");
    return request<{ items: LiveTestSummary[]; total: number }>(`/mock-tests?${p}`);
  },
  getTest: (id: string) => request<LiveTest>(`/mock-tests/${encodeURIComponent(id)}`),
  start: (id: string) => authed<StartedAttempt>(`/mock-tests/${encodeURIComponent(id)}/start`, { method: "POST" }),
  submit: (id: string, attemptId: string, answers: AnswerPayload[]) =>
    authed<LiveResult>(`/mock-tests/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    }),
  /** Autosave (versioned: the server keeps the newest change per question). */
  saveAnswers: (attemptId: string, answers: AnswerPayload[]) =>
    authed<{ saved: { questionId: string; version: number }[]; stale: string[]; serverTime: string; deadlineAt: string }>(
      `/attempts/${encodeURIComponent(attemptId)}/answers`,
      { method: "PUT", body: JSON.stringify({ answers }) }
    ),
  attemptState: (attemptId: string) => authed<AttemptState>(`/attempts/${encodeURIComponent(attemptId)}/state`),
  serverTime: () => request<{ serverTime: string }>("/time"),
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
