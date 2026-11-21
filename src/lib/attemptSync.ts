"use client";

import type { RunnerAnswers } from "@/components/exam/ExamRunner";
import { cacheDelete, cacheGet, cacheSet, type AnswerPayload, type AttemptState, type LiveTest } from "@/lib/liveApi";

// Local copy of a live attempt: the answers, a version per question (the
// time of the change on the server's clock, in ms since the attempt began)
// and the version the server has confirmed. Anything with version > saved is
// still to be sent. The same copy is used to resume after a refresh.

export interface LocalAttempt {
  attemptId: string;
  answers: RunnerAnswers;
  versions: Record<string, number>;
  saved: Record<string, number>;
}

const key = (attemptId: string) => `attempt_${attemptId}`;

export function loadLocal(attemptId: string): LocalAttempt {
  return cacheGet<LocalAttempt>(key(attemptId)) ?? { attemptId, answers: {}, versions: {}, saved: {} };
}

export function storeLocal(l: LocalAttempt) {
  cacheSet(key(l.attemptId), l);
}

export function dropLocal(attemptId: string) {
  cacheDelete(key(attemptId));
}

/** Questions whose answer or review mark differs between two answer sets. */
export function changedQuestions(before: RunnerAnswers, after: RunnerAnswers): string[] {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...ids].filter((id) => {
    const a = before[id];
    const b = after[id];
    return (a?.selected ?? null) !== (b?.selected ?? null) || !!a?.marked !== !!b?.marked;
  });
}

/** Merges the server's saved answers into the local copy: per question, the
 * newer version wins (another device, or changes saved before a crash). */
export function mergeServer(local: LocalAttempt, test: LiveTest, state: AttemptState): LocalAttempt {
  const next: LocalAttempt = { ...local, answers: { ...local.answers }, versions: { ...local.versions }, saved: { ...local.saved } };
  for (const a of state.answers) {
    const q = test.questions.find((x) => x.id === a.questionId);
    if (!q) continue;
    const localV = next.versions[a.questionId] ?? 0;
    next.saved[a.questionId] = Math.max(next.saved[a.questionId] ?? 0, a.version);
    if (a.version > localV) {
      const i = a.selectedOption ? q.options.findIndex((o) => o.label === a.selectedOption) : -1;
      const prev = next.answers[a.questionId];
      next.answers[a.questionId] = {
        selected: i >= 0 ? i : null,
        marked: a.markedForReview,
        visited: true,
        seconds: Math.max(prev?.seconds ?? 0, a.timeSpentSeconds ?? 0),
      };
      next.versions[a.questionId] = a.version;
    }
  }
  return next;
}

/** One answer as the API expects it: an option label, never a score. */
export function toAnswerPayload(test: LiveTest, l: LocalAttempt, questionId: string): AnswerPayload | null {
  const q = test.questions.find((x) => x.id === questionId);
  if (!q) return null;
  const a = l.answers[questionId];
  const i = a?.selected;
  return {
    questionId,
    selectedOption: i === null || i === undefined ? null : (q.options[i]?.label ?? null),
    markedForReview: !!a?.marked,
    timeSpentSeconds: a?.seconds ?? null,
    version: l.versions[questionId] ?? 0,
  };
}

export function dirtyQuestions(l: LocalAttempt): string[] {
  return Object.keys(l.versions).filter((id) => (l.versions[id] ?? 0) > (l.saved[id] ?? 0));
}
