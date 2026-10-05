// Venn diagrams with numbers: three labelled circles, a number in every
// region, and a question about a combination of groups. The answer is the sum
// of the regions that match the condition, worked out from region bitmasks.
import type { Rng } from '../rng.js';
import type { El, Pt } from '../model.js';
import { plainSvg } from '../svg.js';
import { type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { pickLang, type FigLang, type Tri } from '../text.js';

const SIZE = 12;
const CIRCLES: { c: Pt; r: number }[] = [
  { c: [4.6, 4.6], r: 3.2 },
  { c: [7.4, 4.6], r: 3.2 },
  { c: [6, 7.1], r: 3.2 },
];
const NAMES = ['P', 'Q', 'R'] as const;

const inside = (p: Pt, k: number) => Math.hypot(p[0] - CIRCLES[k]!.c[0], p[1] - CIRCLES[k]!.c[1]) < CIRCLES[k]!.r;
const maskOf = (p: Pt) => (inside(p, 0) ? 1 : 0) | (inside(p, 1) ? 2 : 0) | (inside(p, 2) ? 4 : 0);

/** A comfortable spot for the number in each of the 7 regions. */
export const REGION_SPOT: Record<number, Pt> = (() => {
  const best: Record<number, { p: Pt; d: number }> = {};
  for (let x = 1; x <= 11; x += 0.05)
    for (let y = 1; y <= 11; y += 0.05) {
      const p: Pt = [x, y];
      const m = maskOf(p);
      if (!m) continue;
      const d = Math.min(...CIRCLES.map((c) => Math.abs(Math.hypot(x - c.c[0], y - c.c[1]) - c.r)));
      if (!best[m] || d > best[m]!.d) best[m] = { p, d };
    }
  return Object.fromEntries(Object.entries(best).map(([m, v]) => [m, v.p])) as Record<number, Pt>;
})();

const SETS: [Tri, Tri, Tri][] = [
  [
    { hi: 'शिक्षित', hl: 'shikshit (educated)', en: 'educated' },
    { hi: 'नौकरीपेशा', hl: 'naukaripesha (employed)', en: 'employed' },
    { hi: 'शहरी', hl: 'shahri (urban)', en: 'urban' },
  ],
  [
    { hi: 'खिलाड़ी', hl: 'khiladi (sportspersons)', en: 'sportspersons' },
    { hi: 'विद्यार्थी', hl: 'vidyarthi (students)', en: 'students' },
    { hi: 'संगीत-प्रेमी', hl: 'sangeet-premi (music lovers)', en: 'music lovers' },
  ],
  [
    { hi: 'हिंदी बोलने वाले', hl: 'Hindi bolne wale', en: 'Hindi speakers' },
    { hi: 'स्नातक', hl: 'snatak (graduates)', en: 'graduates' },
    { hi: 'सरकारी कर्मचारी', hl: 'sarkari karmchari (government employees)', en: 'government employees' },
  ],
  [
    { hi: 'चाय पीने वाले', hl: 'chai peene wale', en: 'tea drinkers' },
    { hi: 'कॉफ़ी पीने वाले', hl: 'coffee peene wale', en: 'coffee drinkers' },
    { hi: 'दूध पीने वाले', hl: 'doodh peene wale', en: 'milk drinkers' },
  ],
];

interface Query {
  id: string;
  level: Difficulty;
  /** Region masks (1..7) counted in the answer. */
  regions: (a: number, b: number, c: number) => number[];
  text: (lang: FigLang, A: string, B: string, C: string) => string;
}

const bit = (k: number) => 1 << k;

const QUERIES: Query[] = [
  {
    id: 'only-a',
    level: 'easy',
    regions: (a) => [bit(a)],
    text: (l, A) => pickLang(l, { hi: `कितने व्यक्ति केवल ${A} हैं?`, hl: `Kitne vyakti sirf ${A} hain?`, en: `How many people are only ${A}?` }),
  },
  {
    id: 'all-three',
    level: 'easy',
    regions: () => [7],
    text: (l, A, B, C) =>
      pickLang(l, { hi: `कितने व्यक्ति ${A}, ${B} और ${C} तीनों हैं?`, hl: `Kitne vyakti ${A}, ${B} aur ${C} teeno hain?`, en: `How many people are ${A}, ${B} and ${C}?` }),
  },
  {
    id: 'ab-not-c',
    level: 'medium',
    regions: (a, b) => [bit(a) | bit(b)],
    text: (l, A, B, C) =>
      pickLang(l, {
        hi: `कितने व्यक्ति ${A} और ${B} दोनों हैं, परन्तु ${C} नहीं हैं?`,
        hl: `Kitne vyakti ${A} aur ${B} dono hain, lekin ${C} nahi hain?`,
        en: `How many people are both ${A} and ${B} but not ${C}?`,
      }),
  },
  {
    id: 'ab',
    level: 'medium',
    regions: (a, b) => [bit(a) | bit(b), 7],
    text: (l, A, B) => pickLang(l, { hi: `कितने व्यक्ति ${A} और ${B} दोनों हैं?`, hl: `Kitne vyakti ${A} aur ${B} dono hain?`, en: `How many people are both ${A} and ${B}?` }),
  },
  {
    id: 'a-not-b',
    level: 'medium',
    regions: (a, _b, c) => [bit(a), bit(a) | bit(c)],
    text: (l, A, B) => pickLang(l, { hi: `कितने व्यक्ति ${A} हैं, परन्तु ${B} नहीं हैं?`, hl: `Kitne vyakti ${A} hain, lekin ${B} nahi hain?`, en: `How many people are ${A} but not ${B}?` }),
  },
  {
    id: 'exactly-two',
    level: 'hard',
    regions: () => [3, 5, 6],
    text: (l, A, B, C) =>
      pickLang(l, {
        hi: `${A}, ${B} और ${C} — इनमें से ठीक दो वर्गों में कितने व्यक्ति आते हैं?`,
        hl: `${A}, ${B} aur ${C} — inmein se theek do vargon mein kitne vyakti aate hain?`,
        en: `How many people belong to exactly two of the groups ${A}, ${B} and ${C}?`,
      }),
  },
  {
    id: 'a-or-b-not-c',
    level: 'hard',
    regions: (a, b) => [bit(a), bit(b), bit(a) | bit(b)],
    text: (l, A, B, C) =>
      pickLang(l, {
        hi: `कितने व्यक्ति ${A} या ${B} (या दोनों) हैं, परन्तु ${C} नहीं हैं?`,
        hl: `Kitne vyakti ${A} ya ${B} (ya dono) hain, lekin ${C} nahi hain?`,
        en: `How many people are ${A} or ${B} (or both) but not ${C}?`,
      }),
  },
];

function genVenn(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const values: Record<number, number> = {};
  const used = new Set<number>();
  for (let m = 1; m <= 7; m++) {
    let v = rng.int(1, 30);
    while (used.has(v)) v = rng.int(1, 30);
    used.add(v);
    values[m] = v;
  }
  const set = rng.pick(SETS);
  const [a, b, c] = rng.shuffle([0, 1, 2]);
  const q = rng.pick(QUERIES.filter((x) => x.level === difficulty));
  const regions = q.regions(a!, b!, c!);
  const answer = regions.reduce((s, m) => s + values[m]!, 0);
  // Common mistakes: other combinations of regions.
  const others = QUERIES.flatMap((o) => [o.regions(a!, b!, c!), o.regions(b!, a!, c!)])
    .map((rs) => rs.reduce((s, m) => s + values[m]!, 0))
    .concat([answer + values[7]!, answer - values[7]!, values[bit(a!)]!]);
  const wrong: number[] = [];
  for (const v of rng.shuffle(others)) if (v > 0 && v !== answer && !wrong.includes(v)) wrong.push(v);
  if (wrong.length < 3) return null;
  const opts = rng.shuffle([answer, ...wrong.slice(0, 3)]);
  const correct = opts.indexOf(answer);

  const nameOf = (k: number) => pickLang(lang, set[k]!);
  const els: El[] = [];
  CIRCLES.forEach((cc, k) => els.push({ k: 'circle', c: cc.c, r: cc.r, fill: 'none' }));
  const labelAt: Pt[] = [
    [1.2, 1.3],
    [10.8, 1.3],
    [6, 11.15],
  ];
  NAMES.forEach((n, k) => els.push({ k: 'text', at: labelAt[k]!, s: n, size: 0.9 }));
  for (let m = 1; m <= 7; m++) els.push({ k: 'text', at: REGION_SPOT[m]!, s: String(values[m]), size: 0.72 });

  const legend = NAMES.map((n, k) => `${n} = ${nameOf(k)}`).join(', ');
  const parts = regions.map((m) => values[m]!);
  return {
    generator: 'venn-diagram',
    chapter: 'venn-diagram',
    difficulty,
    stem:
      pickLang(lang, {
        hi: `दिए गए आरेख में वृत्त ${legend} व्यक्तियों को दर्शाते हैं। `,
        hl: `Diye gaye aarekh (diagram) mein vritt ${legend} vyaktiyon ko darshaate hain. `,
        en: `In the diagram the circles show people who are: ${legend}. `,
      }) + q.text(lang, nameOf(a!), nameOf(b!), nameOf(c!)),
    explanation: pickLang(lang, {
      hi: `शर्त पूरी करने वाले क्षेत्रों की संख्याएँ जोड़ें: ${parts.join(' + ')} = ${answer}।`,
      hl: `Shart poori karne wale kshetron ki sankhyayein jodiye: ${parts.join(' + ')} = ${answer}.`,
      en: `Add the numbers in the regions that satisfy the condition: ${parts.join(' + ')} = ${answer}.`,
    }),
    stimulus: plainSvg({ size: SIZE, els }, 220),
    options: opts.map((v) => ({ text: String(v), svg: null })),
    correct,
    key: `venn:${q.id}:${a}${b}${c}:${Object.values(values).join(',')}`,
    model: { values, regions, answer, query: q.id, order: [a, b, c] },
  };
}

export const vennDiagram: Generator = {
  id: 'venn-diagram',
  chapter: 'venn-diagram',
  title: { hi: 'वेन आरेख (संख्याओं वाला)', hl: 'Venn aarekh (numbers wala)', en: 'Venn diagram with numbers' },
  description: 'Three labelled circles with a number in each region. Easy: one region; medium: two-group conditions; hard: "exactly two" and "A or B but not C".',
  generate: genVenn,
};
