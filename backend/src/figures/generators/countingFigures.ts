// "How many triangles / squares / rectangles are there in the figure?"
// Figures come from families seen in police papers (rectangle with
// diagonals, triangle with lines from the apex, grids with diagonals, plain
// and subdivided grids). The count is computed exactly (counting.ts), and the
// difficulty follows from the size of the answer.
import type { Rng } from '../rng.js';
import type { El, Pt } from '../model.js';
import { countRectangles, countTriangles, type Seg } from '../counting.js';
import { plainSvg } from '../svg.js';
import { type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { pickLang, type FigLang } from '../text.js';

const SIZE = 12;

function segsToEls(segs: Seg[]): El[] {
  return segs.map((s) => ({ k: 'line' as const, a: s.a, b: s.b }));
}

// ---------------------------------------------------------------------------
// Figure families
// ---------------------------------------------------------------------------

function rectWithDiagonals(rng: Rng): Seg[] {
  const [x1, y1, x2, y2] = rng.chance(0.5) ? [1, 1, 11, 11] : [1, 2.5, 11, 9.5];
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const segs: Seg[] = [
    { a: [x1, y1], b: [x2, y1] },
    { a: [x2, y1], b: [x2, y2] },
    { a: [x2, y2], b: [x1, y2] },
    { a: [x1, y2], b: [x1, y1] },
    { a: [x1, y1], b: [x2, y2] },
    { a: [x2, y1], b: [x1, y2] },
  ];
  if (rng.chance(0.6)) segs.push({ a: [mx, y1], b: [mx, y2] });
  if (rng.chance(0.5)) segs.push({ a: [x1, my], b: [x2, my] });
  if (rng.chance(0.35)) {
    // Diamond through the mid-points of the sides.
    segs.push({ a: [mx, y1], b: [x2, my] }, { a: [x2, my], b: [mx, y2] }, { a: [mx, y2], b: [x1, my] }, { a: [x1, my], b: [mx, y1] });
  }
  return segs;
}

function triangleWithCevians(rng: Rng, maxLines: number): Seg[] {
  const apex: Pt = [6, 1];
  const left: Pt = [0.8, 11];
  const right: Pt = [11.2, 11];
  const segs: Seg[] = [
    { a: apex, b: left },
    { a: apex, b: right },
    { a: left, b: right },
  ];
  const k = rng.int(1, maxLines);
  const xs = new Set<number>();
  while (xs.size < k) xs.add(Math.round((1.8 + rng.next() * 8.4) * 2) / 2);
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.some((x, i) => i > 0 && x - sorted[i - 1]! < 1.2)) return [];
  for (const x of sorted) segs.push({ a: apex, b: [x, 11] });
  const h = rng.int(0, maxLines > 2 ? 2 : 1);
  const ys = h === 0 ? [] : h === 1 ? [rng.pick([6, 7])] : [4.5, 7.8];
  for (const y of ys) {
    const t = (y - 1) / 10;
    segs.push({ a: [6 + (0.8 - 6) * t, y], b: [6 + (11.2 - 6) * t, y] });
  }
  return segs;
}

function gridWithDiagonals(rng: Rng, maxCells: number): Seg[] {
  const r = rng.int(1, 2);
  const c = rng.int(r === 1 ? 2 : 1, Math.max(2, Math.floor(maxCells / r)));
  const w = 10 / Math.max(r, c);
  const ox = (SIZE - c * w) / 2;
  const oy = (SIZE - r * w) / 2;
  const segs: Seg[] = [];
  for (let i = 0; i <= r; i++) segs.push({ a: [ox, oy + i * w], b: [ox + c * w, oy + i * w] });
  for (let j = 0; j <= c; j++) segs.push({ a: [ox + j * w, oy], b: [ox + j * w, oy + r * w] });
  let diagonals = 0;
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      const x = ox + j * w,
        y = oy + i * w;
      const kind = rng.int(0, 3);
      if (kind === 1 || kind === 3) segs.push({ a: [x, y], b: [x + w, y + w] });
      if (kind === 2 || kind === 3) segs.push({ a: [x + w, y], b: [x, y + w] });
      if (kind) diagonals++;
    }
  return diagonals >= 2 ? segs : [];
}

let lastGrid: { r: number; c: number; subdivided: boolean } | null = null;

function grid(rng: Rng, maxN: number, subdivide: boolean): Seg[] {
  const r = rng.int(2, maxN);
  const c = rng.int(2, maxN);
  lastGrid = { r, c, subdivided: subdivide };
  const w = 10 / Math.max(r, c);
  const ox = (SIZE - c * w) / 2;
  const oy = (SIZE - r * w) / 2;
  const segs: Seg[] = [];
  for (let i = 0; i <= r; i++) segs.push({ a: [ox, oy + i * w], b: [ox + c * w, oy + i * w] });
  for (let j = 0; j <= c; j++) segs.push({ a: [ox + j * w, oy], b: [ox + j * w, oy + r * w] });
  if (subdivide) {
    // One or two cells split into four smaller squares.
    const cells = rng.shuffle(Array.from({ length: r * c }, (_, i) => i)).slice(0, rng.int(1, 2));
    for (const cell of cells) {
      const x = ox + (cell % c) * w;
      const y = oy + Math.floor(cell / c) * w;
      segs.push({ a: [x + w / 2, y], b: [x + w / 2, y + w] }, { a: [x, y + w / 2], b: [x + w, y + w / 2] });
    }
  }
  return segs;
}

