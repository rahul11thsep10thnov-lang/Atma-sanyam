import { LightingSpec, LightSpec } from "./spec";
import { clamp, fbm1, hash01, segmentProgress, smoothstep } from "./math";

/** Lights have no explicit depth in the spec; practical lights sit on the set at typical depths. */
const LIGHT_DEPTH: Record<LightSpec["type"], number> = {
  sun: 0,
  moon: 0,
  streetlight: 0.15,
  window: 0.15,
  interior: 0.3,
  neon: 0.2,
  headlights: 0.3,
  police: 0.3,
  fire: 0.35,
  train: 0.25,
  generic: 0.3,
};

export interface LightState {
  id: string;
  type: LightSpec["type"];
  /** Screen position (px) after camera projection. */
  x: number;
  y: number;
  depth: number;
  /** Colour × intensity × flicker at this instant. */
  rgb: [number, number, number];
  radiusPx: number;
  castsShadows: boolean;
  flare: boolean;
  affects?: string[];
  /** Scalar strength (for shadow/rim selection). */
  strength: number;
}

/**
 * LightingEngine, time evaluation: flicker (seeded noise, with occasional
 * dips for failing tubes), colour pulses (police beacons), moving lights
 * (a passing train's window light) — all deterministic.
 */
export function evaluateLights(spec: LightingSpec, t: number, u: number, seed: number, project: (x: number, y: number, depth: number) => [number, number], frameH: number): LightState[] {
  return spec.lights.map((l, i) => {
    let x = l.x;
    let y = l.y;
    if (l.motion) {
      let p: number;
      if (l.motion.loop) {
        const span = Math.max(1e-3, l.motion.endTime - l.motion.startTime);
        p = ((u - l.motion.startTime) / span) % 1;
        if (p < 0) p += 1;
      } else p = segmentProgress(u, l.motion.startTime, l.motion.endTime, l.motion.easing);
      x = l.motion.from[0] + (l.motion.to[0] - l.motion.from[0]) * p;
      y = l.motion.from[1] + (l.motion.to[1] - l.motion.from[1]) * p;
    }
    let k = l.intensity;
    if (l.flicker.amount > 0) {
      const n = 0.5 + 0.5 * fbm1(seed * 13 + i, t * l.flicker.speed);
      k *= 1 - l.flicker.amount * 0.35 * n;
      // rare short dips (an old tube light catching), deterministic per 0.5 s slot
      const slot = Math.floor(t * 2);
      if (l.flicker.amount > 0.25 && hash01(seed + i, slot) < 0.08) {
        const ph = t * 2 - slot;
        if (ph > 0.3 && ph < 0.45) k *= 0.35;
      }
    }
    let rgb: [number, number, number] = [l.color[0] * k, l.color[1] * k, l.color[2] * k];
    if (l.pulse) {
      const phase = (t * l.pulse.frequency) % 1;
      const idx = Math.floor(phase * l.pulse.colors.length);
      const local = (phase * l.pulse.colors.length) % 1;
      const on = smoothstep(0, 0.08, local) * (1 - smoothstep(0.55, 0.7, local));
      const c = l.pulse.colors[idx];
      rgb = [c[0] * k * on, c[1] * k * on, c[2] * k * on];
    }
    const depth = LIGHT_DEPTH[l.type] ?? 0.3;
    const [sx, sy] = project(x, y, depth);
    return { id: l.id, type: l.type, x: sx, y: sy, depth, rgb, radiusPx: l.radius * frameH, castsShadows: l.castsShadows, flare: l.flare, affects: l.affects, strength: (rgb[0] + rgb[1] + rgb[2]) / 3 };
  });
}

/** Low-resolution screen-space light map (RGB irradiance multipliers). */
export interface LightMap {
  w: number;
  h: number;
  scale: number; // screen px per map px
  data: Float32Array; // RGB
  ambient: [number, number, number];
}

