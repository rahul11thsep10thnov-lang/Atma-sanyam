// DADU constants shared by the console pages. Mirrors src/dadu/core/* in the
// mobile app (the console must not import from the app bundle).

export const LANGS = ['en', 'hi', 'bn', 'as', 'or', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml', 'ur', 'sa'] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', as: 'Assamese', or: 'Odia', mr: 'Marathi', gu: 'Gujarati',
  pa: 'Punjabi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', ur: 'Urdu', sa: 'Sanskrit',
};

export type Localised = Partial<Record<Lang, string>> & { en: string };

export const SECTIONS: { key: string; name: string; colour: string }[] = [
  { key: 'academic', name: 'Academic Learning', colour: '#2F3C7E' },
  { key: 'stem', name: 'STEM and Technology', colour: '#2E86AB' },
  { key: 'music', name: 'Music and Performing Arts', colour: '#E07A95' },
  { key: 'art', name: 'Art and Creativity', colour: '#8E4585' },
  { key: 'sports', name: 'Sports and Fitness', colour: '#D9663D' },
  { key: 'nature', name: 'Nature and Life Skills', colour: '#4E9F3D' },
  { key: 'mind', name: 'Cognitive and Social Skills', colour: '#E0901C' },
  { key: 'explore', name: 'Knowledge and Exploration', colour: '#C98310' },
];
export const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

export const WORLDS = ['home', 'garden', 'animalia', 'academy', 'stemlab', 'studio', 'sports', 'storyland', 'sanskriti', 'temple', 'discovery', 'play'] as const;

export const CHARACTERS: { key: string; name: string }[] = [
  { key: 'dadaji', name: 'Dadaji' },
  { key: 'chintu', name: 'Chintu' },
  { key: 'buddy', name: 'Buddy' },
  { key: 'chikki', name: 'Chikki' },
  { key: 'gauri', name: 'Gauri' },
  { key: 'nandu', name: 'Nandu' },
  { key: 'mitthu', name: 'Mitthu (revision only)' },
];

export const BANDS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] as const;
export const BAND_LABELS: Record<string, string> = { A0: '0–2', A1: '2–4', A2: '4–6', A3: '6–8', A4: '8–10', A5: '10–12' };

export const KINDS = ['lesson', 'story', 'assignment', 'object', 'character', 'location'] as const;
export type Kind = (typeof KINDS)[number];

export const RIGHTS = ['original', 'public-domain', 'licensed', 'pending'] as const;

export const ACTIVITY_KINDS = [
  'tap-target', 'choose', 'sort', 'sequence', 'memory', 'trace', 'count',
  'water', 'feed', 'groom', 'plant', 'harvest', 'cook', 'clean', 'mix-colours',
  'play-notes', 'rhythm', 'draw', 'pattern', 'code-blocks', 'circuit', 'maze', 'balance',
] as const;

/** The eight-step editorial workflow, in order. `permission` is what the actor needs to move an item INTO that state. */
export const WORKFLOW: { key: string; label: string; permission: string; who: string }[] = [
  { key: 'draft', label: 'Draft', permission: 'dadu:content:write', who: 'Editor' },
  { key: 'educational_review', label: 'Educational review', permission: 'dadu:content:write', who: 'Editor submits; educational reviewer checks' },
  { key: 'factual_review', label: 'Factual verification', permission: 'dadu:review:educational', who: 'Educational reviewer passes it on' },
  { key: 'language_review', label: 'Language proofreading', permission: 'dadu:review:factual', who: 'Fact checker passes it on' },
  { key: 'cultural_review', label: 'Cultural review', permission: 'dadu:review:language', who: 'Proofreader passes it on' },
  { key: 'rights_review', label: 'Rights verification', permission: 'dadu:review:cultural', who: 'Cultural reviewer passes it on' },
  { key: 'safety_review', label: 'Safety review', permission: 'dadu:review:rights', who: 'Rights officer passes it on' },
  { key: 'approved', label: 'Approved', permission: 'dadu:review:safety', who: 'Safety reviewer approves' },
  { key: 'published', label: 'Published', permission: 'dadu:content:publish', who: 'Publisher' },
];
export const STATUS_KEYS = WORKFLOW.map((w) => w.key);
export const statusLabel = (s: string) => WORKFLOW.find((w) => w.key === s)?.label ?? s;

