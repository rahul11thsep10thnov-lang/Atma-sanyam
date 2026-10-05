// Independent checks for the figure engine. Every generator's answer is
// re-derived here with a different method from the one the generator uses.
import { describe, expect, it } from 'vitest';
import { GENERATORS, generateFigureQuestion, type FigLang } from '../src/figures/index.js';
import { countRectangles, countTriangles, intersect, mergeSegments, type Seg } from '../src/figures/counting.js';
import { boxSvg } from '../src/figures/svg.js';
import type { El, Fig, Pt } from '../src/figures/model.js';
import { parseEdge, type Edge } from '../src/figures/generators/embedded.js';
import { evaluate } from '../src/services/questionService.js';
import type { Fold, Hole } from '../src/figures/generators/paperFold.js';

const DIFFS = ['easy', 'medium', 'hard'] as const;
const LANGS: FigLang[] = ['hi', 'hi-Latn', 'en'];
const N = 60; // seeds per generator × difficulty

function each(id: string, fn: (q: ReturnType<typeof generateFigureQuestion>) => void, n = N) {
  for (const d of DIFFS)
    for (let s = 0; s < n; s++) {
      const q = generateFigureQuestion(id, d, 'en', 5000 + s);
      fn(q);
    }
}

// ---------------------------------------------------------------------------
// Counting: known answers and a second, independent method
// ---------------------------------------------------------------------------

const rect = (x1: number, y1: number, x2: number, y2: number): Seg[] => [
  { a: [x1, y1], b: [x2, y1] },
  { a: [x2, y1], b: [x2, y2] },
  { a: [x2, y2], b: [x1, y2] },
  { a: [x1, y2], b: [x1, y1] },
];
function gridSegs(r: number, c: number): Seg[] {
  const s: Seg[] = [];
  for (let i = 0; i <= r; i++) s.push({ a: [0, i], b: [c, i] });
  for (let j = 0; j <= c; j++) s.push({ a: [j, 0], b: [j, r] });
  return s;
}

/** Second method: a triangle's sides lie on three different (maximal) lines;
 * every triple of lines that meet pairwise inside their extents is one triangle. */
function trianglesByLineTriples(segs: Seg[]): number {
  const lines = mergeSegments(segs);
  let n = 0;
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length; j++)
      for (let k = j + 1; k < lines.length; k++) {
        const p = intersect(lines[i]!, lines[j]!);
        const q = intersect(lines[i]!, lines[k]!);
        const r = intersect(lines[j]!, lines[k]!);
        if (!p || !q || !r) continue;
        const area = Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
        if (area > 1e-6) n++;
      }
  return n;
}

