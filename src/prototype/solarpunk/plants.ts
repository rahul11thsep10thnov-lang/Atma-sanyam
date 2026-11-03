// The ten prototype plants, each built from real botanical parts (stems,
// compound leaves, layered petals) and each different at all seven growth
// stages: more stems and leaves first, then buds, then more and more open
// flowers. A stage is a separately generated shape, not a scaled copy.
import * as THREE from 'three';
import { GeoBuilder, PROFILE, V, V3, UP, bezier, frame, hex, jitter, mix, tint } from './geo';
import { Rand, range } from './rng';

export const PAL = {
  leafDeep: hex(0x1f5a2e),
  leafMid: hex(0x3f8c3a),
  leafBright: hex(0x7cc24a),
  leafYellow: hex(0xb3d45a),
  leafGrey: hex(0x7f9d7c),
  leafGlossy: hex(0x1b5b33),
  stem: hex(0x4a8a3a),
  stemDark: hex(0x2f5a2a),
  woody: hex(0x6a4a30),
  bark: hex(0x6a4c36),
  barkDark: hex(0x3e2d22),
  barkPale: hex(0xa59a88),
  moss: hex(0x5f8f3c),
  white: hex(0xfaf6ee),
  cream: hex(0xf4ecd2),
};

export type Builder = (b: GeoBuilder, r: Rand, stage: number) => void;

/** 0 at stage 1 … 1 at stage 7. */
export const mature = (stage: number) => (stage - 1) / 6;

const TAU = Math.PI * 2;

/** A cubic stem from base to tip with a sideways arch. */
function stemPath(base: V3, tip: V3, arch: V3, n = 7): V3[] {
  const d = new THREE.Vector3().subVectors(tip, base);
  const c1 = new THREE.Vector3().copy(base).addScaledVector(d, 0.35).addScaledVector(arch, 0.2);
  const c2 = new THREE.Vector3().copy(base).addScaledVector(d, 0.72).addScaledVector(arch, 0.75);
  return bezier(base, c1, c2, tip, n);
}

/** Petals arranged round an axis: the building block of every flower. */
export function petalRing(
  b: GeoBuilder,
  r: Rand,
  center: V3,
  axis: V3,
  o: { count: number; tilt: number; len: number; wid: number; off: number; c0: THREE.Color; c1: THREE.Color; curl?: number; fold?: number; rot?: number; profile?: number[][]; lite?: boolean; vary?: number },
): void {
  const f = frame(axis);
  for (let i = 0; i < o.count; i++) {
    const th = (o.rot ?? 0) + (i / o.count) * TAU + (r() - 0.5) * 0.2;
    const radial = new THREE.Vector3().addScaledVector(f.s, Math.cos(th)).addScaledVector(f.n, Math.sin(th));
    const tilt = o.tilt + (r() - 0.5) * 0.18;
    const dir = new THREE.Vector3().addScaledVector(axis, Math.cos(tilt)).addScaledVector(radial, Math.sin(tilt)).normalize();
    const p = new THREE.Vector3().copy(center).addScaledVector(radial, o.off);
    const len = o.len * (1 + (r() - 0.5) * (o.vary ?? 0.12));
    const c0 = jitter(o.c0, r, 0.06);
    const c1 = jitter(o.c1, r, 0.06);
    if (o.lite) b.leafLite(p, dir, len, o.wid, c0, c1, 0.7, 0.04);
    else b.blade({ p, a: dir, up: axis, len, wid: o.wid, profile: o.profile ?? PROFILE.petal, curl: o.curl ?? -0.1, fold: o.fold ?? 0.25, c0, c1, fl: 0.8 });
  }
}

function compoundLeaf(b: GeoBuilder, r: Rand, p: V3, dir: V3, size: number, c0: THREE.Color, c1: THREE.Color) {
  const f = frame(dir);
  const leaflet = (at: V3, d: V3, s: number) => b.leafLite(at, d.clone().normalize(), s, s * 0.55, jitter(c0, r, 0.1), jitter(c1, r, 0.1), 1, 0.1);
  for (let i = 0; i < 2; i++) {
    const along = new THREE.Vector3().copy(p).addScaledVector(dir, size * (0.5 + i * 0.55));
    for (const sgn of [-1, 1]) leaflet(along, new THREE.Vector3().copy(dir).addScaledVector(f.s, sgn * 0.95).addScaledVector(f.n, 0.12), size * (0.78 - i * 0.08));
  }
  leaflet(new THREE.Vector3().copy(p).addScaledVector(dir, size * 1.5), dir, size * 0.9);
}

// ---- 1. Rose --------------------------------------------------------------------------------

