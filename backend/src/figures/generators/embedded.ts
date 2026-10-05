// Embedded figures: "in which answer figure is figure (X) hidden?"
// Figures live on an integer lattice and are stored as unit edges
// (horizontal, vertical or diagonal steps), so "X is contained" means: some
// translation of X's edge set is a subset of the figure's edge set. That is
// checked exhaustively, for the answer (must contain X) and for every
// distractor (must not contain X anywhere).
import type { Rng } from '../rng.js';
import type { El, Pt } from '../model.js';
import { canvasSvg, renderEls } from '../svg.js';
import { arrange, type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { optionText, pickLang, LABELS, type FigLang } from '../text.js';

export type Edge = string; // "x1,y1:x2,y2" with the smaller point first
const FIG = 6; // option figures span 0..6
const PX = 20; // pixels per lattice unit — the same for X and the options

const DIRS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

export function edge(a: Pt, b: Pt): Edge {
  const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
  return `${p[0]},${p[1]}:${q[0]},${q[1]}`;
}
export function parseEdge(e: Edge): [Pt, Pt] {
  const [p, q] = e.split(':').map((s) => s.split(',').map(Number) as unknown as Pt);
  return [p!, q!];
}

function run(start: Pt, dir: [number, number], len: number): Edge[] {
  const out: Edge[] = [];
  let p = start;
  for (let i = 0; i < len; i++) {
    const q: Pt = [p[0] + dir[0], p[1] + dir[1]];
    out.push(edge(p, q));
    p = q;
  }
  return out;
}

const inBox = (p: Pt, n: number) => p[0] >= 0 && p[1] >= 0 && p[0] <= n && p[1] <= n;

/** Move an edge set so its bounding box starts at (0, 0). */
export function normalize(edges: Iterable<Edge>): Edge[] {
  const list = [...edges].map(parseEdge);
  const mx = Math.min(...list.flatMap(([p, q]) => [p[0], q[0]]));
  const my = Math.min(...list.flatMap(([p, q]) => [p[1], q[1]]));
  return list.map(([p, q]) => edge([p[0] - mx, p[1] - my], [q[0] - mx, q[1] - my])).sort();
}

export function shift(edges: Iterable<Edge>, dx: number, dy: number): Edge[] {
  return [...edges].map((e) => {
    const [p, q] = parseEdge(e);
    return edge([p[0] + dx, p[1] + dy], [q[0] + dx, q[1] + dy]);
  });
}

/** All translations at which X (normalized) sits inside the figure. */
export function placements(x: Edge[], fig: Set<Edge>, n = FIG): [number, number][] {
  const found: [number, number][] = [];
  for (let dx = 0; dx <= n; dx++)
    for (let dy = 0; dy <= n; dy++) if (shift(x, dx, dy).every((e) => fig.has(e))) found.push([dx, dy]);
  return found;
}

function randomX(rng: Rng, strokes: number, box = 3): Edge[] | null {
  let p: Pt = [rng.int(0, box), rng.int(0, box)];
  const edges = new Set<Edge>();
  let prev = -1;
  for (let s = 0; s < strokes; s++) {
    const options = DIRS.map((d, i) => ({ d, i })).filter(({ i }) => prev < 0 || (i !== prev && i !== (prev + 4) % 8));
    const { d, i } = rng.pick(options);
    const len = d[0] !== 0 && d[1] !== 0 ? 1 : rng.int(1, 2);
    const end: Pt = [p[0] + d[0] * len, p[1] + d[1] * len];
    if (!inBox(end, box)) return null;
    for (const e of run(p, d, len)) {
      if (edges.has(e)) return null;
      edges.add(e);
    }
    p = end;
    prev = i;
  }
  return normalize(edges);
}

function mirrorX(x: Edge[]): Edge[] {
  return normalize(
    x.map((e) => {
      const [p, q] = parseEdge(e);
      return edge([-p[0], p[1]], [-q[0], q[1]]);
    })
  );
}
function rot90(x: Edge[]): Edge[] {
  return normalize(
    x.map((e) => {
      const [p, q] = parseEdge(e);
      return edge([-p[1], p[0]], [-q[1], q[0]]);
    })
  );
}

/** X with its last stroke redrawn in another direction — the classic near miss. */
function nearMisses(x: Edge[]): Edge[][] {
  const pts = x.flatMap(parseEdge);
  const deg = new Map<string, number>();
  for (const p of pts) deg.set(`${p[0]},${p[1]}`, (deg.get(`${p[0]},${p[1]}`) ?? 0) + 1);
  const out: Edge[][] = [];
  for (const e of x) {
    const [p, q] = parseEdge(e);
    for (const [end, other] of [
      [p, q],
      [q, p],
    ] as [Pt, Pt][]) {
      if (deg.get(`${end[0]},${end[1]}`) !== 1) continue;
      for (const d of DIRS) {
        const moved: Pt = [other[0] + d[0], other[1] + d[1]];
        const ne = edge(other, moved);
        if (ne === e || x.includes(ne)) continue;
        out.push(normalize([...x.filter((k) => k !== e), ne]));
      }
    }
  }
  return out;
}

function border(): Edge[] {
  return [...run([0, 0], [1, 0], FIG), ...run([FIG, 0], [0, 1], FIG), ...run([0, FIG], [1, 0], FIG), ...run([0, 0], [0, 1], FIG)];
}

function noise(rng: Rng, count: number): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < count; i++) {
    const d = rng.pick(DIRS);
    const start: Pt = [rng.int(0, FIG), rng.int(0, FIG)];
    let len = rng.int(2, 5);
    while (len > 0 && !inBox([start[0] + d[0] * len, start[1] + d[1] * len], FIG)) len--;
    if (len > 0) out.push(...run(start, d, len));
  }
  return out;
}

