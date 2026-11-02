// Mitthu's Echo: revision only, never new material (02-character-bible.md).
import type { AgeBand } from '../core/ageBands';
import type { Lesson, Localised } from '../core/content';
import type { MasteryRecord } from '../core/worldState';
import { masteryState } from './mastery';

export type EchoTrigger = 'lesson-count' | 'end-of-topic' | 'mastery-dip' | 'parent-request' | 'return-after-absence';

export interface EchoSession { trigger: EchoTrigger; lessonIds: string[]; clauses: Localised[]; concept?: string }

export const ECHO_EVERY: Record<AgeBand, number> = { A0: 2, A1: 2, A2: 2, A3: 3, A4: 3, A5: 3 };
const DAY = 86_400_000;

export function echoClausesOf(lesson: Lesson, level: 'little' | 'explorer'): Localised[] {
  const out: Localised[] = [];
  for (const s of lesson.steps[level]) {
    if (s.type === 'echo') out.push(...s.clauses);
    else if (s.type === 'dialogue' && s.echo) out.push(s.text);
  }
  return out.slice(0, 3);
}

/** Decide whether an Echo should open now, and build it. Returns null when no trigger fires. */
export function nextEcho(input: {
  band: AgeBand;
  level: 'little' | 'explorer';
  lessons: Record<string, Lesson>;
  completedInOrder: string[];
  mastery: Record<string, MasteryRecord>;
  lastOpenedAt: number;
  now: number;
  parentRequestLessonId?: string;
  echoedLessonIds: string[];
}): EchoSession | null {
  const { lessons, completedInOrder, now } = input;
  const last = completedInOrder[completedInOrder.length - 1];
  const lastLesson = last ? lessons[last] : undefined;
  const build = (trigger: EchoTrigger, ids: string[], concept?: string): EchoSession | null => {
    const clauses = ids.flatMap((id) => (lessons[id] ? echoClausesOf(lessons[id], input.level) : [])).slice(0, 3);
    return clauses.length ? { trigger, lessonIds: ids, clauses, concept } : null;
  };
  if (input.parentRequestLessonId && lessons[input.parentRequestLessonId]) return build('parent-request', [input.parentRequestLessonId]);
  if (input.lastOpenedAt > 0 && now - input.lastOpenedAt >= 3 * DAY && lastLesson) return build('return-after-absence', [last]);
  for (const r of Object.values(input.mastery)) {
    if (masteryState(r, now) === 'needs-revision') {
      const ids = Object.values(lessons).filter((l) => l.concept === r.concept && completedInOrder.includes(l.meta.id)).map((l) => l.meta.id).slice(0, 2);
      const e = build('mastery-dip', ids, r.concept);
      if (e) return e;
    }
  }
  if (lastLesson && !input.echoedLessonIds.includes(last)) {
    const topicLessons = Object.values(lessons).filter((l) => l.meta.section === lastLesson.meta.section && l.meta.topic === lastLesson.meta.topic);
    const topicDone = topicLessons.every((l) => completedInOrder.includes(l.meta.id));
    if (topicDone && topicLessons.length > 1) return build('end-of-topic', topicLessons.map((l) => l.meta.id).slice(-3));
    const sameSubject = completedInOrder.filter((id) => lessons[id]?.meta.subject === lastLesson.meta.subject);
    if (sameSubject.length > 0 && sameSubject.length % ECHO_EVERY[input.band] === 0) return build('lesson-count', sameSubject.slice(-ECHO_EVERY[input.band]));
  }
  return null;
}

export interface EchoState { index: number; repeated: boolean[] }
export const startEcho = (s: EchoSession): EchoState => ({ index: 0, repeated: s.clauses.map(() => false) });
export function echoRepeat(s: EchoState, session: EchoSession): EchoState {
  const repeated = [...s.repeated]; repeated[s.index] = true;
  return { index: Math.min(session.clauses.length, s.index + 1), repeated };
}
export const echoDone = (s: EchoState, session: EchoSession) => s.index >= session.clauses.length;