function roseBloom(b: GeoBuilder, r: Rand, c: V3, axis: V3, R: number) {
  const deep = hex(0x8a0f24);
  const red = hex(0xd02538);
  const light = hex(0xe85a6b);
  petalRing(b, r, c, axis, { count: 5, tilt: 1.1, len: R, wid: R * 1.18, off: R * 0.14, c0: red, c1: light, curl: -0.22, fold: 0.32 });
  petalRing(b, r, c, axis, { count: 5, tilt: 0.75, len: R * 0.86, wid: R * 1.0, off: R * 0.08, c0: deep, c1: red, curl: -0.05, fold: 0.42, rot: 0.6 });
  petalRing(b, r, c, axis, { count: 4, tilt: 0.42, len: R * 0.64, wid: R * 0.82, off: R * 0.035, c0: hex(0x6b0a1c), c1: deep, curl: 0.2, fold: 0.5, rot: 1.1 });
  b.blob(new THREE.Vector3().copy(c).addScaledVector(axis, R * 0.18), R * 0.2, R * 0.26, R * 0.2, deep, hex(0x5a0816), 6, 4, 0.5);
}

function bud(b: GeoBuilder, c: V3, axis: V3, R: number, cTop: THREE.Color, cBottom: THREE.Color) {
  const tip = new THREE.Vector3().copy(c).addScaledVector(axis, R * 0.9);
  b.blob(tip, R * 0.55, R, R * 0.55, cTop, cBottom, 7, 4, 0.5);
  petalRing(b, () => 0.5, c, axis, { count: 3, tilt: 0.25, len: R * 1.7, wid: R * 0.4, off: R * 0.1, c0: PAL.leafDeep, c1: PAL.leafMid, lite: true, curl: 0.1 });
}

function rose(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const canes = 2 + Math.round(k * 7);
  const H = 0.3 + k * 0.95;
  const blooms = st >= 3 ? Math.round(1 + (k - 0.33) * 12) : 0;
  let made = 0;
  for (let i = 0; i < canes; i++) {
    const ang = r() * TAU;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const lean = (0.1 + r() * 0.38) * (0.5 + k);
    const hh = H * (0.72 + r() * 0.32);
    const path = stemPath(V(dx * 0.03, 0, dz * 0.03), V(dx * lean, hh, dz * lean), V(dx, 0.1, dz).multiplyScalar(0.12 + k * 0.1));
    b.tube(path, (t) => 0.0115 * (1 - t * 0.55) * (0.8 + k * 0.5), 5, PAL.woody, PAL.stem);
    const nodes = 3 + Math.round(k * 5);
    for (let j = 0; j < nodes; j++) {
      const q = path[Math.min(path.length - 1, 1 + Math.round(((j + 0.6) / (nodes + 0.5)) * (path.length - 2)))]!;
      const out = V(dx + (r() - 0.5) * 1.2, 0.35 + r() * 0.3, dz + (r() - 0.5) * 1.2).normalize();
      compoundLeaf(b, r, q, out, 0.062 + k * 0.034, PAL.leafGlossy, hex(0x3d8a3a));
    }
    const top = path[path.length - 1]!;
    const axis = V(dx * 0.35, 1, dz * 0.35).normalize();
    if (st === 2 && i < 2) bud(b, top, axis, 0.022, hex(0xb4263a), PAL.leafMid);
    else if (st >= 3 && made < blooms) {
      made++;
      if (r() < 0.22 && st < 7) bud(b, top, axis, 0.026, hex(0xb4263a), PAL.leafMid);
      else roseBloom(b, r, top, axis, 0.046 + k * 0.028);
    }
  }
}

// ---- 2. Jasmine -----------------------------------------------------------------------------

function jasmineFlower(b: GeoBuilder, r: Rand, c: V3, axis: V3, R: number) {
  petalRing(b, r, c, axis, { count: 5, tilt: 1.3, len: R, wid: R * 0.52, off: R * 0.05, c0: hex(0xfff6dc), c1: hex(0xffffff), profile: PROFILE.lance, fold: 0.1, curl: 0.05 });
  b.blob(new THREE.Vector3().copy(c).addScaledVector(axis, R * 0.08), R * 0.16, R * 0.1, R * 0.16, hex(0xf3d96a), hex(0xd6c25a), 5, 3, 0.2);
}