describe('counting algorithms', () => {
  it('match textbook answers', () => {
    const withDiagonals = [...rect(0, 0, 4, 2), { a: [0, 0], b: [4, 2] }, { a: [4, 0], b: [0, 2] }] as Seg[];
    expect(countTriangles(withDiagonals).count).toBe(8);
    const withMidlines = [...withDiagonals, { a: [2, 0], b: [2, 2] }, { a: [0, 1], b: [4, 1] }] as Seg[];
    expect(countTriangles(withMidlines).count).toBe(16);
    // Triangle with k lines from the apex and h lines across: C(k+2, 2) × (h+1).
    for (const k of [0, 1, 2, 3, 4])
      for (const h of [0, 1, 2]) {
        const segs: Seg[] = [
          { a: [5, 0], b: [0, 10] },
          { a: [5, 0], b: [10, 10] },
          { a: [0, 10], b: [10, 10] },
        ];
        for (let i = 1; i <= k; i++) segs.push({ a: [5, 0], b: [(10 * i) / (k + 1), 10] });
        for (let i = 1; i <= h; i++) {
          const y = (10 * i) / (h + 1);
          segs.push({ a: [5 - y / 2, y], b: [5 + y / 2, y] });
        }
        expect(countTriangles(segs).count).toBe((((k + 2) * (k + 1)) / 2) * (h + 1));
      }
    // 2 × 2 grid with both diagonals in every cell: 44.
    const g = gridSegs(2, 2);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) g.push({ a: [j, i], b: [j + 1, i + 1] }, { a: [j + 1, i], b: [j, i + 1] });
    expect(countTriangles(g).count).toBe(44);
  });

  it('counts squares and rectangles in grids (chessboard = 204 squares, 1296 rectangles)', () => {
    const sq = (r: number, c: number) => {
      let n = 0;
      for (let k = 1; k <= Math.min(r, c); k++) n += (r - k + 1) * (c - k + 1);
      return n;
    };
    const re = (r: number, c: number) => (((r + 1) * r) / 2) * (((c + 1) * c) / 2);
    for (const [r, c] of [
      [1, 1],
      [2, 2],
      [2, 3],
      [3, 5],
      [4, 4],
      [8, 8],
    ] as [number, number][]) {
      expect(countRectangles(gridSegs(r, c), true).count).toBe(sq(r, c));
      expect(countRectangles(gridSegs(r, c), false).count).toBe(re(r, c));
    }
  });

  it('agrees with the line-triple method on every generated triangle figure', () => {
    each('count-triangles', (q) => {
      const m = q.model as { segs: Seg[]; total: number; values: number[] };
      expect(trianglesByLineTriples(m.segs)).toBe(m.total);
      expect(q.options[q.correct]!.text).toBe(String(m.total));
    });
  });

  it('agrees with sampled edge coverage on every generated square/rectangle figure', () => {
    const covered = (segs: Seg[], p: Pt) =>
      segs.some((s) => {
        const d = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        const d1 = Math.hypot(p[0] - s.a[0], p[1] - s.a[1]);
        const d2 = Math.hypot(p[0] - s.b[0], p[1] - s.b[1]);
        return Math.abs(d1 + d2 - d) < 1e-6;
      });
    const edgeOk = (segs: Seg[], a: Pt, b: Pt) => {
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        if (!covered(segs, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])) return false;
      }
      return true;
    };
    for (const id of ['count-squares', 'count-rectangles']) {
      each(
        id,
        (q) => {
          const m = q.model as { segs: Seg[]; total: number };
          // Distinct coordinates (with a tolerance — rounding would move points off the lines).
          const uniq = (vals: number[]) => vals.sort((a, b) => a - b).filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]!) > 1e-9);
          const xs = uniq(m.segs.flatMap((s) => [s.a[0], s.b[0]]));
          const ys = uniq(m.segs.flatMap((s) => [s.a[1], s.b[1]]));
          let n = 0;
          for (let a = 0; a < xs.length; a++)
            for (let b = a + 1; b < xs.length; b++)
              for (let c = 0; c < ys.length; c++)
                for (let d = c + 1; d < ys.length; d++) {
                  const [x1, x2, y1, y2] = [xs[a]!, xs[b]!, ys[c]!, ys[d]!];
                  if (id === 'count-squares' && Math.abs(x2 - x1 - (y2 - y1)) > 1e-6) continue;
                  if (edgeOk(m.segs, [x1, y1], [x2, y1]) && edgeOk(m.segs, [x1, y2], [x2, y2]) && edgeOk(m.segs, [x1, y1], [x1, y2]) && edgeOk(m.segs, [x2, y1], [x2, y2]))
                    n++;
                }
          expect(n).toBe(m.total);
        },
        20
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Transform-based questions, re-derived with the test's own geometry
// ---------------------------------------------------------------------------

type Pmap = (p: Pt) => Pt;
function mapFig(fig: Fig, f: Pmap, mirror: boolean, flipText?: 'x' | 'y'): Fig {
  const els = fig.els.map((e): El => {
    switch (e.k) {
      case 'line':
      case 'arrow':
        return { ...e, a: f(e.a), b: f(e.b) };
      case 'poly':
        return { ...e, pts: e.pts.map(f) };
      case 'circle':
        return { ...e, c: f(e.c) };
      case 'text':
        return {
          ...e,
          at: f(e.at),
          sx: flipText === 'x' ? (((e.sx ?? 1) * -1) as 1 | -1) : e.sx ?? 1,
          sy: flipText === 'y' ? (((e.sy ?? 1) * -1) as 1 | -1) : e.sy ?? 1,
        };
      default:
        throw new Error(`unexpected element ${e.k} (mirror=${mirror})`);
    }
  });
  return { size: fig.size, els };
}
const N12 = 12;
const myFlipX = (f: Fig) => mapFig(f, ([x, y]) => [N12 - x, y], true, 'x');
const myFlipY = (f: Fig) => mapFig(f, ([x, y]) => [x, N12 - y], true, 'y');
const myRot = (f: Fig) => mapFig(f, ([x, y]) => [N12 - y, x], false);
const svgOf = (f: Fig) => boxSvg(f);

