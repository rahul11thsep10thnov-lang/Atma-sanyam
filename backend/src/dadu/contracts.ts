// Zod contracts for DADU payloads. They mirror the mobile app's pure types in
// src/dadu/core/*.ts (characters, ageBands, worldState, content) so the JSON
// that crosses the wire is the same shape on both sides.
import { z } from 'zod';

export const CHARACTER_KEYS = ['dadaji', 'chintu', 'buddy', 'chikki', 'gauri', 'nandu', 'mitthu'] as const;
export type CharacterKey = (typeof CHARACTER_KEYS)[number];
export const CHARACTER_ALIASES: Record<string, CharacterKey> = { gopu: 'chintu', kim: 'buddy', molly: 'chikki', dhanu: 'nandu' };
export function canonicalCharacter(key: string): CharacterKey | null {
  if ((CHARACTER_KEYS as readonly string[]).includes(key)) return key as CharacterKey;
  return CHARACTER_ALIASES[key] ?? null;
}
/** Accepts canonical and legacy keys; stores the canonical one. */
export const characterKey = z
  .string()
  .transform((v, ctx) => {
    const k = canonicalCharacter(v);
    if (!k) ctx.addIssue({ code: 'custom', message: `Unknown character "${v}"` });
    return k as CharacterKey;
  });

export const LANGS = ['en', 'hi', 'bn', 'as', 'or', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'ur', 'sa'] as const;
export const lang = z.enum(LANGS);
export const AGE_BANDS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
export const ageBand = z.enum(AGE_BANDS);
export const difficulty = z.enum(['gentle', 'steady', 'stretch']);
export const languageMode = z.enum(['single', 'bilingual', 'compare', 'en-with-hi', 'hi-with-en']);
export const SECTIONS = ['academic', 'stem', 'music', 'art', 'sports', 'nature', 'mind', 'explore'] as const;
export const section = z.enum(SECTIONS);
export const WORLDS = ['home', 'garden', 'animalia', 'academy', 'stemlab', 'studio', 'sports', 'storyland', 'sanskriti', 'temple', 'discovery', 'play'] as const;

const text = (max = 2000) => z.string().max(max);
/** Localised text: English is mandatory, every other launch language optional. */
export const localised = z
  .object({ en: text() })
  .catchall(text())
  .superRefine((v, ctx) => {
    for (const k of Object.keys(v)) if (!(LANGS as readonly string[]).includes(k)) ctx.addIssue({ code: 'custom', message: `Unknown language "${k}"` });
  });

export const contentId = z.string().regex(/^[a-z0-9_.-]{3,120}$/, 'Invalid content id');

export const contentMeta = z.object({
  id: contentId,
  version: z.number().int().min(1),
  objective: localised,
  bands: z.array(ageBand).min(1),
  section,
  subject: z.string().max(60),
  topic: z.string().max(60),
  difficulty: z.number().int().min(1).max(5),
  prerequisites: z.array(contentId).max(20),
  provenance: z.string().max(500),
  rights: z.enum(['original', 'public-domain', 'licensed', 'pending']),
  languages: z.array(lang).min(1),
  review: z.enum(['draft', 'educational', 'factual', 'language', 'cultural', 'rights', 'safety', 'approved', 'published']),
});

export const ACTIVITY_KINDS = [
  'tap-target', 'choose', 'sort', 'sequence', 'memory', 'trace', 'count',
  'water', 'feed', 'groom', 'plant', 'harvest', 'cook', 'clean', 'mix-colours',
  'play-notes', 'rhythm', 'draw', 'pattern', 'code-blocks', 'circuit', 'maze', 'balance',
] as const;

export const activityItem = z.object({
  key: z.string().max(60),
  label: localised,
  ok: z.boolean().optional(),
  group: z.string().max(60).optional(),
  order: z.number().int().optional(),
  icon: z.string().max(60).optional(),
});

export const activitySpec = z.object({
  kind: z.enum(ACTIVITY_KINDS),
  prompt: localised,
  items: z.array(activityItem).max(24),
  success: localised,
  retry: localised,
});

