// The landscaper: where a plant may stand on the garden plate. The plate
// is the painted panorama (3840 × 983); every position is a fraction of
// it. Each segment has beds (rectangles the gardener may plant, minus the
// paths, water and buildings), and a deterministic seed turns the beds
// into a natural scatter of slots: Poisson-disc sampled, never in rows,
// never on a path, each with the depth that decides how big a plant
// looks there. A reshuffle is simply another seed.
import type { SegmentId } from './catalog';

export const PLATE_W = 3840;
export const PLATE_H = 983;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Bed {
  segment: SegmentId;
  rect: Rect;
  /** Where the bed sits in depth: back (big plants), mid, front (small). */
  band: 'back' | 'mid' | 'front';
  /** Only certain habits here (the pond takes potted plants on plinths, and water plants). */
  only?: ('water' | 'pot')[];
  /** Plants here stand on a stone plinth rising from the water. */
  plinth?: boolean;
  /** Spacing multiplier: potted displays stand closer than open beds. */
  tight?: number;
}

/** Beds, authored against the plate; paths, bridges, waterfalls and the
 * gazebo are the gaps between them. x/y are fractions of the plate. */
export const BEDS: Bed[] = [
  // flowers: a border of arches at the back, beds either side of the gazebo path, the rose beds in front
  { segment: 'flowers', rect: { x: 0.0, y: 0.43, w: 0.21, h: 0.11 }, band: 'back' },
  { segment: 'flowers', rect: { x: 0.0, y: 0.55, w: 0.095, h: 0.12 }, band: 'mid' },
  { segment: 'flowers', rect: { x: 0.11, y: 0.55, w: 0.1, h: 0.12 }, band: 'mid' },
  { segment: 'flowers', rect: { x: 0.0, y: 0.7, w: 0.17, h: 0.3 }, band: 'front' },
  // trees: the lawn around the treehouse, the beds by the path, pots on the paving
  { segment: 'trees', rect: { x: 0.215, y: 0.3, w: 0.2, h: 0.2 }, band: 'back' },
  { segment: 'trees', rect: { x: 0.215, y: 0.52, w: 0.2, h: 0.13 }, band: 'mid' },
  { segment: 'trees', rect: { x: 0.215, y: 0.7, w: 0.11, h: 0.28 }, band: 'front' },
  // indoor and ornamental: the terraces either side of the gazebo, the step landings, and the
  // lotus pond, where potted plants stand on stone plinths among the lilies
  { segment: 'indoor', rect: { x: 0.415, y: 0.46, w: 0.03, h: 0.16 }, band: 'back', only: ['pot'], tight: 0.85 },
  { segment: 'indoor', rect: { x: 0.53, y: 0.46, w: 0.075, h: 0.16 }, band: 'back', only: ['pot'], tight: 0.85 },
  { segment: 'indoor', rect: { x: 0.36, y: 0.6, w: 0.08, h: 0.09 }, band: 'mid', only: ['pot'], tight: 0.85 },
  { segment: 'indoor', rect: { x: 0.53, y: 0.62, w: 0.07, h: 0.08 }, band: 'mid', only: ['pot'], tight: 0.85 },
  { segment: 'indoor', rect: { x: 0.36, y: 0.75, w: 0.25, h: 0.245 }, band: 'front', only: ['pot', 'water'], plinth: true, tight: 0.78 },
  // fruits: the orchard at the back, vegetable beds, planters along the path
  { segment: 'fruits', rect: { x: 0.61, y: 0.3, w: 0.2, h: 0.2 }, band: 'back' },
  { segment: 'fruits', rect: { x: 0.62, y: 0.52, w: 0.19, h: 0.15 }, band: 'mid' },
  { segment: 'fruits', rect: { x: 0.605, y: 0.7, w: 0.2, h: 0.28 }, band: 'front' },
  // herbs: under the pergola, the raised beds, the front border
  { segment: 'herbs', rect: { x: 0.815, y: 0.32, w: 0.185, h: 0.18 }, band: 'back' },
  { segment: 'herbs', rect: { x: 0.815, y: 0.52, w: 0.185, h: 0.15 }, band: 'mid' },
  { segment: 'herbs', rect: { x: 0.815, y: 0.7, w: 0.185, h: 0.28 }, band: 'front' },
];

