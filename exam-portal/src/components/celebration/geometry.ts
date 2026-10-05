/** Board geometry inside the (larger) overlay canvas, the calm text zone
 * in the middle, and perimeter sampling for every effect. */
export interface Geometry {
  width: number;
  height: number;
  margin: number;
  /** Board rectangle in canvas pixels. */
  board: { x: number; y: number; w: number; h: number };
  /** Area holding name / locality / city / exam — kept visually calm. */
  calm: { x: number; y: number; w: number; h: number };
  /** Size scale relative to a 360×220 reference board. */
  scale: number;
}

export function makeGeometry(width: number, height: number, margin: number): Geometry {
  const board = { x: margin, y: margin, w: Math.max(1, width - margin * 2), h: Math.max(1, height - margin * 2) };
  const calm = { x: board.x + board.w * 0.12, y: board.y + board.h * 0.22, w: board.w * 0.76, h: board.h * 0.66 };
  // Area-based so a wide, short board still gets readable particles.
  const scale = Math.min(1.5, Math.max(0.7, Math.sqrt(board.w * board.h) / 230));
  return { width, height, margin, board, calm, scale };
}

/** 1 outside the calm zone, fading to ~0 inside it (24 px soft edge). */
export function calmMask(g: Geometry, x: number, y: number): number {
  const { calm } = g;
  const dx = Math.max(calm.x - x, 0, x - (calm.x + calm.w));
  const dy = Math.max(calm.y - y, 0, y - (calm.y + calm.h));
  const d = Math.hypot(dx, dy);
  if (d === 0) return 0.08; // a faint hint only — never covers the text
  return Math.min(1, 0.08 + d / 24);
}

export type Region = "top" | "topLeft" | "topRight" | "left" | "right" | "bottomLeft" | "bottomRight";
const WEIGHTS: Array<[Region, number]> = [
  ["top", 0.28],
  ["topLeft", 0.15],
  ["topRight", 0.15],
  ["left", 0.12],
  ["right", 0.12],
  ["bottomLeft", 0.09],
  ["bottomRight", 0.09],
];

export function pickRegion(r: () => number, allow?: Region[]): Region {
  const list = allow ? WEIGHTS.filter(([k]) => allow.includes(k)) : WEIGHTS;
  const total = list.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of list) {
    x -= w;
    if (x <= 0) return k;
  }
  return list[list.length - 1][0];
}

/** A point around the board's outer edge (inside the spill margin), never
 * inside the calm zone. */
export function perimeterPoint(g: Geometry, region: Region, r: () => number): { x: number; y: number } {
  const { board: b, margin: m } = g;
  const out = () => -m * 0.15 + r() * m * 0.6; // mostly just outside the edge
  switch (region) {
    case "top":
      return { x: b.x + b.w * (0.15 + r() * 0.7), y: b.y - out() };
    case "topLeft":
      return { x: b.x - out() + r() * b.w * 0.12, y: b.y - out() + r() * b.h * 0.15 };
    case "topRight":
      return { x: b.x + b.w + out() - r() * b.w * 0.12, y: b.y - out() + r() * b.h * 0.15 };
    case "left":
      return { x: b.x - out(), y: b.y + b.h * (0.25 + r() * 0.55) };
    case "right":
      return { x: b.x + b.w + out(), y: b.y + b.h * (0.25 + r() * 0.55) };
    case "bottomLeft":
      return { x: b.x - out() + r() * b.w * 0.1, y: b.y + b.h + out() - r() * b.h * 0.1 };
    case "bottomRight":
      return { x: b.x + b.w + out() - r() * b.w * 0.1, y: b.y + b.h + out() - r() * b.h * 0.1 };
  }
}

/** Small deterministic PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
