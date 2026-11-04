// The twenty plants that complete the thirty-plant catalogue. Each is built
// from its own botanical parts: a lily's six recurved tepals on a leafy stalk,
// a tulip's closed cup over two broad basal leaves, a hydrangea's mophead of
// tiny florets, an anthurium's heart leaves with a waxy spathe and spadix, an
// aloe's toothed succulent rosette, and so on. Seven stages each: leaves and
// stems first, then buds, then more and fuller flowers.
import * as THREE from 'three';
import { GeoBuilder, PROFILE, V, V3, bezier, frame, hex, jitter, mix } from './geo';
import { Builder, PAL, mature, petalRing, stemPath, bud, compoundLeaf } from './plants';
import { Rand } from './rng';

const TAU = Math.PI * 2;
type C = THREE.Color;

const add = (a: V3, d: V3, s: number) => new THREE.Vector3().copy(a).addScaledVector(d, s);

/** A ring of leaves from the ground: the base of most herbaceous plants. */
function basal(b: GeoBuilder, r: Rand, n: number, len: number, wid: number, c0: C, c1: C, o: { rise?: number; droop?: number; profile?: number[][]; fold?: number; spread?: number } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.6;
    const rise = (o.rise ?? 1) * (0.6 + r() * 0.6);
    const d = V(Math.cos(a) * (o.spread ?? 1), rise, Math.sin(a) * (o.spread ?? 1)).normalize();
    b.blade({ p: V(Math.cos(a) * 0.01, 0.005, Math.sin(a) * 0.01), a: d, len: len * (0.75 + r() * 0.45), wid: wid * (0.85 + r() * 0.3), profile: o.profile ?? PROFILE.lance, fold: o.fold ?? 0.2, droop: o.droop ?? 0.25, c0: jitter(c0, r, 0.06), c1: jitter(c1, r, 0.06), fl: 1 });
  }
}

/** A stem from the ground with alternate leaves; returns its path. */
function leafyStem(b: GeoBuilder, r: Rand, h: number, lean: number, leaves: number, leafLen: number, leafWid: number, cStem: C, cl0: C, cl1: C, thick = 0.004, profile = PROFILE.lance): V3[] {
  const a = r() * TAU;
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const path = stemPath(V(dx * 0.01, 0, dz * 0.01), V(dx * lean, h, dz * lean), V(dx, 0, dz).multiplyScalar(lean * 0.4), 6);
  b.tube(path, (t) => thick * (1 - t * 0.5), 4, cStem, cStem);
  for (let j = 0; j < leaves; j++) {
    const q = path[Math.min(path.length - 2, 1 + Math.floor((j / Math.max(1, leaves)) * (path.length - 2)))]!;
    const la = a + j * 2.4;
    b.blade({ p: q, a: V(Math.cos(la), 0.35 + r() * 0.3, Math.sin(la)).normalize(), len: leafLen * (0.8 + r() * 0.4), wid: leafWid, profile, fold: 0.25, droop: 0.3, c0: jitter(cl0, r, 0.06), c1: jitter(cl1, r, 0.06), fl: 1 });
  }
  return path;
}

const tipOf = (p: V3[]) => p[p.length - 1]!;
const axisOf = (p: V3[]) => new THREE.Vector3().subVectors(p[p.length - 1]!, p[p.length - 2]!).normalize();

// ---- 1. Lily: six recurved, spotted tepals with long stamens ------------------------------------
function lily(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 1 + Math.round(k * 3);
  for (let s = 0; s < stems; s++) {
    const p = leafyStem(b, r, 0.35 + k * 0.5, 0.06, 8 + Math.round(k * 6), 0.11, 0.022, PAL.stem, PAL.leafDeep, PAL.leafMid, 0.005);
    const top = tipOf(p);
    const ax = axisOf(p);
    if (st < 3) continue;
    const flowers = st < 4 ? 0 : Math.min(4, 1 + Math.floor((st - 4) * 0.8));
    if (!flowers) bud(b, top, ax, 0.02, hex(0xf2b5c8), PAL.leafMid);
    for (let f = 0; f < flowers; f++) {
      const ang = f * 2.3 + r();
      const out = V(Math.cos(ang), 0.3, Math.sin(ang)).normalize();
      const c = add(top, out, 0.04 * (f ? 1 : 0));
      const fax = new THREE.Vector3().addScaledVector(out, 0.85).add(V(0, 0.4, 0)).normalize();
      petalRing(b, r, c, fax, { count: 6, tilt: 1.15, len: 0.075, wid: 0.03, off: 0.008, c0: hex(0xf7d6e2), c1: hex(0xe0507c), curl: 0.35, fold: 0.15, profile: PROFILE.pointed });
      for (let m = 0; m < 6; m++) {
        const ma = (m / 6) * TAU;
        const f2 = frame(fax);
        const d = new THREE.Vector3().copy(fax).addScaledVector(f2.s, Math.cos(ma) * 0.35).addScaledVector(f2.n, Math.sin(ma) * 0.35).normalize();
        const e = add(c, d, 0.05);
        b.tube([c, e], () => 0.0012, 3, hex(0xe8e0a0), hex(0xe8e0a0));
        b.blob(e, 0.004, 0.007, 0.004, hex(0x8a3a20), hex(0x6a2a10), 4, 3);
      }
    }
  }
}

