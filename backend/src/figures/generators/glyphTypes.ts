// Mirror / water images, odd figure out and figure analogies, all built from
// random asymmetric glyphs. Correctness is decided on exact figure keys:
//  - mirror: the four options are the figure under {mirror, other mirror,
//    half-turn, unchanged}; they are distinct only if the figure has none of
//    those symmetries, which is checked;
//  - odd one out: three options are turns of the figure, one is a turn of its
//    mirror image; the figure must be fully asymmetric (8 distinct keys);
//  - analogy: B = T(A); the answer is T(C); a puzzle is rejected if another
//    transformation also turns A into B but C into something else.
import type { Rng } from '../rng.js';
import { figKey, invertFill, hasFillable, transformFig, ALL_TRANSFORMS, ROTATIONS, type Fig, type Transform } from '../model.js';
import { distinctUnder, randomGlyph, GLYPH_SIZE } from '../glyphs.js';
import { boxSvg, canvasSvg, renderEls, stripSvg, SVG_STYLE } from '../svg.js';
import { arrange, type Difficulty, type FigureQuestion, type Generator } from '../types.js';
import { optionText, pickLang, LABELS, type FigLang, type Tri } from '../text.js';

const PARTS: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };

// ---------------------------------------------------------------------------
// Mirror and water images
// ---------------------------------------------------------------------------

function mirrorStimulus(fig: Fig, water: boolean): string {
  const px = SVG_STYLE.BOX;
  const s = px / fig.size;
  const label = (x: number, y: number, t: string) =>
    `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#111">${t}</text>`;
  if (!water) {
    const w = px + 46;
    const h = px + 40;
    const lx = px + 22;
    return canvasSvg(
      w,
      h,
      `<rect x="1" y="21" width="${px - 2}" height="${px - 2}" fill="none" stroke="#111" stroke-width="1.6"/>` +
        renderEls(fig.els, s, 0, 20) +
        `<line x1="${lx}" y1="14" x2="${lx}" y2="${px + 26}" stroke="#111" stroke-width="3" stroke-dasharray="7 4"/>` +
        label(lx, 7, 'M') +
        label(lx, px + 33, 'N')
    );
  }
  const w = px + 44;
  const h = px + 34;
  const ly = px + 18;
  return canvasSvg(
    w,
    h,
    `<rect x="23" y="1" width="${px - 2}" height="${px - 2}" fill="none" stroke="#111" stroke-width="1.6"/>` +
      renderEls(fig.els, s, 22, 0) +
      `<line x1="16" y1="${ly}" x2="${px + 28}" y2="${ly}" stroke="#111" stroke-width="3" stroke-dasharray="7 4"/>` +
      label(7, ly, 'M') +
      label(px + 37, ly, 'N')
  );
}

