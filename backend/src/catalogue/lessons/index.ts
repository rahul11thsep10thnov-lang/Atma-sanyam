// All seeded lessons. Each file is one section; the template is checked
// when the seed runs so a malformed lesson can never reach the database.
import { assertTemplate, type LessonSeed } from './helpers.js';
import { STUDY_A } from './studyA.js';
import { STUDY_B } from './studyB.js';
import { MUSIC } from './music.js';
import { SPORTS } from './sports.js';

export const LESSON_SEEDS: LessonSeed[] = [...STUDY_A, ...STUDY_B, ...MUSIC, ...SPORTS];

const ids = new Set<string>();
for (const l of LESSON_SEEDS) {
  if (ids.has(l.id)) throw new Error(`Duplicate lesson id ${l.id}`);
  ids.add(l.id);
  assertTemplate(l);
}

export type { LessonSeed } from './helpers.js';