function jasmine(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 5 + Math.round(k * 9);
  const H = 0.28 + k * 0.85;
  const flowers = st < 2 ? 0 : Math.round(Math.pow(k, 1.2) * 70) + (st >= 2 ? 3 : 0);
  const tips: { p: V3; d: V3 }[] = [];
  for (let i = 0; i < stems; i++) {
    const ang = r() * TAU;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const lean = (0.1 + r() * 0.34) * (0.5 + k);
    const hh = H * (0.6 + r() * 0.4);
    const path = stemPath(V(dx * 0.02, 0, dz * 0.02), V(dx * lean, hh, dz * lean), V(dx, 0.2, dz).multiplyScalar(0.1));
    b.tube(path, (t) => 0.0065 * (1 - t * 0.6), 4, PAL.woody, PAL.stem);
    const nodes = 5 + Math.round(k * 7);
    for (let j = 0; j < nodes; j++) {
      const q = path[Math.min(path.length - 1, 1 + Math.round(((j + 0.5) / (nodes + 0.3)) * (path.length - 2)))]!;
      for (const sgn of [-1, 1]) {
        const d = V(dx * 0.5 + sgn * dz * 0.9, 0.35 + r() * 0.3, dz * 0.5 - sgn * dx * 0.9).normalize();
        b.leafLite(q, d, 0.045 + k * 0.025, 0.026 + k * 0.012, jitter(PAL.leafGlossy, r, 0.12), jitter(PAL.leafMid, r, 0.12), 1, 0.12);
      }
      if (r() < 0.45) tips.push({ p: q, d: V(dx, 0.7, dz).normalize() });
    }
    tips.push({ p: path[path.length - 1]!, d: V(dx * 0.3, 1, dz * 0.3).normalize() });
  }
  for (let i = 0; i < flowers && tips.length; i++) {
    const t = tips[Math.floor(r() * tips.length)]!;
    const off = V((r() - 0.5) * 0.03, 0.008 + r() * 0.02, (r() - 0.5) * 0.03);
    jasmineFlower(b, r, new THREE.Vector3().copy(t.p).add(off), V(t.d.x + (r() - 0.5) * 0.7, 0.8 + r() * 0.3, t.d.z + (r() - 0.5) * 0.7).normalize(), 0.017 + k * 0.006);
  }
}

// ---- 3. Marigold ----------------------------------------------------------------------------

function pom(b: GeoBuilder, r: Rand, c: V3, axis: V3, R: number) {
  const orange = hex(0xe8790f);
  const gold = hex(0xf8b61f);
  const deep = hex(0xc8560a);
  const layers: [number, number, number][] = [[1.3, 15, 0], [1.0, 12, 0.3], [0.7, 9, 0.7], [0.4, 6, 1.1], [0.1, 4, 0.5]];
  for (const [tilt, count, rot] of layers) {
    petalRing(b, r, new THREE.Vector3().copy(c).addScaledVector(axis, R * (0.3 - tilt * 0.12)), axis, { count, tilt, len: R * 0.85, wid: R * 0.56, off: R * 0.12, c0: deep, c1: r() > 0.5 ? orange : gold, lite: true, rot, vary: 0.2 });
  }
  b.blob(new THREE.Vector3().copy(c).addScaledVector(axis, R * 0.32), R * 0.2, R * 0.12, R * 0.2, gold, orange, 5, 3, 0.3);
}

function marigold(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const leaves = 12 + Math.round(k * 34);
  const R = 0.16 + k * 0.2;
  for (let i = 0; i < leaves; i++) {
    const ang = r() * TAU;
    const lift = 0.45 + r() * 0.8;
    const d = V(Math.cos(ang), lift, Math.sin(ang)).normalize();
    b.blade({ p: V(Math.cos(ang) * 0.015, 0.01 + r() * 0.05 * k, Math.sin(ang) * 0.015), a: d, len: R * (0.7 + r() * 0.6), wid: 0.03 + k * 0.012, profile: PROFILE.lance, fold: 0.1, droop: 0.35, c0: PAL.leafDeep, c1: PAL.leafBright, fl: 1 });
  }
  const blooms = st < 3 ? 0 : Math.round(1 + (k - 0.33) * 20);
  const stems = st < 2 ? 0 : 1 + Math.round(k * 12);
  for (let i = 0; i < stems; i++) {
    const ang = r() * TAU;
    const lean = 0.03 + r() * R * 1.2;
    const hh = 0.16 + k * 0.28 + r() * 0.12;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const top = V(dx * lean, hh, dz * lean);
    const path = stemPath(V(dx * 0.01, 0.02, dz * 0.01), top, V(dx, 0, dz).multiplyScalar(0.03), 5);
    b.tube(path, () => 0.0045, 4, PAL.stemDark, PAL.stem);
    const axis = V(dx * 0.25, 1, dz * 0.25).normalize();
    if (st === 2) bud(b, top, axis, 0.016, hex(0xe8790f), PAL.leafMid);
    else if (i < blooms) pom(b, r, top, axis, 0.036 + k * 0.028);
    else bud(b, top, axis, 0.016 + k * 0.006, hex(0xe8790f), PAL.leafMid);
  }
}

// ---- 4. Hibiscus ----------------------------------------------------------------------------