function genMirror(rng: Rng, difficulty: Difficulty, lang: FigLang, water: boolean): FigureQuestion | null {
  const { fig, spec } = randomGlyph(rng, PARTS[difficulty], { letter: difficulty === 'hard', edgeLine: difficulty !== 'easy' && rng.chance(0.5) });
  const group: Transform[] = ['flipX', 'flipY', 'rot180', 'id'];
  if (!distinctUnder(fig, group)) return null;
  const answerT: Transform = water ? 'flipY' : 'flipX';
  const others = group.filter((t) => t !== answerT);
  const { items, correct } = arrange(rng, answerT, others, (t) => t);
  const label = LABELS[correct]!;
  const stem: Tri = water
    ? {
        hi: 'यदि दर्पण को MN रेखा पर (आकृति के नीचे) रखा जाए, तो दी गई आकृति का सही जल प्रतिबिंब कौन-सा होगा?',
        hl: 'Agar darpan ko MN rekha par (figure ke neeche) rakha jaaye, to di gayi figure ka sahi jal pratibimb (water image) kaun-sa hoga?',
        en: 'If the mirror is placed along MN (below the figure), which is the correct water image of the given figure?',
      }
    : {
        hi: 'यदि दर्पण को MN रेखा पर रखा जाए, तो दी गई आकृति का सही दर्पण प्रतिबिंब कौन-सा होगा?',
        hl: 'Agar darpan ko MN rekha par rakha jaaye, to di gayi figure ka sahi darpan pratibimb (mirror image) kaun-sa hoga?',
        en: 'If a mirror is placed along the line MN, which is the correct mirror image of the given figure?',
      };
  const why: Tri = water
    ? {
        hi: `दर्पण आकृति के नीचे क्षैतिज रखा है, इसलिए ऊपर और नीचे के भाग आपस में बदल जाते हैं जबकि बाएँ-दाएँ भाग वैसे ही रहते हैं। यह आकृति (${label}) में है।`,
        hl: `Darpan figure ke neeche horizontal rakha hai, isliye upar aur neeche ke hisse aapas mein badal jaate hain, jabki baayen-daayen hisse waise hi rehte hain. Yeh figure (${label}) mein hai.`,
        en: `The mirror lies horizontally below the figure, so top and bottom swap while left and right stay the same. That is figure (${label}).`,
      }
    : {
        hi: `दर्पण आकृति के दाईं ओर ऊर्ध्वाधर रखा है, इसलिए बाएँ और दाएँ भाग आपस में बदल जाते हैं जबकि ऊपर-नीचे के भाग वैसे ही रहते हैं। यह आकृति (${label}) में है।`,
        hl: `Darpan figure ke daayin taraf vertical rakha hai, isliye baayen aur daayen hisse aapas mein badal jaate hain, jabki upar-neeche ke hisse waise hi rehte hain. Yeh figure (${label}) mein hai.`,
        en: `The mirror stands vertically to the right of the figure, so left and right swap while top and bottom stay the same. That is figure (${label}).`,
      };
  const id = water ? 'water-image' : 'mirror-image';
  return {
    generator: id,
    chapter: 'mirror-image',
    difficulty,
    stem: pickLang(lang, stem),
    explanation: pickLang(lang, why),
    stimulus: mirrorStimulus(fig, water),
    options: items.map((t, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(transformFig(fig, t)) })),
    correct,
    key: `${id}:${figKey(fig)}`,
    model: { fig, spec, options: items, answer: answerT },
  };
}

// ---------------------------------------------------------------------------
// Odd figure out
// ---------------------------------------------------------------------------

function genOdd(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const { fig, spec } = randomGlyph(rng, PARTS[difficulty] - 1, { edgeLine: difficulty === 'hard' });
  if (!distinctUnder(fig, ALL_TRANSFORMS)) return null;
  const turns = rng.shuffle(ROTATIONS).slice(0, 3);
  const mirrored = rng.pick<Transform>(['flipX', 'flipY', 'transpose', 'antiTranspose']);
  const options: { fig: Fig; odd: boolean; t: Transform }[] = [
    ...turns.map((t) => ({ fig: transformFig(fig, t), odd: false, t })),
    { fig: transformFig(fig, mirrored), odd: true, t: mirrored },
  ];
  const order = rng.shuffle([0, 1, 2, 3]);
  const items = order.map((i) => options[i]!);
  if (new Set(items.map((o) => figKey(o.fig))).size !== 4) return null;
  const correct = items.findIndex((o) => o.odd);
  const label = LABELS[correct]!;
  return {
    generator: 'odd-one-out',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'निम्नलिखित चार आकृतियों में से तीन किसी एक तरह से समान हैं। विषम (भिन्न) आकृति चुनिए।',
      hl: 'Neeche di gayi chaar figures mein se teen kisi ek tarah se samaan hain. Vishum (alag) figure chuniye.',
      en: 'Three of the following four figures are alike in a certain way. Choose the odd one out.',
    }),
    explanation: pickLang(lang, {
      hi: `तीन आकृतियाँ एक ही आकृति को घुमाकर बनी हैं। आकृति (${label}) उसका दर्पण प्रतिबिंब है, जिसे केवल घुमाकर नहीं बनाया जा सकता, इसलिए वह विषम है।`,
      hl: `Teen figures ek hi figure ko ghumakar bani hain. Figure (${label}) uska darpan pratibimb hai, jise sirf ghumakar nahi banaya ja sakta, isliye woh alag hai.`,
      en: `Three figures are the same figure turned round. Figure (${label}) is its mirror image, which cannot be obtained by turning, so it is the odd one out.`,
    }),
    stimulus: null,
    options: items.map((o, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(o.fig) })),
    correct,
    key: `odd-one-out:${figKey(fig)}`,
    model: { fig, spec, options: items.map((o) => ({ fig: o.fig, t: o.t })) },
  };
}