/** Things the gardener never covers: lanterns, the bridge, the waterfalls, the fountain. */
export const KEEP_CLEAR: Rect[] = [
  { x: 0.17, y: 0.6, w: 0.045, h: 0.2 }, // the lanterns by the flowers path
  { x: 0.325, y: 0.68, w: 0.1, h: 0.2 }, // the stone bridge
  { x: 0.57, y: 0.6, w: 0.05, h: 0.3 }, // the right-hand bridge and lantern
  { x: 0.455, y: 0.62, w: 0.065, h: 0.17 }, // the fountain foot and glowing lotus
  { x: 0.445, y: 0.38, w: 0.085, h: 0.24 }, // the gazebo, its statue and the steps
  { x: 0.47, y: 0.82, w: 0.06, h: 0.08 }, // the second glowing lotus
  { x: 0.37, y: 0.62, w: 0.06, h: 0.12 }, // the left cascade
  { x: 0.78, y: 0.7, w: 0.03, h: 0.2 }, // the large lantern on the fruits path
];

/** Plate pixels per metre at a depth (y as a fraction of the plate). */
export function pxPerMetre(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 0.3) / 0.7));
  return 60 + 110 * Math.pow(t, 1.3);
}

/** Spacing between slots grows toward the front, where plants look bigger. */
function spacing(y: number): number {
  return 19 + 40 * Math.max(0, Math.min(1, (y - 0.3) / 0.7));
}

export interface Slot {
  /** Fraction of the plate. */
  x: number;
  y: number;
  band: Bed['band'];
  only?: Bed['only'];
  plinth?: boolean;
  /** Free radius around the slot, in plate pixels. */
  radius: number;
}

/** A small, fast, seedable generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Every slot of a segment for a seed: a Poisson scatter over its beds. */
export function slotsFor(segment: SegmentId, seed: number): Slot[] {
  const random = rng(seed * 7919 + segment.length * 131);
  const slots: Slot[] = [];
  const beds = BEDS.filter((b) => b.segment === segment);
  for (const bed of beds) {
    const r = bed.rect;
    const wpx = r.w * PLATE_W;
    const hpx = r.h * PLATE_H;
    // dart throwing with rejection against everything placed so far
    const attempts = Math.ceil((wpx * hpx) / 60);
    for (let i = 0; i < attempts; i++) {
      const fx = r.x + random() * r.w;
      const fy = r.y + random() * r.h;
      if (KEEP_CLEAR.some((k) => inRect(fx, fy, k))) continue;
      const px = fx * PLATE_W;
      const py = fy * PLATE_H;
      const s = spacing(fy) * (bed.tight ?? 1);
      let ok = true;
      for (const o of slots) {
        const dx = o.x * PLATE_W - px;
        const dy = (o.y * PLATE_H - py) * 1.3; // depth reads compressed: keep a little more vertical room
        if (dx * dx + dy * dy < s * s) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      slots.push({ x: fx, y: fy, band: bed.band, only: bed.only, plinth: bed.plinth, radius: s * 0.55 });
    }
  }
  // front to back order is decided by y when drawing; keep the slot list stable
  return slots;
}

export function segmentOfX(x: number): SegmentId {
  if (x < 0.21) return 'flowers';
  if (x < 0.415) return 'trees';
  if (x < 0.605) return 'indoor';
  if (x < 0.815) return 'fruits';
  return 'herbs';
}

/** The x-range (fraction of the plate) each segment occupies. */
export const SEGMENT_RANGE: Record<SegmentId, [number, number]> = {
  flowers: [0.0, 0.21],
  trees: [0.21, 0.415],
  indoor: [0.415, 0.605],
  fruits: [0.605, 0.815],
  herbs: [0.815, 1.0],
};

/** Where the baked-in label of each segment sits on the plate (the app draws its own chip there). */
export const SEGMENT_LABEL_POS: Record<SegmentId, { x: number; y: number }> = {
  flowers: { x: 0.067, y: 0.69 },
  trees: { x: 0.262, y: 0.69 },
  indoor: { x: 0.49, y: 0.9 },
  fruits: { x: 0.73, y: 0.69 },
  herbs: { x: 0.93, y: 0.69 },
};