describe('mirror and water images', () => {
  for (const [id, flip] of [
    ['mirror-image', myFlipX],
    ['water-image', myFlipY],
  ] as const) {
    it(`${id}: exactly one option is the reflection`, () => {
      each(id, (q) => {
        const m = q.model as { fig: Fig };
        const expected = svgOf(flip(m.fig));
        const hits = q.options.map((o, i) => (o.svg === expected ? i : -1)).filter((i) => i >= 0);
        expect(hits).toEqual([q.correct]);
      });
    });
  }
});

describe('odd figure out', () => {
  it('three options are turns of one figure; the answer is not', () => {
    each('odd-one-out', (q) => {
      const m = q.model as { options: { fig: Fig }[] };
      m.options.forEach((o, i) => expect(svgOf(o.fig)).toBe(q.options[i]!.svg));
      const orbit = (f: Fig) => {
        const out = new Set<string>();
        let g = f;
        for (let k = 0; k < 4; k++) {
          out.add(svgOf(g));
          g = myRot(g);
        }
        return out;
      };
      const orbits = m.options.map((o) => orbit(o.fig));
      const sameAs = (i: number) => m.options.filter((_, j) => j !== i && orbits[i]!.has(svgOf(m.options[j]!.fig))).length;
      m.options.forEach((_, i) => expect(sameAs(i)).toBe(i === q.correct ? 0 : 2));
    });
  });
});

describe('figure analogy', () => {
  it('the answer is the same change applied to the third figure, and no other change fits', () => {
    const invert = (f: Fig): Fig => ({
      size: f.size,
      els: f.els.map((e) =>
        e.k === 'circle' || (e.k === 'poly' && e.closed) ? { ...e, fill: e.fill === 'black' ? 'none' : e.fill === 'none' ? 'black' : e.fill } : e
      ),
    });
    const rigid: Record<string, (f: Fig) => Fig> = {
      id: (f) => f,
      rot90: myRot,
      rot180: (f) => myRot(myRot(f)),
      rot270: (f) => myRot(myRot(myRot(f))),
      flipX: myFlipX,
      flipY: myFlipY,
    };
    const ops = Object.entries(rigid).flatMap(([name, fn]) => [
      { name, f: fn },
      { name: `${name}+inv`, f: (x: Fig) => invert(fn(x)) },
    ]);
    each('figure-analogy', (q) => {
      const m = q.model as { A: Fig; B: Fig; C: Fig; op: { t: string; invert: boolean } };
      const op = ops.find((o) => o.name === `${m.op.t}${m.op.invert ? '+inv' : ''}`)!;
      expect(svgOf(op.f(m.A))).toBe(svgOf(m.B));
      expect(q.options[q.correct]!.svg).toBe(svgOf(op.f(m.C)));
      for (const o of ops)
        if (svgOf(o.f(m.A)) === svgOf(m.B)) expect(svgOf(o.f(m.C))).toBe(q.options[q.correct]!.svg);
    });
  });
});

// ---------------------------------------------------------------------------
// Series: infer the rule from the four shown frames only
// ---------------------------------------------------------------------------

