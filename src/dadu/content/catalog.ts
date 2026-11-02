// Content index helpers and validation used by the app, the CMS pack
// builder and the tests.
import type { AgeBand } from '../core/ageBands';
import type { Assignment, InteractiveObject, Lang, Lesson, Localised, Story } from '../core/content';
import { LOCATION_BY_ID } from '../core/locations';
import type { SectionKey } from '../core/worlds';
import { SECTIONS } from '../core/worlds';
import { LESSONS, LESSON_BY_ID } from './lessons';
import { OBJECTS, OBJECT_BY_ID, canonicalObject } from './objects';
import { STORIES, STORY_BY_ID, COLLECTIONS } from './stories';
import { ASSIGNMENTS, ASSIGNMENT_BY_ID } from './assignments';

export { LESSONS, LESSON_BY_ID, OBJECTS, OBJECT_BY_ID, STORIES, STORY_BY_ID, COLLECTIONS, ASSIGNMENTS, ASSIGNMENT_BY_ID, canonicalObject };

export function lessonsBySection(section: SectionKey): Lesson[] { return LESSONS.filter((l) => l.meta.section === section); }
export function lessonsForBand(band: AgeBand, section?: SectionKey): Lesson[] { return LESSONS.filter((l) => l.meta.bands.includes(band) && (!section || l.meta.section === section)); }
export function lessonForObject(objectId: string): Lesson | undefined {
  const o = OBJECT_BY_ID[canonicalObject(objectId)];
  return o?.lesson ? LESSON_BY_ID[o.lesson] : undefined;
}
export function objectsForLocation(locationId: string): InteractiveObject[] { return OBJECTS.filter((o) => o.location === locationId); }
export function lessonsAtLocation(locationId: string): Lesson[] { return objectsForLocation(locationId).map((o) => o.lesson && LESSON_BY_ID[o.lesson]).filter((l): l is Lesson => !!l); }
export function assignmentsForLesson(lessonId: string): Assignment[] { return ASSIGNMENTS.filter((a) => a.lesson === lessonId); }
export function storiesForBand(band: AgeBand): Story[] { return STORIES.filter((s) => s.meta.bands.includes(band)); }

export interface Coverage {
  lessons: number; stories: number; assignments: number; objects: number; objectsWithLessons: number;
  bySection: Record<SectionKey, { lessons: number; bands: Record<AgeBand, number>; objects: number; assignments: number }>;
  byLanguage: Record<Lang, { lessons: number; stories: number; assignments: number }>;
}

const BANDS: AgeBand[] = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const LANGS: Lang[] = ['en', 'hi', 'bn', 'as', 'or', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'ur', 'sa'];

export function coverage(): Coverage {
  const bySection = {} as Coverage['bySection'];
  for (const s of SECTIONS) {
    const ls = lessonsBySection(s.key);
    const bands = {} as Record<AgeBand, number>;
    for (const b of BANDS) bands[b] = ls.filter((l) => l.meta.bands.includes(b)).length;
    bySection[s.key] = { lessons: ls.length, bands, objects: OBJECTS.filter((o) => o.section === s.key).length, assignments: ASSIGNMENTS.filter((a) => a.meta.section === s.key).length };
  }
  const byLanguage = {} as Coverage['byLanguage'];
  for (const lang of LANGS) {
    byLanguage[lang] = {
      lessons: LESSONS.filter((l) => l.meta.languages.includes(lang)).length,
      stories: STORIES.filter((s) => s.meta.languages.includes(lang)).length,
      assignments: ASSIGNMENTS.filter((a) => a.meta.languages.includes(lang)).length,
    };
  }
  return { lessons: LESSONS.length, stories: STORIES.length, assignments: ASSIGNMENTS.length, objects: OBJECTS.length, objectsWithLessons: OBJECTS.filter((o) => !!o.lesson).length, bySection, byLanguage };
}

function walkLocalised(value: unknown, path: string, out: string[], langs: Lang[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((v, i) => walkLocalised(v, `${path}[${i}]`, out, langs)); return; }
  const obj = value as Record<string, unknown>;
  if (typeof obj.en === 'string') {
    for (const l of langs) if (typeof obj[l] !== 'string' || !(obj[l] as string).trim()) out.push(`${path} missing ${l}`);
    return;
  }
  for (const [k, v] of Object.entries(obj)) walkLocalised(v, `${path}.${k}`, out, langs);
}

