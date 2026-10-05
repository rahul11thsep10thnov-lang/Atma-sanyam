import { ParticleSpec } from "./spec";
import { clamp, fbm1, hash01 } from "./math";
import { createImage, PImage } from "./raster";
import { Painter, solid } from "../production/procedural/painter";

/**
 * EnvironmentParticleEngine. Every particle is an analytic function of time
 * (spawn hashed from (system seed, particle index, generation)), so any frame
 * can be rendered independently on any worker and the result is identical
 * on every re-render.
 */

export type ParticleShape = "dot" | "streak" | "puff" | "sprite";

export interface Particle {
  shape: ParticleShape;
  /** Canvas-fraction position before camera projection. */
  x: number;
  y: number;
  depth: number;
  /** Radius (dot/puff) or length (streak) in canvas heights. */
  size: number;
  alpha: number;
  rgb: [number, number, number];
  /** Streak direction (radians) / sprite rotation. */
  angle: number;
  sprite?: string;
  /** Sprite flip (walking direction). */
  flip?: boolean;
  /** Extra bob for sprites (canvas heights). */
  bob?: number;
  /** Additive (glowing) particles: sparks, fire, insects near lamps. */
  additive?: boolean;
  /** Boost by local light (dust motes catch light). */
  catchesLight?: number;
}

const BASE_COUNT: Record<ParticleSpec["type"], number> = {
  rain: 520,
  snow: 260,
  fog: 9,
  mist: 7,
  smoke: 26,
  dust: 140,
  steam: 34,
  fire: 60,
  sparks: 50,
  leaves: 26,
  water: 120,
  crowds: 14,
  traffic: 6,
  birds: 7,
  insects: 18,
};

const DEFAULT_COLOR: Record<ParticleSpec["type"], [number, number, number]> = {
  rain: [0.78, 0.84, 0.95],
  snow: [0.96, 0.97, 1],
  fog: [0.8, 0.82, 0.86],
  mist: [0.85, 0.87, 0.9],
  smoke: [0.45, 0.45, 0.47],
  dust: [1, 0.93, 0.78],
  steam: [0.93, 0.93, 0.96],
  fire: [1, 0.6, 0.2],
  sparks: [1, 0.78, 0.35],
  leaves: [0.55, 0.45, 0.2],
  water: [0.85, 0.92, 1],
  crowds: [0.22, 0.22, 0.26],
  traffic: [0.25, 0.25, 0.28],
  birds: [0.12, 0.12, 0.14],
  insects: [1, 0.95, 0.7],
};

const wrap = (v: number, lo: number, hi: number) => {
  const span = hi - lo;
  return lo + ((((v - lo) % span) + span) % span);
};

export interface ParticleContext {
  t: number;
  duration: number;
  /** Light positions (canvas fractions) for insects. */
  lights: { x: number; y: number }[];
}