function falloff(r: number, R: number): number {
  const q = r / R;
  return (1 / (1 + q * q * 3)) * (1 - smoothstep(0.8, 2.2, q));
}

export function buildLightMap(spec: LightingSpec, lights: LightState[], W: number, H: number, kind?: string, scale = 8): LightMap {
  const w = Math.ceil(W / scale);
  const h = Math.ceil(H / scale);
  const data = new Float32Array(w * h * 3);
  const amb: [number, number, number] = [spec.ambient.color[0] * spec.ambient.intensity, spec.ambient.color[1] * spec.ambient.intensity, spec.ambient.color[2] * spec.ambient.intensity];
  const active = lights.filter((l) => l.strength > 0.002 && (!kind || !l.affects || l.affects.includes(kind)));
  for (let y = 0; y < h; y++) {
    const py = (y + 0.5) * scale;
    for (let x = 0; x < w; x++) {
      const px = (x + 0.5) * scale;
      let r = amb[0];
      let g = amb[1];
      let b = amb[2];
      for (const l of active) {
        // sun/moon: broad directional wash rather than a point
        const f = l.type === "sun" || l.type === "moon" ? 0.55 + 0.45 * falloff(Math.hypot(px - l.x, py - l.y), l.radiusPx) : falloff(Math.hypot(px - l.x, py - l.y), l.radiusPx);
        r += l.rgb[0] * f;
        g += l.rgb[1] * f;
        b += l.rgb[2] * f;
      }
      const o = (y * w + x) * 3;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
    }
  }
  return { w, h, scale, data, ambient: amb };
}

/** Bilinear light lookup at a screen position; writes RGB into out. */
export function sampleLight(m: LightMap, x: number, y: number, out: Float32Array): void {
  const fx = clamp(x / m.scale - 0.5, 0, m.w - 1);
  const fy = clamp(y / m.scale - 0.5, 0, m.h - 1);
  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = Math.min(m.w - 1, x0 + 1);
  const y1 = Math.min(m.h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const d = m.data;
  for (let c = 0; c < 3; c++) {
    const a = d[(y0 * m.w + x0) * 3 + c] * (1 - tx) + d[(y0 * m.w + x1) * 3 + c] * tx;
    const b = d[(y1 * m.w + x0) * 3 + c] * (1 - tx) + d[(y1 * m.w + x1) * 3 + c] * tx;
    out[c] = a * (1 - ty) + b * ty;
  }
}

/** The light that should drive a subject's cast shadow and rim (strongest shadow caster, else the key direction). */
export function keyLightFor(lights: LightState[], sx: number, sy: number, keyDirectionDeg: number, frameH: number): { dx: number; dy: number; strength: number; rgb: [number, number, number] } {
  let best: LightState | null = null;
  let bestScore = 0;
  for (const l of lights) {
    if (!l.castsShadows) continue;
    const dist = Math.hypot(l.x - sx, l.y - sy) / Math.max(1, frameH);
    const score = (l.type === "sun" || l.type === "moon" ? l.strength : l.strength * falloff(dist * frameH, l.radiusPx * 1.6)) * 1;
    if (score > bestScore) {
      best = l;
      bestScore = score;
    }
  }
  if (!best) {
    const a = (keyDirectionDeg * Math.PI) / 180;
    return { dx: Math.cos(a), dy: -Math.abs(Math.sin(a)), strength: 0.5, rgb: [1, 0.95, 0.88] };
  }
  const dx = best.x - sx;
  const dy = best.y - sy;
  const len = Math.hypot(dx, dy) || 1;
  const s = clamp(bestScore, 0, 1.5);
  return { dx: dx / len, dy: dy / len, strength: s, rgb: [best.rgb[0] / Math.max(1e-3, best.strength), best.rgb[1] / Math.max(1e-3, best.strength), best.rgb[2] / Math.max(1e-3, best.strength)] };
}
