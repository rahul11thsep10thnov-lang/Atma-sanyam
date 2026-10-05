// Small, clearly drawn parts arranged on a 3 × 3 grid make up the abstract
// figures used by mirror-image, odd-one-out and analogy questions. Each part
// can be turned or mirrored inside its cell, which makes most combinations
// fully asymmetric — exactly what those question types need.
import type { Rng } from './rng.js';
import { ALL_TRANSFORMS, figKey, tp, transformFig, translateEls, type El, type Fig, type Pt, type Transform } from './model.js';

export const GLYPH_SIZE = 12;
const CELL = 4;

type PartName = 'dot' | 'ring' | 'tri' | 'square' | 'squareFill' | 'ell' | 'flag' | 'arrow' | 'zig' | 'hook' | 'corner' | 'slashDot';
const PARTS: PartName[] = ['dot', 'ring', 'tri', 'square', 'squareFill', 'ell', 'flag', 'arrow', 'zig', 'hook', 'corner', 'slashDot'];
/** Parts that look the same under every turn/mirror (they never add asymmetry on their own). */
const SYMMETRIC = new Set<PartName>(['dot', 'ring', 'square', 'squareFill']);

function rawPart(name: PartName): El[] {
  switch (name) {
    case 'dot':
      return [{ k: 'circle', c: [2, 2], r: 0.7, fill: 'black' }];
    case 'ring':
      return [{ k: 'circle', c: [2, 2], r: 1.15, fill: 'none' }];
    case 'tri':
      return [{ k: 'poly', pts: [[2, 0.8], [3.2, 3.1], [0.8, 3.1]], closed: true, fill: 'black' }];
    case 'square':
      return [{ k: 'poly', pts: [[1, 1], [3, 1], [3, 3], [1, 3]], closed: true, fill: 'none' }];
    case 'squareFill':
      return [{ k: 'poly', pts: [[1.1, 1.1], [2.9, 1.1], [2.9, 2.9], [1.1, 2.9]], closed: true, fill: 'black' }];
    case 'ell':
      return [{ k: 'poly', pts: [[1.1, 0.7], [1.1, 3.2], [3.1, 3.2]], closed: false, fill: 'none' }];
    case 'flag':
      return [
        { k: 'line', a: [1.1, 0.6], b: [1.1, 3.4] },
        { k: 'poly', pts: [[1.1, 0.6], [3.2, 1.3], [1.1, 2.0]], closed: true, fill: 'black' },
      ];
    case 'arrow':
      return [{ k: 'arrow', a: [0.6, 2], b: [3.4, 2] }];
    case 'zig':
      return [{ k: 'poly', pts: [[0.7, 3], [1.55, 1], [2.45, 3], [3.3, 1]], closed: false, fill: 'none' }];
    case 'hook':
      return [{ k: 'poly', pts: [[3, 0.7], [3, 3.1], [1, 3.1], [1, 2]], closed: false, fill: 'none' }];
    case 'corner':
      return [{ k: 'poly', pts: [[0.9, 0.9], [3.1, 0.9], [0.9, 3.1]], closed: true, fill: 'black' }];
    case 'slashDot':
      return [
        { k: 'line', a: [0.9, 3.1], b: [3.1, 0.9] },
        { k: 'circle', c: [3, 3], r: 0.55, fill: 'black' },
      ];
  }
}

function placePart(name: PartName, cell: number, t: Transform): El[] {
  const local: Fig = { size: CELL, els: rawPart(name) };
  const turned = transformFig(local, t);
  return translateEls(turned.els, (cell % 3) * CELL, Math.floor(cell / 3) * CELL);
}

const LETTERS = ['F', 'G', 'J', 'L', 'P', 'R', 'S', 'Z', '2', '4', '7'];

export interface GlyphSpec {
  parts: { name: PartName | 'text'; cell: number; t: Transform; letter?: string }[];
  edge: number | null;
}

/** Random glyph with `n` parts in distinct cells; optionally one letter (mirror questions). */
export function randomGlyph(rng: Rng, n: number, opts: { letter?: boolean; edgeLine?: boolean } = {}): { fig: Fig; spec: GlyphSpec } {
  const cells = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, n);
  const spec: GlyphSpec = { parts: [], edge: null };
  const els: El[] = [];
  let asymmetricParts = 0;
  cells.forEach((cell, i) => {
    if (opts.letter && i === 0) {
      const letter = rng.pick(LETTERS);
      spec.parts.push({ name: 'text', cell, t: 'id', letter });
      const c: Pt = [(cell % 3) * CELL + 2, Math.floor(cell / 3) * CELL + 2];
      els.push({ k: 'text', at: c, s: letter, size: 2.7 });
      return;
    }
    // Keep at least two asymmetric parts so the figure has a clear orientation.
    const pool = asymmetricParts < 2 && i >= n - 2 ? PARTS.filter((p) => !SYMMETRIC.has(p)) : PARTS;
    const name = rng.pick(pool);
    if (!SYMMETRIC.has(name)) asymmetricParts++;
    const t = rng.pick(ALL_TRANSFORMS);
    spec.parts.push({ name, cell, t });
    els.push(...placePart(name, cell, t));
  });
  if (opts.edgeLine) {
    const edge = rng.int(0, 3);
    spec.edge = edge;
    const lines: [Pt, Pt][] = [
      [[0.5, 0.5], [11.5, 0.5]],
      [[11.5, 0.5], [11.5, 11.5]],
      [[0.5, 11.5], [11.5, 11.5]],
      [[0.5, 0.5], [0.5, 11.5]],
    ];
    const [a, b] = lines[edge]!;
    els.push({ k: 'line', a, b, w: 3 });
  }
  return { fig: { size: GLYPH_SIZE, els }, spec };
}

/** Keys of the figure under each of the given transforms. */
export function keysUnder(fig: Fig, ts: Transform[]): string[] {
  return ts.map((t) => figKey(transformFig(fig, t)));
}

/** True when all of the given transforms produce different drawings. */
export function distinctUnder(fig: Fig, ts: Transform[]): boolean {
  return new Set(keysUnder(fig, ts)).size === ts.length;
}

export { tp };