// ---- 2. Dahlia: a layered pompon on a branching bush with pinnate leaves ------------------------
function dahlia(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 3 + Math.round(k * 6);
  for (let s = 0; s < stems; s++) {
    const p = leafyStem(b, r, 0.25 + k * 0.55 + r() * 0.1, 0.15 + k * 0.1, 3, 0.07, 0.035, hex(0x3d6a2c), PAL.leafDeep, PAL.leafMid, 0.006, PROFILE.oval);
    for (const q of [p[2]!, p[4]!]) compoundLeaf(b, r, q, V(r() - 0.5, 0.3, r() - 0.5).normalize(), 0.05 + k * 0.02, PAL.leafDeep, PAL.leafMid);
    if (st < 3) continue;
    if (st === 3 || r() < 0.2) { bud(b, tipOf(p), axisOf(p), 0.02, hex(0xc0304a), PAL.leafMid); continue; }
    const c = tipOf(p);
    const ax = V(0, 1, 0).lerp(axisOf(p), 0.4).normalize();
    const R = 0.05 + k * 0.035;
    const col = [hex(0xd8344a), hex(0xf06a3a), hex(0xb02a6a)][s % 3]!;
    for (let ring = 0; ring < 5; ring++) {
      petalRing(b, r, c, ax, { count: 10 + ring * 2, tilt: 1.45 - ring * 0.28, len: R * (1 - ring * 0.13), wid: R * 0.38, off: R * 0.05, c0: mix(col, hex(0x4a0a1a), ring * 0.12), c1: col, curl: 0.4, fold: 0.6, rot: ring * 0.4, lite: ring > 2 });
    }
  }
}

// ---- 3. Chrysanthemum: many thin quilled rays, dense mound -----------------------------------
function chrysanthemum(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 5 + Math.round(k * 12);
  const R = 0.12 + k * 0.16;
  for (let s = 0; s < stems; s++) {
    const p = leafyStem(b, r, R * (1.1 + r() * 0.6), R * 0.8 * r(), 5, 0.05, 0.03, hex(0x456a35), hex(0x3a5e32), hex(0x6f8f5a), 0.0035, PROFILE.oval);
    if (st < 4) continue;
    const c = tipOf(p);
    const ax = V(0, 1, 0);
    const col = [hex(0xf3c63a), hex(0xf4f0e0), hex(0xd97a2a)][s % 3]!;
    const Rf = 0.028 + k * 0.014;
    petalRing(b, r, c, ax, { count: 22, tilt: 1.35, len: Rf, wid: Rf * 0.16, off: 0.004, c0: col, c1: col, lite: true });
    petalRing(b, r, c, ax, { count: 16, tilt: 0.8, len: Rf * 0.8, wid: Rf * 0.15, off: 0.002, c0: col, c1: col, lite: true, rot: 0.3 });
    b.blob(c, Rf * 0.25, Rf * 0.18, Rf * 0.25, mix(col, hex(0x7a5a10), 0.4), col, 5, 3);
  }
}

