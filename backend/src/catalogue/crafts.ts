// The Art & Craft library the server seeds. Every tutorial lists what the
// child needs, which materials need a grown-up, and numbered steps with a
// FoldDiagram (see app src/crafts/FoldDiagram.tsx) or, for drawing, a text
// instruction. `physical` marks crafts done with real paper; `digital`
// tutorials run on the screen (they open the drawing games).
import type { CraftStep } from '../database/schema.js';
import { ORIGAMI_DIAGRAMS } from './origamiDiagrams.js';

export interface CraftSeed {
  id: string;
  title: string;
  kind: 'origami' | 'paper_craft' | 'drawing' | 'digital';
  description: string;
  brackets: ('A' | 'B' | 'C' | 'D')[];
  difficulty: number; // 1–5
  estimatedMinutes: number;
  materials: string[];
  hazards: string[];
  adultSupervision: boolean;
  physical: boolean;
  steps: CraftStep[];
  finalPreview: Record<string, unknown>;
  checklist: string[];
  sortOrder: number;
}

const SQ = [[8, 8], [92, 8], [92, 92], [8, 92]];
const RECT = [[20, 6], [80, 6], [80, 94], [20, 94]];
const ORIGAMI_CHECKLIST = ['My folds are sharp and flat', 'The corners meet neatly', 'I tidied up my paper scraps'];