export const lessonStep = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dialogue'), who: characterKey, text: localised, emotion: z.string().max(30).optional(), echo: z.boolean().optional() }),
  z.object({ type: z.literal('activity'), activity: activitySpec }),
  z.object({ type: z.literal('quiz'), question: localised, items: z.array(activityItem).min(2).max(8), explain: localised }),
  z.object({ type: z.literal('echo'), clauses: z.array(localised).min(1).max(5) }),
]);

export const lessonBody = z.object({
  meta: contentMeta,
  title: localised,
  host: z.string().max(120),
  world: z.enum(WORLDS),
  companion: characterKey,
  concept: z.string().max(120),
  steps: z.object({ little: z.array(lessonStep).min(1).max(40), explorer: z.array(lessonStep).min(1).max(40) }),
  simpler: localised,
  advanced: localised,
  example: localised,
  assignment: contentId.optional(),
});

export const storyBody = z.object({
  meta: contentMeta,
  title: localised,
  collection: z.string().max(60),
  pages: z.array(z.object({ text: localised, illustration: z.string().max(200), speaker: characterKey.optional() })).min(1).max(60),
  vocabulary: z.array(z.object({ word: localised, meaning: localised })).max(40),
  moral: localised,
  questions: z.object({
    little: z.array(z.object({ type: z.literal('quiz'), question: localised, items: z.array(activityItem).min(2).max(8), explain: localised })).max(10),
    explorer: z.array(z.object({ type: z.literal('quiz'), question: localised, items: z.array(activityItem).min(2).max(8), explain: localised })).max(10),
  }),
});

export const assignmentBody = z.object({
  meta: contentMeta,
  title: localised,
  intro: localised,
  objective: localised,
  instructions: z.array(localised).min(1).max(20),
  materials: z.array(localised).max(20),
  minutes: z.number().int().min(1).max(600),
  supervision: z.enum(['self', 'nearby', 'assist', 'together']),
  safety: z.array(localised).max(20),
  completion: localised,
  outcome: localised,
  badge: z.string().max(60),
  lesson: contentId.optional(),
});

export const objectBody = z.object({
  id: z.string().max(120),
  location: z.string().max(120),
  name: localised,
  section,
  lesson: contentId.optional(),
  preview: localised,
  states: z.array(z.enum(['open', 'on', 'full', 'clean', 'ready', 'inUse', 'unlocked'])).max(7),
  tile: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
  sprite: z.string().max(120),
  activity: z.enum(ACTIVITY_KINDS).optional(),
});

export const characterBody = z.object({
  key: characterKey,
  legacyKeys: z.array(z.string().max(20)).max(5),
  name: localised,
  kind: z.enum(['human', 'dog', 'rabbit', 'cow', 'calf', 'parrot']),
  heightWu: z.number().positive(),
  role: localised,
  voice: localised,
  joins: z.array(section).max(8),
});

export const locationBody = z.object({
  id: z.string().max(120),
  world: z.enum(WORLDS),
  name: localised,
  size: z.object({ w: z.number().int().min(1), d: z.number().int().min(1) }),
  entry: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
  parent: z.string().max(120).optional(),
  camera: z.enum(['iso', 'side']),
  idlers: z.array(characterKey).max(7),
  ambience: z.string().max(60),
});

export const CONTENT_KINDS = ['lesson', 'story', 'assignment', 'object', 'character', 'location'] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export const bodyForKind: Record<ContentKind, z.ZodType> = {
  lesson: lessonBody,
  story: storyBody,
  assignment: assignmentBody,
  object: objectBody,
  character: characterBody,
  location: locationBody,
};

// ---- child profile and world state ------------------------------------

export const avatar = z.object({ skin: z.string().max(30), hair: z.string().max(30), top: z.string().max(30) });

export const childCreate = z.object({
  name: z.string().trim().min(1).max(40),
  band: ageBand,
  difficulty: difficulty.default('steady'),
  language: lang.default('en'),
  helperLanguage: lang.optional(),
  languageMode: languageMode.default('single'),
  avatar: avatar.default({ skin: 'warm', hair: 'black', top: 'yellow' }),
  templeEnabled: z.boolean().default(false),
});
export const childPatch = childCreate.partial();