// ---- 4. Tulip: a closed six-tepal cup over two broad glaucous leaves -----------------------
function tulip(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const bulbs = 1 + Math.round(k * 6);
  for (let i = 0; i < bulbs; i++) {
    const a = r() * TAU;
    const o = V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(i ? 0.05 + r() * 0.12 * (1 + k) : 0);
    for (let l = 0; l < 2; l++) {
      const la = a + l * Math.PI + r() * 0.5;
      b.blade({ p: o, a: V(Math.cos(la) * 0.45, 1, Math.sin(la) * 0.45).normalize(), len: 0.12 + k * 0.08, wid: 0.04, profile: PROFILE.strap, fold: 0.45, droop: 0.15, c0: hex(0x5f8a6a), c1: hex(0x8fb592), fl: 1 });
    }
    if (st < 2) continue;
    const h = 0.12 + k * 0.28;
    const path = stemPath(o, add(o, V(0, 1, 0), h), V(0.02, 0, 0), 5);
    b.tube(path, () => 0.0045, 4, hex(0x6a9a5a), hex(0x6a9a5a));
    const c = tipOf(path);
    if (st < 4) { bud(b, c, V(0, 1, 0), 0.016, hex(0x9ac080), PAL.leafMid); continue; }
    const col = [hex(0xe0283a), hex(0xf4c030), hex(0xf27aa0), hex(0xf6f0e8)][i % 4]!;
    const open = 0.18 + (st - 4) * 0.08;
    petalRing(b, r, c, V(0, 1, 0), { count: 3, tilt: open, len: 0.075, wid: 0.06, off: 0.008, c0: mix(col, hex(0x2a4a20), 0.2), c1: col, curl: 0.5, fold: 0.6, profile: PROFILE.oval });
    petalRing(b, r, c, V(0, 1, 0), { count: 3, tilt: open * 0.8, len: 0.072, wid: 0.056, off: 0.006, c0: col, c1: col, curl: 0.5, fold: 0.6, profile: PROFILE.oval, rot: 1.05 });
  }
}

// ---- 5. Petunia: sprawling sticky stems, open five-lobed funnels ------------------------------
function petunia(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const n = 6 + Math.round(k * 12);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r();
    const L = 0.08 + k * 0.2;
    const path = stemPath(V(0, 0.01, 0), V(Math.cos(a) * L, 0.05 + r() * 0.06 + k * 0.04, Math.sin(a) * L), V(0, 0.06, 0), 5);
    b.tube(path, () => 0.003, 4, PAL.stem, PAL.stem);
    for (const q of path.slice(1)) b.leafLite(q, V(Math.cos(a + r()), 0.4, Math.sin(a + r())).normalize(), 0.035, 0.022, PAL.leafMid, PAL.leafBright, 1, 0.15);
    if (st < 3 || r() > 0.2 + k * 0.8) continue;
    const c = add(tipOf(path), V(0, 1, 0), 0.01);
    const col = [hex(0x8a2aa8), hex(0xe04a8a), hex(0xf6eef6)][i % 3]!;
    b.fan(c, V(Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4).normalize(), V(0, 0, 1), (th) => 0.028 * (0.85 + 0.15 * Math.cos(th * 5)), mix(col, hex(0xf8e8a0), 0.5), col, { segs: 20, rings: 4, cup: 0.6, fl: 0.6 });
  }
}

// ---- 6. Bougainvillea: a woody, thorny climber with masses of papery magenta bracts -----------
function bougainvillea(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const canes = 2 + Math.round(k * 6);
  const H = 0.3 + k * 1.1;
  for (let i = 0; i < canes; i++) {
    const a = r() * TAU;
    const end = V(Math.cos(a) * H * 0.55, H * (0.7 + r() * 0.4), Math.sin(a) * H * 0.55);
    const path = bezier(V(0, 0, 0), V(end.x * 0.1, end.y * 0.5, end.z * 0.1), V(end.x * 0.7, end.y * 1.1, end.z * 0.7), end, 9);
    b.tube(path, (t) => 0.012 * (1 - t * 0.7) * (0.6 + k * 0.6), 5, hex(0x6a5038), hex(0x8a6a48));
    for (let j = 2; j < path.length; j++) {
      const q = path[j]!;
      for (let l = 0; l < 2; l++) b.leafLite(q, V(r() - 0.5, 0.2 + r() * 0.4, r() - 0.5).normalize(), 0.04, 0.026, PAL.leafDeep, PAL.leafMid, 1, 0.12);
      if (st < 4 || r() > 0.4 + k * 0.5) continue;
      for (let c = 0; c < 2 + Math.round(k * 3); c++) {
        const p = add(q, V(r() - 0.5, r() * 0.6, r() - 0.5).normalize(), 0.04);
        petalRing(b, r, p, V(r() - 0.5, 1, r() - 0.5).normalize(), { count: 3, tilt: 0.7, len: 0.026, wid: 0.022, off: 0.002, c0: hex(0xb01e78), c1: hex(0xe0409a), lite: true });
      }
    }
  }
}

