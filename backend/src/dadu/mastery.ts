// Per-concept mastery (docs/dadu/16-assessment.md §5): an explainable
// exponential update plus spaced revision. Pure functions, unit tested
// through the progress endpoint.

export interface MasteryRow {
  score: number;
  attempts: number;
  correct: number;
  intervalDays: number;
  lastSeenAt: Date;
  nextReviewAt: Date;
}

export const DIFFICULTY_WEIGHT = { gentle: 0.8, steady: 1.0, stretch: 1.25 } as const;

export function updateMastery(
  prev: MasteryRow | null,
  result: number,
  difficulty: keyof typeof DIFFICULTY_WEIGHT = 'steady',
  now = new Date()
): MasteryRow {
  const m = prev?.score ?? 0;
  const n = prev?.attempts ?? 0;
  const alpha = n < 3 ? 0.35 : 0.2;
  const target = Math.max(0, Math.min(1, result * DIFFICULTY_WEIGHT[difficulty]));
  const score = m + alpha * (target - m);
  const correctNow = result >= 0.6;
  const intervalDays = correctNow ? Math.min(60, Math.round((prev?.intervalDays ?? 1) * 2.2)) : 1;
  const nextReviewAt = new Date(now.getTime() + intervalDays * 86_400_000);
  return {
    score: Math.max(0, Math.min(1, score)),
    attempts: n + 1,
    correct: (prev?.correct ?? 0) + (correctNow ? 1 : 0),
    intervalDays,
    lastSeenAt: now,
    nextReviewAt,
  };
}

export type MasteryState = 'new' | 'exploring' | 'growing' | 'nearly' | 'mastered' | 'revise';

export function masteryState(row: MasteryRow | null, now = new Date()): MasteryState {
  if (!row || row.attempts === 0) return 'new';
  if (row.attempts < 3) return 'exploring';
  const mastered = row.score >= 0.8 && row.attempts >= 4;
  if (mastered && row.nextReviewAt.getTime() < now.getTime()) return 'revise';
  if (mastered) return 'mastered';
  if (row.score < 0.6) return 'growing';
  return 'nearly';
}
