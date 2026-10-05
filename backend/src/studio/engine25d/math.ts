import { Easing } from "./spec";

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Cubic bezier easing (CSS semantics) solved by Newton–Raphson with bisection fallback. */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

const EASING_FNS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  ease_in: cubicBezier(0.42, 0, 1, 1),
  ease_out: cubicBezier(0, 0, 0.58, 1),
  ease_in_out: cubicBezier(0.42, 0, 0.58, 1),
  // Slow, weighty start and a long settle — reads as a dolly operator, not a robot.
  cinematic: cubicBezier(0.45, 0, 0.2, 1),
  sine_in_out: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  expo_out: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

export function ease(kind: Easing, t: number): number {
  return EASING_FNS[kind](clamp(t, 0, 1));
}

/** Progress (0..1) of a timed segment at shot fraction u. */
export function segmentProgress(u: number, startTime: number, endTime: number, easing: Easing): number {
  if (endTime <= startTime) return u >= endTime ? 1 : 0;
  return ease(easing, (u - startTime) / (endTime - startTime));
}

/** Deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stateless integer hash → [0, 1). Used for per-particle and per-frame randomness without simulation state. */
export function hash01(a: number, b = 0, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [-1, 1], deterministic per seed. */
export function noise1(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash01(seed, i) * 2 - 1;
  const b = hash01(seed, i + 1) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

/** Fractal (2-octave) 1D noise — organic handheld/sway motion. */
export function fbm1(seed: number, x: number): number {
  return noise1(seed, x) * 0.66 + noise1(seed + 101, x * 2.13) * 0.34;
}

/** 2D affine matrix [a, b, c, d, e, f]: x' = a*x + c*y + e ; y' = b*x + d*y + f */
export type Mat2D = [number, number, number, number, number, number];

export const IDENTITY: Mat2D = [1, 0, 0, 1, 0, 0];

export function multiply(m: Mat2D, n: Mat2D): Mat2D {
  // m ∘ n (apply n first, then m)
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function translate(x: number, y: number): Mat2D {
  return [1, 0, 0, 1, x, y];
}

export function scale(sx: number, sy = sx): Mat2D {
  return [sx, 0, 0, sy, 0, 0];
}

export function rotate(deg: number): Mat2D {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}

export function invert(m: Mat2D): Mat2D {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) throw new Error("Singular transform");
  const id = 1 / det;
  return [m[3] * id, -m[1] * id, -m[2] * id, m[0] * id, (m[2] * m[5] - m[3] * m[4]) * id, (m[1] * m[4] - m[0] * m[5]) * id];
}

export function apply(m: Mat2D, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Axis-aligned bounds of a w×h rectangle after transform m. */
export function transformedBounds(m: Mat2D, w: number, h: number): { x0: number; y0: number; x1: number; y1: number } {
  const pts = [apply(m, 0, 0), apply(m, w, 0), apply(m, 0, h), apply(m, w, h)];
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    x1: Math.max(...pts.map((p) => p[0])),
    y1: Math.max(...pts.map((p) => p[1])),
  };
}