// ---- 7. Gerbera: a flat daisy on a bare scape above a rosette of lobed leaves ---------------
function gerbera(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  basal(b, r, 6 + Math.round(k * 8), 0.09 + k * 0.06, 0.04, hex(0x3a6a30), hex(0x6a9a4a), { rise: 0.45, droop: 0.4, profile: PROFILE.oval });
  if (st < 3) return;
  const scapes = st < 4 ? 1 : 1 + Math.round(k * 4);
  for (let i = 0; i < scapes; i++) {
    const a = r() * TAU;
    const path = stemPath(V(0, 0, 0), V(Math.cos(a) * 0.05, 0.18 + k * 0.16 + r() * 0.05, Math.sin(a) * 0.05), V(0.01, 0, 0), 5);
    b.tube(path, () => 0.003, 4, hex(0x5a7a40), hex(0x5a7a40));
    const c = tipOf(path);
    if (st < 4) { bud(b, c, V(0, 1, 0), 0.014, hex(0xe86a40), PAL.leafMid); continue; }
    const col = [hex(0xf2602a), hex(0xf4d030), hex(0xe8366a), hex(0xf6a0b0)][i % 4]!;
    const ax = V(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize();
    petalRing(b, r, c, ax, { count: 20, tilt: 1.5, len: 0.045, wid: 0.009, off: 0.012, c0: col, c1: col, lite: true });
    petalRing(b, r, c, ax, { count: 14, tilt: 1.3, len: 0.03, wid: 0.007, off: 0.008, c0: col, c1: col, lite: true, rot: 0.2 });
    b.blob(c, 0.013, 0.006, 0.013, hex(0x3a2a10), hex(0x6a5a20), 6, 3);
  }
}

// ---- 8. Carnation: grey-green grassy leaves, swollen nodes, ruffled fringed heads -----------
function carnation(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  basal(b, r, 10 + Math.round(k * 14), 0.07 + k * 0.04, 0.008, hex(0x6a8a80), hex(0x9ab4aa), { rise: 0.9, droop: 0.2 });
  const stems = st < 3 ? 0 : 1 + Math.round(k * 6);
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, 0.18 + k * 0.2, 0.05, 4, 0.04, 0.006, hex(0x7a9a8a), hex(0x6a8a80), hex(0x9ab4aa), 0.0025);
    for (const q of p.slice(1, -1)) b.blob(q, 0.004, 0.005, 0.004, hex(0x7a9a8a), hex(0x7a9a8a), 4, 3);
    if (st < 4) { bud(b, tipOf(p), V(0, 1, 0), 0.012, hex(0x8aa898), hex(0x6a8a7a)); continue; }
    const c = tipOf(p);
    const col = [hex(0xd8204a), hex(0xf29ab4), hex(0xf8f2ea)][i % 3]!;
    b.blob(add(c, V(0, -1, 0), 0.008), 0.007, 0.014, 0.007, hex(0x7a9a8a), hex(0x6a8a7a), 5, 3);
    for (let ring = 0; ring < 4; ring++) petalRing(b, r, c, V(0, 1, 0), { count: 8, tilt: 1.3 - ring * 0.3, len: 0.024, wid: 0.016, off: 0.002, c0: col, c1: mix(col, hex(0xffffff), 0.15), curl: 0.3, fold: 0.7, rot: ring * 0.5, profile: PROFILE.petal });
  }
}

