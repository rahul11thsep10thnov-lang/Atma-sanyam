// The Grand Banyan: the permanent landmark of the Northern Arboretum. One
// merged geometry (one draw call): a fused multi-stem trunk with buttress
// roots, eight spreading limbs with sub-branches, a canopy of about 8 m
// radius, a curtain of hanging aerial roots, and pillar roots that have
// reached the ground and thickened into secondary trunks.
import * as THREE from 'three';
import { GeoBuilder, V, V3, bezier, hex, jitter, mix } from './geo';
import { foliage } from './trees';
import { Rand, hashStr, range, rng } from './rng';

const TAU = Math.PI * 2;

export interface BanyanStats {
  triangles: number;
  height: number;
  canopyRadius: number;
  pillarRoots: number;
  hangingRoots: number;
  /** Where the pillar roots reach the ground (model space, before the landmark's scale). */
  pillarAt: { x: number; z: number }[];
}

export function buildGrandBanyan(seed = 'grand-banyan'): { geometry: THREE.BufferGeometry; stats: BanyanStats } {
  const r: Rand = rng(hashStr(seed));
  const b = new GeoBuilder();
  const bark0 = hex(0x4a3d33);
  const bark1 = hex(0x7a6a58);
  const moss = hex(0x5c8a3a);
  const barkFn = (t: number, th: number) => {
    const m = Math.max(0, 0.9 - t * 3.0) * (0.5 + 0.5 * Math.sin(th * 4 + t * 7));
    return mix(mix(bark0, bark1, 0.5 + 0.5 * Math.sin(th * 5 + t * 11)), moss, Math.min(0.55, m));
  };
  const rootCol = (t: number) => mix(hex(0x6e5238), hex(0x9a7c58), t);

  // ---- trunk complex ---------------------------------------------------------------------------
  const trunk: V3[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    trunk.push(V(Math.sin(t * 3) * 0.22, t * 4.0, Math.cos(t * 2.4) * 0.18));
  }
  b.tube(trunk, (t) => 1.25 * (1 - t) + 0.9 * t + 0.95 * Math.pow(1 - t, 5), 16, bark0, bark1, 0, { noise: r, rough: 0.16, colorFn: barkFn });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + r() * 0.5;
    const off = 0.95 + r() * 0.25;
    const path = bezier(V(Math.cos(a) * off, 0, Math.sin(a) * off), V(Math.cos(a) * off * 1.05, 1.2, Math.sin(a) * off * 1.05), V(Math.cos(a) * off * 1.25, 2.4, Math.sin(a) * off * 1.25), V(Math.cos(a) * off * 1.5, 3.4 + r() * 0.5, Math.sin(a) * off * 1.5), 8);
    b.tube(path, (t) => 0.62 * (1 - t * 0.5) + 0.3 * Math.pow(1 - t, 4), 10, bark0, bark1, 0, { noise: r, rough: 0.18, colorFn: barkFn });
  }
  // buttress and surface roots
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + r() * 0.35;
    const len = range(r, 3.2, 6.5);
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const wob = (r() - 0.5) * 1.4;
    const path = bezier(V(dx * 0.8, 0.9, dz * 0.8), V(dx * len * 0.35 - dz * wob * 0.3, 0.55, dz * len * 0.35 + dx * wob * 0.3), V(dx * len * 0.7 + dz * wob, 0.18, dz * len * 0.7 - dx * wob), V(dx * len, -0.08, dz * len), 9);
    b.tube(path, (t) => 0.5 * Math.pow(1 - t, 1.2) + 0.05, 8, bark0, bark1, 0, { noise: r, rough: 0.14, colorFn: (t, th) => mix(barkFn(t, th), moss, t * 0.35) });
  }

  // ---- limbs -------------------------------------------------------------------------------------
  const tips: V3[] = [];
  const limbPts: V3[] = [];
  const limb = (p0: V3, dir: V3, len: number, r0: number, depth: number) => {
    const up = depth === 0 ? 1.0 : depth === 1 ? 0.35 : 0.15;
    const p1 = V(p0.x + dir.x * len * 0.35, p0.y + up * 0.9, p0.z + dir.z * len * 0.35);
    const p2 = V(p0.x + dir.x * len * 0.7, p0.y + up * 1.15, p0.z + dir.z * len * 0.7);
    const p3 = V(p0.x + dir.x * len, p0.y + up * (depth === 0 ? 0.9 : 0.1) - (depth > 0 ? 0.25 : 0), p0.z + dir.z * len);
    const path = bezier(p0, p1, p2, p3, 8);
    b.tube(path, (t) => r0 * (1 - t) + r0 * 0.42 * t, depth === 0 ? 10 : 6, bark0, bark1, 0, { noise: r, rough: 0.12, colorFn: barkFn });
    for (let i = 3; i <= 8; i++) limbPts.push(path[i]!.clone());
    if (depth < 2) {
      const kids = depth === 0 ? 3 : 3;
      for (let k = 0; k < kids; k++) {
        const t = 0.42 + (k / kids) * 0.55;
        const at = path[Math.round(t * 8)]!;
        const a = Math.atan2(dir.z, dir.x) + (k % 2 ? 1 : -1) * range(r, 0.45, 0.95);
        limb(at, V(Math.cos(a), 0, Math.sin(a)), len * (depth === 0 ? 0.62 : 0.55), r0 * 0.5, depth + 1);
      }
      limb(path[8]!, V(dir.x, 0, dir.z).normalize(), len * 0.45, r0 * 0.42, depth + 1);
    } else {
      for (let i = 4; i <= 8; i += 2) tips.push(path[i]!.clone());
    }
  };
  const limbs = 8;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * TAU + r() * 0.3;
    const start = V(Math.cos(a) * 0.8, 3.2 + r() * 0.8, Math.sin(a) * 0.8);
    limb(start, V(Math.cos(a), 0, Math.sin(a)), range(r, 5.2, 6.8), 0.5 + r() * 0.12, 0);
  }

  // ---- canopy ------------------------------------------------------------------------------------
  const deep = hex(0x174a26);
  const lush = hex(0x4c9440);
  const fresh = hex(0xb7d65a);
  for (const t of tips) foliage(b, r, V(t.x, t.y + 0.1, t.z), 1.4, 44, 0.36, 0.19, deep, lush, { flat: 0.55, up: 0.3, yellow: fresh });
  // dense inner canopy, a flattened dome over the limbs
  const canopyR = 8.2;
  for (let i = 0; i < 7200; i++) {
    const a = r() * TAU;
    const rad = Math.sqrt(r()) * canopyR;
    const dome = Math.sqrt(Math.max(0, 1 - (rad / (canopyR * 1.08)) ** 2));
    const y = 5.0 + dome * (2.5 + r() * 1.5) - (1 - dome) * r() * 0.9;
    const p = V(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const d = V(Math.cos(a) * 0.5 + (r() - 0.5), 0.5 + r() * 0.5, Math.sin(a) * 0.5 + (r() - 0.5)).normalize();
    const lit = Math.min(1, (y - 4.5) / 3.5);
    b.leafLite(p, d, 0.36 * (0.8 + r() * 0.5), 0.19 * (0.8 + r() * 0.4), jitter(mix(deep, lush, lit * 0.5), r, 0.1), jitter(mix(lush, fresh, 0.15 + lit * 0.5 * r()), r, 0.1), 1, 0.12);
  }

  // ---- aerial roots ----------------------------------------------------------------------------------
  const high = limbPts.filter((p) => p.y > 3.8);
  let hanging = 0;
  for (let i = 0; i < 110 && high.length; i++) {
    const s = high[Math.floor(r() * high.length)]!;
    const grounded = r() < 0.4 && s.y < 7;
    const drop = grounded ? s.y + 0.05 : range(r, 1.4, Math.min(s.y - 0.4, 5.5));
    const drift = V((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6);
    const pts: V3[] = [];
    for (let k = 0; k <= 9; k++) {
      const t = k / 9;
      pts.push(V(s.x + drift.x * t + Math.sin(t * 5 + i) * 0.07, s.y - drop * t, s.z + drift.z * t + Math.cos(t * 4 + i * 0.7) * 0.07));
    }
    const base = grounded ? 0.045 : 0.026;
    b.tube(pts, (t) => (grounded ? base * (0.6 + 0.9 * t) : base * (1 - t * 0.6)), 4, hex(0x6e5238), hex(0x9a7c58), 0.25, { colorFn: (t) => rootCol(t) });
    hanging++;
  }
  // pillar roots: bundles of twisting strands that have thickened into secondary trunks
  let pillars = 0;
  const pillarPos: { x: number; z: number }[] = [];
  const pillarAt = [0.2, 0.9, 1.7, 2.5, 3.3, 4.1, 4.9, 5.7, 0.55, 3.9, 1.3, 5.2];
  pillarAt.forEach((a, i) => {
    const dist = 3.4 + (i % 4) * 1.35 + r() * 0.4;
    const x = Math.cos(a) * dist;
    const z = Math.sin(a) * dist;
    pillarPos.push({ x, z });
    const topY = 4.2 + r() * 1.4;
    for (let sI = 0; sI < 3; sI++) {
      const ph = (sI / 3) * TAU;
      const pts: V3[] = [];
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        const rho = 0.13 * (0.5 + t) * (1 - 0.35 * Math.sin(t * Math.PI));
        pts.push(V(x + Math.cos(ph + t * 9) * rho + Math.sin(t * 3 + i) * 0.1, topY * (1 - t), z + Math.sin(ph + t * 9) * rho + Math.cos(t * 2.6 + i) * 0.1));
      }
      b.tube(pts, (t) => 0.05 + 0.13 * Math.pow(t, 1.4), 6, hex(0x6e5238), hex(0x9a7c58), 0.1, { noise: r, rough: 0.12, colorFn: (t) => rootCol(t * 0.8) });
    }
    // flared foot
    for (let f = 0; f < 4; f++) {
      const a2 = (f / 4) * TAU + r();
      b.tube([V(x, 0.25, z), V(x + Math.cos(a2) * 0.35, 0.1, z + Math.sin(a2) * 0.35), V(x + Math.cos(a2) * 0.7, -0.02, z + Math.sin(a2) * 0.7)], (t) => 0.12 * (1 - t * 0.8), 5, hex(0x6e5238), hex(0x8a6c48));
    }
    pillars++;
  });
  // figs
  for (let i = 0; i < 140; i++) {
    const s = limbPts[Math.floor(r() * limbPts.length)]!;
    b.blob(V(s.x + (r() - 0.5) * 0.8, s.y - 0.1 - r() * 0.6, s.z + (r() - 0.5) * 0.8), 0.05, 0.05, 0.05, hex(0xd24a30), hex(0x8f2b20), 5, 3, 0.4);
  }

  const geometry = b.build();
  geometry.computeBoundingBox();
  return { geometry, stats: { triangles: b.triangleCount, height: geometry.boundingBox!.max.y, canopyRadius: canopyR, pillarRoots: pillars, hangingRoots: hanging, pillarAt: pillarPos } };
}
