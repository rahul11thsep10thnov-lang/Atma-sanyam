// Figure series: "which figure replaces the question mark?"
//  - rotation: an arrow turns by a fixed (or growing) angle while a dot moves
//    round the corners and a small triangle moves round the sides;
//  - sectors: shaded sectors of a circle move (and grow) step by step.
// Each frame is computed from a small state; the answer is the next state.
import type { Rng } from '../rng.js';
import type { El, Fig, Pt } from '../model.js';
import { boxSvg, stripSvg } from '../svg.js';
import { arrange, type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { optionText, pickLang, LABELS, type FigLang } from '../text.js';

const SIZE = 12;
const C: Pt = [6, 6];
const mod = (v: number, m: number) => ((v % m) + m) % m;

// ---------------------------------------------------------------------------
// Rotation series
// ---------------------------------------------------------------------------

type Pointer = 'arrow' | 'pin' | 'flag' | 'kite';
const POINTERS: Pointer[] = ['arrow', 'pin', 'flag', 'kite'];

interface RotState {
  shape: Pointer; // fixed for the whole question
  arrow: number; // direction 0..7 (×45°, 0 = up, clockwise)
  dot: number | null; // corner 0..3 (TL, TR, BR, BL)
  tri: number | null; // side 0..3 (top, right, bottom, left)
}

const rotKey = (s: RotState) => `${s.shape}|${s.arrow}|${s.dot ?? '-'}|${s.tri ?? '-'}`;

function pointerEls(shape: Pointer, dir: number): El[] {
  const a = (dir * 45 * Math.PI) / 180;
  const at = (r: number, side = 0): Pt => [C[0] + r * Math.sin(a) + side * Math.cos(a), C[1] - r * Math.cos(a) + side * Math.sin(a)];
  switch (shape) {
    case 'arrow':
      return [
        { k: 'arrow', a: at(-1.2), b: at(3.4) },
        { k: 'circle', c: at(-1.2), r: 0.45, fill: 'black' },
      ];
    case 'pin':
      return [
        { k: 'line', a: at(-1.4), b: at(2.6) },
        { k: 'circle', c: at(3.1), r: 0.6, fill: 'black' },
      ];
    case 'flag':
      return [
        { k: 'line', a: at(-1.6), b: at(3.4) },
        { k: 'poly', pts: [at(3.4), at(2.5, 1.5), at(1.6)], closed: true, fill: 'black' },
      ];
    case 'kite':
      return [{ k: 'poly', pts: [at(3.4), at(-0.6, 1.0), at(-1.6), at(-0.6, -1.0)], closed: true, fill: 'black' }];
  }
}

function rotFig(s: RotState): Fig {
  const els: El[] = pointerEls(s.shape, s.arrow);
  if (s.dot !== null) {
    const corners: Pt[] = [
      [1.9, 1.9],
      [10.1, 1.9],
      [10.1, 10.1],
      [1.9, 10.1],
    ];
    els.push({ k: 'circle', c: corners[s.dot]!, r: 0.85, fill: 'black' });
  }
  if (s.tri !== null) {
    // Small triangle on the side, pointing into the box.
    const tris: Pt[][] = [
      [[5, 0.7], [7, 0.7], [6, 2.1]],
      [[11.3, 5], [11.3, 7], [9.9, 6]],
      [[5, 11.3], [7, 11.3], [6, 9.9]],
      [[0.7, 5], [0.7, 7], [2.1, 6]],
    ];
    els.push({ k: 'poly', pts: tris[s.tri]!, closed: true, fill: 'black' });
  }
  return { size: SIZE, els };
}

const DIR_TEXT = {
  cw: { hi: 'घड़ी की दिशा में', hl: 'clockwise', en: 'clockwise' },
  ccw: { hi: 'घड़ी की विपरीत दिशा में', hl: 'anticlockwise', en: 'anticlockwise' },
};

const PTR: Record<Pointer, { hi: string; hl: string; en: string }> = {
  arrow: { hi: 'तीर', hl: 'teer', en: 'arrow' },
  pin: { hi: 'सुई (गोल सिरे वाली रेखा)', hl: 'sui (gol sire wali rekha)', en: 'pin' },
  flag: { hi: 'झंडा', hl: 'jhanda', en: 'flag' },
  kite: { hi: 'काला संकेतक', hl: 'kaala sanketak', en: 'black pointer' },
};

function stepText(lang: FigLang, step: number) {
  const dir = step > 0 ? DIR_TEXT.cw : DIR_TEXT.ccw;
  return `${Math.abs(step) * 45}° ${pickLang(lang, dir)}`;
}

function genRotation(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const sign = rng.pick([1, -1]);
  const shape = rng.pick(POINTERS);
  const arrowSteps: number[] =
    difficulty === 'easy'
      ? Array(4).fill(sign * rng.pick([1, 2, 3]))
      : difficulty === 'medium'
        ? Array(4).fill(sign * rng.pick([1, 3]))
        : [1, 2, 3, 4].map((k) => sign * k); // growing turn: 45°, 90°, 135°, 180°
  const dotStep = difficulty === 'easy' ? 0 : rng.pick([1, -1]);
  const triStep = difficulty === 'hard' ? -dotStep : 0;

  const s0: RotState = { shape, arrow: rng.int(0, 7), dot: dotStep ? rng.int(0, 3) : null, tri: triStep ? rng.int(0, 3) : null };
  const frames: RotState[] = [s0];
  for (let i = 0; i < 4; i++) {
    const p = frames[i]!;
    frames.push({
      shape,
      arrow: mod(p.arrow + arrowSteps[i]!, 8),
      dot: p.dot === null ? null : mod(p.dot + dotStep, 4),
      tri: p.tri === null ? null : mod(p.tri + triStep, 4),
    });
  }
  const answer = frames[4]!;
  const prev = frames[3]!;
  // The four shown figures must differ, and the answer must not repeat the
  // last one (it may equal the first: a 90° turn comes full circle).
  if (new Set(frames.slice(0, 4).map(rotKey)).size < 4 || rotKey(frames[4]!) === rotKey(frames[3]!)) return null;

  const wrongArrow = rng.shuffle([mod(answer.arrow + 1, 8), mod(answer.arrow - 1, 8), mod(answer.arrow + 4, 8), prev.arrow]).filter(
    (d) => d !== answer.arrow
  );
  const distractors: RotState[] = [];
  const push = (s: RotState) => {
    if (rotKey(s) !== rotKey(answer) && !distractors.some((d) => rotKey(d) === rotKey(s))) distractors.push(s);
  };
  if (difficulty === 'easy') {
    for (const d of wrongArrow) push({ ...answer, arrow: d });
  } else {
    push({ ...answer, arrow: wrongArrow[0]! });
    push({ ...answer, dot: mod(answer.dot! + 2, 4) });
    if (answer.tri !== null) push({ ...answer, tri: mod(answer.tri + 2, 4) });
    push({ ...answer, arrow: wrongArrow[1]!, dot: prev.dot });
    push({ ...answer, arrow: wrongArrow[2]! });
  }
  if (distractors.length < 3) return null;
  const { items, correct } = arrange(rng, answer, distractors.slice(0, 3), rotKey);

  const parts: { hi: string; hl: string; en: string }[] = [];
  if (difficulty === 'hard') {
    const dir = sign > 0 ? DIR_TEXT.cw : DIR_TEXT.ccw;
    parts.push({
      hi: `${PTR[shape].hi} ${dir.hi} हर बार पहले से 45° अधिक घूमता है (45°, 90°, 135°), इसलिए अगली बार 180° घूमेगा`,
      hl: `${PTR[shape].hl} ${dir.hl} har baar pichhli baar se 45° zyada ghoomta hai (45°, 90°, 135°), isliye agli baar 180° ghoomega`,
      en: `the ${PTR[shape].en} turns ${dir.en}, 45° more each time (45°, 90°, 135°), so next it turns 180°`,
    });
  } else {
    const t = stepText(lang, arrowSteps[0]!);
    parts.push({ hi: `${PTR[shape].hi} हर चरण में ${t} घूमता है`, hl: `${PTR[shape].hl} har step mein ${t} ghoomta hai`, en: `the ${PTR[shape].en} turns ${t} at every step` });
  }
  if (dotStep) {
    const d = dotStep > 0 ? DIR_TEXT.cw : DIR_TEXT.ccw;
    parts.push({ hi: `काला बिंदु एक-एक कोना ${d.hi} आगे बढ़ता है`, hl: `kaala bindu ek-ek kona ${d.hl} aage badhta hai`, en: `the black dot moves one corner ${d.en}` });
  }
  if (triStep) {
    const d = triStep > 0 ? DIR_TEXT.cw : DIR_TEXT.ccw;
    parts.push({ hi: `त्रिभुज एक-एक भुजा ${d.hi} खिसकता है`, hl: `tribhuj ek-ek bhuja ${d.hl} khisakta hai`, en: `the triangle moves one side ${d.en}` });
  }
  const joined = { hi: parts.map((p) => p.hi).join('; '), hl: parts.map((p) => p.hl).join('; '), en: parts.map((p) => p.en).join('; ') };
  const label = LABELS[correct]!;
  return {
    generator: 'series-rotation',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'दी गई आकृति-श्रृंखला को ध्यान से देखिए। प्रश्न चिह्न (?) के स्थान पर उत्तर आकृतियों में से उचित आकृति चुनिए।',
      hl: 'Di gayi figure series ko dhyan se dekhiye. Prashn chihn (?) ki jagah aane wali figure options mein se chuniye.',
      en: 'Study the series of figures. Choose the answer figure that should replace the question mark (?).',
    }),
    explanation: pickLang(lang, {
      hi: `${joined.hi}। इसलिए अगली आकृति (${label}) है।`,
      hl: `${joined.hl}. Isliye agli figure (${label}) hai.`,
      en: `In this series ${joined.en}. So the next figure is (${label}).`,
    }),
    stimulus: stripSvg([...frames.slice(0, 4).map((f) => ({ fig: rotFig(f) })), { question: true }]),
    options: items.map((s, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(rotFig(s)) })),
    correct,
    key: `series-rotation:${frames.map(rotKey).join('/')}`,
    model: { frames, options: items, arrowSteps, dotStep, triStep },
  };
}