// ---- 9. Peony: a shrubby herb with deeply cut leaves and huge, many-petalled globes ---------
function peony(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 3 + Math.round(k * 8);
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, 0.2 + k * 0.45, 0.1 + k * 0.08, 0, 0, 0, hex(0x6a3a3a), PAL.leafDeep, PAL.leafMid, 0.005);
    for (const q of [p[2]!, p[3]!, p[4]!]) compoundLeaf(b, r, q, V(r() - 0.5, 0.2, r() - 0.5).normalize(), 0.06 + k * 0.03, hex(0x2a5a2a), hex(0x5a8a40));
    if (st < 4) continue;
    if (st === 4 && r() < 0.6) { b.blob(tipOf(p), 0.018, 0.02, 0.018, hex(0xe06a8a), hex(0x5a7a40), 6, 4); continue; }
    const c = tipOf(p);
    const R = 0.05 + k * 0.03;
    const col = [hex(0xf0a0b8), hex(0xf8eef0), hex(0xc0305a)][i % 3]!;
    for (let ring = 0; ring < 6; ring++) petalRing(b, r, c, V(0, 1, 0), { count: 6 + ring, tilt: 1.2 - ring * 0.18, len: R * (1 - ring * 0.08), wid: R * 0.9, off: R * 0.05, c0: mix(col, hex(0xffffff), 0.1 * ring), c1: col, curl: 0.45, fold: 0.5, rot: ring * 0.7, profile: PROFILE.oval });
  }
}

// ---- 10. Hydrangea: woody shrub with big serrated leaves and mophead balls of florets -------
function hydrangea(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 3 + Math.round(k * 9);
  const H = 0.22 + k * 0.6;
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, H * (0.8 + r() * 0.3), H * 0.6 * r(), 4, 0.09 + k * 0.03, 0.06, hex(0x5a6a3a), hex(0x2f6a32), hex(0x5f9a45), 0.006, PROFILE.oval);
    if (st < 4) continue;
    const c = add(tipOf(p), V(0, 1, 0), 0.03);
    const R = 0.05 + k * 0.05;
    const col = [hex(0x6a8ae0), hex(0xc070c8), hex(0xf2a0c0), hex(0xf4f0f4)][i % 4]!;
    const florets = Math.round(30 + k * 50) * (b.detail > 0.5 ? 1 : 0.5);
    for (let f = 0; f < florets; f++) {
      const u = r() * 2 - 1;
      const th = r() * TAU;
      const s = Math.sqrt(1 - u * u);
      const d = V(Math.cos(th) * s, Math.abs(u) * 0.9 + 0.1, Math.sin(th) * s).normalize();
      petalRing(b, r, add(c, d, R), d, { count: 4, tilt: 1.4, len: R * 0.22, wid: R * 0.2, off: 0.001, c0: jitter(col, r, 0.08), c1: mix(col, hex(0xffffff), 0.25), lite: true });
    }
  }
}

// ---- 11. Calathea: upright painted leaves on long petioles, purple undersides -----------------
function calathea(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const n = 4 + Math.round(k * 12);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.4;
    const h = 0.1 + k * 0.3 * (0.7 + r() * 0.4);
    const tip = V(Math.cos(a) * h * 0.35, h, Math.sin(a) * h * 0.35);
    const path = stemPath(V(0, 0, 0), tip, V(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.05), 5);
    b.tube(path, () => 0.003, 3, hex(0x6a3a5a), hex(0x4a6a3a));
    const d = V(Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8).normalize();
    const L = 0.09 + k * 0.07;
    b.blade({ p: tip, a: d, len: L, wid: L * 0.5, profile: PROFILE.oval, fold: 0.15, droop: 0.12, c0: hex(0x1f4a2a), c1: hex(0x8ab870), fl: 1 });
    // feathered stripes: a paler herringbone overlay along the midrib
    for (let s = 1; s < 5; s++) {
      const q = add(tip, d, L * s * 0.18);
      b.leafLite(add(q, V(0, 1, 0), 0.002), d, L * 0.15, L * 0.08, hex(0xb8d8a0), hex(0xd0e8b8), 1, 0);
    }
  }
}

