// Built-in origami models used by the Origami Studio and Paper Airplane
// games. Each step is a FoldDiagram (see FoldDiagram.tsx) authored in a
// 0–100 square. These are the digital practice versions; the full Art &
// Craft library (materials, hazards, printable checklists) comes from the
// server's craft tutorials.
import type { Diagram } from './FoldDiagram';

export interface OrigamiStep { title: string; text: string; diagram: Diagram; tip?: string }
export interface OrigamiModel {
  id: string;
  name: string;
  emoji: string;
  brackets: ('A' | 'B' | 'C' | 'D')[];
  difficulty: 'easy' | 'medium' | 'hard';
  minutes: number;
  paper: string;
  color: string;
  steps: OrigamiStep[];
  finish: string;
}

type Pt = [number, number];
const SQ: Pt[] = [[8, 8], [92, 8], [92, 92], [8, 92]];
const DIAMOND: Pt[] = [[50, 4], [96, 50], [50, 96], [4, 50]];
const RECT: Pt[] = [[20, 6], [80, 6], [80, 94], [20, 94]];

export const ORIGAMI_MODELS: OrigamiModel[] = [
  {
    id: 'dog-face', name: 'Puppy Face', emoji: '🐶', brackets: ['A', 'B'], difficulty: 'easy', minutes: 5, paper: 'one square sheet (15 cm)', color: '#F6C177',
    finish: 'Draw two eyes and a nose. Woof!',
    steps: [
      { title: 'Make a triangle', text: 'Put the square like a diamond. Fold the top corner down to the bottom corner.', diagram: { paper: DIAMOND, color: '#F6C177', folds: [{ from: [4, 50], to: [96, 50], kind: 'valley' }], arrows: [{ from: [50, 10], to: [50, 88], curve: 30 }], shade: [[50, 4], [96, 50], [4, 50]], after: [[4, 50], [96, 50], [50, 96]] }, tip: 'Press the fold flat with your finger. Crisp folds make a neat puppy.' },
      { title: 'Fold the left ear', text: 'Fold the left corner down so it hangs below the edge, like a floppy ear.', diagram: { paper: [[4, 50], [96, 50], [50, 96]], color: '#F6C177', folds: [{ from: [30, 50], to: [46, 72], kind: 'valley' }], arrows: [{ from: [8, 52], to: [28, 84], curve: -16 }], shade: [[4, 50], [30, 50], [46, 72]], after: [[30, 50], [96, 50], [50, 96], [46, 72], [28, 86]] } },
      { title: 'Fold the right ear', text: 'Now do the same on the right side so the two ears match.', diagram: { paper: [[30, 50], [96, 50], [50, 96], [46, 72], [28, 86]], color: '#F6C177', folds: [{ from: [70, 50], to: [54, 72], kind: 'valley' }], arrows: [{ from: [92, 52], to: [72, 84], curve: 16 }], shade: [[70, 50], [96, 50], [54, 72]], after: [[30, 50], [70, 50], [72, 86], [54, 72], [50, 96], [46, 72], [28, 86]] } },
      { title: 'Fold the chin', text: 'Fold the bottom point up a little to make the chin.', diagram: { paper: [[30, 50], [70, 50], [72, 86], [54, 72], [50, 96], [46, 72], [28, 86]], color: '#F6C177', folds: [{ from: [44, 82], to: [56, 82], kind: 'valley' }], arrows: [{ from: [50, 94], to: [50, 74], curve: 12 }], shade: [[46, 82], [54, 82], [50, 96]], after: [[30, 50], [70, 50], [72, 86], [54, 72], [50, 82], [46, 72], [28, 86]], labels: [{ at: [50, 40], text: 'top = head' }] } },
    ],
  },
  {
    id: 'paper-boat', name: 'Paper Boat', emoji: '⛵', brackets: ['B', 'C', 'D'], difficulty: 'medium', minutes: 8, paper: 'one rectangle sheet (A4)', color: '#8CD3FF',
    finish: 'Pull the two sides gently apart and your boat is ready to float!',
    steps: [
      { title: 'Fold in half', text: 'Fold the rectangle in half from top to bottom.', diagram: { paper: RECT, color: '#8CD3FF', folds: [{ from: [20, 50], to: [80, 50], kind: 'valley' }], arrows: [{ from: [50, 10], to: [50, 90], curve: 30 }], shade: [[20, 6], [80, 6], [80, 50], [20, 50]], after: [[20, 50], [80, 50], [80, 94], [20, 94]] } },
      { title: 'Corners to the middle', text: 'Fold the two top corners down to meet in the middle, making a point like a roof.', diagram: { paper: [[20, 50], [80, 50], [80, 94], [20, 94]], color: '#8CD3FF', folds: [{ from: [50, 50], to: [20, 80], kind: 'valley' }, { from: [50, 50], to: [80, 80], kind: 'valley' }], arrows: [{ from: [24, 54], to: [46, 78], curve: -10 }, { from: [76, 54], to: [54, 78], curve: 10 }], shade: [[20, 50], [50, 50], [20, 80]], after: [[50, 50], [80, 80], [80, 94], [20, 94], [20, 80]] } },
      { title: 'Fold the strips up', text: 'Fold the bottom strip up on the front, then turn over and fold the other strip up on the back.', diagram: { paper: [[50, 50], [80, 80], [80, 94], [20, 94], [20, 80]], color: '#8CD3FF', folds: [{ from: [20, 86], to: [80, 86], kind: 'valley' }], arrows: [{ from: [50, 94], to: [50, 76], curve: 14 }], shade: [[20, 86], [80, 86], [80, 94], [20, 94]], after: [[50, 50], [80, 80], [80, 86], [20, 86], [20, 80]] }, tip: 'Tuck the little corners that stick out around the back.' },
      { title: 'Open into a square', text: 'Hold the hat shape at the bottom corners and pull them apart. Flatten it into a square (diamond).', diagram: { paper: [[50, 50], [80, 80], [80, 86], [20, 86], [20, 80]], color: '#8CD3FF', arrows: [{ from: [24, 84], to: [50, 96], curve: 10 }, { from: [76, 84], to: [50, 96], curve: -10 }], after: [[50, 42], [78, 70], [50, 98], [22, 70]], labels: [{ at: [50, 30], text: 'squash flat' }] } },
      { title: 'Corners up again', text: 'Fold the bottom corner up to the top on the front, then the same on the back.', diagram: { paper: [[50, 42], [78, 70], [50, 98], [22, 70]], color: '#8CD3FF', folds: [{ from: [22, 70], to: [78, 70], kind: 'valley' }], arrows: [{ from: [50, 96], to: [50, 46], curve: 20 }], shade: [[22, 70], [78, 70], [50, 98]], after: [[50, 42], [78, 70], [22, 70]] } },
      { title: 'Open again and pull', text: 'Open the triangle into a square once more. Then pull the two top corners apart to see the boat appear!', diagram: { paper: [[50, 42], [78, 70], [22, 70]], color: '#8CD3FF', arrows: [{ from: [30, 66], to: [10, 60], curve: 8 }, { from: [70, 66], to: [90, 60], curve: -8 }], after: [[6, 70], [94, 70], [80, 86], [20, 86]], labels: [{ at: [50, 60], text: 'pull both sides' }] } },
    ],
  },
  {
    id: 'jumping-frog', name: 'Jumping Frog', emoji: '🐸', brackets: ['C', 'D'], difficulty: 'hard', minutes: 12, paper: 'one rectangle sheet (A6 or index card)', color: '#8BE38B',
    finish: 'Press the frog\'s back down and let go. It jumps!',
    steps: [
      { title: 'Two diagonals', text: 'Fold the top edge down to the right side and unfold. Then fold it down to the left side and unfold. You get an X of creases.', diagram: { paper: RECT, color: '#8BE38B', folds: [{ from: [20, 6], to: [80, 66], kind: 'valley' }, { from: [80, 6], to: [20, 66], kind: 'valley' }], arrows: [{ from: [22, 10], to: [76, 60], curve: 14 }] } },
      { title: 'Horizontal crease', text: 'Fold the top part down where the X crosses the sides and unfold. This is a mountain fold.', diagram: { paper: RECT, color: '#8BE38B', folds: [{ from: [20, 36], to: [80, 36], kind: 'mountain' }, { from: [20, 6], to: [80, 66], kind: 'valley' }, { from: [80, 6], to: [20, 66], kind: 'valley' }] } },
      { title: 'Collapse the triangle', text: 'Push the sides in at the horizontal crease so the top folds down into a triangle.', diagram: { paper: RECT, color: '#8BE38B', arrows: [{ from: [14, 36], to: [40, 40], curve: 0 }, { from: [86, 36], to: [60, 40], curve: 0 }], shade: [[20, 6], [80, 6], [80, 36], [20, 36]], after: [[20, 36], [80, 36], [80, 94], [20, 94]], labels: [{ at: [50, 60], text: 'triangle on top' }] }, tip: 'This is the tricky fold. Ask a grown-up if the paper will not sit flat.' },
      { title: 'Front legs', text: 'Fold the two front flaps of the triangle up to the top point.', diagram: { paper: [[20, 36], [80, 36], [80, 94], [20, 94]], color: '#8BE38B', folds: [{ from: [35, 50], to: [50, 36], kind: 'valley' }, { from: [65, 50], to: [50, 36], kind: 'valley' }], arrows: [{ from: [24, 60], to: [44, 38], curve: -8 }, { from: [76, 60], to: [56, 38], curve: 8 }] } },
      { title: 'Sides in', text: 'Fold the left and right edges in to the centre line.', diagram: { paper: [[20, 36], [80, 36], [80, 94], [20, 94]], color: '#8BE38B', folds: [{ from: [35, 60], to: [35, 94], kind: 'valley' }, { from: [65, 60], to: [65, 94], kind: 'valley' }], arrows: [{ from: [22, 80], to: [34, 80], curve: 0 }, { from: [78, 80], to: [66, 80], curve: 0 }], after: [[35, 36], [65, 36], [65, 94], [35, 94]] } },
      { title: 'Fold the bottom up', text: 'Fold the bottom edge up to the base of the triangle.', diagram: { paper: [[35, 36], [65, 36], [65, 94], [35, 94]], color: '#8BE38B', folds: [{ from: [35, 68], to: [65, 68], kind: 'valley' }], arrows: [{ from: [50, 92], to: [50, 46], curve: 20 }], shade: [[35, 68], [65, 68], [65, 94], [35, 94]], after: [[35, 36], [65, 36], [65, 68], [35, 68]] } },
      { title: 'Make the spring', text: 'Fold the same flap back down halfway. This zig-zag is the spring that makes the frog jump.', diagram: { paper: [[35, 36], [65, 36], [65, 68], [35, 68]], color: '#8BE38B', folds: [{ from: [35, 56], to: [65, 56], kind: 'mountain' }], arrows: [{ from: [50, 44], to: [50, 66], curve: -20 }], after: [[35, 36], [65, 36], [65, 80], [35, 80]], labels: [{ at: [50, 90], text: 'zig-zag' }] } },
    ],
  },
];