// ---------------------------------------------------------------------------
// Sector series
// ---------------------------------------------------------------------------

interface SecState {
  black: number[]; // sector indices 0..7 (sector i spans 45i°..45(i+1)°, clockwise from top)
  grey: number[];
}
const secKey = (s: SecState) => `${[...s.black].sort().join(',')}|${[...s.grey].sort().join(',')}`;

function secFig(s: SecState): Fig {
  const els: El[] = [];
  for (const i of s.black) els.push({ k: 'sector', c: C, r: 4.6, from: i * 45, to: (i + 1) * 45, fill: 'black' });
  for (const i of s.grey) els.push({ k: 'sector', c: C, r: 4.6, from: i * 45, to: (i + 1) * 45, fill: 'grey' });
  els.push({ k: 'circle', c: C, r: 4.6, fill: 'none' });
  for (let i = 0; i < 4; i++) {
    const a = (i * 45 * Math.PI) / 180;
    els.push({ k: 'line', a: [C[0] + 4.6 * Math.sin(a), C[1] - 4.6 * Math.cos(a)], b: [C[0] - 4.6 * Math.sin(a), C[1] + 4.6 * Math.cos(a)] });
  }
  return { size: SIZE, els };
}

const block = (start: number, len: number) => Array.from({ length: len }, (_, i) => mod(start + i, 8));