/** Structural validation: references resolve, every string has en + hi, every lesson follows the formula. */
export function validate(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const l of LESSONS) {
    if (ids.has(l.meta.id)) errors.push(`duplicate lesson ${l.meta.id}`); ids.add(l.meta.id);
    if (!OBJECT_BY_ID[l.host]) errors.push(`${l.meta.id}: host ${l.host} not in objects`);
    if (l.assignment && !ASSIGNMENT_BY_ID[l.assignment]) errors.push(`${l.meta.id}: assignment ${l.assignment} missing`);
    for (const p of l.meta.prerequisites) if (!LESSON_BY_ID[p]) errors.push(`${l.meta.id}: prerequisite ${p} missing`);
    for (const level of ['little', 'explorer'] as const) {
      const types = l.steps[level].map((s) => s.type);
      if (!types.includes('activity')) errors.push(`${l.meta.id}/${level}: no activity step`);
      if (!types.includes('quiz')) errors.push(`${l.meta.id}/${level}: no quiz step`);
      if (!types.includes('echo')) errors.push(`${l.meta.id}/${level}: no echo step`);
      const dialogues = l.steps[level].filter((s) => s.type === 'dialogue');
      if (dialogues.length < 4) errors.push(`${l.meta.id}/${level}: fewer than 4 dialogue steps`);
      if (dialogues[0]?.type === 'dialogue' && dialogues[0].who !== 'dadaji') errors.push(`${l.meta.id}/${level}: Dadaji must introduce`);
      for (const s of l.steps[level]) if (s.type === 'quiz' && !s.items.some((i) => i.ok)) errors.push(`${l.meta.id}/${level}: quiz has no correct item`);
    }
    walkLocalised(l, l.meta.id, errors, ['en', 'hi']);
  }
  for (const o of OBJECTS) {
    if (!LOCATION_BY_ID[o.location]) errors.push(`${o.id}: location ${o.location} missing`);
    if (o.lesson && !LESSON_BY_ID[o.lesson]) errors.push(`${o.id}: lesson ${o.lesson} missing`);
    const loc = LOCATION_BY_ID[o.location];
    if (loc && loc.camera === 'iso' && (o.tile.x >= loc.size.w || o.tile.y >= loc.size.d)) errors.push(`${o.id}: tile outside footprint`);
    walkLocalised({ name: o.name, preview: o.preview }, o.id, errors, ['en', 'hi']);
  }
  for (const s of STORIES) {
    if (!COLLECTIONS.find((c) => c.key === s.collection)) errors.push(`${s.meta.id}: collection ${s.collection} missing`);
    if (s.pages.length < 2) errors.push(`${s.meta.id}: fewer than 2 pages`);
    if (s.meta.rights === 'pending' && s.pages.length) errors.push(`${s.meta.id}: licensed story has pages`);
    walkLocalised(s, s.meta.id, errors, ['en', 'hi']);
  }
  for (const a of ASSIGNMENTS) {
    if (a.lesson && !LESSON_BY_ID[a.lesson]) errors.push(`${a.meta.id}: lesson ${a.lesson} missing`);
    if (!a.instructions.length || !a.completion || !a.outcome || a.minutes <= 0) errors.push(`${a.meta.id}: incomplete contract`);
    if (a.supervision === 'self' && a.meta.bands.includes('A0')) errors.push(`${a.meta.id}: A0 cannot be self-supervised`);
    walkLocalised(a, a.meta.id, errors, ['en', 'hi']);
  }
  return { ok: errors.length === 0, errors };
}

export const localisedOk = (v: Localised, lang: Lang) => typeof v[lang] === 'string';

/** Convenience lookups (undefined when the id is unknown; legacy ids accepted for objects). */
export const lessonById = (id: string): Lesson | undefined => LESSON_BY_ID[id];
export const storyById = (id: string): Story | undefined => STORY_BY_ID[id];
export const assignmentById = (id: string): Assignment | undefined => ASSIGNMENT_BY_ID[id];
export const objectById = (id: string): InteractiveObject | undefined => OBJECT_BY_ID[canonicalObject(id)];