function hibiscusBloom(b: GeoBuilder, r: Rand, c: V3, axis: V3, R: number) {
  const crimson = hex(0x8a0a1a);
  const red = hex(0xe5222f);
  petalRing(b, r, c, axis, { count: 5, tilt: 1.12, len: R, wid: R * 1.2, off: R * 0.04, c0: crimson, c1: red, curl: -0.28, fold: 0.22, profile: PROFILE.petal, vary: 0.06 });
  petalRing(b, r, c, axis, { count: 5, tilt: 0.9, len: R * 0.9, wid: R * 1.0, off: R * 0.02, c0: crimson, c1: tint(red, 0.92), curl: -0.18, fold: 0.2, rot: 0.62 });
  const f = frame(axis);
  const colEnd = new THREE.Vector3().copy(c).addScaledVector(axis, R * 0.55).addScaledVector(f.s, R * 0.9);
  const path = [new THREE.Vector3().copy(c), new THREE.Vector3().lerpVectors(c, colEnd, 0.5), colEnd];
  b.tube(path, () => R * 0.045, 4, hex(0xa5101d), hex(0xe9d36a), 0.3);
  for (let i = 0; i < 6; i++) b.blob(new THREE.Vector3().lerpVectors(c, colEnd, 0.55 + i * 0.07).add(V((r() - 0.5) * R * 0.15, (r() - 0.5) * R * 0.15, (r() - 0.5) * R * 0.15)), R * 0.06, R * 0.05, R * 0.06, hex(0xf4d23d), hex(0xe0b32a), 4, 2, 0.3);
  b.blob(colEnd, R * 0.07, R * 0.07, R * 0.07, hex(0xc8141f), hex(0x9e0f1a), 5, 3, 0.3);
}

function hibiscus(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const stems = 2 + Math.round(k * 4);
  const H = 0.35 + k * 1.15;
  const flowers = st < 3 ? 0 : Math.round(1 + (k - 0.33) * 10);
  let made = 0;
  for (let i = 0; i < stems; i++) {
    const ang = (i / stems) * TAU + r() * 0.8;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const lean = (0.08 + r() * 0.3) * (0.4 + k);
    const hh = H * (0.75 + r() * 0.3);
    const path = stemPath(V(dx * 0.02, 0, dz * 0.02), V(dx * lean, hh, dz * lean), V(dx, 0.2, dz).multiplyScalar(0.12));
    b.tube(path, (t) => 0.014 * (1 - t * 0.6) * (0.7 + k * 0.6), 5, PAL.woody, PAL.stem);
    const nodes = 5 + Math.round(k * 9);
    for (let j = 0; j < nodes; j++) {
      const q = path[Math.min(path.length - 1, 1 + Math.round(((j + 0.5) / (nodes + 0.3)) * (path.length - 2)))]!;
      const th = j * 2.4 + i;
      const d = V(Math.cos(th), 0.3 + r() * 0.3, Math.sin(th)).normalize();
      b.blade({ p: q, a: d, len: 0.1 + k * 0.07, wid: 0.066 + k * 0.04, profile: PROFILE.oval, fold: 0.18, droop: 0.4, c0: PAL.leafGlossy, c1: hex(0x3f8f40), fl: 1 });
    }
    const top = path[path.length - 1]!;
    const axis = V(dx * 0.5, 0.75, dz * 0.5).normalize();
    if (made < flowers) {
      made++;
      hibiscusBloom(b, r, top, axis, 0.07 + k * 0.045);
    } else if (st >= 2) bud(b, top, axis, 0.02, hex(0xc8141f), PAL.leafMid);
  }
}

// ---- 5. Orchid ------------------------------------------------------------------------------

function orchidFlower(b: GeoBuilder, r: Rand, c: V3, face: V3, R: number) {
  const f = frame(face, UP);
  const upv = new THREE.Vector3().copy(f.n);
  const rgt = new THREE.Vector3().copy(f.s);
  const white = hex(0xfbeff4);
  const pink = hex(0xe58db4);
  const mag = hex(0xb21f74);
  const part = (radial: V3, tilt: number, len: number, wid: number, c0: THREE.Color, c1: THREE.Color) => {
    const dir = new THREE.Vector3().addScaledVector(face, Math.cos(tilt)).addScaledVector(radial, Math.sin(tilt)).normalize();
    b.blade({ p: new THREE.Vector3().copy(c).addScaledVector(radial, R * 0.05), a: dir, up: face, len, wid, profile: PROFILE.petal, fold: 0.25, curl: -0.12, c0, c1, fl: 0.8 });
  };
  part(upv, 1.2, R, R * 0.62, white, pink); // dorsal sepal
  part(new THREE.Vector3().addScaledVector(upv, -0.7).addScaledVector(rgt, 0.7).normalize(), 1.2, R, R * 0.58, white, pink);
  part(new THREE.Vector3().addScaledVector(upv, -0.7).addScaledVector(rgt, -0.7).normalize(), 1.2, R, R * 0.58, white, pink);
  part(rgt, 1.3, R * 1.08, R * 1.25, hex(0xf2b8cf), pink); // wings
  part(rgt.clone().negate(), 1.3, R * 1.08, R * 1.25, hex(0xf2b8cf), pink);
  part(upv.clone().negate(), 1.0, R * 0.5, R * 0.4, mag, hex(0xd9468f)); // lip
  b.blob(new THREE.Vector3().copy(c).addScaledVector(face, R * 0.05), R * 0.1, R * 0.1, R * 0.1, hex(0xf2d44a), hex(0xd8b53a), 4, 3, 0.2);
}

