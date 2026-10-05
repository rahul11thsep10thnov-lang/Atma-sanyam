import type { Rng } from './rng.js';
import type { FigLang, Tri } from './text.js';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface FigureOption {
  /** Option text shown when there is no figure (counting / Venn answers). */
  text: string;
  svg: string | null;
}

export interface FigureQuestion {
  generator: string;
  /** Chapter slug inside the reasoning subject (taxonomy). */
  chapter: string;
  difficulty: Difficulty;
  stem: string;
  explanation: string;
  /** The problem figure (strip, figure + mirror line, diagram …); null when the options alone are the figures. */
  stimulus: string | null;
  options: FigureOption[];
  /** Index of the correct option (0 = A). */
  correct: number;
  /** Identity of the puzzle, independent of option order and language — used to reject duplicates. */
  key: string;
  /** Structured data behind the figures, for independent re-checking in tests. */
  model: unknown;
}

export interface Generator {
  id: string;
  chapter: string;
  title: Tri;
  description: string;
  generate(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null;
}

/** Shuffles the correct answer among the distractors. All four must be distinct. */
export function arrange<T>(rng: Rng, correct: T, distractors: T[], keyOf: (t: T) => string): { items: T[]; correct: number } {
  if (distractors.length !== 3) throw new Error('Need exactly three distractors');
  const all = [correct, ...distractors];
  const keys = new Set(all.map(keyOf));
  if (keys.size !== 4) throw new Error('Options are not distinct');
  const order = rng.shuffle([0, 1, 2, 3]);
  return { items: order.map((i) => all[i]!), correct: order.indexOf(0) };
}