// ---- 12. Anthurium: glossy heart leaves, a waxy red spathe and an upright spadix ----------------
function anthurium(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const n = 3 + Math.round(k * 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.5;
    const h = 0.12 + k * 0.25;
    const tip = V(Math.cos(a) * h * 0.4, h, Math.sin(a) * h * 0.4);
    b.tube(stemPath(V(0, 0, 0), tip, V(0, 0.02, 0), 4), () => 0.003, 3, PAL.stem, PAL.stem);
    b.blade({ p: tip, a: V(Math.cos(a), -0.4, Math.sin(a)).normalize(), len: 0.09 + k * 0.05, wid: 0.07 + k * 0.03, profile: PROFILE.heart, fold: 0.2, droop: 0.1, c0: hex(0x0f3f22), c1: hex(0x2f7a3a), fl: 1 });
  }
  const flowers = st < 3 ? 0 : Math.round(1 + k * 4);
  for (let i = 0; i < flowers; i++) {
    const a = r() * TAU;
    const tip = V(Math.cos(a) * 0.06, 0.18 + k * 0.22, Math.sin(a) * 0.06);
    b.tube(stemPath(V(0, 0, 0), tip, V(0, 0.02, 0), 4), () => 0.0025, 3, PAL.stem, PAL.stem);
    const face = V(Math.cos(a), 0.6, Math.sin(a)).normalize();
    b.blade({ p: tip, a: face, len: 0.06, wid: 0.05, profile: PROFILE.heart, fold: -0.1, curl: 0.1, c0: hex(0xb0101e), c1: hex(0xe8203a), fl: 0.6 });
    const sp = bezier(tip, add(tip, V(0, 1, 0), 0.015), add(tip, face, 0.02).add(V(0, 0.03, 0)), add(tip, face, 0.025).add(V(0, 0.05, 0)), 4);
    b.tube(sp, (t) => 0.004 * (1 - t * 0.5), 5, hex(0xf2e070), hex(0xe8c040));
  }
}

// ---- 13. Peace lily: dark lanceolate leaves arching from the base, white hooded spathes ------
function peaceLily(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  basal(b, r, 6 + Math.round(k * 14), 0.14 + k * 0.14, 0.05, hex(0x0f3a1f), hex(0x2a6a35), { rise: 1.2, droop: 0.4, profile: PROFILE.lance, fold: 0.35 });
  const flowers = st < 4 ? 0 : 1 + Math.round(k * 5);
  for (let i = 0; i < flowers; i++) {
    const a = r() * TAU;
    const tip = V(Math.cos(a) * 0.05, 0.24 + k * 0.18, Math.sin(a) * 0.05);
    b.tube(stemPath(V(0, 0, 0), tip, V(0, 0.02, 0), 5), () => 0.0025, 3, PAL.stem, PAL.stem);
    b.blade({ p: tip, a: V(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize(), len: 0.07, wid: 0.04, profile: PROFILE.pointed, fold: 0.6, curl: 0.15, c0: hex(0xe8eee0), c1: hex(0xfafaf6), fl: 0.6 });
    b.tube([tip, add(tip, V(0, 1, 0), 0.035)], () => 0.004, 4, hex(0xf0e8b0), hex(0xe8dc90));
  }
}

// ---- 14. Areca palm: clumping ringed golden canes with arching feather fronds ----------------
function arecaPalm(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const canes = 2 + Math.round(k * 7);
  for (let i = 0; i < canes; i++) {
    const a = r() * TAU;
    const H = (0.2 + k * 1.1) * (0.6 + r() * 0.5);
    const lean = 0.04 + r() * 0.12;
    const top = V(Math.cos(a) * lean * H, H, Math.sin(a) * lean * H);
    const cane = stemPath(V(Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02), top, V(0, 0, 0), 6);
    b.tube(cane, () => 0.008 + k * 0.006, 5, hex(0x9a9a40), hex(0x6a8a3a), 0, { colorFn: (t) => (Math.floor(t * 14) % 2 ? hex(0x8a9040) : hex(0x6a7a34)) });
    const fronds = 3 + Math.round(k * 4);
    for (let f = 0; f < fronds; f++) {
      const fa = a + f * 2.2 + r();
      const L = 0.2 + k * 0.45;
      const end = add(top, V(Math.cos(fa), -0.4, Math.sin(fa)).normalize(), L);
      const rach = bezier(top, add(top, V(Math.cos(fa) * 0.3, 1, Math.sin(fa) * 0.3).normalize(), L * 0.35), add(top, V(Math.cos(fa), 0.4, Math.sin(fa)).normalize(), L * 0.75), end, 7);
      b.tube(rach, (t) => 0.003 * (1 - t * 0.6), 3, hex(0x8a9a40), hex(0x6a8a3a));
      const side = V(-Math.sin(fa), 0, Math.cos(fa));
      for (let j = 1; j < rach.length; j++) for (const sg of [-1, 1]) b.leafLite(rach[j]!, add(new THREE.Vector3().copy(side).multiplyScalar(sg), V(0, -0.3, 0), 1).normalize(), L * 0.22 * (1 - j / 9), 0.008, hex(0x4a8a30), hex(0x8abf4a), 1, 0.3);
    }
  }
}

// ---- 15. Snake plant: stiff upright sword leaves with dark bands and yellow margins ---------
function snakePlant(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const n = 3 + Math.round(k * 12);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    const d = V(Math.cos(a) * 0.12, 1, Math.sin(a) * 0.12).normalize();
    const L = (0.12 + k * 0.5) * (0.6 + r() * 0.5);
    const p = V(Math.cos(a) * 0.04 * r(), 0, Math.sin(a) * 0.04 * r());
    b.blade({ p, a: d, len: L, wid: 0.04 + k * 0.012, profile: PROFILE.pointed, fold: 0.5, droop: 0.02, c0: hex(0x1f4a2a), c1: hex(0x5a8a4a), fl: 0.3 });
    // dark crossbands and a gold edge
    for (let s = 1; s < 6; s++) b.leafLite(add(add(p, d, L * s * 0.15), V(Math.cos(a + 1.57), 0, Math.sin(a + 1.57)), 0.004), V(Math.cos(a + 1.57), 0.1, Math.sin(a + 1.57)), 0.03, 0.006, hex(0x10301a), hex(0x183a20), 0.3, 0);
    b.tube([p, add(p, d, L * 0.85)], () => 0.0018, 3, hex(0xd8c850), hex(0xc8b840));
  }
}