export const AIRPLANE_MODELS: OrigamiModel[] = [
  {
    id: 'classic-dart', name: 'Classic Dart', emoji: '✈️', brackets: ['B', 'C', 'D'], difficulty: 'easy', minutes: 5, paper: 'one rectangle sheet (A4)', color: '#F5F5FA',
    finish: 'Hold it under the wings and throw gently forward.',
    steps: [
      { title: 'Centre crease', text: 'Fold the sheet in half the long way and unfold it. The crease is your centre line.', diagram: { paper: RECT, color: '#F5F5FA', folds: [{ from: [50, 6], to: [50, 94], kind: 'valley' }], arrows: [{ from: [24, 50], to: [76, 50], curve: 20 }] } },
      { title: 'Corners to centre', text: 'Fold the two top corners down so they meet on the centre line.', diagram: { paper: RECT, color: '#F5F5FA', folds: [{ from: [50, 6], to: [20, 36], kind: 'valley' }, { from: [50, 6], to: [80, 36], kind: 'valley' }], arrows: [{ from: [24, 10], to: [46, 30], curve: -8 }, { from: [76, 10], to: [54, 30], curve: 8 }], shade: [[20, 6], [50, 6], [20, 36]], after: [[50, 6], [80, 36], [80, 94], [20, 94], [20, 36]] } },
      { title: 'Again to centre', text: 'Fold the new slanted edges in to the centre line to make a sharp nose.', diagram: { paper: [[50, 6], [80, 36], [80, 94], [20, 94], [20, 36]], color: '#F5F5FA', folds: [{ from: [50, 6], to: [35, 70], kind: 'valley' }, { from: [50, 6], to: [65, 70], kind: 'valley' }], arrows: [{ from: [26, 40], to: [44, 60], curve: -8 }, { from: [74, 40], to: [56, 60], curve: 8 }], after: [[50, 6], [65, 70], [80, 94], [20, 94], [35, 70]] } },
      { title: 'Fold in half', text: 'Fold the plane in half along the centre line so the folds are on the outside.', diagram: { paper: [[50, 6], [65, 70], [80, 94], [20, 94], [35, 70]], color: '#F5F5FA', folds: [{ from: [50, 6], to: [50, 94], kind: 'mountain' }], arrows: [{ from: [30, 80], to: [70, 80], curve: 18 }], shade: [[50, 6], [35, 70], [20, 94], [50, 94]], after: [[50, 6], [65, 70], [80, 94], [50, 94]] } },
      { title: 'Wings down', text: 'Fold each wing down so its edge lines up with the bottom of the body. Open the wings out flat.', diagram: { paper: [[50, 6], [65, 70], [80, 94], [50, 94]], color: '#F5F5FA', folds: [{ from: [50, 20], to: [60, 94], kind: 'valley' }], arrows: [{ from: [74, 86], to: [54, 60], curve: 10 }], after: [[50, 6], [60, 94], [50, 94]], labels: [{ at: [30, 50], text: 'same on the other side' }] }, tip: 'Bend the back edges of the wings up a tiny bit if the plane dives.' },
    ],
  },
];
