// Story reader state: pages, read-along sentence highlighting, bedtime pacing,
// comprehension by level. Pure.
import type { Level, QuizStep, Story } from '../core/content';

export interface ReaderState { storyId: string; page: number; sentence: number; bedtime: boolean; startedAt: number; finished: boolean }

export function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?।])\s+/).map((s) => s.trim()).filter(Boolean);
}

export const startReader = (story: Story, now: number, bedtime = false): ReaderState => ({ storyId: story.meta.id, page: 0, sentence: 0, bedtime, startedAt: now, finished: false });

/** Milliseconds per sentence for the read-along highlight; bedtime mode is slower and calmer. */
export function paceMs(sentence: string, bedtime: boolean, narrationRate = 1): number {
  const words = sentence.split(/\s+/).length;
  const base = 420 * words + 600;
  return Math.round((base * (bedtime ? 1.35 : 1)) / Math.max(0.5, narrationRate));
}

export function nextSentence(story: Story, s: ReaderState, lang: string): ReaderState {
  const text = (story.pages[s.page]?.text as Record<string, string | undefined>)[lang] ?? story.pages[s.page]?.text.en ?? '';
  const n = sentencesOf(text).length;
  if (s.sentence + 1 < n) return { ...s, sentence: s.sentence + 1 };
  return nextPage(story, s);
}

export function nextPage(story: Story, s: ReaderState): ReaderState {
  if (s.page + 1 >= story.pages.length) return { ...s, finished: true };
  return { ...s, page: s.page + 1, sentence: 0 };
}

export const prevPage = (s: ReaderState): ReaderState => ({ ...s, page: Math.max(0, s.page - 1), sentence: 0, finished: false });

/** Bedtime mode asks nothing at night; questions wait for the next morning. */
export function questionsFor(story: Story, level: Level, bedtime: boolean): QuizStep[] {
  if (bedtime) return [];
  return story.questions[level] ?? [];
}

export const BEDTIME_HOURS = { from: 19, to: 6 };
export function isBedtimeHour(now: number): boolean {
  const h = new Date(now).getHours();
  return h >= BEDTIME_HOURS.from || h < BEDTIME_HOURS.to;
}