describe('figure series', () => {
  const nextOf = (vals: number[], m: number) => {
    const d = vals.slice(1).map((v, i) => (((v - vals[i]!) % m) + m) % m);
    const signed = d.map((x) => (x > m / 2 ? x - m : x));
    const dd = signed.slice(1).map((v, i) => v - signed[i]!);
    const step = dd.every((x) => x === dd[0]) ? signed[signed.length - 1]! + dd[0]! : signed[0]!;
    return (((vals[vals.length - 1]! + step) % m) + m) % m;
  };
  it('rotation: exactly one option continues every element', () => {
    each('series-rotation', (q) => {
      const m = q.model as { frames: { arrow: number; dot: number | null; tri: number | null }[]; options: typeof m.frames };
      const shown = m.frames.slice(0, 4);
      const want = {
        arrow: nextOf(shown.map((f) => f.arrow), 8),
        dot: shown[0]!.dot === null ? null : nextOf(shown.map((f) => f.dot!), 4),
        tri: shown[0]!.tri === null ? null : nextOf(shown.map((f) => f.tri!), 4),
      };
      const hits = m.options.map((o, i) => (o.arrow === want.arrow && o.dot === want.dot && o.tri === want.tri ? i : -1)).filter((i) => i >= 0);
      expect(hits).toEqual([q.correct]);
    });
  });
  it('sectors: the answer is the next state of every shaded block', () => {
    each('series-sectors', (q) => {
      const m = q.model as { frames: { black: number[]; grey: number[] }[]; options: { black: number[]; grey: number[] }[] };
      const key = (s: { black: number[]; grey: number[] }) => `${[...s.black].sort().join()}|${[...s.grey].sort().join()}`;
      expect(key(m.options[q.correct]!)).toBe(key(m.frames[4]!));
      // The block start and size progress steadily across the shown frames.
      const starts = m.frames.slice(0, 4).map((f) => f.black[0]!);
      expect(nextOf(starts, 8)).toBe(m.frames[4]!.black[0]);
      m.options.forEach((o, i) => i !== q.correct && expect(key(o)).not.toBe(key(m.frames[4]!)));
    });
  });
});

// ---------------------------------------------------------------------------
// Embedded figures: continuous-geometry containment
// ---------------------------------------------------------------------------

describe('embedded figures', () => {
  it('only the answer contains X (checked by sampling points along X)', () => {
    const toSegs = (edges: Edge[]): Seg[] => mergeSegments(edges.map((e) => {
      const [a, b] = parseEdge(e);
      return { a, b };
    }));
    const onAny = (segs: Seg[], p: Pt) =>
      segs.some((s) => Math.abs(Math.hypot(p[0] - s.a[0], p[1] - s.a[1]) + Math.hypot(p[0] - s.b[0], p[1] - s.b[1]) - Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1])) < 1e-6);
    each(
      'embedded-figure',
      (q) => {
        const m = q.model as { x: Edge[]; options: Edge[][] };
        const xs = m.x.map(parseEdge);
        const contains = (fig: Edge[]) => {
          const segs = toSegs(fig);
          for (let dx = 0; dx <= 6; dx++)
            for (let dy = 0; dy <= 6; dy++)
              if (xs.every(([a, b]) => [0, 0.25, 0.5, 0.75, 1].every((t) => onAny(segs, [a[0] + dx + (b[0] - a[0]) * t, a[1] + dy + (b[1] - a[1]) * t]))))
                return true;
          return false;
        };
        const hits = m.options.map((o, i) => (contains(o) ? i : -1)).filter((i) => i >= 0);
        expect(hits).toEqual([q.correct]);
      },
      25
    );
  });
});

// ---------------------------------------------------------------------------
// Paper folding: fold forward and see which cells get punched
// ---------------------------------------------------------------------------

describe('paper folding', () => {
  it('forward simulation gives the marked answer', () => {
    const move = (f: Fold, i: number, j: number): [number, number] => {
      const movesNow = f === 'L>R' ? i < 2 : f === 'R>L' ? i >= 2 : f === 'T>B' ? j < 2 : f === 'B>T' ? j >= 2 : i > j;
      if (!movesNow) return [i, j];
      if (f === 'L>R' || f === 'R>L') return [3 - i, j];
      if (f === 'T>B' || f === 'B>T') return [i, 3 - j];
      return [j, i];
    };
    const key = (hs: Hole[]) => hs.map((h) => `${h.i},${h.j},${h.shape}`).sort().join(';');
    each('paper-folding', (q) => {
      const m = q.model as { folds: Fold[]; punched: Hole[]; options: Hole[][] };
      const holes: Hole[] = [];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          let p: [number, number] = [i, j];
          for (const f of m.folds) p = move(f, p[0], p[1]);
          const hit = m.punched.find((h) => h.i === p[0] && h.j === p[1]);
          if (hit) holes.push({ i, j, shape: hit.shape });
        }
      const hits = m.options.map((o, i) => (key(o) === key(holes) ? i : -1)).filter((i) => i >= 0);
      expect(hits).toEqual([q.correct]);
    });
  });
});

// ---------------------------------------------------------------------------
// Venn: recompute from the meaning of the question
// ---------------------------------------------------------------------------

