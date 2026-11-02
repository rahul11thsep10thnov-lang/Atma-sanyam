import type { Lesson } from '../../core/content';
import { ACADEMIC } from './academic';
import { STEM } from './stem';
import { MUSIC } from './music';
import { ART } from './art';
import { SPORTS } from './sports';
import { NATURE } from './nature';
import { MIND } from './mind';
import { EXPLORE } from './explore';

export const LESSONS: Lesson[] = [...ACADEMIC, ...STEM, ...MUSIC, ...ART, ...SPORTS, ...NATURE, ...MIND, ...EXPLORE];
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.meta.id, l]));