function bboxSize(x: Edge[]): [number, number] {
  const pts = x.flatMap(parseEdge);
  return [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

/** Edge set → drawing: unit edges merged into the longest straight lines. */
export function edgesToEls(edges: Iterable<Edge>, offset = 0): El[] {
  const set = new Set(edges);
  const used = new Set<Edge>();
  const els: El[] = [];
  for (const e of [...set].sort()) {
    if (used.has(e)) continue;
    const [p, q] = parseEdge(e);
    const d: [number, number] = [q[0] - p[0], q[1] - p[1]];
    let a = p;
    while (set.has(edge([a[0] - d[0], a[1] - d[1]], a))) a = [a[0] - d[0], a[1] - d[1]];
    let b = a;
    while (set.has(edge(b, [b[0] + d[0], b[1] + d[1]]))) {
      used.add(edge(b, [b[0] + d[0], b[1] + d[1]]));
      b = [b[0] + d[0], b[1] + d[1]];
    }
    els.push({ k: 'line', a: [a[0] + offset, a[1] + offset], b: [b[0] + offset, b[1] + offset] });
  }
  return els;
}

function figureSvg(edges: Iterable<Edge>, n: number): string {
  const pad = 0.7;
  const px = (n + 2 * pad) * PX;
  return canvasSvg(px, px, renderEls(edgesToEls(edges, pad), PX));
}

function stimulusSvg(x: Edge[]): string {
  const [w, h] = bboxSize(x);
  const pad = 0.9;
  const W = (Math.max(w, 3) + 2 * pad) * PX;
  const H = (Math.max(h, 3) + 2 * pad) * PX;
  const ox = (W - w * PX) / 2;
  const oy = (H - h * PX) / 2;
  const els = edgesToEls(x, 0);
  return canvasSvg(
    W + 40,
    H,
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#111" stroke-width="1.6"/>` +
      renderEls(els, PX, ox, oy) +
      `<text x="${W + 20}" y="${H / 2}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#111">(X)</text>`
  );
}

const SETTINGS: Record<Difficulty, { strokes: number; noise: [number, number]; box: number }> = {
  easy: { strokes: 3, noise: [3, 4], box: 3 },
  medium: { strokes: 4, noise: [5, 7], box: 3 },
  hard: { strokes: 5, noise: [6, 8], box: 4 },
};

function genEmbedded(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const cfg = SETTINGS[difficulty];
  const x = randomX(rng, cfg.strokes, cfg.box);
  if (!x || x.length < cfg.strokes) return null;
  const [w, h] = bboxSize(x);
  if (w === 0 || h === 0) return null; // a straight line is too easy to hide/find

  const place = (shape: Edge[]) => {
    const [sw, sh] = bboxSize(shape);
    return shift(shape, rng.int(0, FIG - sw), rng.int(0, FIG - sh));
  };
  const answer = new Set([...border(), ...noise(rng, rng.int(...cfg.noise)), ...place(x)]);
  if (placements(x, answer).length === 0) return null;

  // Near misses: mirrored X, turned X, X with one stroke redrawn. Hard
  // questions use mostly one-stroke changes, which are the hardest to spot.
  const same = (a: Edge[], b: Edge[]) => a.join(' ') === b.join(' ');
  const misses = rng.shuffle(nearMisses(x)).filter((v) => bboxSize(v)[0] <= FIG && bboxSize(v)[1] <= FIG);
  const flips = [mirrorX(x), rot90(x)];
  const ordered = difficulty === 'hard' ? [...misses.slice(0, 4), ...flips] : [...rng.shuffle(flips), ...misses.slice(0, 4)];
  const pool = ordered.filter((v) => !same(v, x));
  const distractors: Set<Edge>[] = [];
  for (const v of pool) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const f = new Set([...border(), ...noise(rng, rng.int(...cfg.noise)), ...place(v)]);
      if (placements(x, f).length === 0) {
        distractors.push(f);
        break;
      }
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const keyOf = (s: Set<Edge>) => [...s].sort().join(' ');
  const { items, correct } = arrange(rng, answer, distractors, keyOf);
  const label = LABELS[correct]!;
  return {
    generator: 'embedded-figure',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'वह उत्तर आकृति चुनिए जिसमें प्रश्न आकृति (X) छिपी हुई (सन्निहित) है। आकृति (X) को घुमाया या उलटा नहीं गया है।',
      hl: 'Woh uttar figure chuniye jismein prashn figure (X) chhipi hui (embedded) hai. Figure (X) ko ghumaya ya ulta nahi gaya hai.',
      en: 'Choose the answer figure in which the question figure (X) is embedded. Figure (X) is not turned or flipped.',
    }),
    explanation: pickLang(lang, {
      hi: `आकृति (X) उसी आकार और दिशा में आकृति (${label}) की रेखाओं में पूरी दिखाई देती है। अन्य आकृतियों में उसका उलटा, घुमाया हुआ या बदला हुआ रूप है।`,
      hl: `Figure (X) usi size aur disha mein figure (${label}) ki rekhaon mein poori dikhai deti hai. Baaki figures mein uska ulta, ghumaya hua ya badla hua roop hai.`,
      en: `Figure (X), in the same size and direction, is traced completely by the lines of figure (${label}). The other figures contain a flipped, turned or altered version.`,
    }),
    stimulus: stimulusSvg(x),
    options: items.map((s, i) => ({ text: optionText(lang, LABELS[i]!), svg: figureSvg(s, FIG) })),
    correct,
    key: `embedded:${x.join(' ')}#${keyOf(answer)}`,
    model: { x, options: items.map((s) => [...s].sort()) },
  };
}

export const embeddedFigure: Generator = {
  id: 'embedded-figure',
  chapter: 'figure-based',
  title: { hi: 'अंतर्निहित (छिपी) आकृति', hl: 'Embedded (chhipi) figure', en: 'Embedded figure' },
  description: 'Find the answer figure that contains X; distractors hide a mirrored, turned or altered X and are checked not to contain X anywhere.',
  generate: genEmbedded,
};