function genSectors(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const step = rng.pick([1, 2, -1, -2, 3, -3]);
  const start = rng.int(0, 7);
  let frames: SecState[];
  let rule: { hi: string; hl: string; en: string };
  const dirOf = (k: number) => (k > 0 ? DIR_TEXT.cw : DIR_TEXT.ccw);
  if (difficulty === 'easy') {
    const len = rng.pick([1, 2, 3]);
    frames = [0, 1, 2, 3, 4].map((i) => ({ black: block(start + i * step, len), grey: [] }));
    const d = dirOf(step);
    rule = {
      hi: `काला भाग हर चरण में ${Math.abs(step)} खाने ${d.hi} खिसकता है`,
      hl: `kaala hissa har step mein ${Math.abs(step)} khaane ${d.hl} khisakta hai`,
      en: `the black part moves ${Math.abs(step)} sector(s) ${d.en} each time`,
    };
  } else if (difficulty === 'medium' && rng.chance(0.5)) {
    // A black pair and a grey sector moving in opposite directions.
    const step2 = -Math.sign(step) * rng.pick([1, 2, 3]);
    // Pick a grey start that never lands on the black pair in any frame.
    const make = (s2: number) => [0, 1, 2, 3, 4].map((i) => ({ black: block(start + i * step, 2), grey: [mod(s2 + i * step2, 8)] }));
    const valid = [0, 1, 2, 3, 4, 5, 6, 7].filter((s2) => make(s2).every((f) => !f.black.includes(f.grey[0]!)));
    if (!valid.length) return null;
    frames = make(rng.pick(valid));
    const d1 = dirOf(step);
    const d2 = dirOf(step2);
    rule = {
      hi: `दो काले खाने हर बार ${Math.abs(step)} खाने ${d1.hi} और धूसर (स्लेटी) खाना ${Math.abs(step2)} खाने ${d2.hi} खिसकता है`,
      hl: `do kaale khaane har baar ${Math.abs(step)} khaane ${d1.hl} aur grey khaana ${Math.abs(step2)} khaane ${d2.hl} khisakta hai`,
      en: `the two black sectors move ${Math.abs(step)} ${d1.en} and the grey sector moves ${Math.abs(step2)} ${d2.en} each time`,
    };
  } else if (difficulty === 'medium') {
    frames = [0, 1, 2, 3, 4].map((i) => ({ black: block(start + i * step, i + 1), grey: [] }));
    const d = dirOf(step);
    rule = {
      hi: `हर चरण में एक काला खाना बढ़ता है और काले भाग का आरंभ ${Math.abs(step)} खाने ${d.hi} खिसकता है`,
      hl: `har step mein ek kaala khaana badhta hai aur kaale hisse ki shuruaat ${Math.abs(step)} khaane ${d.hl} khisakti hai`,
      en: `one more sector is shaded each time and the shaded block starts ${Math.abs(step)} sector(s) further ${d.en}`,
    };
  } else {
    const step2 = rng.pick([1, 2, 3, -1, -2, -3].filter((x) => x !== step));
    const start2 = rng.int(0, 7);
    frames = [0, 1, 2, 3, 4].map((i) => ({ black: [mod(start + i * step, 8)], grey: [mod(start2 + i * step2, 8)] }));
    if (frames.some((f) => f.black[0] === f.grey[0])) return null;
    const d1 = dirOf(step);
    const d2 = dirOf(step2);
    rule = {
      hi: `काला खाना हर बार ${Math.abs(step)} खाने ${d1.hi} और धूसर (स्लेटी) खाना ${Math.abs(step2)} खाने ${d2.hi} खिसकता है`,
      hl: `kaala khaana har baar ${Math.abs(step)} khaane ${d1.hl} aur grey khaana ${Math.abs(step2)} khaane ${d2.hl} khisakta hai`,
      en: `the black sector moves ${Math.abs(step)} ${d1.en} and the grey sector moves ${Math.abs(step2)} ${d2.en} each time`,
    };
  }
  if (new Set(frames.slice(0, 4).map(secKey)).size < 4 || secKey(frames[4]!) === secKey(frames[3]!)) return null;
  const answer = frames[4]!;
  const shift = (s: SecState, kb: number, kg: number): SecState => ({ black: s.black.map((x) => mod(x + kb, 8)), grey: s.grey.map((x) => mod(x + kg, 8)) });
  const cands: SecState[] = [
    shift(answer, 1, 0),
    shift(answer, -1, 0),
    shift(answer, 4, 0),
    frames[3]!,
    answer.grey.length === 0 ? { black: answer.black.slice(0, Math.max(1, answer.black.length - 1)), grey: [] } : shift(answer, 0, 1),
    answer.grey.length === 0 ? { black: block(answer.black[0]! - 1, answer.black.length + 1), grey: [] } : shift(answer, 0, -1),
    { black: answer.grey, grey: answer.black },
  ].filter((s) => s.black.every((b) => !s.grey.includes(b)));
  const distractors: SecState[] = [];
  for (const c of rng.shuffle(cands)) {
    if (secKey(c) !== secKey(answer) && !distractors.some((d) => secKey(d) === secKey(c))) distractors.push(c);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const { items, correct } = arrange(rng, answer, distractors, secKey);
  const label = LABELS[correct]!;
  return {
    generator: 'series-sectors',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'नीचे दी गई श्रृंखला की अगली आकृति विकल्पों में से ज्ञात कीजिए।',
      hl: 'Neeche di gayi series ki agli figure options mein se gyaat kijiye.',
      en: 'Find the next figure in the series from the options.',
    }),
    explanation: pickLang(lang, {
      hi: `${rule.hi}। इसलिए उत्तर आकृति (${label}) है।`,
      hl: `${rule.hl.charAt(0).toUpperCase() + rule.hl.slice(1)}. Isliye uttar figure (${label}) hai.`,
      en: `In this series ${rule.en}. So the answer is figure (${label}).`,
    }),
    stimulus: stripSvg([...frames.slice(0, 4).map((f) => ({ fig: secFig(f) })), { question: true }]),
    options: items.map((s, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(secFig(s)) })),
    correct,
    key: `series-sectors:${frames.map(secKey).join('/')}`,
    model: { frames, options: items },
  };
}

export const seriesRotation: Generator = {
  id: 'series-rotation',
  chapter: 'figure-based',
  title: { hi: 'आकृति श्रृंखला — घूमता तीर', hl: 'Figure series — ghoomta teer', en: 'Figure series — rotating arrow' },
  description: 'A pointer (arrow, pin, flag or kite) turning by a fixed step (easy), with a dot moving round the corners (medium), or by a growing angle with a dot and a side triangle (hard).',
  generate: genRotation,
};

export const seriesSectors: Generator = {
  id: 'series-sectors',
  chapter: 'figure-based',
  title: { hi: 'आकृति श्रृंखला — वृत्त के खाने', hl: 'Figure series — vritt ke khaane', en: 'Figure series — shaded circle sectors' },
  description: 'A shaded block of sectors moving round a circle (easy); a block growing while it moves, or a black pair and a grey sector moving opposite ways (medium); a black and a grey sector each moving by its own step (hard).',
  generate: genSectors,
};
