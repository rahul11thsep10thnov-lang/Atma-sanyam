// Registry of figure-question generators and the single entry point used by
// the API: generateFigureQuestion(generator, difficulty, language, seed).
import { createRng, randomSeed } from './rng.js';
import type { FigLang } from './text.js';
import type { Difficulty, FigureQuestion, Generator } from './types.js';
import { seriesRotation, seriesSectors } from './generators/series.js';
import { figureAnalogy, mirrorImage, oddOneOut, waterImage } from './generators/glyphTypes.js';
import { embeddedFigure } from './generators/embedded.js';
import { countRectanglesGen, countSquaresGen, countTrianglesGen } from './generators/countingFigures.js';
import { paperFolding } from './generators/paperFold.js';
import { vennDiagram } from './generators/venn.js';

export const GENERATORS: Generator[] = [
  seriesRotation,
  seriesSectors,
  mirrorImage,
  waterImage,
  oddOneOut,
  figureAnalogy,
  embeddedFigure,
  paperFolding,
  countTrianglesGen,
  countSquaresGen,
  countRectanglesGen,
  vennDiagram,
];

export const GENERATOR_MAP = new Map(GENERATORS.map((g) => [g.id, g]));
export const FIGURE_LANGS: FigLang[] = ['hi', 'hi-Latn', 'en'];
export const ENGINE_VERSION = 'figures-v1';

export interface GeneratedFigure extends FigureQuestion {
  seed: number;
  language: FigLang;
}

const MAX_TRIES = 600;

/** Last line of defence: every question that leaves the engine has four
 * distinct options and exactly one marked answer. */
export function assertWellFormed(q: FigureQuestion): void {
  if (q.options.length !== 4) throw new Error(`${q.generator}: expected 4 options`);
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) throw new Error(`${q.generator}: bad answer index`);
  const keys = q.options.map((o) => o.svg ?? `text:${o.text}`);
  if (new Set(keys).size !== 4) throw new Error(`${q.generator}: options are not distinct`);
  if (!q.stem.trim() || !q.explanation.trim()) throw new Error(`${q.generator}: empty text`);
}

export function generateFigureQuestion(generatorId: string, difficulty: Difficulty, language: FigLang, seed = randomSeed()): GeneratedFigure {
  const g = GENERATOR_MAP.get(generatorId);
  if (!g) throw new Error(`Unknown figure generator "${generatorId}"`);
  const rng = createRng(seed);
  for (let i = 0; i < MAX_TRIES; i++) {
    const q = g.generate(rng, difficulty, language);
    if (q) {
      assertWellFormed(q);
      return { ...q, seed, language };
    }
  }
  throw new Error(`${generatorId}: could not build a ${difficulty} question (seed ${seed})`);
}

export type { Difficulty, FigureQuestion, Generator, FigLang };