// ---------------------------------------------------------------------------
// Figure analogy  A : B :: C : ?
// ---------------------------------------------------------------------------

interface Op {
  t: Transform;
  invert: boolean;
}
const opKey = (o: Op) => `${o.t}${o.invert ? '+inv' : ''}`;
const apply = (f: Fig, o: Op) => {
  const g = transformFig(f, o.t);
  return o.invert ? invertFill(g) : g;
};
const ALL_OPS: Op[] = ALL_TRANSFORMS.flatMap((t) => [
  { t, invert: false },
  { t, invert: true },
]);

const OP_TEXT: Record<Transform, Tri> = {
  id: { hi: 'वैसा ही रखने', hl: 'waisa hi rakhne', en: 'keeping it unchanged' },
  rot90: { hi: '90° घड़ी की दिशा में घुमाने', hl: '90° clockwise ghumane', en: 'turning it 90° clockwise' },
  rot180: { hi: '180° घुमाने', hl: '180° ghumane', en: 'turning it through 180°' },
  rot270: { hi: '90° घड़ी की विपरीत दिशा में घुमाने', hl: '90° anticlockwise ghumane', en: 'turning it 90° anticlockwise' },
  flipX: { hi: 'बाएँ-दाएँ उलटने (ऊर्ध्वाधर दर्पण)', hl: 'baayen-daayen ulatne (vertical mirror)', en: 'flipping it left to right (vertical mirror)' },
  flipY: { hi: 'ऊपर-नीचे उलटने (जल प्रतिबिंब)', hl: 'upar-neeche ulatne (water image)', en: 'flipping it top to bottom (water image)' },
  transpose: { hi: 'विकर्ण पर उलटने', hl: 'vikarn par ulatne', en: 'reflecting it in a diagonal' },
  antiTranspose: { hi: 'दूसरे विकर्ण पर उलटने', hl: 'doosre vikarn par ulatne', en: 'reflecting it in the other diagonal' },
};

function opText(lang: FigLang, o: Op): string {
  const base = pickLang(lang, OP_TEXT[o.t]);
  if (!o.invert) return base;
  return pickLang(lang, { hi: `${base} और काले-सफेद भाग आपस में बदलने`, hl: `${base} aur kaale-safed hisse aapas mein badalne`, en: `${base} and swapping black and white` });
}