// ---- 16. Croton: a woody stem and leathery leaves splashed with red, orange and yellow --------
function croton(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 1 + Math.round(k * 3);
  const cols = [hex(0xd83a1a), hex(0xf0a020), hex(0xe8d030), hex(0x2f6a2a), hex(0x8a1a2a)];
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, 0.15 + k * 0.45, 0.05, 0, 0, 0, hex(0x6a5038), PAL.leafDeep, PAL.leafMid, 0.007);
    for (let j = 2; j < p.length; j++) {
      for (let l = 0; l < 3; l++) {
        const a = j * 2.4 + l * 2.1;
        const c0 = cols[Math.floor(r() * cols.length)]!;
        const c1 = cols[Math.floor(r() * cols.length)]!;
        b.blade({ p: p[j]!, a: V(Math.cos(a), 0.2 + r() * 0.4, Math.sin(a)).normalize(), len: 0.08 + k * 0.05, wid: 0.03 + k * 0.01, profile: PROFILE.lance, fold: 0.25, droop: 0.25, c0, c1, fl: 1 });
      }
    }
  }
}

// ---- 17. Tulsi: a bushy, purple-stemmed herb with small aromatic leaves and flower spikes -----
function tulsi(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 3 + Math.round(k * 9);
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, 0.12 + k * 0.35, 0.08 + k * 0.1, 0, 0, 0, hex(0x5a2a4a), PAL.leafMid, PAL.leafBright, 0.003);
    for (const q of p.slice(1)) for (const sg of [-1, 1]) b.leafLite(q, V(sg * (r() + 0.2), 0.4, sg * (r() - 0.5)).normalize(), 0.03, 0.018, hex(0x3a6a2a), hex(0x6a9a40), 1, 0.1);
    if (st < 4) continue;
    const top = tipOf(p);
    const sp = [top, add(top, V(0, 1, 0), 0.04 + k * 0.03)];
    b.tube(sp, (t) => 0.003 * (1 - t * 0.5), 4, hex(0x8a4a8a), hex(0xb07ab0), 0.5);
  }
}

// ---- 18. Aloe vera: a rosette of thick, spotted, toothed succulent leaves -----------------------
function aloeVera(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const n = 5 + Math.round(k * 12);
  for (let i = 0; i < n; i++) {
    const a = i * 2.4;
    const rise = 1.6 - (i / n) * 1.0;
    const d = V(Math.cos(a), rise, Math.sin(a)).normalize();
    const L = 0.08 + k * 0.22 * (0.6 + (i / n) * 0.6);
    const path = bezier(V(0, 0, 0), add(V(0, 0, 0), d, L * 0.3), add(V(0, 0, 0), d, L * 0.7).add(V(0, -L * 0.05, 0)), add(V(0, 0, 0), d, L).add(V(0, -L * 0.12, 0)), 6);
    b.tube(path, (t) => (0.03 + k * 0.012) * (1 - t * 0.9), 5, hex(0x5a8a6a), hex(0x8ab098), 0.1, { colorFn: (t, th) => (Math.sin(th * 7 + t * 23) > 0.85 ? hex(0xc8dcc8) : mix(hex(0x507a5a), hex(0x8aaa90), t)) });
  }
  if (st >= 6) {
    const sp = stemPath(V(0, 0, 0), V(0.02, 0.35 + k * 0.2, 0), V(0, 0, 0), 6);
    b.tube(sp, () => 0.004, 4, hex(0x7a8a5a), hex(0x7a8a5a));
    for (let j = 3; j < sp.length; j++) b.leafLite(sp[j]!, V(r() - 0.5, -0.6, r() - 0.5).normalize(), 0.03, 0.006, hex(0xe87a30), hex(0xf2b040), 0.5, 0);
  }
}