describe('Venn diagrams', () => {
  it('the marked number matches the condition', () => {
    each('venn-diagram', (q) => {
      const m = q.model as { values: Record<number, number>; query: string; order: [number, number, number] };
      const [a, b, c] = m.order;
      const inA = (r: number) => !!(r & (1 << a));
      const inB = (r: number) => !!(r & (1 << b));
      const inC = (r: number) => !!(r & (1 << c));
      const members = (r: number) => [0, 1, 2].filter((k) => r & (1 << k)).length;
      const cond: Record<string, (r: number) => boolean> = {
        'only-a': (r) => inA(r) && !inB(r) && !inC(r),
        'all-three': (r) => r === 7,
        'ab-not-c': (r) => inA(r) && inB(r) && !inC(r),
        ab: (r) => inA(r) && inB(r),
        'a-not-b': (r) => inA(r) && !inB(r),
        'exactly-two': (r) => members(r) === 2,
        'a-or-b-not-c': (r) => (inA(r) || inB(r)) && !inC(r),
      };
      let sum = 0;
      for (let r = 1; r <= 7; r++) if (cond[m.query]!(r)) sum += m.values[r]!;
      expect(q.options[q.correct]!.text).toBe(String(sum));
      expect(q.options.filter((o) => o.text === String(sum))).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Every generator: well-formed, safe, deterministic, balanced answers
// ---------------------------------------------------------------------------

describe('all generators', () => {
  it('produce well-formed, safe SVG in all three languages', () => {
    for (const g of GENERATORS)
      for (const d of DIFFS)
        for (const lang of LANGS)
          for (let s = 0; s < 8; s++) {
            const q = generateFigureQuestion(g.id, d, lang, 9000 + s);
            expect(q.options).toHaveLength(4);
            expect(q.difficulty).toBe(d);
            const svgs = [q.stimulus, ...q.options.map((o) => o.svg)].filter((x): x is string => !!x);
            expect(svgs.length).toBeGreaterThan(0);
            for (const svg of svgs) {
              expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
              expect(svg).not.toMatch(/<script|on[a-z]+=|href|<foreignObject|javascript:/i);
              expect(svg.length).toBeLessThan(16_000);
            }
            if (lang === 'hi') expect(q.stem).toMatch(/[ऀ-ॿ]/);
            else expect(q.stem).not.toMatch(/[ऀ-ॿ]/);
          }
  });

  it('pass the question validator with no errors in every type, level and language', () => {
    for (const g of GENERATORS)
      for (const d of DIFFS)
        for (const lang of LANGS)
          for (let s = 0; s < 12; s++) {
            const q = generateFigureQuestion(g.id, d, lang, 3100 + s);
            const ev = evaluate(
              {
                question_text: q.stem,
                options: q.options.map((o, i) => ({ id: 'ABCD'[i]!, text: o.text })),
                correct_option: 'ABCD'[q.correct]!,
                explanation: q.explanation,
                difficulty: d,
                computation: null,
                language: lang,
                question_type: 'mcq',
                examId: 'e',
                subjectId: 's',
                chapterId: 'c',
                topicId: null,
              },
              { explanationRequired: true, metadataOk: true, sourceProvided: true, pool: [] }
            );
            const errors = ev.validation.issues.filter((i) => i.severity === 'error');
            expect(errors, `${g.id}/${d}/${lang}: ${JSON.stringify(errors)}`).toEqual([]);
          }
  });

  it('are reproducible from the seed', () => {
    for (const g of GENERATORS) {
      const a = generateFigureQuestion(g.id, 'medium', 'hi', 4242);
      const b = generateFigureQuestion(g.id, 'medium', 'hi', 4242);
      expect(b.key).toBe(a.key);
      expect(b.correct).toBe(a.correct);
      expect(b.options).toEqual(a.options);
    }
  });

  it('spread the correct answer across A–D', () => {
    const counts = [0, 0, 0, 0];
    let total = 0;
    for (const g of GENERATORS)
      for (let s = 0; s < 40; s++) {
        counts[generateFigureQuestion(g.id, 'medium', 'en', 700 + s).correct]!++;
        total++;
      }
    for (const c of counts) expect(c / total).toBeGreaterThan(0.17);
  });
});
