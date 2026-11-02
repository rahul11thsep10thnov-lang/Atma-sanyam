// The lesson runner: a pure state machine over Lesson.steps[level] that
// follows the DADU teaching formula and never shames. Screens render the
// current step; every action returns a new state.
import type { Lesson, LessonStep, Level, Localised } from '../core/content';
import { evaluate } from './activities';
import type { ActivityAnswer, ActivityResult } from './activities';

export type Phase = 'intro' | 'question' | 'friend' | 'explain' | 'activity' | 'feedback' | 'quiz' | 'echo' | 'done';
export type Variant = 'normal' | 'simpler' | 'advanced' | 'example';

export interface LessonState {
  lessonId: string;
  level: Level;
  stepIndex: number;
  phase: Phase;
  picked: ActivityAnswer | null;
  lastResult: ActivityResult | null;
  /** Attempts at the current activity or quiz step. */
  attempts: number;
  quizAttempts: number;
  quizCorrect: boolean;
  activityDone: boolean;
  variant: Variant;
  onBreak: boolean;
  /** Clauses tagged echo:true collected on the way, for Mitthu. */
  echoClauses: Localised[];
  startedAt: number;
  finishedAt: number | null;
  /** How many times the child asked to hear a line again (curiosity, not a score). */
  repeats: number;
}

export interface LessonResult {
  lessonId: string;
  concept: string;
  correct: boolean;
  attempts: number;
  durationMs: number;
  stars: number;
  coins: number;
  /** Mastery result weight: 1 first try, 0.6 later tries. */
  resultWeight: number;
}

/** Maps the step list onto the canonical eight phases. */
export function phases(steps: LessonStep[]): Phase[] {
  const out: Phase[] = [];
  let dialoguesBefore = 0;
  let seenActivity = false;
  const pre: Phase[] = ['intro', 'question', 'friend', 'explain'];
  for (const s of steps) {
    if (s.type === 'dialogue') {
      if (!seenActivity) { out.push(pre[Math.min(dialoguesBefore, 3)]); dialoguesBefore++; }
      else out.push('feedback');
    } else if (s.type === 'activity') { out.push('activity'); seenActivity = true; }
    else if (s.type === 'quiz') out.push('quiz');
    else out.push('echo');
  }
  return out;
}

export function startLesson(lesson: Lesson, level: Level, now: number): LessonState {
  const steps = lesson.steps[level];
  return {
    lessonId: lesson.meta.id, level, stepIndex: 0, phase: steps.length ? phases(steps)[0] : 'done',
    picked: null, lastResult: null, attempts: 0, quizAttempts: 0, quizCorrect: false, activityDone: false,
    variant: 'normal', onBreak: false, echoClauses: [], startedAt: now, finishedAt: null, repeats: 0,
  };
}

export function currentStep(lesson: Lesson, s: LessonState): LessonStep | null {
  return lesson.steps[s.level][s.stepIndex] ?? null;
}

/** True when Next may be pressed: dialogue always, activity/quiz only once answered correctly. */
export function canAdvance(lesson: Lesson, s: LessonState): boolean {
  const step = currentStep(lesson, s);
  if (!step || s.phase === 'done') return false;
  if (step.type === 'activity') return s.activityDone;
  if (step.type === 'quiz') return s.quizCorrect;
  return true;
}

export function next(lesson: Lesson, s: LessonState, now: number): LessonState {
  if (!canAdvance(lesson, s)) return s;
  const steps = lesson.steps[s.level];
  const step = steps[s.stepIndex];
  const echoClauses = step.type === 'dialogue' && step.echo ? [...s.echoClauses, step.text] : step.type === 'echo' ? [...s.echoClauses, ...step.clauses] : s.echoClauses;
  const idx = s.stepIndex + 1;
  if (idx >= steps.length) return { ...s, stepIndex: idx, phase: 'done', echoClauses, finishedAt: now, picked: null, lastResult: null };
  return { ...s, stepIndex: idx, phase: phases(steps)[idx], echoClauses, picked: null, lastResult: null, attempts: 0, variant: 'normal' };
}

/** Answer the current activity or quiz. Wrong answers keep the step open with a warm retry line. */
export function pick(lesson: Lesson, s: LessonState, answer: ActivityAnswer): LessonState {
  const step = currentStep(lesson, s);
  if (!step || (step.type !== 'activity' && step.type !== 'quiz')) return s;
  const attempts = s.attempts + 1;
  if (step.type === 'activity') {
    const r = evaluate(step.activity, answer);
    return { ...s, picked: answer, lastResult: r, attempts, activityDone: s.activityDone || r.ok };
  }
  const key = Array.isArray(answer) ? String(answer[0]) : String(answer);
  const ok = !!step.items.find((i) => i.key === key)?.ok;
  const r: ActivityResult = { ok, feedback: ok ? { en: 'Shabash! That is right.', hi: 'शाबाश! बिल्कुल सही।' } : { en: 'Not this one. Let us look again together.', hi: 'यह नहीं। चलो फिर से साथ देखते हैं।' }, progress: ok ? 1 : 0 };
  return { ...s, picked: answer, lastResult: r, attempts, quizAttempts: s.quizAttempts + 1, quizCorrect: s.quizCorrect || ok };
}

export const retry = (s: LessonState): LessonState => ({ ...s, picked: null, lastResult: null });
export const simpler = (s: LessonState): LessonState => ({ ...s, variant: 'simpler' });
export const advanced = (s: LessonState): LessonState => ({ ...s, variant: 'advanced' });
export const example = (s: LessonState): LessonState => ({ ...s, variant: 'example' });
export const repeat = (s: LessonState): LessonState => ({ ...s, repeats: s.repeats + 1 });
export const takeBreak = (s: LessonState, on: boolean): LessonState => ({ ...s, onBreak: on });

/** The text to show for the current step given the variant (simpler/advanced/example come from the lesson). */
export function variantText(lesson: Lesson, s: LessonState): Localised | null {
  if (s.variant === 'simpler') return lesson.simpler;
  if (s.variant === 'advanced') return lesson.advanced;
  if (s.variant === 'example') return lesson.example;
  return null;
}

/** Reward rule: 1 star + 5 coins for finishing, +1 star when the quiz was right first time. Never negative. */
export function complete(lesson: Lesson, s: LessonState, now: number): LessonResult | null {
  if (s.phase !== 'done') return null;
  const firstTry = s.quizAttempts <= 1 && s.quizCorrect;
  const hadQuiz = lesson.steps[s.level].some((x) => x.type === 'quiz');
  return {
    lessonId: lesson.meta.id,
    concept: lesson.concept,
    correct: s.quizCorrect || !hadQuiz,
    attempts: s.quizAttempts,
    durationMs: Math.max(0, (s.finishedAt ?? now) - s.startedAt),
    stars: 1 + (firstTry ? 1 : 0),
    coins: 5,
    resultWeight: !hadQuiz ? 0.8 : firstTry ? 1 : s.quizCorrect ? 0.6 : 0,
  };
}
