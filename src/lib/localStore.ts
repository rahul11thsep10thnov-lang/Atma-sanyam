"use client";

// Client-side persistence layer used in demo mode (no Supabase project
// configured yet). Shapes mirror the Supabase tables 1:1 (bookmarks,
// wrong_questions, test_attempts, profiles.points/streak) so swapping this
// module's internals for real Supabase calls later is a drop-in change —
// callers don't need to know which backend is active.

import { Question, QuestionReport, ReportReason, TestAttemptResult } from "@/types";
import { QUESTIONS } from "@/data/questions";

const KEYS = {
  bookmarks: "pe_bookmarks",
  wrongQuestions: "pe_wrong_questions",
  attempts: "pe_attempts",
  points: "pe_points",
  streak: "pe_streak",
  lastQuizDate: "pe_last_quiz_date",
  displayName: "pe_display_name",
  reports: "pe_question_reports",
  adminQuestions: "pe_admin_questions",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode errors
  }
}

// ---------- Bookmarks ----------
export function getBookmarks(): string[] {
  return read<string[]>(KEYS.bookmarks, []);
}

export function isBookmarked(questionId: string): boolean {
  return getBookmarks().includes(questionId);
}

export function toggleBookmark(questionId: string): boolean {
  const current = getBookmarks();
  const exists = current.includes(questionId);
  const next = exists ? current.filter((id) => id !== questionId) : [...current, questionId];
  write(KEYS.bookmarks, next);
  return !exists;
}

// ---------- Wrong questions (Meri Mistakes) ----------
interface WrongEntry {
  questionId: string;
  wrongCount: number;
  lastWrongAt: string;
}

export function getWrongQuestions(): WrongEntry[] {
  return read<WrongEntry[]>(KEYS.wrongQuestions, []);
}

export function recordAnswer(questionId: string, isCorrect: boolean) {
  const current = getWrongQuestions();
  if (isCorrect) {
    write(
      KEYS.wrongQuestions,
      current.filter((w) => w.questionId !== questionId)
    );
    return;
  }
  const existing = current.find((w) => w.questionId === questionId);
  if (existing) {
    existing.wrongCount += 1;
    existing.lastWrongAt = new Date().toISOString();
    write(KEYS.wrongQuestions, [...current]);
  } else {
    write(KEYS.wrongQuestions, [
      ...current,
      { questionId, wrongCount: 1, lastWrongAt: new Date().toISOString() },
    ]);
  }
}

export function clearMistake(questionId: string) {
  write(
    KEYS.wrongQuestions,
    getWrongQuestions().filter((w) => w.questionId !== questionId)
  );
}

// ---------- Attempts ----------
export function getAttempts(): TestAttemptResult[] {
  return read<TestAttemptResult[]>(KEYS.attempts, []);
}

export function saveAttempt(attempt: TestAttemptResult) {
  const current = getAttempts();
  write(KEYS.attempts, [attempt, ...current].slice(0, 100));
}

// ---------- Points / gamification ----------
export function getPoints(): number {
  return read<number>(KEYS.points, 0);
}

export function addPoints(amount: number): number {
  const next = getPoints() + amount;
  write(KEYS.points, next);
  return next;
}

export function getStreak(): number {
  return read<number>(KEYS.streak, 0);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function recordDailyQuizCompletion(): { streak: number; alreadyDoneToday: boolean } {
  const last = read<string | null>(KEYS.lastQuizDate, null);
  const today = todayKey();
  if (last === today) {
    return { streak: getStreak(), alreadyDoneToday: true };
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const currentStreak = getStreak();
  const nextStreak = last === yesterday ? currentStreak + 1 : 1;
  write(KEYS.streak, nextStreak);
  write(KEYS.lastQuizDate, today);
  addPoints(20);
  return { streak: nextStreak, alreadyDoneToday: false };
}

export function getDisplayName(): string {
  return read<string>(KEYS.displayName, "PoliceAspirant" + Math.floor(Math.random() * 900 + 100));
}

export function setDisplayName(name: string) {
  write(KEYS.displayName, name);
}

// ---------- Gamification: badges computed from local activity ----------
export function getEarnedBadgeCodes(): string[] {
  const attempts = getAttempts();
  const streak = getStreak();
  const totalAttempted = attempts.reduce((sum, a) => sum + a.correct + a.incorrect + a.skipped, 0);
  const mockAttempts = attempts.filter((a) => a.mockId.includes("full-mock")).length;
  const stateGkAttempts = attempts.filter((a) => a.mockId.includes("state-gk"));
  const stateGkAccuracy = stateGkAttempts.length
    ? stateGkAttempts.reduce((sum, a) => sum + a.accuracy, 0) / stateGkAttempts.length
    : 0;

  const earned: string[] = [];
  if (streak >= 7) earned.push("streak-7");
  if (totalAttempted >= 100) earned.push("questions-100");
  if (totalAttempted >= 500) earned.push("questions-500");
  if (totalAttempted >= 1000) earned.push("questions-1000");
  if (stateGkAttempts.length > 0 && stateGkAccuracy >= 90) earned.push("state-gk-master");
  if (mockAttempts >= 5) earned.push("mock-master");
  if (attempts.length >= 20) earned.push("consistency-star");
  return earned;
}

// ---------- Question reports ("Report Question") ----------
export function getQuestionReports(): QuestionReport[] {
  return read<QuestionReport[]>(KEYS.reports, []);
}

export function addQuestionReport(questionId: string, reason: ReportReason, note?: string) {
  const current = getQuestionReports();
  const report: QuestionReport = {
    id: `report-${Date.now()}`,
    questionId,
    reason,
    note,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  write(KEYS.reports, [report, ...current]);
}

export function updateReportStatus(id: string, status: QuestionReport["status"]) {
  const current = getQuestionReports();
  write(
    KEYS.reports,
    current.map((r) => (r.id === id ? { ...r, status } : r))
  );
}

// ---------- Admin question moderation (demo mode) ----------
// In demo mode (no Supabase configured) this is the admin's working copy of
// the question bank, seeded once from the static seed data. Every admin
// panel action (add/edit/delete/duplicate/publish) mutates this copy so the
// full moderation workflow is exercisable end-to-end without a backend.
// Swapping this module's internals for real `questions` table reads/writes
// (already modeled 1:1 in supabase/schema.sql) is a drop-in change.
export function getAdminQuestions(): Question[] {
  const existing = read<Question[] | null>(KEYS.adminQuestions, null);
  if (existing) return existing;
  write(KEYS.adminQuestions, QUESTIONS);
  return QUESTIONS;
}

export function saveAdminQuestions(questions: Question[]) {
  write(KEYS.adminQuestions, questions);
}

export function upsertAdminQuestion(question: Question) {
  const current = getAdminQuestions();
  const idx = current.findIndex((q) => q.id === question.id);
  if (idx >= 0) {
    const next = [...current];
    next[idx] = question;
    saveAdminQuestions(next);
  } else {
    saveAdminQuestions([question, ...current]);
  }
}

export function deleteAdminQuestion(id: string) {
  saveAdminQuestions(getAdminQuestions().filter((q) => q.id !== id));
}

export function resetAdminQuestions() {
  write(KEYS.adminQuestions, QUESTIONS);
}
