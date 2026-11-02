// Per-concept mastery (docs/dadu/16-assessment.md section 5). Pure.
import type { Difficulty } from '../core/ageBands';
import type { AgeBand } from '../core/ageBands';
import type { MasteryRecord } from '../core/worldState';

const DAY = 86_400_000;
export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { gentle: 0.8, steady: 1.0, stretch: 1.25 };

export type MasteryState = 'new' | 'exploring' | 'growing' | 'nearly' | 'mastered' | 'needs-revision';

/** r: 1 first-try correct, 0.6 second-try correct, 0.8 parent-confirmed practical, 0 incorrect. */
export function updateMastery(rec: MasteryRecord | undefined, concept: string, r: number, difficulty: Difficulty, now: number): MasteryRecord {
  const prev = rec ?? { concept, score: 0, attempts: 0, correct: 0, lastSeenAt: 0, nextReviewAt: now };
  const alpha = prev.attempts < 3 ? 0.35 : 0.2;
  const target = Math.max(0, Math.min(1, r * DIFFICULTY_WEIGHT[difficulty]));
  const score = prev.score + alpha * (target - prev.score);
  const prevIntervalDays = prev.attempts === 0 ? 1 : Math.max(1, Math.round((prev.nextReviewAt - prev.lastSeenAt) / DAY) || 1);
  const intervalDays = r >= 0.6 ? Math.min(60, Math.round(prevIntervalDays * 2.2)) : 1;
  return {
    concept,
    score: Math.round(score * 1000) / 1000,
    attempts: prev.attempts + 1,
    correct: prev.correct + (r >= 0.6 ? 1 : 0),
    lastSeenAt: now,
    nextReviewAt: now + intervalDays * DAY,
  };
}

export function masteryState(rec: MasteryRecord | undefined, now: number): MasteryState {
  if (!rec || rec.attempts === 0) return 'new';
  if (rec.attempts < 3) return 'exploring';
  const overdue = rec.nextReviewAt < now;
  if (rec.attempts >= 4 && rec.score >= 0.6 && (overdue || rec.score < 0.7) && rec.score < 0.8) return 'needs-revision';
  if (rec.score >= 0.8 && rec.attempts >= 4) return overdue ? 'needs-revision' : 'mastered';
  if (rec.score >= 0.6) return 'nearly';
  return 'growing';
}

export function dueForRevision(records: Record<string, MasteryRecord>, now: number): MasteryRecord[] {
  return Object.values(records)
    .filter((r) => r.attempts > 0 && r.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

export function weakConcepts(records: Record<string, MasteryRecord>): MasteryRecord[] {
  return Object.values(records).filter((r) => r.attempts >= 3 && r.score < 0.6).sort((a, b) => a.score - b.score);
}

const STEPS: Difficulty[] = ['gentle', 'steady', 'stretch'];
const shift = (d: Difficulty, by: number): Difficulty => STEPS[Math.max(0, Math.min(2, STEPS.indexOf(d) + by))];

/** docs 16-assessment.md 5.4: base from mastery, parent setting shifts, streaks shift, bands clamp. */
export function pickNextDifficulty(input: { mastery: number; parent: Difficulty; band: AgeBand; lastThree: boolean[]; lastServed?: Difficulty }): { difficulty: Difficulty; why: string } {
  let d: Difficulty = input.mastery < 0.5 ? 'gentle' : input.mastery < 0.8 ? 'steady' : 'stretch';
  const reasons = [`mastery ${input.mastery.toFixed(2)} → ${d}`];
  if (input.parent === 'gentle') { d = shift(d, -1); reasons.push('parent setting gentle'); }
  if (input.parent === 'stretch') { d = shift(d, 1); reasons.push('parent setting stretch'); }
  const l3 = input.lastThree.slice(-3);
  if (l3.length === 3 && l3.every(Boolean)) { d = shift(d, 1); reasons.push('three right in a row'); }
  else if (l3.length >= 2 && l3.slice(-2).every((x) => !x)) { d = shift(d, -1); reasons.push('two to think about'); }
  if ((input.band === 'A1' || input.band === 'A2') && d === 'stretch') { d = 'steady'; reasons.push('Little mode never stretches'); }
  if (input.band === 'A5' && d === 'gentle' && input.lastServed === 'gentle' && input.mastery >= 0.8) { d = 'steady'; reasons.push('A5 mastered concept: not gentle twice'); }
  return { difficulty: d, why: reasons.join('; ') };
}

export function summarise(records: Record<string, MasteryRecord>, now: number) {
  const all = Object.values(records);
  const states = all.map((r) => masteryState(r, now));
  return {
    concepts: all.length,
    mastered: states.filter((s) => s === 'mastered').length,
    needsRevision: states.filter((s) => s === 'needs-revision' || s === 'growing').length,
    mean: all.length ? all.reduce((s, r) => s + r.score, 0) / all.length : 0,
  };
}