export const CRAFT_SEEDS: CraftSeed[] = [
  {
    id: 'dog-face', title: 'Puppy Face', kind: 'origami', description: 'A floppy-eared puppy from one square. Four folds, then draw the face.', brackets: ['A', 'B'], difficulty: 1, estimatedMinutes: 5,
    materials: ['1 square sheet of paper (15 cm)', 'Crayons or a pencil'], hazards: [], adultSupervision: false, physical: true,
    steps: ORIGAMI_DIAGRAMS['dog-face']!, finalPreview: { emoji: '🐶', diagram: { paper: [[30, 50], [70, 50], [72, 86], [54, 72], [50, 82], [46, 72], [28, 86]], color: '#F6C177', labels: [{ at: [50, 66], text: '• •' }] } },
    checklist: [...ORIGAMI_CHECKLIST, 'I drew eyes and a nose'], sortOrder: 1,
  },
  {
    id: 'paper-cup', title: 'Paper Cup', kind: 'origami', description: 'A little cup that really holds a few sweets.', brackets: ['A', 'B', 'C'], difficulty: 1, estimatedMinutes: 5,
    materials: ['1 square sheet of paper (15 cm or bigger)'], hazards: [], adultSupervision: false, physical: true,
    steps: [
      { title: 'Triangle', text: 'Fold the square in half diagonally so you have a triangle with the long edge at the bottom.', diagram: { paper: SQ, color: '#FFB3C7', folds: [{ from: [8, 8], to: [92, 92], kind: 'valley' }], arrows: [{ from: [80, 20], to: [20, 80], curve: 24 }], shade: [[8, 8], [92, 8], [92, 92]], after: [[8, 8], [92, 92], [8, 92]] } },
      { title: 'Corner across', text: 'Fold the right corner over to touch the middle of the left edge.', diagram: { paper: [[8, 50], [92, 50], [50, 92]], color: '#FFB3C7', folds: [{ from: [64, 50], to: [50, 78], kind: 'valley' }], arrows: [{ from: [88, 54], to: [30, 64], curve: -14 }], after: [[8, 50], [64, 50], [50, 78], [50, 92], [30, 64]] } },
      { title: 'Other corner', text: 'Fold the left corner over to the right so the two flaps cross.', diagram: { paper: [[8, 50], [64, 50], [50, 78], [50, 92], [30, 64]], color: '#FFB3C7', folds: [{ from: [36, 50], to: [50, 78], kind: 'valley' }], arrows: [{ from: [12, 54], to: [70, 64], curve: 14 }], after: [[36, 50], [64, 50], [70, 64], [50, 92], [30, 64]] } },
      { title: 'Tuck the tops', text: 'Fold the top flap down into the front pocket, and the other top flap down the back. Open the cup gently.', diagram: { paper: [[36, 50], [64, 50], [70, 64], [50, 92], [30, 64]], color: '#FFB3C7', folds: [{ from: [30, 64], to: [70, 64], kind: 'valley' }], arrows: [{ from: [50, 52], to: [50, 74], curve: 10 }], after: [[30, 64], [70, 64], [50, 92]] } },
    ],
    finalPreview: { emoji: '🥤', diagram: { paper: [[30, 40], [70, 40], [50, 80]], color: '#FFB3C7' } }, checklist: [...ORIGAMI_CHECKLIST, 'My cup opens and stands'], sortOrder: 2,
  },
  {
    id: 'paper-boat', title: 'Paper Boat', kind: 'origami', description: 'The classic boat that floats. Six folds from a rectangle.', brackets: ['B', 'C', 'D'], difficulty: 2, estimatedMinutes: 8,
    materials: ['1 rectangle sheet (A4 or notebook paper)'], hazards: [], adultSupervision: false, physical: true,
    steps: ORIGAMI_DIAGRAMS['paper-boat']!, finalPreview: { emoji: '⛵', diagram: { paper: [[6, 70], [94, 70], [80, 86], [20, 86]], after: [[50, 40], [60, 70], [40, 70]], color: '#8CD3FF' } },
    checklist: [...ORIGAMI_CHECKLIST, 'The boat stands up by itself'], sortOrder: 3,
  },
  {
    id: 'fox-puppet', title: 'Fox Finger Puppet', kind: 'origami', description: 'A fox face that fits on your finger. Add eyes and a nose!', brackets: ['B', 'C'], difficulty: 2, estimatedMinutes: 8,
    materials: ['1 square sheet (orange if you have it)', 'Pen for the face'], hazards: [], adultSupervision: false, physical: true,
    steps: [
      { title: 'Triangle', text: 'Fold the square in half diagonally. Point down.', diagram: { paper: [[50, 4], [96, 50], [50, 96], [4, 50]], color: '#FF9A5C', folds: [{ from: [4, 50], to: [96, 50], kind: 'valley' }], arrows: [{ from: [50, 10], to: [50, 88], curve: 30 }], shade: [[50, 4], [96, 50], [4, 50]], after: [[4, 50], [96, 50], [50, 96]] } },
      { title: 'Fold in half again', text: 'Fold the triangle in half from left to right, then unfold to make a centre crease.', diagram: { paper: [[4, 50], [96, 50], [50, 96]], color: '#FF9A5C', folds: [{ from: [50, 50], to: [50, 96], kind: 'valley' }], arrows: [{ from: [12, 56], to: [88, 56], curve: 16 }] } },
      { title: 'Ears up', text: 'Fold the left and right corners up to the top edge, slanting outwards for pointy ears.', diagram: { paper: [[4, 50], [96, 50], [50, 96]], color: '#FF9A5C', folds: [{ from: [28, 50], to: [50, 74], kind: 'valley' }, { from: [72, 50], to: [50, 74], kind: 'valley' }], arrows: [{ from: [10, 54], to: [36, 28], curve: -14 }, { from: [90, 54], to: [64, 28], curve: 14 }], after: [[28, 50], [36, 26], [50, 50], [64, 26], [72, 50], [50, 74]] } },
      { title: 'Nose', text: 'Fold the bottom point up a little to make a nose, then turn the fox over and draw its eyes.', diagram: { paper: [[28, 50], [36, 26], [50, 50], [64, 26], [72, 50], [50, 74]], color: '#FF9A5C', folds: [{ from: [44, 68], to: [56, 68], kind: 'valley' }], arrows: [{ from: [50, 74], to: [50, 60], curve: 8 }], after: [[28, 50], [36, 26], [50, 50], [64, 26], [72, 50], [56, 68], [44, 68]] } },
      { title: 'Finger pocket', text: 'The back of the fox has a pocket. Slide a finger in and make it talk!', diagram: { paper: [[28, 50], [36, 26], [50, 50], [64, 26], [72, 50], [56, 68], [44, 68]], color: '#FF9A5C', labels: [{ at: [50, 90], text: 'pocket at the back' }] } },
    ],
    finalPreview: { emoji: '🦊', diagram: { paper: [[28, 50], [36, 26], [50, 50], [64, 26], [72, 50], [56, 68], [44, 68]], color: '#FF9A5C', labels: [{ at: [50, 58], text: '• •' }] } }, checklist: [...ORIGAMI_CHECKLIST, 'The puppet fits on my finger'], sortOrder: 4,
  },
  {
    id: 'jumping-frog', title: 'Jumping Frog', kind: 'origami', description: 'A frog with a paper spring. Press its back and it hops!', brackets: ['C', 'D'], difficulty: 4, estimatedMinutes: 12,
    materials: ['1 stiff rectangle (index card or A6 card)'], hazards: [], adultSupervision: false, physical: true,
    steps: ORIGAMI_DIAGRAMS['jumping-frog']!, finalPreview: { emoji: '🐸', diagram: { paper: [[35, 36], [65, 36], [65, 80], [35, 80]], color: '#8BE38B', labels: [{ at: [50, 30], text: 'press here' }] } },
    checklist: [...ORIGAMI_CHECKLIST, 'My frog jumps when I press its back'], sortOrder: 5,
  },
  {
    id: 'paper-crane', title: 'Paper Crane', kind: 'origami', description: 'The famous Japanese crane. A real challenge with many folds.', brackets: ['D'], difficulty: 5, estimatedMinutes: 20,
    materials: ['1 square sheet (15 cm, thin paper works best)'], hazards: [], adultSupervision: false, physical: true,
    steps: [
      { title: 'Square base: diagonals', text: 'Fold the square in half diagonally both ways and unfold. Turn it over.', diagram: { paper: SQ, color: '#FFFFFF', folds: [{ from: [8, 8], to: [92, 92], kind: 'valley' }, { from: [92, 8], to: [8, 92], kind: 'valley' }] } },
      { title: 'Square base: halves', text: 'Fold in half side to side both ways and unfold. These are mountain folds now.', diagram: { paper: SQ, color: '#FFFFFF', folds: [{ from: [50, 8], to: [50, 92], kind: 'mountain' }, { from: [8, 50], to: [92, 50], kind: 'mountain' }] } },
      { title: 'Collapse', text: 'Bring all four corners together at the bottom so the paper collapses into a small square (the square base).', diagram: { paper: SQ, color: '#FFFFFF', arrows: [{ from: [12, 12], to: [50, 90], curve: 20 }, { from: [88, 12], to: [50, 90], curve: -20 }], after: [[50, 30], [75, 55], [50, 80], [25, 55]] }, tip: 'Open flap edge at the bottom. If it fights you, re-crease the mountain folds.' },
      { title: 'Kite folds', text: 'Fold the lower left and right edges of the top layer in to the centre line. Fold the top triangle down and unfold everything.', diagram: { paper: [[50, 20], [80, 50], [50, 80], [20, 50]], color: '#FFFFFF', folds: [{ from: [50, 80], to: [35, 50], kind: 'valley' }, { from: [50, 80], to: [65, 50], kind: 'valley' }, { from: [35, 50], to: [65, 50], kind: 'valley' }] } },
      { title: 'Petal fold', text: 'Lift the bottom corner of the top layer up and press the sides in along the creases so it becomes a long diamond. Repeat on the back.', diagram: { paper: [[50, 20], [80, 50], [50, 80], [20, 50]], color: '#FFFFFF', arrows: [{ from: [50, 78], to: [50, 14], curve: 24 }], after: [[50, 6], [62, 50], [50, 80], [38, 50]] }, tip: 'This is the hardest step. Go slowly and ask for help if the paper tears.' },
      { title: 'Narrow the legs', text: 'Fold the lower edges of the diamond in to the centre line, front and back.', diagram: { paper: [[50, 6], [62, 50], [50, 80], [38, 50]], color: '#FFFFFF', folds: [{ from: [50, 80], to: [44, 50], kind: 'valley' }, { from: [50, 80], to: [56, 50], kind: 'valley' }], after: [[50, 6], [56, 50], [50, 80], [44, 50]] } },
      { title: 'Neck and tail', text: 'Fold the two thin points up on the outside (inside reverse folds) to make the neck and tail.', diagram: { paper: [[50, 6], [56, 50], [50, 80], [44, 50]], color: '#FFFFFF', arrows: [{ from: [46, 76], to: [20, 30], curve: -20 }, { from: [54, 76], to: [80, 30], curve: 20 }], after: [[50, 6], [56, 50], [80, 26], [50, 60], [20, 26], [44, 50]] } },
      { title: 'Head and wings', text: 'Fold the tip of one point down for the head. Pull the wings gently apart and blow into the hole underneath to puff the body.', diagram: { paper: [[50, 6], [56, 50], [80, 26], [50, 60], [20, 26], [44, 50]], color: '#FFFFFF', arrows: [{ from: [20, 26], to: [12, 36], curve: 6 }], labels: [{ at: [50, 90], text: 'blow gently underneath' }] } },
    ],
    finalPreview: { emoji: '🕊️', diagram: { paper: [[50, 6], [56, 50], [80, 26], [50, 60], [20, 26], [44, 50]], color: '#FFFFFF' } }, checklist: [...ORIGAMI_CHECKLIST, 'The crane stands on its tail and legs'], sortOrder: 6,
  },
  {
    id: 'classic-dart', title: 'Paper Airplane: Classic Dart', kind: 'origami', description: 'The simplest fast plane. Fold it, then test it in the Paper Airplane game.', brackets: ['B', 'C', 'D'], difficulty: 2, estimatedMinutes: 5,
    materials: ['1 rectangle sheet (A4)'], hazards: [], adultSupervision: false, physical: true,
    steps: ORIGAMI_DIAGRAMS['classic-dart']!, finalPreview: { emoji: '✈️', diagram: { paper: [[50, 6], [60, 94], [50, 94]], after: [[50, 6], [80, 94], [20, 94]], color: '#F5F5FA' } },
    checklist: [...ORIGAMI_CHECKLIST, 'The nose is sharp and the wings are even', 'I only throw it where nobody is standing'], sortOrder: 7,
  },
  {
    id: 'paper-fan', title: 'Accordion Paper Fan', kind: 'paper_craft', description: 'Zig-zag folds make a fan to cool you down. Decorate it first!', brackets: ['A', 'B', 'C'], difficulty: 1, estimatedMinutes: 8,
    materials: ['1 rectangle sheet (A4)', 'Crayons or stickers', 'Sticky tape or a stapler (grown-up)'], hazards: ['small_parts'], adultSupervision: true, physical: true,
    steps: [
      { title: 'Decorate', text: 'Colour the whole sheet with stripes, dots or a rainbow.', diagram: { paper: RECT, color: '#C3F0FF', labels: [{ at: [50, 50], text: '🌈 colour me' }] } },
      { title: 'First fold', text: 'Fold a thin strip (about two fingers wide) along the short edge.', diagram: { paper: RECT, color: '#C3F0FF', folds: [{ from: [20, 18], to: [80, 18], kind: 'valley' }], arrows: [{ from: [50, 8], to: [50, 26], curve: 8 }] } },
      { title: 'Zig-zag', text: 'Turn the paper over and fold the same width again. Keep turning and folding until the whole sheet is a zig-zag strip.', diagram: { paper: RECT, color: '#C3F0FF', folds: [{ from: [20, 30], to: [80, 30], kind: 'mountain' }, { from: [20, 42], to: [80, 42], kind: 'valley' }, { from: [20, 54], to: [80, 54], kind: 'mountain' }, { from: [20, 66], to: [80, 66], kind: 'valley' }, { from: [20, 78], to: [80, 78], kind: 'mountain' }] }, tip: 'Count the folds out loud. Equal widths make the prettiest fan.' },
      { title: 'Pinch the handle', text: 'Squeeze one end together and ask a grown-up to tape or staple it. Spread the other end into a fan.', diagram: { paper: [[44, 20], [56, 20], [56, 94], [44, 94]], color: '#C3F0FF', arrows: [{ from: [44, 30], to: [10, 10], curve: 10 }, { from: [56, 30], to: [90, 10], curve: -10 }], after: [[10, 10], [90, 10], [56, 94], [44, 94]] }, caution: 'Staplers and tape dispensers have sharp parts: a grown-up does this step.' },
    ],
    finalPreview: { emoji: '🪭', diagram: { paper: [[10, 10], [90, 10], [56, 94], [44, 94]], color: '#C3F0FF' } }, checklist: ['All my folds are the same width', 'A grown-up fixed the handle', 'I tidied up'], sortOrder: 10,
  },
  {
    id: 'paper-chain', title: 'Paper Chain Garland', kind: 'paper_craft', description: 'Loops of colourful paper linked into a long chain for your room.', brackets: ['A', 'B'], difficulty: 1, estimatedMinutes: 10,
    materials: ['Coloured paper', 'Child-safe scissors', 'Glue stick or tape'], hazards: ['scissors', 'glue'], adultSupervision: true, physical: true,
    steps: [
      { title: 'Cut strips', text: 'With a grown-up, cut the paper into strips about as wide as two fingers.', diagram: { paper: RECT, color: '#FFD6E5', folds: [{ from: [32, 6], to: [32, 94], kind: 'mountain' }, { from: [44, 6], to: [44, 94], kind: 'mountain' }, { from: [56, 6], to: [56, 94], kind: 'mountain' }, { from: [68, 6], to: [68, 94], kind: 'mountain' }], labels: [{ at: [50, 50], text: '✂ cut lines' }] }, caution: 'Scissors: a grown-up helps and holds them when not in use.' },
      { title: 'First loop', text: 'Curl one strip into a ring and glue the ends together.', diagram: { paper: [[30, 40], [70, 40], [70, 60], [30, 60]], color: '#FFD6E5', arrows: [{ from: [68, 50], to: [32, 50], curve: -30 }], after: [[35, 25], [65, 25], [65, 75], [35, 75]] } },
      { title: 'Link the next', text: 'Thread the next strip through the ring, then glue it into a ring too. Keep going!', diagram: { paper: [[35, 25], [65, 25], [65, 75], [35, 75]], color: '#FFD6E5', arrows: [{ from: [50, 70], to: [50, 95], curve: 10 }], after: [[20, 60], [80, 60], [80, 95], [20, 95]] } },
      { title: 'Hang it up', text: 'Ask a grown-up to hang your chain across the room.', diagram: { paper: [[8, 40], [92, 40], [92, 60], [8, 60]], color: '#FFD6E5', labels: [{ at: [50, 30], text: '🎉' }] } },
    ],
    finalPreview: { emoji: '🎊' }, checklist: ['I used the scissors with a grown-up', 'Glue lid is back on', 'My chain has 10 or more loops'], sortOrder: 11,
  },
  {
    id: 'pop-up-card', title: 'Pop-up Greeting Card', kind: 'paper_craft', description: 'A card with a surprise that jumps out when it opens.', brackets: ['B', 'C', 'D'], difficulty: 3, estimatedMinutes: 15,
    materials: ['2 sheets of card or thick paper', 'Child-safe scissors', 'Glue stick', 'Colour pens'], hazards: ['scissors', 'glue'], adultSupervision: true, physical: true,
    steps: [
      { title: 'Fold the card', text: 'Fold one sheet in half to make the card.', diagram: { paper: RECT, color: '#FFF4A3', folds: [{ from: [20, 50], to: [80, 50], kind: 'valley' }], arrows: [{ from: [50, 10], to: [50, 90], curve: 24 }], after: [[20, 50], [80, 50], [80, 94], [20, 94]] } },
      { title: 'Cut two slits', text: 'On the folded edge, cut two short slits about a thumb apart. Do not cut all the way across!', diagram: { paper: [[20, 50], [80, 50], [80, 94], [20, 94]], color: '#FFF4A3', folds: [{ from: [42, 50], to: [42, 64], kind: 'mountain' }, { from: [58, 50], to: [58, 64], kind: 'mountain' }], labels: [{ at: [50, 44], text: '✂ ✂' }] }, caution: 'Scissors: ask a grown-up to help cut.' },
      { title: 'Push the tab in', text: 'Open the card and push the strip between the slits inside, so it makes a little step.', diagram: { paper: RECT, color: '#FFF4A3', shade: [[42, 36], [58, 36], [58, 64], [42, 64]], arrows: [{ from: [50, 30], to: [50, 50], curve: 6 }] } },
      { title: 'Make the surprise', text: 'Draw and cut a picture from the second sheet (a cake, a heart, a dinosaur) and glue it to the step.', diagram: { paper: RECT, color: '#FFF4A3', labels: [{ at: [50, 50], text: '🎂 glue here' }] } },
      { title: 'Write your message', text: 'Decorate the front and write who the card is for.', diagram: { paper: RECT, color: '#FFF4A3', labels: [{ at: [50, 50], text: 'Happy Birthday!' }] } },
    ],
    finalPreview: { emoji: '💌' }, checklist: ['The surprise pops up when the card opens', 'I used scissors with a grown-up', 'The card is signed'], sortOrder: 12,
  },
  {
    id: 'draw-a-cat', title: 'Draw a Cat in 6 Steps', kind: 'drawing', description: 'Simple shapes become a cute cat. Paper and pencil, or the Drawing Canvas.', brackets: ['A', 'B', 'C'], difficulty: 1, estimatedMinutes: 8,
    materials: ['Paper', 'Pencil and crayons (or the Drawing Canvas game)'], hazards: [], adultSupervision: false, physical: true,
    steps: [
      { title: 'Head', text: 'Draw a big circle in the middle of the page.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFE8C2' } },
      { title: 'Ears', text: 'Add two triangles on top of the circle.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFE8C2', after: [[26, 30], [34, 8], [44, 22]], labels: [{ at: [66, 14], text: '▲' }] } },
      { title: 'Eyes and nose', text: 'Two dots for eyes and a small triangle nose.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFE8C2', labels: [{ at: [40, 46], text: '●' }, { at: [60, 46], text: '●' }, { at: [50, 58], text: '▼' }] } },
      { title: 'Mouth and whiskers', text: 'Draw a "w" under the nose and three lines on each cheek.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFE8C2', folds: [{ from: [12, 56], to: [34, 60], kind: 'mountain' }, { from: [12, 64], to: [34, 64], kind: 'mountain' }, { from: [88, 56], to: [66, 60], kind: 'mountain' }, { from: [88, 64], to: [66, 64], kind: 'mountain' }], labels: [{ at: [50, 68], text: 'w' }] } },
      { title: 'Body and tail', text: 'Draw a rounded body under the head and a curly tail.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFE8C2', after: [[32, 76], [68, 76], [72, 96], [28, 96]], arrows: [{ from: [72, 90], to: [92, 70], curve: -16 }] } },
      { title: 'Colour it', text: 'Colour your cat. Stripes? Spots? Rainbow? You decide.', diagram: { paper: [[50, 20], [68, 25], [80, 40], [80, 60], [68, 75], [50, 80], [32, 75], [20, 60], [20, 40], [32, 25]], color: '#FFB347', labels: [{ at: [50, 50], text: '🎨' }] } },
    ],
    finalPreview: { emoji: '🐱' }, checklist: ['My cat has two ears, two eyes and whiskers', 'I coloured it in'], sortOrder: 20,
  },
  {
    id: 'digital-colouring', title: 'Colouring Book (on screen)', kind: 'digital', description: 'Tap to colour pictures on the screen. No paper needed.', brackets: ['A', 'B', 'C'], difficulty: 1, estimatedMinutes: 5,
    materials: ['Just this device'], hazards: [], adultSupervision: false, physical: false,
    steps: [{ title: 'Open the Colouring Book', text: 'Go to Games and open Colouring Book. Pick a picture and tap each part to fill it with colour.', diagram: { paper: SQ, color: '#FFD6E5', labels: [{ at: [50, 50], text: '🖍️' }] } }],
    finalPreview: { emoji: '🖍️', gameId: 'colouring-book' }, checklist: ['I finished a whole picture'], sortOrder: 30,
  },
  {
    id: 'digital-drawing', title: 'Free Drawing (on screen)', kind: 'digital', description: 'Draw anything with your finger on the Drawing Canvas.', brackets: ['A', 'B', 'C', 'D'], difficulty: 1, estimatedMinutes: 5,
    materials: ['Just this device'], hazards: [], adultSupervision: false, physical: false,
    steps: [{ title: 'Open the Drawing Canvas', text: 'Go to Games and open Drawing Canvas. Choose a colour and brush, and draw. Use the stamps to decorate.', diagram: { paper: SQ, color: '#C3F0FF', labels: [{ at: [50, 50], text: '🎨' }] } }],
    finalPreview: { emoji: '🎨', gameId: 'drawing-canvas' }, checklist: ['I drew a picture and saved it'], sortOrder: 31,
  },
];
