// Paper folding and punching. A square sheet (4 × 4 cells) is folded once or
// twice, punched, and unfolded. The answer is computed by unfolding
// (reflecting the holes back through each fold, last fold first); the tests
// re-derive it by folding forward (tracking where every cell of the sheet
// ends up), which is an independent method.
import type { Rng } from '../rng.js';
import type { El, Fig, Pt } from '../model.js';
import { boxSvg, stripSvg } from '../svg.js';
import { arrange, type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { optionText, pickLang, LABELS, type FigLang } from '../text.js';

export type Fold = 'L>R' | 'R>L' | 'T>B' | 'B>T' | 'D';
export type HoleShape = 'circle' | 'square';
export interface Hole {
  i: number; // column 0..3
  j: number; // row 0..3
  shape: HoleShape;
}

const SIZE = 12;
const O = 2; // sheet offset in the box
const CELL = 2;

/** Cells that move when folding (they land on the other half). */
export function moves(f: Fold, i: number, j: number): boolean {
  switch (f) {
    case 'L>R':
      return i < 2;
    case 'R>L':
      return i >= 2;
    case 'T>B':
      return j < 2;
    case 'B>T':
      return j >= 2;
    case 'D':
      return i > j; // the upper-right triangle folds onto the lower-left
  }
}

export function reflect(f: Fold, i: number, j: number): [number, number] {
  if (f === 'L>R' || f === 'R>L') return [3 - i, j];
  if (f === 'T>B' || f === 'B>T') return [i, 3 - j];
  return [j, i];
}

const holeKey = (h: Hole) => `${h.i},${h.j},${h.shape}`;
export const setKey = (hs: Hole[]) => hs.map(holeKey).sort().join(';');

/** Unfold: reflect the holes back through every fold, last fold first. */
export function unfold(folds: Fold[], punched: Hole[]): Hole[] {
  let holes = [...punched];
  for (let k = folds.length - 1; k >= 0; k--) {
    const f = folds[k]!;
    const back = holes.map((h) => {
      const [i, j] = reflect(f, h.i, h.j);
      return { i, j, shape: h.shape };
    });
    const all = new Map<string, Hole>();
    for (const h of [...holes, ...back]) all.set(holeKey(h), h);
    holes = [...all.values()];
  }
  return holes;
}

/** The cells still visible after the folds (where holes may be punched). */
export function remaining(folds: Fold[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      // A cell is visible (top layer) if it never moved; diagonal cells are cut in half — never punched.
      if (folds.includes('D') && i === j) continue;
      if (folds.every((f) => !moves(f, i, j))) out.push([i, j]);
    }
  return out;
}

const cx = (i: number) => O + i * CELL + CELL / 2;

function holeEls(holes: Hole[]): El[] {
  return holes.map((h): El => {
    const c: Pt = [cx(h.i), cx(h.j)];
    return h.shape === 'circle'
      ? { k: 'circle', c, r: 0.55, fill: 'none' }
      : { k: 'poly', pts: [[c[0] - 0.5, c[1] - 0.5], [c[0] + 0.5, c[1] - 0.5], [c[0] + 0.5, c[1] + 0.5], [c[0] - 0.5, c[1] + 0.5]], closed: true, fill: 'none' };
  });
}

/** Outline of the folded sheet after the given folds. */
function regionPoly(folds: Fold[]): Pt[] {
  if (folds.includes('D')) return [[O, O], [O, O + 8], [O + 8, O + 8]];
  let [x1, y1, x2, y2] = [O, O, O + 8, O + 8];
  for (const f of folds) {
    if (f === 'L>R') x1 = (x1 + x2) / 2;
    if (f === 'R>L') x2 = (x1 + x2) / 2;
    if (f === 'T>B') y1 = (y1 + y2) / 2;
    if (f === 'B>T') y2 = (y1 + y2) / 2;
  }
  return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

function foldFrame(done: Fold[], next: Fold): Fig {
  const poly = regionPoly(done);
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const els: El[] = [{ k: 'poly', pts: poly, closed: true, fill: 'none' }];
  if (next === 'D') {
    els.push({ k: 'line', a: [x1, y1], b: [x2, y2], dash: 'dash' });
    els.push({ k: 'arrow', a: [x1 + (x2 - x1) * 0.72, y1 + (y2 - y1) * 0.28], b: [x1 + (x2 - x1) * 0.36, y1 + (y2 - y1) * 0.64] });
  } else if (next === 'L>R' || next === 'R>L') {
    els.push({ k: 'line', a: [mx, y1 - 0.6], b: [mx, y2 + 0.6], dash: 'dash' });
    const from = next === 'L>R' ? (x1 + mx) / 2 : (mx + x2) / 2;
    const to = next === 'L>R' ? (mx + x2) / 2 : (x1 + mx) / 2;
    els.push({ k: 'arrow', a: [from, my], b: [to, my] });
  } else {
    els.push({ k: 'line', a: [x1 - 0.6, my], b: [x2 + 0.6, my], dash: 'dash' });
    const from = next === 'T>B' ? (y1 + my) / 2 : (my + y2) / 2;
    const to = next === 'T>B' ? (my + y2) / 2 : (y1 + my) / 2;
    els.push({ k: 'arrow', a: [mx, from], b: [mx, to] });
  }
  return { size: SIZE, els };
}

function punchedFrame(folds: Fold[], holes: Hole[]): Fig {
  return { size: SIZE, els: [{ k: 'poly', pts: regionPoly(folds), closed: true, fill: 'none' }, ...holeEls(holes)] };
}

function sheet(holes: Hole[]): Fig {
  return { size: SIZE, els: [{ k: 'poly', pts: [[O, O], [O + 8, O], [O + 8, O + 8], [O, O + 8]], closed: true, fill: 'none' }, ...holeEls(holes)] };
}

const FOLD_TEXT: Record<Fold, { hi: string; hl: string; en: string }> = {
  'L>R': { hi: 'बायाँ आधा भाग दाएँ पर', hl: 'baayan aadha hissa daayen par', en: 'the left half onto the right' },
  'R>L': { hi: 'दायाँ आधा भाग बाएँ पर', hl: 'daayan aadha hissa baayen par', en: 'the right half onto the left' },
  'T>B': { hi: 'ऊपरी आधा भाग नीचे', hl: 'upar ka aadha hissa neeche', en: 'the top half down' },
  'B>T': { hi: 'निचला आधा भाग ऊपर', hl: 'neeche ka aadha hissa upar', en: 'the bottom half up' },
  D: { hi: 'विकर्ण के अनुदिश ऊपरी-दायाँ त्रिभुज नीचे-बाएँ पर', hl: 'vikarn ke saath upar-daayan tribhuj neeche-baayen par', en: 'along the diagonal, the upper-right triangle onto the lower-left' },
};

function genFold(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const V: Fold[] = ['L>R', 'R>L'];
  const H: Fold[] = ['T>B', 'B>T'];
  let folds: Fold[];
  let nHoles: number;
  let shapes: HoleShape[];
  if (difficulty === 'easy') {
    folds = [rng.pick([...V, ...H])];
    nHoles = rng.int(1, 3);
    shapes = ['circle', 'circle', 'circle'];
  } else if (difficulty === 'medium') {
    if (rng.chance(0.3)) {
      folds = ['D'];
      nHoles = rng.int(2, 3);
      shapes = rng.chance(0.5) ? ['circle', 'circle', 'circle'] : rng.shuffle<HoleShape>(['circle', 'square', 'circle']);
    } else {
      folds = rng.chance(0.5) ? [rng.pick(V), rng.pick(H)] : [rng.pick(H), rng.pick(V)];
      nHoles = rng.int(1, 3);
      shapes = rng.chance(0.6) ? ['circle', 'circle', 'circle'] : rng.shuffle<HoleShape>(['circle', 'square', 'circle']);
    }
  } else {
    folds = rng.chance(0.5) ? [rng.pick(V), rng.pick(H)] : [rng.pick(H), rng.pick(V)];
    nHoles = rng.int(2, 3);
    shapes = rng.shuffle<HoleShape>(['circle', 'square', rng.pick<HoleShape>(['circle', 'square'])]);
  }
  const cells = rng.shuffle(remaining(folds)).slice(0, nHoles);
  if (cells.length < nHoles) return null;
  const punched: Hole[] = cells.map(([i, j], k) => ({ i, j, shape: shapes[k]! }));
  const answer = unfold(folds, punched);

  // Plausible mistakes.
  const swapAxis = (f: Fold): Fold => (f === 'L>R' ? 'T>B' : f === 'R>L' ? 'B>T' : f === 'T>B' ? 'L>R' : f === 'B>T' ? 'R>L' : 'D');
  const cands: Hole[][] = [
    punched, // forgot to unfold
    unfold(folds.slice(1), punched), // unfolded only the last fold
    unfold(folds.slice(0, -1), punched),
    unfold(folds.map(swapAxis), punched), // reflected in the wrong line
    folds.length === 1 && folds[0] !== 'D' ? unfold(['D'], punched) : unfold([folds[0]!], punched),
    answer.map((h, i) => (i === 0 ? { ...h, i: (h.i + 1) % 4 } : h)), // one hole misplaced
    difficulty === 'hard' ? answer.map((h) => ({ ...h, shape: (h.shape === 'circle' ? 'square' : 'circle') as HoleShape })) : [],
  ];
  const distractors: Hole[][] = [];
  for (const c of rng.shuffle(cands)) {
    if (!c.length) continue;
    const k = setKey(c);
    if (k !== setKey(answer) && !distractors.some((d) => setKey(d) === k)) distractors.push(c);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const { items, correct } = arrange(rng, answer, distractors, setKey);
  const label = LABELS[correct]!;
  const frames = folds.map((f, k) => ({ fig: foldFrame(folds.slice(0, k), f) }));
  const steps = folds.map((f) => pickLang(lang, FOLD_TEXT[f]));
  return {
    generator: 'paper-folding',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'एक वर्गाकार कागज़ को नीचे दिखाए अनुसार मोड़ा गया और फिर उसमें छेद किए गए। खोलने पर कागज़ कैसा दिखाई देगा?',
      hl: 'Ek vargaakar kaagaz ko neeche dikhaye anusaar moda gaya aur phir usmein chhed kiye gaye. Kholne par kaagaz kaisa dikhega?',
      en: 'A square sheet of paper is folded as shown and then punched. How will it look when unfolded?',
    }),
    explanation: pickLang(lang, {
      hi: `कागज़ को क्रम से मोड़ा गया: ${steps.join('; फिर ')}। हर छेद मोड़ की रेखा के दूसरी ओर उतनी ही दूरी पर भी बनता है, इसलिए खोलने पर ${answer.length} छेद आकृति (${label}) जैसे दिखते हैं।`,
      hl: `Kaagaz ko kram se moda gaya: ${steps.join('; phir ')}. Har chhed fold ki rekha ke doosri taraf utni hi doori par bhi banta hai, isliye kholne par ${answer.length} chhed figure (${label}) jaise dikhte hain.`,
      en: `The sheet was folded ${steps.join(', then ')}. Each hole also appears at the same distance on the other side of every fold line, so the unfolded sheet has ${answer.length} holes as in figure (${label}).`,
    }),
    stimulus: stripSvg([...frames, { fig: punchedFrame(folds, punched) }]),
    options: items.map((hs, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(sheet(hs)) })),
    correct,
    key: `paper-folding:${folds.join(',')}:${setKey(punched)}`,
    model: { folds, punched, answer, options: items },
  };
}

export const paperFolding: Generator = {
  id: 'paper-folding',
  chapter: 'figure-based',
  title: { hi: 'कागज़ मोड़ना और काटना', hl: 'Kaagaz modna aur kaatna', en: 'Paper folding and punching' },
  description: 'One fold (easy); two folds or a diagonal fold (medium); two folds with round and square holes (hard).',
  generate: genFold,
};