/** Permission needed to send an item from `status` back to draft (the reviewer of that step). */
export function sendBackPermission(status: string): string {
  const idx = STATUS_KEYS.indexOf(status);
  if (idx <= 0) return 'dadu:content:write';
  // the reviewer responsible for the current step is the one who may move it onward: same permission as the next transition
  return WORKFLOW[Math.min(idx + 1, WORKFLOW.length - 1)].permission;
}

export interface ContentVersion { version: number; body: unknown; changeNote: string | null; createdAt: string; publishedAt: string | null }
export interface ContentReview { version: number; step: string; decision: string; reviewer: string; note: string | null; createdAt: string }
export interface DaduContentItem {
  id: string;
  kind: Kind;
  section: string;
  subject: string;
  topic: string;
  bands: string[];
  difficulty: number;
  languages: string[];
  rights: string;
  provenance: string;
  status: string;
  version: number;
  body: unknown;
  objective?: Localised | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface DaduAsset {
  id: string;
  kind: string;
  url: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sha256: string;
  licence: string;
  source: string;
  creator: string;
  attributionRequired: boolean;
  attributionText: string | null;
  characterKey: string | null;
  locationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DaduPack {
  id: string;
  kind: string;
  language: string;
  version: number;
  status: string;
  bytes: number | null;
  itemCount: number | null;
  manifest: unknown;
  createdAt: string;
  publishedAt: string | null;
}

export interface Flag { key: string; value: unknown; updatedAt: string | null }

export const ID_RE = /^[a-z0-9_.-]+$/;

/** Localised text with a non-empty English value. */
export function hasEnglish(v: unknown): boolean {
  return !!v && typeof v === 'object' && typeof (v as Localised).en === 'string' && (v as Localised).en.trim().length > 0;
}

/** Walks a body and returns the paths of localised objects that lack English. A localised object is one with an `en` key or only language keys. */
export function missingEnglish(value: unknown, path = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => missingEnglish(v, `${path}[${i}]`));
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);
  const looksLocalised = keys.length > 0 && keys.every((k) => (LANGS as readonly string[]).includes(k));
  if (looksLocalised) return hasEnglish(obj) ? [] : [path || '(root)'];
  return keys.flatMap((k) => missingEnglish(obj[k], path ? `${path}.${k}` : k));
}

export const EMPTY_LESSON_BODY = {
  title: { en: '' },
  host: '',
  world: 'home',
  companion: 'chintu',
  concept: '',
  steps: { little: [], explorer: [] },
  simpler: { en: '' },
  advanced: { en: '' },
  example: { en: '' },
};

export const EMPTY_BODY_BY_KIND: Record<Kind, unknown> = {
  lesson: EMPTY_LESSON_BODY,
  story: { title: { en: '' }, collection: '', pages: [], vocabulary: [], moral: { en: '' }, questions: { little: [], explorer: [] } },
  assignment: { title: { en: '' }, intro: { en: '' }, objective: { en: '' }, instructions: [], materials: [], minutes: 15, supervision: 'together', safety: [], completion: { en: '' }, outcome: { en: '' }, badge: '' },
  object: { id: '', location: '', name: { en: '' }, section: 'nature', preview: { en: '' }, states: [], tile: { x: 0, y: 0 }, sprite: '' },
  character: { key: '', name: { en: '', hi: '' }, kind: 'human', heightWu: 6, role: { en: '' }, voice: { en: '' }, joins: [] },
  location: { id: '', world: 'home', name: { en: '' }, size: { w: 8, d: 6 }, entry: { x: 4, y: 5 }, camera: 'iso', idlers: [], ambience: '' },
};