function orchid(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const leaves = 2 + Math.round(k * 3);
  for (let i = 0; i < leaves; i++) {
    const ang = (i / leaves) * TAU + 0.3 * r();
    const d = V(Math.cos(ang), 0.5, Math.sin(ang)).normalize();
    b.blade({ p: V(0, 0.03, 0), a: d, len: 0.18 + k * 0.16, wid: 0.075 + k * 0.05, profile: PROFILE.oval, fold: 0.42, droop: 0.5, c0: hex(0x2c6e3a), c1: hex(0x5aa650), fl: 0.6 });
  }
  const roots = 2 + Math.round(k * 4);
  for (let i = 0; i < roots; i++) {
    const ang = r() * TAU;
    const path = stemPath(V(0, 0.03, 0), V(Math.cos(ang) * 0.12, -0.0, Math.sin(ang) * 0.12), V(0, 0.08, 0), 5);
    b.tube(path, (t) => 0.006 * (1 - t * 0.3), 4, hex(0x9aa889), hex(0xc7cfae));
  }
  if (st < 3) return;
  const spikes = st >= 6 ? 2 : 1;
  const flowers = Math.round(2 + (k - 0.33) * 10);
  for (let s = 0; s < spikes; s++) {
    const ang = r() * TAU + s * 2.4;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const H = 0.26 + k * 0.3;
    const path = bezier(V(0, 0.05, 0), V(dx * 0.02, H * 0.8, dz * 0.02), V(dx * 0.12, H * 1.05, dz * 0.12), V(dx * 0.3 + dx * k * 0.1, H * 0.78, dz * 0.3 + dz * k * 0.1), 8);
    b.tube(path, (t) => 0.0045 * (1 - t * 0.5), 4, PAL.stemDark, hex(0x7a5aa0));
    const n = Math.max(2, Math.round(flowers * (s === 0 ? 1 : 0.6)));
    for (let i = 0; i < n; i++) {
      const t = 0.42 + (i / Math.max(1, n - 1)) * 0.56;
      const q = path[Math.round(t * (path.length - 1))]!;
      const face = V(dx * 0.4 + (r() - 0.5) * 0.3, 0.45, dz * 0.4 + (r() - 0.5) * 0.3).normalize();
      const side = V(-dz, 0, dx).multiplyScalar(i % 2 ? 0.03 : -0.03);
      orchidFlower(b, r, new THREE.Vector3().copy(q).add(side), face, 0.04 + k * 0.012 - i * 0.0012);
    }
    if (st >= 4) {
      const end = path[path.length - 1]!;
      for (let i = 0; i < 2; i++) b.blob(V(end.x + (i + 1) * dx * 0.018, end.y + 0.01, end.z + (i + 1) * dz * 0.018), 0.011, 0.014, 0.011, hex(0xe58db4), hex(0xc4a2b8), 5, 3, 0.2);
    }
  }
}

// ---- 6. Lotus (grows on water) ----------------------------------------------------------------

function lotusPad(b: GeoBuilder, r: Rand, c: V3, R: number, forward: V3, up: V3, cup: number) {
  const notch = r() * TAU;
  b.fan(c, forward, up, (th) => {
    let d = Math.abs(((th - notch + Math.PI * 3) % TAU) - Math.PI);
    d = Math.PI - d;
    return R * (d < 0.1 ? 0.2 + 0.8 * (d / 0.1) : 1) * (0.97 + 0.03 * Math.sin(th * 7));
  }, hex(0x2f7a40), hex(0x72b95c), { segs: 28, rings: 3, cup, fl: 0.5, droopEdge: 0.0 });
}