/** A grid with some cells left out (an irregular block of squares). */
function partialGrid(rng: Rng, maxN: number, diagonals: boolean): Seg[] {
  const r = rng.int(2, maxN);
  const c = rng.int(2, maxN);
  const w = 10 / Math.max(r, c);
  const ox = (SIZE - c * w) / 2;
  const oy = (SIZE - r * w) / 2;
  const cells: [number, number][] = [];
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) cells.push([i, j]);
  const drop = rng.int(1, Math.max(1, Math.floor((r * c) / 3)));
  const kept = rng.shuffle(cells).slice(drop);
  // Keep the block in one piece: every kept cell must touch another kept cell.
  if (kept.length < 3 || !kept.every(([i, j]) => kept.some(([a, b]) => Math.abs(a - i) + Math.abs(b - j) === 1))) return [];
  lastGrid = { r, c, subdivided: true }; // not a full grid: no formula
  const segs: Seg[] = [];
  for (const [i, j] of kept) {
    const x = ox + j * w,
      y = oy + i * w;
    segs.push({ a: [x, y], b: [x + w, y] }, { a: [x, y + w], b: [x + w, y + w] }, { a: [x, y], b: [x, y + w] }, { a: [x + w, y], b: [x + w, y + w] });
    if (diagonals) {
      const kind = rng.int(0, 3);
      if (kind === 1 || kind === 3) segs.push({ a: [x, y], b: [x + w, y + w] });
      if (kind === 2 || kind === 3) segs.push({ a: [x + w, y], b: [x, y + w] });
    }
  }
  return segs;
}

// ---------------------------------------------------------------------------

type Shape = 'triangle' | 'square' | 'rectangle';

const LIMITS: Record<Shape, Record<Difficulty, [number, number]>> = {
  triangle: { easy: [4, 10], medium: [11, 24], hard: [25, 60] },
  square: { easy: [4, 10], medium: [11, 22], hard: [23, 70] },
  rectangle: { easy: [5, 18], medium: [19, 60], hard: [61, 300] },
};

function levelOf(shape: Shape, n: number): Difficulty | null {
  const l = LIMITS[shape];
  for (const d of ['easy', 'medium', 'hard'] as const) if (n >= l[d][0] && n <= l[d][1]) return d;
  return null;
}

function build(rng: Rng, shape: Shape, difficulty: Difficulty): Seg[] {
  lastGrid = null;
  if (shape === 'triangle') {
    const fam = rng.int(0, 3);
    if (fam === 0) return rectWithDiagonals(rng);
    if (fam === 1) return triangleWithCevians(rng, difficulty === 'easy' ? 2 : 4);
    if (fam === 2) return gridWithDiagonals(rng, difficulty === 'hard' ? 6 : 4);
    return partialGrid(rng, difficulty === 'hard' ? 3 : 2, true);
  }
  if (rng.chance(0.5)) return partialGrid(rng, difficulty === 'easy' ? 3 : 5, false);
  return grid(rng, difficulty === 'easy' ? 3 : 5, difficulty !== 'easy' && rng.chance(shape === 'square' ? 0.6 : 0.4));
}

function sizesText(lang: FigLang, groups: number[], total: number): string {
  const sum = `${groups.join(' + ')} = ${total}`;
  return pickLang(lang, {
    hi: `आकार के अनुसार (सबसे छोटे से सबसे बड़े तक) गिनती: ${sum}`,
    hl: `Size ke hisaab se (sabse chhote se sabse bade tak) ginti: ${sum}`,
    en: `Counting by size, smallest first: ${sum}`,
  });
}

const choose2 = (k: number) => (k * (k - 1)) / 2;

/** Rectangles in a plain r × c grid: choose 2 of the r+1 horizontal and 2 of the c+1 vertical lines. */
function gridFormula(lang: FigLang, r: number, c: number, total: number): string {
  const a = choose2(r + 1);
  const b = choose2(c + 1);
  return pickLang(lang, {
    hi: `${r + 1} क्षैतिज रेखाओं में से 2 चुनने के ${a} तरीके और ${c + 1} ऊर्ध्वाधर रेखाओं में से 2 चुनने के ${b} तरीके हैं; आयत = ${a} × ${b} = ${total}`,
    hl: `${r + 1} horizontal rekhaon mein se 2 chunne ke ${a} tareeke aur ${c + 1} vertical rekhaon mein se 2 chunne ke ${b} tareeke hain; aayat = ${a} × ${b} = ${total}`,
    en: `There are ${a} ways to pick 2 of the ${r + 1} horizontal lines and ${b} ways to pick 2 of the ${c + 1} vertical lines; rectangles = ${a} × ${b} = ${total}`,
  });
}