export function evaluateParticles(spec: ParticleSpec, ctx: ParticleContext): Particle[] {
  const n = Math.max(0, Math.round(BASE_COUNT[spec.type] * spec.density));
  const out: Particle[] = [];
  const color = spec.color ?? DEFAULT_COLOR[spec.type];
  const [d0, d1] = spec.depthRange;
  const area = spec.area ?? [-0.1, -0.1, 1.1, 1.1];
  const dirRad = (spec.direction * Math.PI) / 180;
  const vx = Math.cos(dirRad);
  const vy = Math.sin(dirRad);
  const t = ctx.t;
  const s = spec.seed;
  for (let i = 0; i < n; i++) {
    const depth = d0 + (d1 - d0) * hash01(s, i, 1);
    const near = 0.35 + depth; // nearer particles move faster on screen and look bigger
    const life = spec.lifetime * (0.75 + 0.5 * hash01(s, i, 2));
    const phase = hash01(s, i, 3) * life;
    const gen = Math.floor((t + phase) / life);
    const age = (t + phase) - gen * life;
    const a01 = age / life;
    const h = (k: number) => hash01(s + gen * 7919, i, k);
    switch (spec.type) {
      case "rain": {
        const sp = spec.speed * near;
        const x = wrap(area[0] + h(4) * (area[2] - area[0]) + (vx + spec.wind) * sp * age, area[0], area[2]);
        const y = wrap(area[1] + h(5) * (area[3] - area[1]) + vy * sp * age, area[1], area[3]);
        out.push({ shape: "streak", x, y, depth, size: 0.012 + 0.03 * depth, alpha: spec.opacity * (0.35 + 0.65 * depth), rgb: color, angle: Math.atan2(vy, vx + spec.wind) });
        break;
      }
      case "snow": {
        const sp = spec.speed * 0.25 * near;
        const sway = Math.sin(t * 1.3 + i) * 0.01 * near;
        const x = wrap(area[0] + h(4) * (area[2] - area[0]) + sway + spec.wind * sp * age, area[0], area[2]);
        const y = wrap(area[1] + h(5) * (area[3] - area[1]) + sp * age, area[1], area[3]);
        out.push({ shape: "dot", x, y, depth, size: 0.0025 + 0.006 * depth, alpha: spec.opacity, rgb: color, angle: 0 });
        break;
      }
      case "fog":
      case "mist": {
        // slow, large banks drifting sideways; continuous (no respawn pop)
        const x = wrap(hash01(s, i, 4) * 1.6 - 0.3 + spec.speed * t * (0.6 + 0.4 * hash01(s, i, 6)), -0.4, 1.4);
        const y = area === spec.area ? area[1] + hash01(s, i, 5) * (area[3] - area[1]) : 0.35 + hash01(s, i, 5) * 0.55;
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.3 + i);
        out.push({ shape: "puff", x, y, depth, size: (spec.type === "fog" ? 0.22 : 0.16) * (0.7 + 0.6 * hash01(s, i, 7)), alpha: spec.opacity * 0.55 * pulse, rgb: color, angle: 0 });
        break;
      }
      case "smoke":
      case "steam": {
        const src = spec.source ?? { x: 0.5, y: 0.6, spread: 0.05 };
        const sp = spec.speed * (0.7 + 0.6 * h(4));
        const sx = src.x + (h(5) - 0.5) * 2 * src.spread;
        const turb = fbm1(s + i, t * 0.8) * 0.03 * a01;
        const x = sx + (vx * sp + spec.wind) * age * 0.25 + turb + a01 * a01 * 0.04 * (h(6) - 0.3);
        const y = src.y + vy * sp * age * 0.25 + turb * 0.3;
        const size = (spec.size ?? 0.06) * (0.35 + 1.4 * a01);
        const fade = Math.sin(Math.PI * Math.min(1, a01 * 1.15)) ** 0.8;
        out.push({ shape: "puff", x, y, depth, size, alpha: spec.opacity * fade * 0.7, rgb: color, angle: 0 });
        break;
      }
      case "dust": {
        const ar = spec.area ?? [-0.05, 0.1, 1.05, 1.0];
        const x = wrap(ar[0] + h(4) * (ar[2] - ar[0]) + fbm1(s + i * 3, t * 0.15) * 0.06 + spec.speed * vx * t, ar[0], ar[2]);
        const y = wrap(ar[1] + h(5) * (ar[3] - ar[1]) + fbm1(s + i * 5, t * 0.12) * 0.05 + spec.speed * vy * t * 0.5, ar[1], ar[3]);
        const tw = 0.6 + 0.4 * Math.sin(t * (1.5 + h(6) * 2) + i);
        out.push({ shape: "dot", x, y, depth, size: (spec.size ?? 0.003) * (0.6 + depth), alpha: spec.opacity * tw, rgb: color, angle: 0, catchesLight: 1.8, additive: true });
        break;
      }
      case "fire":
      case "sparks": {
        const src = spec.source ?? { x: 0.5, y: 0.8, spread: 0.04 };
        const x = src.x + (h(4) - 0.5) * 2 * src.spread + fbm1(s + i, t * 2) * 0.01 * a01;
        const y = src.y - spec.speed * 0.3 * age * (0.6 + 0.8 * h(5));
        const fade = (1 - a01) ** 1.5;
        out.push({ shape: "dot", x, y, depth, size: (spec.type === "fire" ? 0.006 : 0.002) * (1 - a01 * 0.5), alpha: spec.opacity * fade, rgb: color, angle: 0, additive: true });
        break;
      }
      case "leaves": {
        const sp = spec.speed * near * 0.6;
        const x = wrap(h(4) * 1.2 - 0.1 + (vx * sp + spec.wind) * age + Math.sin(t * 2 + i) * 0.02, -0.1, 1.1);
        const y = wrap(-0.05 + h(5) * 1.1 + vy * sp * age, -0.1, 1.1);
        out.push({ shape: "sprite", sprite: "leaf", x, y, depth, size: 0.012 + 0.012 * depth, alpha: spec.opacity, rgb: color, angle: t * (2 + h(6) * 3) + i });
        break;
      }
      case "water": {
        const ar = spec.area ?? [0, 0.6, 1, 0.75];
        const x = ar[0] + hash01(s, i, 4) * (ar[2] - ar[0]) + Math.sin(t * 0.7 + i) * 0.004;
        const y = ar[1] + hash01(s, i, 5) * (ar[3] - ar[1]);
        const glint = Math.max(0, Math.sin(t * (2 + hash01(s, i, 6) * 3) + i * 1.7));
        out.push({ shape: "streak", x, y, depth, size: 0.008 + 0.01 * hash01(s, i, 7), alpha: spec.opacity * glint, rgb: color, angle: 0, additive: true });
        break;
      }
      case "crowds": {
        const ar = spec.area ?? [-0.1, 0.56, 1.1, 0.62];
        const dir = hash01(s, i, 4) < 0.5 ? 1 : -1;
        const speed = spec.speed * (0.6 + 0.8 * hash01(s, i, 5)) * (hash01(s, i, 9) < 0.3 ? 0 : 1); // some stand
        const x = wrap(ar[0] + hash01(s, i, 6) * (ar[2] - ar[0]) + dir * speed * t, ar[0], ar[2]);
        const y = ar[1] + hash01(s, i, 7) * (ar[3] - ar[1]);
        const walkPhase = t * 3.2 * (speed > 0 ? 1 : 0) + i;
        out.push({ shape: "sprite", sprite: `person${i % 4}`, x, y, depth, size: 0.05 + 0.025 * (y - ar[1]) / Math.max(1e-3, ar[3] - ar[1]), alpha: spec.opacity, rgb: color, angle: 0, flip: dir < 0, bob: speed > 0 ? Math.abs(Math.sin(walkPhase)) * 0.0015 : 0 });
        break;
      }
      case "traffic": {
        const ar = spec.area ?? [-0.2, 0.6, 1.2, 0.66];
        const dir = i % 2 === 0 ? 1 : -1;
        const speed = spec.speed * (0.7 + 0.6 * hash01(s, i, 5));
        const x = wrap(ar[0] + hash01(s, i, 6) * (ar[2] - ar[0]) + dir * speed * t, ar[0], ar[2]);
        const y = ar[1] + (dir > 0 ? 0.6 : 0.2) * (ar[3] - ar[1]);
        out.push({ shape: "sprite", sprite: `vehicle${i % 3}`, x, y, depth, size: 0.035, alpha: spec.opacity, rgb: color, angle: 0, flip: dir < 0 });
        break;
      }
      case "birds": {
        const dir = hash01(s, i, 4) < 0.7 ? 1 : -1;
        const x = wrap(hash01(s, i, 5) * 1.4 - 0.2 + dir * spec.speed * t * (0.8 + 0.4 * hash01(s, i, 6)), -0.2, 1.2);
        const y = 0.06 + hash01(s, i, 7) * 0.22 + Math.sin(t * 0.8 + i) * 0.01;
        const flap = Math.sin(t * (7 + hash01(s, i, 8) * 3) + i);
        out.push({ shape: "sprite", sprite: flap > 0 ? "birdUp" : "birdDown", x, y, depth, size: 0.012, alpha: spec.opacity, rgb: color, angle: 0, flip: dir < 0 });
        break;
      }
      case "insects": {
        const L = ctx.lights.length ? ctx.lights[i % ctx.lights.length] : { x: 0.5, y: 0.4 };
        const r = 0.015 + 0.03 * hash01(s, i, 4);
        const w = (1.5 + 2.5 * hash01(s, i, 5)) * (hash01(s, i, 6) < 0.5 ? 1 : -1);
        const x = L.x + Math.cos(t * w + i) * r + fbm1(s + i, t * 3) * 0.006;
        const y = L.y + Math.sin(t * w * 1.3 + i) * r * 0.7 + 0.02;
        out.push({ shape: "dot", x, y, depth, size: 0.0018, alpha: spec.opacity, rgb: color, angle: 0, additive: true });
        break;
      }
    }
  }
  return out;
}