const timeOfDay = z.enum(['morning', 'afternoon', 'evening', 'night']);
const weather = z.enum(['sunny', 'cloudy', 'rainy', 'stormy', 'foggy']);
const season = z.enum(['spring', 'summer', 'monsoon', 'autumn', 'winter']);
export const PLANT_STAGES = ['seed', 'germination', 'seedling', 'growing', 'mature', 'flowering', 'fruiting', 'harvest'] as const;

/** The mobile WorldState. Known fields are validated; the object is capped in size by the JSON body limit. */
export const worldState = z.object({
  version: z.literal(1),
  tickedAt: z.number(),
  time: timeOfDay,
  weather,
  season,
  plants: z.array(z.object({
    id: z.string().max(80), species: z.string().max(60), plot: z.string().max(120), stage: z.enum(PLANT_STAGES),
    progress: z.number().min(0).max(1), plantedAt: z.number(), lastWateredAt: z.number(), waterings: z.array(z.number()).max(60), harvested: z.number().int().min(0),
  })).max(200),
  animals: z.array(z.object({
    key: characterKey, hunger: z.number().min(0).max(1), thirst: z.number().min(0).max(1), rest: z.number().min(0).max(1), groom: z.number().min(0).max(1),
    mood: z.enum(['happy', 'content', 'needs-care']), lastCaredAt: z.number(), location: z.string().max(120),
  })).max(10),
  objects: z.record(z.string().max(120), z.object({
    id: z.string().max(120), flags: z.record(z.string().max(20), z.boolean()), completions: z.number().int().min(0), lastInteractedAt: z.number().optional(),
  })),
  positions: z.array(z.object({
    key: characterKey, location: z.string().max(120), x: z.number(), y: z.number(), facing: z.enum(['ne', 'nw', 'se', 'sw']),
    activity: z.enum(['idle', 'walk', 'sit', 'sleep', 'read', 'garden', 'cook', 'play', 'graze', 'teach']),
  })).max(10),
  inventory: z.record(z.string().max(60), z.number().int().min(0)),
  decorations: z.array(z.string().max(80)).max(500),
  rewards: z.object({ stars: z.number().int().min(0), coins: z.number().int().min(0), badges: z.array(z.string().max(80)).max(500), certificates: z.array(z.string().max(80)).max(200) }),
  mastery: z.record(z.string().max(120), z.object({
    concept: z.string().max(120), score: z.number().min(0).max(1), attempts: z.number().int().min(0), correct: z.number().int().min(0), lastSeenAt: z.number(), nextReviewAt: z.number(),
  })),
  lessonsCompleted: z.array(z.string().max(120)).max(5000),
  storiesRead: z.array(z.string().max(120)).max(5000),
  assignments: z.record(z.string().max(120), z.object({
    status: z.enum(['available', 'started', 'completed']), completedAt: z.number().optional(), note: z.string().max(500).optional(), photoId: z.string().max(120).optional(),
  })),
  echoQueue: z.array(z.string().max(120)).max(200),
  unlockedLocations: z.array(z.string().max(120)).max(200),
});
export type WorldState = z.infer<typeof worldState>;

export const progressEvent = z.object({
  clientId: z.string().regex(/^[A-Za-z0-9_.:-]{3,80}$/),
  kind: z.enum(['lesson', 'story', 'activity', 'assessment', 'assignment']),
  contentId: z.string().max(120),
  occurredAt: z.string().datetime({ offset: true }),
  payload: z
    .object({
      concept: z.string().max(120).optional(),
      /** result 0..1 (1 = correct first try, 0.6 = second try, 0.8 = parent-confirmed practical). */
      result: z.number().min(0).max(1).optional(),
      difficulty: difficulty.optional(),
      minutes: z.number().int().min(0).max(240).optional(),
      durationSec: z.number().int().min(0).max(36_000).optional(),
      level: z.enum(['little', 'explorer']).optional(),
      stars: z.number().int().min(0).max(10).optional(),
      coins: z.number().int().min(0).max(100).optional(),
    })
    .strict(),
});
export type ProgressEvent = z.infer<typeof progressEvent>;