function genAnalogy(rng: Rng, difficulty: Difficulty, lang: FigLang): FigureQuestion | null {
  const parts = difficulty === 'hard' ? 4 : 3;
  const A = randomGlyph(rng, parts).fig;
  const Cg = randomGlyph(rng, parts).fig;
  if (!distinctUnder(A, ALL_TRANSFORMS) || !distinctUnder(Cg, ALL_TRANSFORMS) || figKey(A) === figKey(Cg)) return null;
  let op: Op;
  if (difficulty === 'easy') op = { t: rng.pick<Transform>(['rot90', 'rot180', 'rot270']), invert: false };
  else if (difficulty === 'medium') op = { t: rng.pick<Transform>(['flipX', 'flipY', 'rot90', 'rot270']), invert: false };
  else {
    if (!hasFillable(A) || !hasFillable(Cg)) return null;
    op = { t: rng.pick<Transform>(['rot90', 'rot180', 'rot270', 'flipX', 'flipY']), invert: true };
  }
  const B = apply(A, op);
  const answer = apply(Cg, op);
  // Unambiguous: every operation that maps A to B must map C to the same answer.
  for (const o of ALL_OPS) {
    if (figKey(apply(A, o)) === figKey(B) && figKey(apply(Cg, o)) !== figKey(answer)) return null;
  }
  // Distractors: C under nearby operations (same family first).
  const near = ALL_OPS.filter((o) => opKey(o) !== opKey(op) && o.t !== 'transpose' && o.t !== 'antiTranspose');
  const ranked = rng.shuffle(near).sort((p, q) => Number(q.invert === op.invert) - Number(p.invert === op.invert));
  const distractors: Fig[] = [];
  for (const o of ranked) {
    const f = apply(Cg, o);
    const k = figKey(f);
    if (k !== figKey(answer) && !distractors.some((d) => figKey(d) === k)) distractors.push(f);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const { items, correct } = arrange(rng, answer, distractors, figKey);
  const label = LABELS[correct]!;
  const how = opText(lang, op);
  return {
    generator: 'figure-analogy',
    chapter: 'figure-based',
    difficulty,
    stem: pickLang(lang, {
      hi: 'जिस प्रकार पहली आकृति का संबंध दूसरी आकृति से है, उसी प्रकार तीसरी आकृति का संबंध उत्तर आकृतियों में से किससे है?',
      hl: 'Jis prakar pehli figure ka sambandh doosri figure se hai, usi prakar teesri figure ka sambandh uttar figures mein se kis se hai?',
      en: 'The second figure is related to the first in a certain way. Which answer figure is related to the third figure in the same way?',
    }),
    explanation: pickLang(lang, {
      hi: `पहली आकृति को ${how} पर दूसरी आकृति बनती है। उसी प्रकार तीसरी आकृति को ${how} पर आकृति (${label}) बनती है।`,
      hl: `Pehli figure ko ${how} par doosri figure banti hai. Usi prakar teesri figure ko ${how} par figure (${label}) banti hai.`,
      en: `The second figure is obtained by ${how}. Doing the same to the third figure gives figure (${label}).`,
    }),
    stimulus: stripSvg([{ fig: A }, { sep: ':' }, { fig: B }, { sep: '::' }, { fig: Cg }, { sep: ':' }, { question: true }]),
    options: items.map((f, i) => ({ text: optionText(lang, LABELS[i]!), svg: boxSvg(f) })),
    correct,
    key: `figure-analogy:${figKey(A)}>${opKey(op)}>${figKey(Cg)}`,
    model: { A, B, C: Cg, op, options: items },
  };
}

export const mirrorImage: Generator = {
  id: 'mirror-image',
  chapter: 'mirror-image',
  title: { hi: 'दर्पण प्रतिबिंब', hl: 'Darpan pratibimb (mirror image)', en: 'Mirror image' },
  description: 'Vertical mirror MN beside a composite figure; options are the true image, the water image, the half-turn and the unchanged figure. Hard adds a letter.',
  generate: (rng, d, lang) => genMirror(rng, d, lang, false),
};

export const waterImage: Generator = {
  id: 'water-image',
  chapter: 'mirror-image',
  title: { hi: 'जल प्रतिबिंब', hl: 'Jal pratibimb (water image)', en: 'Water image' },
  description: 'Horizontal mirror below the figure; same option design as the mirror image.',
  generate: (rng, d, lang) => genMirror(rng, d, lang, true),
};

export const oddOneOut: Generator = {
  id: 'odd-one-out',
  chapter: 'figure-based',
  title: { hi: 'विषम आकृति', hl: 'Vishum figure (odd one out)', en: 'Odd figure out' },
  description: 'Three options are the same figure turned; one is its mirror image turned.',
  generate: genOdd,
};

export const figureAnalogy: Generator = {
  id: 'figure-analogy',
  chapter: 'figure-based',
  title: { hi: 'आकृति सादृश्य', hl: 'Figure analogy', en: 'Figure analogy' },
  description: 'A : B :: C : ? — turn (easy), mirror or turn (medium), turn/mirror plus black–white swap (hard). Ambiguous pairs are rejected.',
  generate: genAnalogy,
};

export const GLYPH_SIZE_UNITS = GLYPH_SIZE;