function lotus(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const pads = 2 + Math.round(k * 8);
  for (let i = 0; i < pads; i++) {
    const ang = r() * TAU;
    const dist = 0.1 + r() * (0.35 + k * 0.7);
    const R = 0.14 + r() * 0.12 + k * 0.17;
    lotusPad(b, r, V(Math.cos(ang) * dist, 0.025, Math.sin(ang) * dist), R, V(Math.cos(ang), 0, Math.sin(ang)), UP, 0.5 / Math.max(0.1, R));
  }
  const standing = st < 3 ? 0 : Math.round(1 + k * 3);
  const flowers = st < 4 ? 0 : Math.round(1 + (k - 0.5) * 5);
  for (let i = 0; i < standing; i++) {
    const ang = r() * TAU;
    const dist = 0.12 + r() * 0.3;
    const H = 0.35 + k * 0.5 + r() * 0.2;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const base = V(dx * dist, 0, dz * dist);
    const top = V(dx * (dist + 0.08), H, dz * (dist + 0.08));
    b.tube(stemPath(base, top, V(0, 0, 0), 6), (t) => 0.0075 * (1 - t * 0.35), 5, hex(0x5a7a3a), hex(0x7fa050));
    const R = 0.2 + k * 0.14;
    const nrm = V(-dx * 0.3, 1, -dz * 0.3).normalize();
    lotusPad(b, r, top, R, V(dx, 0.2, dz).normalize(), nrm, 0.7 / R);
  }
  for (let i = 0; i < flowers + (st >= 5 ? 1 : 0); i++) {
    const ang = r() * TAU + i * 1.7;
    const dist = 0.2 + r() * 0.45;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const H = 0.5 + k * 0.45 + r() * 0.15;
    const top = V(dx * dist, H, dz * dist);
    b.tube(stemPath(V(dx * dist * 0.9, 0, dz * dist * 0.9), top, V(0, 0, 0), 6), (t) => 0.0095 * (1 - t * 0.4), 5, hex(0x5a7a3a), hex(0x7fa050));
    const bloom = i < flowers;
    if (!bloom) {
      b.blob(V(top.x, top.y + 0.05, top.z), 0.035, 0.07, 0.035, hex(0xf5a8c4), hex(0xe58db4), 6, 4, 0.3);
      continue;
    }
    const R = 0.1 + k * 0.045;
    petalRing(b, r, top, UP, { count: 9, tilt: 1.0, len: R * 1.3, wid: R * 0.66, off: R * 0.12, c0: hex(0xfbe6ee), c1: hex(0xf09ab8), profile: PROFILE.pointed, curl: -0.1, fold: 0.3 });
    petalRing(b, r, top, UP, { count: 8, tilt: 0.65, len: R * 1.1, wid: R * 0.6, off: R * 0.08, c0: hex(0xfff2f6), c1: hex(0xf4a9c4), profile: PROFILE.pointed, curl: 0.05, fold: 0.35, rot: 0.4 });
    petalRing(b, r, top, UP, { count: 6, tilt: 0.3, len: R * 0.8, wid: R * 0.5, off: R * 0.04, c0: hex(0xfffaf8), c1: hex(0xf7bfd2), profile: PROFILE.pointed, curl: 0.15, fold: 0.4, rot: 0.9 });
    b.blob(V(top.x, top.y + R * 0.2, top.z), R * 0.26, R * 0.12, R * 0.26, hex(0xc8d36a), hex(0x8aa04a), 6, 3, 0.3);
    for (let s = 0; s < 14; s++) {
      const a2 = (s / 14) * TAU;
      b.leafLite(V(top.x + Math.cos(a2) * R * 0.22, top.y + R * 0.12, top.z + Math.sin(a2) * R * 0.22), V(Math.cos(a2) * 0.3, 1, Math.sin(a2) * 0.3).normalize(), R * 0.4, R * 0.07, hex(0xf4d23d), hex(0xf9e27a), 0.5, 0);
    }
  }
}

// ---- 7. Lavender ----------------------------------------------------------------------------

