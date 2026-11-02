// Content contracts shared by the lesson engine, activity engine, assessment
// engine, stories, assignments, the CMS pack format and the API. Pure types.
import type { CharacterKey } from './characters';
import type { AgeBand } from './ageBands';
import type { SectionKey, WorldKey } from './worlds';

export type Lang = 'en' | 'hi' | 'bn' | 'as' | 'or' | 'mr' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'ml' | 'ur' | 'sa';
export type Localised = Partial<Record<Lang, string>> & { en: string };
export type Level = 'little' | 'explorer';

export interface ContentMeta {
  id: string;
  version: number;
  objective: Localised;
  bands: AgeBand[];
  section: SectionKey;
  subject: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  provenance: string;
  rights: 'original' | 'public-domain' | 'licensed' | 'pending';
  languages: Lang[];
  review: 'draft' | 'educational' | 'factual' | 'language' | 'cultural' | 'rights' | 'safety' | 'approved' | 'published';
}

export type ActivityKind =
  | 'tap-target' | 'choose' | 'sort' | 'sequence' | 'memory' | 'trace' | 'count'
  | 'water' | 'feed' | 'groom' | 'plant' | 'harvest' | 'cook' | 'clean' | 'mix-colours'
  | 'play-notes' | 'rhythm' | 'draw' | 'pattern' | 'code-blocks' | 'circuit' | 'maze' | 'balance';

export interface ActivityItem { key: string; label: Localised; ok?: boolean; group?: string; order?: number; icon?: string }

export interface ActivitySpec {
  kind: ActivityKind;
  prompt: Localised;
  items: ActivityItem[];
  /** For sequence/sort: the correct order or grouping is derived from items. */
  success: Localised;
  retry: Localised;
}

export type Speaker = CharacterKey | 'you';

export interface DialogueStep { type: 'dialogue'; who: CharacterKey; text: Localised; emotion?: string; echo?: boolean }
export interface ActivityStep { type: 'activity'; activity: ActivitySpec }
export interface QuizStep { type: 'quiz'; question: Localised; items: ActivityItem[]; explain: Localised }
export interface EchoStep { type: 'echo'; clauses: Localised[] }
export type LessonStep = DialogueStep | ActivityStep | QuizStep | EchoStep;

export interface Lesson {
  meta: ContentMeta;
  title: Localised;
  /** The object or location that hosts the lesson, e.g. villa.living.telescope. */
  host: string;
  world: WorldKey;
  companion: CharacterKey;
  concept: string;
  steps: Record<Level, LessonStep[]>;
  simpler: Localised;
  advanced: Localised;
  example: Localised;
  assignment?: string; // rwa id
}

export interface StoryPage { text: Localised; illustration: string; speaker?: CharacterKey }
export interface Story {
  meta: ContentMeta;
  title: Localised;
  collection: string;
  pages: StoryPage[];
  vocabulary: { word: Localised; meaning: Localised }[];
  moral: Localised;
  questions: Record<Level, QuizStep[]>;
}

export interface Assignment {
  meta: ContentMeta;
  title: Localised;
  intro: Localised;
  objective: Localised;
  instructions: Localised[];
  materials: Localised[];
  minutes: number;
  supervision: 'self' | 'nearby' | 'assist' | 'together';
  safety: Localised[];
  completion: Localised;
  outcome: Localised;
  badge: string;
  lesson?: string;
}

export interface InteractiveObject {
  id: string;             // location.object
  location: string;
  name: Localised;
  section: SectionKey;
  lesson?: string;        // lesson id
  preview: Localised;     // Dadaji's one-liner when there is no full lesson yet
  states: ('open' | 'on' | 'full' | 'clean' | 'ready' | 'inUse' | 'unlocked')[];
  /** Isometric tile within the location and the sprite key. */
  tile: { x: number; y: number };
  sprite: string;
  activity?: ActivityKind;
}