function distractorNumbers(rng: Rng, n: number): number[] {
  const cands = rng.shuffle([n - 2, n + 2, n - 1, n + 1, n + 4, n - 4, n + 3]).filter((v) => v > 0 && v !== n);
  const out: number[] = [];
  for (const v of cands) if (!out.includes(v)) out.push(v);
  return out.slice(0, 3);
}

function makeCounter(shape: Shape): Generator['generate'] {
  return (rng, difficulty, lang) => {
    const segs = build(rng, shape, difficulty);
    if (!segs.length) return null;
    const gridInfo = lastGrid as { r: number; c: number; subdivided: boolean } | null;
    let total: number;
    let groups: number[];
    if (shape === 'triangle') {
      const r = countTriangles(segs);
      total = r.count;
      groups = r.byArea.map((g) => g.count);
    } else {
      const r = countRectangles(segs, shape === 'square');
      total = r.count;
      // Group by area so the working stays short (2×1 and 1×2 together).
      const byArea: { area: number; count: number }[] = [];
      for (const g of r.bySize) {
        const area = Math.round(g.w * g.h * 1000) / 1000;
        const hit = byArea.find((x) => x.area === area);
        if (hit) hit.count += g.count;
        else byArea.push({ area, count: g.count });
      }
      groups = byArea.sort((p, q) => p.area - q.area).map((g) => g.count);
    }
    if (levelOf(shape, total) !== difficulty) return null;
    const wrong = distractorNumbers(rng, total);
    if (wrong.length < 3) return null;
    const values = rng.shuffle([total, ...wrong]);
    const correct = values.indexOf(total);
    const noun = {
      triangle: { hi: 'त्रिभुज', hl: 'tribhuj (triangles)', en: 'triangles' },
      square: { hi: 'वर्ग', hl: 'varg (squares)', en: 'squares' },
      rectangle: { hi: 'आयत', hl: 'aayat (rectangles)', en: 'rectangles' },
    }[shape];
    const note =
      shape === 'rectangle'
        ? pickLang(lang, { hi: ' (वर्ग भी आयत ही गिने जाएँगे)', hl: ' (varg bhi aayat hi gine jaayenge)', en: ' (squares count as rectangles)' })
        : '';
    return {
      generator: `count-${shape}s`,
      chapter: 'counting-figures',
      difficulty,
      stem: pickLang(lang, {
        hi: `दी गई आकृति में कितने ${noun.hi} हैं?${note}`,
        hl: `Di gayi figure mein kitne ${noun.hl} hain?${note}`,
        en: `How many ${noun.en} are there in the given figure?${note}`,
      }),
      explanation:
        (shape === 'rectangle' && gridInfo && !gridInfo.subdivided
          ? gridFormula(lang, gridInfo.r, gridInfo.c, total)
          : groups.length <= 9
            ? sizesText(lang, groups, total)
            : pickLang(lang, {
                hi: `सबसे छोटे आकार से शुरू करके हर आकार के ${noun.hi} गिनें`,
                hl: `Sabse chhote size se shuru karke har size ke ${noun.hl.split(' ')[0]} giniye`,
                en: `Count the ${noun.en} of every size, starting with the smallest`,
              })) +
        pickLang(lang, {
          hi: `। अतः कुल ${total} ${noun.hi} हैं।`,
          hl: `. Isliye kul ${total} ${noun.hl.split(' ')[0]} hain.`,
          en: `. So there are ${total} ${noun.en} in all.`,
        }),
      stimulus: plainSvg({ size: SIZE, els: segsToEls(segs) }, 200),
      options: values.map((v) => ({ text: String(v), svg: null })),
      correct,
      key: `count-${shape}s:${segs
        .map((s) => `${s.a.map((v) => v.toFixed(3)).join(',')}-${s.b.map((v) => v.toFixed(3)).join(',')}`)
        .sort()
        .join(';')}`,
      model: { segs, total, groups, values },
    };
  };
}

export const countTrianglesGen: Generator = {
  id: 'count-triangles',
  chapter: 'counting-figures',
  title: { hi: 'त्रिभुज गिनना', hl: 'Tribhuj ginna', en: 'Counting triangles' },
  description: 'Rectangles with diagonals and mid-lines, triangles with lines from the apex, full or partial grids with diagonals. Easy ≤ 10, medium 11–24, hard 25+.',
  generate: makeCounter('triangle'),
};

export const countSquaresGen: Generator = {
  id: 'count-squares',
  chapter: 'counting-figures',
  title: { hi: 'वर्ग गिनना', hl: 'Varg ginna', en: 'Counting squares' },
  description: 'Full or partial (stepped) grids, some with cells split into four. Easy ≤ 10, medium 11–22, hard 23+.',
  generate: makeCounter('square'),
};

export const countRectanglesGen: Generator = {
  id: 'count-rectangles',
  chapter: 'counting-figures',
  title: { hi: 'आयत गिनना', hl: 'Aayat ginna', en: 'Counting rectangles' },
  description: 'Full or partial grids (squares included), some with split cells. Easy ≤ 18, medium 19–60, hard 61+.',
  generate: makeCounter('rectangle'),
};
