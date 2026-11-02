// Assessment sets and the twelve question types (docs/dadu/16-assessment.md). Pure.
import type { ActivityItem, Lesson, Level, Localised, QuizStep } from '../core/content';
import type { AgeBand } from '../core/ageBands';
import type { MasteryRecord } from '../core/worldState';
import { dueForRevision, weakConcepts } from './mastery';

export type AssessmentType = 'daily' | 'chapter' | 'subject' | 'weekly' | 'monthly' | 'revision' | 'comprehensive' | 'challenge' | 'olympiad';
export type QuestionKind = 'mcq' | 'true-false' | 'match' | 'fill-blank' | 'image' | 'audio' | 'drag-drop' | 'sequence' | 'memory' | 'practical' | 'oral' | 'drawing';

export const KINDS_BY_BAND: Record<AgeBand, QuestionKind[]> = {
  A0: ['image', 'audio'],
  A1: ['image', 'audio', 'match', 'drag-drop'],
  A2: ['image', 'audio', 'match', 'drag-drop', 'memory', 'sequence', 'oral', 'drawing'],
  A3: ['mcq', 'true-false', 'match', 'fill-blank', 'image', 'audio', 'drag-drop', 'sequence', 'memory', 'practical', 'oral', 'drawing'],
  A4: ['mcq', 'true-false', 'match', 'fill-blank', 'image', 'audio', 'drag-drop', 'sequence', 'memory', 'practical', 'oral', 'drawing'],
  A5: ['mcq', 'true-false', 'match', 'fill-blank', 'image', 'audio', 'drag-drop', 'sequence', 'memory', 'practical', 'oral', 'drawing'],
};

export const SET_LENGTH: Record<AssessmentType, number> = { daily: 3, chapter: 6, subject: 10, weekly: 8, monthly: 12, revision: 5, comprehensive: 20, challenge: 6, olympiad: 10 };

export interface AssessmentItem {
  id: string;
  kind: QuestionKind;
  lessonId: string;
  concept: string;
  question: Localised;
  items: ActivityItem[];
  explain: Localised;
}

export interface AssessmentSet { type: AssessmentType; items: AssessmentItem[]; createdAt: number; why: string[] }

export type Answer = string | string[] | boolean | Record<string, string> | { confirmed: boolean };

/** Validation for every question kind. */
export function isCorrect(kind: QuestionKind, items: ActivityItem[], answer: Answer): boolean {
  switch (kind) {
    case 'mcq': case 'image': case 'audio':
      return !!items.find((i) => i.key === answer)?.ok;
    case 'true-false':
      return (items.find((i) => i.ok)?.key === 'true') === (answer === true || answer === 'true');
    case 'fill-blank': {
      const want = items.filter((i) => i.ok).map((i) => i.key.toLowerCase().trim());
      return want.includes(String(answer).toLowerCase().trim());
    }
    case 'match': case 'drag-drop': {
      const map = (typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, string>;
      const g = items.filter((i) => i.group !== undefined);
      return g.length > 0 && g.every((i) => map[i.key] === i.group);
    }
    case 'sequence': {
      const exp = items.filter((i) => i.order !== undefined).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((i) => i.key);
      const got = Array.isArray(answer) ? answer : [];
      return exp.length === got.length && exp.every((k, idx) => k === got[idx]);
    }
    case 'memory': {
      const got = Array.isArray(answer) ? answer : [];
      const a = items.find((i) => i.key === got[0]); const b = items.find((i) => i.key === got[1]);
      return !!a && !!b && a.key !== b.key && a.group !== undefined && a.group === b.group;
    }
    case 'practical': case 'oral': case 'drawing':
      // Confirmed by a parent or by participation; never graded.
      return typeof answer === 'object' && !Array.isArray(answer) ? !!(answer as { confirmed?: boolean }).confirmed : answer === true;
  }
}

/** The result weight that feeds mastery (16-assessment.md 5.1). */
export function resultWeight(kind: QuestionKind, correct: boolean, attempt: number): number {
  if (kind === 'practical' || kind === 'oral' || kind === 'drawing') return correct ? 0.8 : 0;
  if (!correct) return 0;
  return attempt <= 1 ? 1 : 0.6;
}

function quizItemsOf(lesson: Lesson, level: Level): AssessmentItem[] {
  const out: AssessmentItem[] = [];
  lesson.steps[level].forEach((s, idx) => {
    if (s.type === 'quiz') {
      const q = s as QuizStep;
      out.push({ id: `q.${lesson.meta.id}.${idx}`, kind: level === 'little' ? 'image' : 'mcq', lessonId: lesson.meta.id, concept: lesson.concept, question: q.question, items: q.items, explain: q.explain });
    }
  });
  return out;
}

/** Due concepts first, then weak, then new material; never two items from one lesson in a short set. */
export function buildAssessment(type: AssessmentType, pool: Lesson[], level: Level, mastery: Record<string, MasteryRecord>, now: number, filter?: (l: Lesson) => boolean): AssessmentSet {
  const lessons = pool.filter((l) => !filter || filter(l));
  const byConcept = new Map<string, Lesson[]>();
  for (const l of lessons) byConcept.set(l.concept, [...(byConcept.get(l.concept) ?? []), l]);
  const why: string[] = [];
  const ordered: Lesson[] = [];
  const seen = new Set<string>();
  const push = (l: Lesson, reason: string) => { if (!seen.has(l.meta.id)) { seen.add(l.meta.id); ordered.push(l); why.push(`${l.meta.id}: ${reason}`); } };
  for (const r of dueForRevision(mastery, now)) for (const l of byConcept.get(r.concept) ?? []) push(l, 'due for revision');
  for (const r of weakConcepts(mastery)) for (const l of byConcept.get(r.concept) ?? []) push(l, 'needs practice');
  for (const l of lessons) if (!mastery[l.concept]) push(l, 'new');
  for (const l of lessons) push(l, 'practice');
  const n = SET_LENGTH[type];
  const items: AssessmentItem[] = [];
  for (const l of ordered) {
    const q = quizItemsOf(l, level)[0];
    if (q) items.push(q);
    if (items.length >= n) break;
  }
  return { type, items, createdAt: now, why: why.slice(0, items.length) };
}

/** Olympiad-style practice: harder lessons only, more items, no revision ordering (it is a challenge, not a check-up). */
export function buildOlympiad(pool: Lesson[], level: Level, now: number): AssessmentSet {
  const hard = pool.filter((l) => l.meta.difficulty >= 3);
  const items = hard.flatMap((l) => quizItemsOf(l, level)).slice(0, SET_LENGTH.olympiad);
  return { type: 'olympiad', items, createdAt: now, why: items.map(() => 'challenge') };
}

export interface SetProgress { answered: number; correct: number; firstTry: number; byConcept: Record<string, { correct: number; total: number }> }
export function emptyProgress(): SetProgress { return { answered: 0, correct: 0, firstTry: 0, byConcept: {} }; }
export function recordAnswer(p: SetProgress, item: AssessmentItem, correct: boolean, attempt: number): SetProgress {
  const c = p.byConcept[item.concept] ?? { correct: 0, total: 0 };
  return {
    answered: p.answered + 1,
    correct: p.correct + (correct ? 1 : 0),
    firstTry: p.firstTry + (correct && attempt <= 1 ? 1 : 0),
    byConcept: { ...p.byConcept, [item.concept]: { correct: c.correct + (correct ? 1 : 0), total: c.total + 1 } },
  };
}