function lavender(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const blades = 16 + Math.round(k * 44);
  const R = 0.18 + k * 0.17;
  for (let i = 0; i < blades; i++) {
    const ang = r() * TAU;
    const d = V(Math.cos(ang), 0.7 + r() * 0.9, Math.sin(ang)).normalize();
    b.blade({ p: V(Math.cos(ang) * 0.02, 0.02, Math.sin(ang) * 0.02), a: d, len: R * (0.6 + r() * 0.7), wid: 0.014, profile: PROFILE.lance, fold: 0.1, droop: 0.28, c0: hex(0x6d8c6f), c1: hex(0x9db79a), fl: 1 });
  }
  const spikes = st < 3 ? 0 : Math.round(3 + (k - 0.33) * 50);
  for (let i = 0; i < spikes; i++) {
    const ang = r() * TAU;
    const lean = r() * R * 1.1;
    const hh = 0.28 + k * 0.28 + r() * 0.12;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const top = V(dx * lean, hh, dz * lean);
    const path = stemPath(V(dx * 0.015, 0.03, dz * 0.015), top, V(dx, 0, dz).multiplyScalar(0.03), 5);
    b.tube(path, () => 0.0028, 4, hex(0x6d8c6f), hex(0x8aa586));
    const sp = bezier(top, V(top.x, top.y + 0.03, top.z), V(top.x + dx * 0.005, top.y + 0.06, top.z + dz * 0.005), V(top.x + dx * 0.008, top.y + 0.1 + k * 0.03, top.z + dz * 0.008), 5);
    b.tube(sp, (t) => 0.0085 * (1 - t * 0.7), 5, hex(0x7a52b8), hex(0xa583d9), 0.6);
    for (let w = 1; w < 5; w++) {
      const q = sp[w + 0]!;
      for (let s = 0; s < 3; s++) {
        const a2 = (s / 3) * TAU + w;
        b.leafLite(q, V(Math.cos(a2), 0.4, Math.sin(a2)).normalize(), 0.026, 0.014, hex(0x6e48aa), hex(0xb08ae0), 0.8, 0.05);
      }
    }
  }
}

// ---- 8. Sunflower ---------------------------------------------------------------------------

function sunflower(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const H = [0.12, 0.32, 0.7, 1.15, 1.5, 1.75, 1.95][st - 1]!;
  const lean = V(0.09, 0, 0.04).multiplyScalar(k * 2);
  const base = V(0, 0, 0);
  const top = V(lean.x, H, lean.z);
  const path = stemPath(base, top, V(0.04, 0, 0).multiplyScalar(k), 8);
  b.tube(path, (t) => (0.011 + 0.017 * k) * (1 - t * 0.35), 6, hex(0x3f6a2a), hex(0x5f8f3a), 0.1, { colorFn: (t) => mix(hex(0x3f6a2a), hex(0x6f9a3c), t) });
  const leaves = 2 + Math.round(k * 9);
  for (let i = 0; i < leaves; i++) {
    const t = st <= 2 ? 0.1 + (i / Math.max(1, leaves)) * 0.4 : 0.12 + (i / leaves) * 0.72;
    const q = path[Math.round(t * (path.length - 1))]!;
    const th = i * 2.4;
    const d = V(Math.cos(th), 0.42 - t * 0.3, Math.sin(th)).normalize();
    b.blade({ p: q, a: d, len: 0.1 + k * 0.2 - t * 0.04, wid: 0.075 + k * 0.14 - t * 0.04, profile: PROFILE.heart, fold: 0.2, droop: 0.55, c0: hex(0x2b6a2c), c1: hex(0x5d9a3d), fl: 1 });
  }
  if (st < 4) return;
  const face = V(0.55, 0.6, 0.3).normalize();
  const R = st === 4 ? 0.04 : 0.07 + (st - 5) * 0.035;
  const hc = new THREE.Vector3().copy(top).addScaledVector(face, R * 0.3);
  if (st === 4) {
    b.blob(hc, R, R * 0.7, R, hex(0x6f9a3c), hex(0x4a7a2c), 7, 4, 0.5);
    petalRing(b, r, hc, face, { count: 8, tilt: 0.5, len: R * 1.9, wid: R * 0.6, off: R * 0.7, c0: PAL.leafMid, c1: PAL.leafBright, lite: true });
    return;
  }
  const f = frame(face, UP);
  b.fan(hc, f.s, face, () => R * 1.45, hex(0x2b1a10), hex(0x6a4420), {
    segs: 30,
    rings: 4,
    cup: -0.25 / R,
    fl: 0.2,
    colorFn: (u, th) => (u < 0.4 ? hex(0x2a190f) : mix(hex(0x4a2c14), hex(0xa86a24), (Math.sin(th * 14 + u * 20) + 1) * 0.5 * u)),
  });
  petalRing(b, r, hc, face, { count: 26, tilt: 1.42, len: R * 1.45, wid: R * 0.48, off: R * 1.25, c0: hex(0xe89a0a), c1: hex(0xffd23a), lite: true, vary: 0.14 });
  petalRing(b, r, new THREE.Vector3().copy(hc).addScaledVector(face, -R * 0.1), face, { count: 24, tilt: 1.3, len: R * 1.35, wid: R * 0.46, off: R * 1.2, c0: hex(0xd98708), c1: hex(0xf6b81c), lite: true, rot: 0.1 });
  petalRing(b, r, new THREE.Vector3().copy(hc).addScaledVector(face, -R * 0.35), face, { count: 14, tilt: 2.2, len: R * 0.9, wid: R * 0.5, off: R * 1.1, c0: PAL.leafDeep, c1: PAL.leafMid, lite: true });
}