// ---- 19. Mint: square creeping stems with paired, wrinkled, serrated leaves -------------------
function mint(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 4 + Math.round(k * 14);
  for (let i = 0; i < stems; i++) {
    const a = r() * TAU;
    const L = 0.06 + k * 0.16 * r();
    const h = 0.05 + k * 0.14 * (0.4 + r() * 0.6);
    const path = stemPath(V(Math.cos(a) * L, 0, Math.sin(a) * L), V(Math.cos(a) * L * 1.2, h, Math.sin(a) * L * 1.2), V(0, 0, 0), 5);
    b.tube(path, () => 0.0025, 4, hex(0x4a7a3a), hex(0x5a8a4a));
    for (let j = 1; j < path.length; j++) {
      const la = j * 1.57;
      for (const sg of [-1, 1]) b.blade({ p: path[j]!, a: V(sg * Math.cos(la), 0.3, sg * Math.sin(la)).normalize(), len: 0.028, wid: 0.02, profile: PROFILE.oval, fold: 0.35, droop: 0.2, c0: hex(0x3a8a3a), c1: hex(0x7ac85a), fl: 1 });
    }
  }
}

// ---- 20. Rosemary: woody upright stems densely set with needle leaves and pale blue flowers -----
function rosemary(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 4 + Math.round(k * 12);
  for (let i = 0; i < stems; i++) {
    const p = leafyStem(b, r, 0.12 + k * 0.4 * (0.7 + r() * 0.3), 0.05 + k * 0.08, 0, 0, 0, hex(0x6a5a40), PAL.leafGrey, PAL.leafGrey, 0.004);
    for (let j = 1; j < p.length; j++) {
      for (let n = 0; n < 6; n++) {
        const a = n * 1.05 + j;
        b.leafLite(p[j]!, V(Math.cos(a), 0.6, Math.sin(a)).normalize(), 0.022, 0.003, hex(0x3a5a40), hex(0x7a9a80), 1, 0.05);
      }
      if (st >= 5 && r() < 0.3) b.blob(add(p[j]!, V(r() - 0.5, 0.5, r() - 0.5).normalize(), 0.012), 0.005, 0.004, 0.005, hex(0xa0b8e8), hex(0x7a90c8), 4, 3);
    }
  }
}

// ---- The wilted sapling an abandoned session leaves: a bent dry stem and curled brown leaves -----
function wilted(b: GeoBuilder, r: Rand) {
  const path = bezier(V(0, 0, 0), V(0.01, 0.08, 0), V(0.05, 0.14, 0.01), V(0.11, 0.1, 0.02), 6);
  b.tube(path, (t) => 0.006 * (1 - t * 0.6), 4, hex(0x6a5236), hex(0x8a7048));
  for (let i = 1; i < path.length; i++) b.blade({ p: path[i]!, a: V(r() - 0.5, -0.6, r() - 0.5).normalize(), len: 0.045, wid: 0.02, profile: PROFILE.oval, fold: 0.6, droop: 0.6, c0: hex(0x6a5030), c1: hex(0xa08050), fl: 0.6 });
  b.blob(V(0, 0.005, 0), 0.06, 0.012, 0.06, hex(0x5a4430), hex(0x4a3828), 8, 3);
}

export const PLANT_BUILDERS_2: Record<string, Builder> = {
  wilted_sapling: wilted,
  lily, dahlia, chrysanthemum, tulip, petunia, bougainvillea, gerbera, carnation, peony, hydrangea,
  calathea, anthurium, peace_lily: peaceLily, areca_palm: arecaPalm, snake_plant: snakePlant, croton, tulsi, aloe_vera: aloeVera, mint, rosemary,
};
