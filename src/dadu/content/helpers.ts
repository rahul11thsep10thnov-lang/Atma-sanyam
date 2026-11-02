// Compact authoring helpers for bilingual content. Every string carries en + hi.
import type { CharacterKey } from '../core/characters';
import type { ActivityItem, ActivityKind, ActivityStep, ContentMeta, DialogueStep, EchoStep, Lesson, Level, LessonStep, Localised, QuizStep } from '../core/content';
import type { AgeBand } from '../core/ageBands';
import type { SectionKey, WorldKey } from '../core/worlds';

export const L = (en: string, hi: string): Localised => ({ en, hi });
export const say = (who: CharacterKey, en: string, hi: string, echo = false): DialogueStep => ({ type: 'dialogue', who, text: L(en, hi), ...(echo ? { echo: true } : {}) });
export const it = (key: string, en: string, hi: string, extra: { ok?: boolean; group?: string; order?: number; icon?: string } = {}): ActivityItem => ({ key, label: L(en, hi), ...extra });
export const act = (kind: ActivityKind, prompt: [string, string], items: ActivityItem[], success: [string, string] = ['Shabash! You did it.', 'शाबाश! तुमने कर दिखाया।'], retry: [string, string] = ['Almost. Let us try once more together.', 'लगभग। चलो एक बार फिर साथ करते हैं।']): ActivityStep => ({ type: 'activity', activity: { kind, prompt: L(...prompt), items, success: L(...success), retry: L(...retry) } });
export const quiz = (q: [string, string], items: ActivityItem[], explain: [string, string]): QuizStep => ({ type: 'quiz', question: L(...q), items, explain: L(...explain) });
export const echo = (...clauses: [string, string][]): EchoStep => ({ type: 'echo', clauses: clauses.map((c) => L(...c)) });

export interface LessonDef {
  id: string;
  title: [string, string];
  objective: [string, string];
  section: SectionKey;
  subject: string;
  topic: string;
  bands: AgeBand[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  host: string;
  world: WorldKey;
  companion: CharacterKey;
  concept: string;
  prerequisites?: string[];
  little: LessonStep[];
  explorer: LessonStep[];
  simpler: [string, string];
  advanced: [string, string];
  example: [string, string];
  assignment?: string;
  provenance?: string;
}

export function lesson(d: LessonDef): Lesson {
  const meta: ContentMeta = {
    id: d.id, version: 1, objective: L(...d.objective), bands: d.bands, section: d.section, subject: d.subject, topic: d.topic,
    difficulty: d.difficulty, prerequisites: d.prerequisites ?? [], provenance: d.provenance ?? 'original: DADU editorial team, 2026', rights: 'original',
    languages: ['en', 'hi'], review: 'draft',
  };
  const steps: Record<Level, LessonStep[]> = { little: d.little, explorer: d.explorer };
  return { meta, title: L(...d.title), host: d.host, world: d.world, companion: d.companion, concept: d.concept, steps, simpler: L(...d.simpler), advanced: L(...d.advanced), example: L(...d.example), assignment: d.assignment };
}

/** The common choose-quiz with four options where the first is right. */
export const choices = (...opts: [string, string, string][]): ActivityItem[] => opts.map(([k, en, hi], i) => it(k, en, hi, { ok: i === 0 }));
export const ordered = (...opts: [string, string, string][]): ActivityItem[] => opts.map(([k, en, hi], i) => it(k, en, hi, { order: i + 1 }));
export const grouped = (...opts: [string, string, string, string][]): ActivityItem[] => opts.map(([k, en, hi, g]) => it(k, en, hi, { group: g }));