/** Small painted sprites for crowd figures, vehicles, birds and leaves (white; tinted at draw time). */
export function buildParticleSprites(): Record<string, PImage> {
  const sprites: Record<string, PImage> = {};
  const white = solid(1, 1, 1, 1);
  for (let v = 0; v < 4; v++) {
    const p = new Painter(40, 100);
    const shoulder = 11 + v;
    p.ellipse(20, 12, 7, 8, white);
    p.roundRect(20 - shoulder, 21, shoulder * 2, 38, 6, white);
    if (v % 2 === 1) p.poly([20 - shoulder, 50, 20 + shoulder, 50, 20 + shoulder + 4, 82, 20 - shoulder - 4, 82], white); // saree / long kurta
    p.rect(12, 56, 7, 42, white);
    p.rect(21, 56, 7, 42, white);
    if (v === 2) p.rect(26, 40, 12, 16, white); // bag
    sprites[`person${v}`] = p.img;
  }
  for (let v = 0; v < 3; v++) {
    const p = new Painter(120, 50);
    const h = v === 1 ? 40 : 26;
    p.roundRect(4, 46 - h, 112, h - 6, 6, white);
    p.rect(v === 1 ? 10 : 30, 50 - h, v === 1 ? 100 : 50, 10, solid(1, 1, 1, 1));
    p.ellipse(26, 44, 6, 6, white);
    p.ellipse(94, 44, 6, 6, white);
    sprites[`vehicle${v}`] = p.img;
  }
  const bu = new Painter(40, 20);
  bu.curve(2, 6, 10, 0, 20, 12, 2.5, white).curve(20, 12, 30, 0, 38, 6, 2.5, white);
  sprites.birdUp = bu.img;
  const bd = new Painter(40, 20);
  bd.curve(2, 14, 10, 18, 20, 10, 2.5, white).curve(20, 10, 30, 18, 38, 14, 2.5, white);
  sprites.birdDown = bd.img;
  const lf = new Painter(24, 12);
  lf.ellipse(12, 6, 11, 5, white);
  sprites.leaf = lf.img;
  const soft = createImage(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const r = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32;
      const a = clamp(1 - r, 0, 1) ** 2;
      soft.data.set([a, a, a, a], (y * 64 + x) * 4);
    }
  sprites.soft = soft;
  return sprites;
}