// ---- 9. Monstera ----------------------------------------------------------------------------

function angDiff(a: number, c: number) {
  return Math.abs(((a - c + Math.PI * 3) % TAU) - Math.PI);
}

function monsteraLeaf(b: GeoBuilder, c: V3, forward: V3, up: V3, R: number, slits: number) {
  b.fan(
    c,
    forward,
    up,
    (th) => {
      let rr = R * (0.88 + 0.12 * Math.cos(th));
      const notch = Math.PI - angDiff(th, Math.PI);
      if (notch < 0.32) rr *= 0.32 + 0.68 * (notch / 0.32);
      if (slits > 0) {
        for (let kk = 0; kk < 4; kk++) {
          for (const sgn of [-1, 1]) {
            const dd = angDiff(th, sgn * (0.52 + 0.33 * kk));
            if (dd < 0.085) rr *= 1 - slits * 0.78 * (1 - dd / 0.085);
          }
        }
      }
      return rr;
    },
    hex(0x174f2e),
    hex(0x3f8d4a),
    { segs: 72, rings: 4, cup: 0.18 / R, droopEdge: 0.5 / R, fl: 0.6, colorFn: (u, th) => mix(hex(0x14502c), hex(0x3a8a48), Math.pow(u, 0.9) * (0.85 + 0.15 * Math.sin(th * 9))) },
  );
}

function monstera(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const leaves = 2 + Math.round(k * 8);
  for (let i = 0; i < leaves; i++) {
    const ang = (i / leaves) * TAU + r() * 0.5;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const reach = 0.1 + (0.1 + k * 0.5) * (0.5 + r() * 0.7);
    const H = 0.16 + k * 0.6 * (0.55 + r() * 0.55);
    const top = V(dx * reach, H, dz * reach);
    b.tube(stemPath(V(dx * 0.02, 0, dz * 0.02), top, V(dx, 0.3, dz).multiplyScalar(0.08), 6), (t) => 0.007 * (1 - t * 0.35) * (0.7 + k * 0.7), 5, hex(0x4a7a3a), hex(0x6a9a4a));
    const R = 0.11 + k * 0.2 + r() * 0.03;
    const fwd = V(dx, 0.1, dz).normalize();
    const nrm = V(-dx * 0.35, 1, -dz * 0.35).normalize();
    monsteraLeaf(b, top, fwd, nrm, R, st >= 3 ? Math.min(1, (st - 2) / 3) : 0);
  }
}

// ---- 10. Fern -------------------------------------------------------------------------------

function fern(b: GeoBuilder, r: Rand, st: number) {
  const k = mature(st);
  const fronds = 5 + Math.round(k * 22);
  for (let i = 0; i < fronds; i++) {
    const ang = (i / fronds) * TAU * 1.618 + r() * 0.3;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const L = (0.22 + k * 0.62) * (0.65 + r() * 0.5);
    const reach = L * (0.55 + r() * 0.25);
    const top = V(dx * reach, L * 0.55, dz * reach);
    const path = bezier(V(dx * 0.015, 0.01, dz * 0.015), V(dx * reach * 0.15, L * 0.55, dz * reach * 0.15), V(dx * reach * 0.6, L * 0.95, dz * reach * 0.6), V(top.x, top.y - L * 0.1, top.z), 9);
    b.tube(path, (t) => 0.0042 * (1 - t * 0.7), 4, hex(0x3f6a2a), hex(0x5f8f3a), 0.2);
    const pairs = 9 + Math.round(k * 7);
    for (let j = 2; j < pairs; j++) {
      const t = j / pairs;
      const idx = Math.min(path.length - 1, Math.round(t * (path.length - 1)));
      const q = path[idx]!;
      const tangent = new THREE.Vector3().subVectors(path[Math.min(path.length - 1, idx + 1)]!, path[Math.max(0, idx - 1)]!).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const plen = (0.045 + 0.06 * Math.sin(Math.PI * Math.min(1, t * 1.05))) * (0.7 + k * 0.5);
      for (const sgn of [-1, 1]) {
        const d = new THREE.Vector3().copy(side).multiplyScalar(sgn).addScaledVector(tangent, 0.55).addScaledVector(UP, 0.12).normalize();
        b.leafLite(q, d, plen, plen * 0.32, jitter(hex(0x2e7a3c), r, 0.1), jitter(hex(0x6fbc4a), r, 0.1), 1, 0.08);
      }
    }
  }
}

export const PLANT_BUILDERS: Record<string, Builder> = { rose, jasmine, marigold, hibiscus, orchid, lotus, lavender, sunflower, monstera, fern };

// small helpers other modules reuse
export { bud, compoundLeaf, stemPath };
export const _range = range;
