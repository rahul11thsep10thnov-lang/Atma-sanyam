// Terrain, stonework and the solarpunk structures: a polar-grid ground with
// ponds carved into it, flagstone paths, arched bridges, moss-covered rocks,
// lanterns with solar leaves, a geodesic glass dome and a central "solar
// tree". All of it is generated, with no image assets.
import * as THREE from 'three';
import { GeoBuilder, V, V3, bezier, hex, jitter, lerpColor, mix, tint, UP } from './geo';
import { PAL } from './plants';
import { Rand, fbm2, noise2, range, smoothstep } from './rng';

const TAU = Math.PI * 2;

// ---- terrain -------------------------------------------------------------------------------------

export interface TerrainOpts {
  R: number;
  height: (x: number, z: number) => number;
  color: (x: number, z: number, h: number, slope: number) => THREE.Color;
  rings?: number;
  segs?: number;
}

export function buildTerrain(o: TerrainOpts): THREE.BufferGeometry {
  const rings = o.rings ?? 64;
  const segs = o.segs ?? 160;
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const push = (x: number, z: number) => {
    const h = o.height(x, z);
    const e = 0.25;
    const slope = Math.hypot(o.height(x + e, z) - o.height(x - e, z), o.height(x, z + e) - o.height(x, z - e)) / (2 * e);
    const c = o.color(x, z, h, slope);
    pos.push(x, h, z);
    col.push(c.r, c.g, c.b);
    uv.push(x * 0.22, z * 0.22);
  };
  push(0, 0);
  for (let i = 1; i <= rings; i++) {
    // denser rings toward the rim keep the kerb edge crisp
    const u = i / rings;
    const rr = o.R * u;
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * TAU;
      push(Math.cos(a) * rr, Math.sin(a) * rr);
    }
  }
  const ring = (i: number, j: number) => 1 + (i - 1) * segs + (j % segs);
  for (let j = 0; j < segs; j++) idx.push(0, ring(1, j + 1), ring(1, j));
  for (let i = 1; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      idx.push(ring(i, j), ring(i, j + 1), ring(i + 1, j));
      idx.push(ring(i, j + 1), ring(i + 1, j + 1), ring(i + 1, j));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** The rim of the diorama: a stone kerb and the strata of soil beneath. */
export function buildPlinth(R: number, topY: number, depth: number, r: Rand): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const segs = 96;
  const layers: [number, THREE.Color][] = [
    [0.0, hex(0x5a3f2a)],
    [0.18, hex(0x6b4a30)],
    [0.34, hex(0x8a6a44)],
    [0.5, hex(0x7a6a58)],
    [0.7, hex(0x5e5650)],
    [1.0, hex(0x3e3a38)],
  ];
  const rows: number[][] = [];
  const ys = [topY - 0.02, topY - depth * 0.18, topY - depth * 0.34, topY - depth * 0.5, topY - depth * 0.7, topY - depth];
  ys.forEach((y, li) => {
    const row: number[] = [];
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * TAU;
      const wob = 1 + (noise2(Math.cos(a) * 3 + li * 7, Math.sin(a) * 3) - 0.5) * 0.02 * (li + 1);
      const c = layers[Math.min(li, layers.length - 1)]![1];
      row.push(b.vert(Math.cos(a) * R * wob, y, Math.sin(a) * R * wob, jitter(c, r, 0.12)));
    }
    rows.push(row);
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      b.tri(rows[i]![j]!, rows[i + 1]![j]!, rows[i]![j1]!);
      b.tri(rows[i]![j1]!, rows[i + 1]![j]!, rows[i + 1]![j1]!);
    }
  }
  // bottom cap
  const c0 = b.vert(0, topY - depth, 0, hex(0x2e2b2a));
  for (let j = 0; j < segs; j++) b.tri(c0, rows[rows.length - 1]![(j + 1) % segs]!, rows[rows.length - 1]![j]!);
  // kerb stones round the rim
  const n = Math.round((TAU * R) / 1.1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const m = new THREE.Matrix4().compose(V(Math.cos(a) * (R + 0.15), topY + 0.14, Math.sin(a) * (R + 0.15)), new THREE.Quaternion().setFromAxisAngle(UP, -a + r() * 0.2), V(0.62 + r() * 0.15, 0.3 + r() * 0.06, 0.62 + r() * 0.08));
    b.addGeometry(cyl, m, (p, nrm) => jitter(mix(hex(0x8d8579), hex(0xb8ae9c), Math.max(0, nrm.y)), r, 0.1));
  }
  return b.build({ wind: false });
}

// ---- stonework ---------------------------------------------------------------------------------------

const STONE_A = hex(0x9a9082);
const STONE_B = hex(0xc4b8a2);

/** Points spaced `spacing` apart along a polyline, with the direction at each. */
export function resample(line: V3[], spacing: number): { p: V3; dir: V3 }[] {
  const out: { p: V3; dir: V3 }[] = [];
  let carry = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const c = line[i + 1]!;
    const seg = Math.hypot(c.x - a.x, c.z - a.z);
    if (seg < 1e-6) continue;
    const dir = V((c.x - a.x) / seg, 0, (c.z - a.z) / seg);
    for (let d = carry; d < seg; d += spacing) out.push({ p: V(a.x + dir.x * d, a.y, a.z + dir.z * d), dir });
    carry = (carry - seg) % spacing;
    while (carry < 0) carry += spacing;
  }
  return out;
}

export function flagstones(b: GeoBuilder, r: Rand, line: V3[], width: number, ground: (x: number, z: number) => number, spacing = 0.7): void {
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 7, 1);
  const across = Math.max(1, Math.round(width / (spacing * 0.95)));
  for (const { p, dir } of resample(line, spacing)) {
    const side = V(-dir.z, 0, dir.x);
    for (let k = 0; k < across; k++) {
      const off = ((k + 0.5) / across - 0.5) * width + (r() - 0.5) * 0.08;
      const x = p.x + side.x * off + (r() - 0.5) * 0.08;
      const z = p.z + side.z * off + (r() - 0.5) * 0.08;
      const sz = spacing * (0.4 + r() * 0.12);
      const m = new THREE.Matrix4().compose(V(x, ground(x, z) + 0.035, z), new THREE.Quaternion().setFromAxisAngle(UP, r() * TAU), V(sz, 0.05 + r() * 0.025, sz * (0.85 + r() * 0.2)));
      b.addGeometry(cyl, m, (pt, nrm) => {
        const base = mix(STONE_A, STONE_B, fbm2(pt.x * 1.7, pt.z * 1.7, 2));
        const edge = nrm.y < 0.5 ? 0.78 : 1;
        const moss = noise2(pt.x * 3.1, pt.z * 3.1) > 0.72 ? 0.5 : 0;
        return jitter(tint(mix(base, PAL.moss, moss), edge), r, 0.06);
      });
    }
  }
  cyl.dispose();
}

/** A mossy boulder. */
export function rock(b: GeoBuilder, r: Rand, c: V3, size: number, squash = 0.7): void {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.getAttribute('position');
  const seed = r() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + (fbm2(x * 1.6 + seed, z * 1.6 + y * 1.4, 3) - 0.5) * 0.8;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  const m = new THREE.Matrix4().compose(V(c.x, c.y + size * squash * 0.55, c.z), new THREE.Quaternion().setFromAxisAngle(UP, r() * TAU), V(size, size * squash, size * (0.8 + r() * 0.3)));
  b.addGeometry(g, m, (pt, nrm) => {
    const stone = mix(hex(0x6c665c), hex(0x9a9486), fbm2(pt.x * 2, pt.z * 2, 2));
    const mossAmt = smoothstep(0.35, 0.8, nrm.y) * (0.7 + 0.3 * noise2(pt.x * 4, pt.z * 4));
    return jitter(mix(stone, PAL.moss, mossAmt), r, 0.08);
  });
  g.dispose();
}

/** A small arched stone footbridge from a to c. */
export function bridge(b: GeoBuilder, r: Rand, a: V3, c: V3, width: number, arch: number): void {
  const len = Math.hypot(c.x - a.x, c.z - a.z);
  const dir = V((c.x - a.x) / len, 0, (c.z - a.z) / len);
  const side = V(-dir.z, 0, dir.x);
  const ang = Math.atan2(dir.x, dir.z);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const steps = 14;
  const stone = (col: number) => (p: V3, n: V3) => jitter(tint(mix(hex(col), hex(0xcbbfa8), noise2(p.x * 2, p.z * 2) * 0.5), n.y > 0.6 ? 1 : 0.8), r, 0.07);
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const y0 = a.y + Math.sin(Math.PI * t0) * arch;
    const y1 = a.y + Math.sin(Math.PI * t1) * arch;
    const tm = (t0 + t1) / 2;
    const cx = a.x + dir.x * len * tm;
    const cz = a.z + dir.z * len * tm;
    const cy = (y0 + y1) / 2;
    const pitch = Math.atan2(y1 - y0, len / steps);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-pitch, ang, 0, 'YXZ'));
    // deck slab
    b.addGeometry(box, new THREE.Matrix4().compose(V(cx, cy - 0.12, cz), q, V(width, 0.24, len / steps + 0.03)), stone(0xa59a88));
    // parapets
    for (const sg of [-1, 1]) {
      b.addGeometry(box, new THREE.Matrix4().compose(V(cx + side.x * sg * (width / 2 - 0.07), cy + 0.2, cz + side.z * sg * (width / 2 - 0.07)), q, V(0.14, 0.34, len / steps + 0.03)), stone(0x8d8579));
    }
  }
  // under-arch: two piers and a soffit tube
  for (const sg of [0, 1]) {
    const at = sg ? c : a;
    b.addGeometry(box, new THREE.Matrix4().compose(V(at.x, at.y - 0.25, at.z), new THREE.Quaternion().setFromAxisAngle(UP, ang), V(width + 0.2, 0.9, 0.5)), stone(0x7d766a));
  }
  box.dispose();
}

// ---- lights and solar sculpture ------------------------------------------------------------------------

export interface LanternSpot {
  p: V3;
}

/** A brass post with three dark solar leaves; returns the bulb position (for glow). */
export function lantern(b: GeoBuilder, r: Rand, base: V3, height = 1.7): V3 {
  const top = V(base.x, base.y + height, base.z);
  const brass = hex(0xb58a3c);
  b.tube([base, V(base.x, base.y + height * 0.5, base.z), top], (t) => 0.045 * (1 - t * 0.35), 6, hex(0x6a5a3a), brass);
  b.tube([V(base.x, base.y, base.z), V(base.x, base.y + 0.12, base.z)], () => 0.11, 8, hex(0x6a5a3a), hex(0x8a7550));
  // solar leaves
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + r() * 0.4;
    b.blade({ p: V(top.x, top.y - 0.02, top.z), a: V(Math.cos(a) * 0.85, 0.5, Math.sin(a) * 0.85).normalize(), up: UP, len: 0.36, wid: 0.2, profile: [[0, 0.1], [0.3, 0.8], [0.62, 1], [0.9, 0.6], [1, 0.05]], fold: 0.04, curl: 0.12, c0: hex(0x1b4f86), c1: hex(0x58a6ec), fl: 0.1 });
  }
  b.blob(V(top.x, top.y - 0.07, top.z), 0.06, 0.09, 0.06, brass, hex(0x6a5a3a), 6, 4);
  return V(top.x, top.y - 0.1, top.z);
}

/** The conservatory's heart: a metal tree whose leaves are solar panels and whose nodes glow. */
export function solarTree(b: GeoBuilder, r: Rand, c: V3, scale = 1): V3[] {
  const glow: V3[] = [];
  const trunk = bezier(c.clone(), V(c.x + 0.1 * scale, c.y + 1.4 * scale, c.z), V(c.x - 0.15 * scale, c.y + 2.8 * scale, c.z + 0.1 * scale), V(c.x, c.y + 4.0 * scale, c.z), 10);
  b.tube(trunk, (t) => (0.22 * (1 - t * 0.7) + 0.02) * scale, 8, hex(0xb9b3a4), hex(0xd6cfbf), 0, { colorFn: (t) => mix(hex(0x9d9684), hex(0xd8d0bf), t) });
  b.tube([V(c.x, c.y, c.z), V(c.x, c.y + 0.12 * scale, c.z)], () => 0.5 * scale, 14, hex(0x7d766a), hex(0x9a9486));
  const limbs = 7;
  for (let i = 0; i < limbs; i++) {
    const t = 0.38 + (i / limbs) * 0.62;
    const at = trunk[Math.round(t * (trunk.length - 1))]!;
    const a = i * 2.4;
    const d = V(Math.cos(a) * 0.9, 0.55 + 0.3 * t, Math.sin(a) * 0.9).normalize();
    const len = (1.5 - t * 0.55) * scale;
    const end = new THREE.Vector3().copy(at).addScaledVector(d, len);
    end.y += 0.35 * scale;
    const limb = bezier(at.clone(), new THREE.Vector3().copy(at).addScaledVector(d, len * 0.4).add(V(0, 0.2 * scale, 0)), new THREE.Vector3().copy(at).addScaledVector(d, len * 0.8).add(V(0, 0.45 * scale, 0)), end, 6);
    b.tube(limb, (u) => 0.055 * scale * (1 - u * 0.6), 5, hex(0xa39c8a), hex(0xc7c0ae));
    // solar leaf panels
    const n = 3;
    for (let k = 0; k < n; k++) {
      const q = limb[3 + k]!;
      for (const sg of [-1, 1]) {
        const side = V(-d.z * sg, 0.25, d.x * sg).normalize();
        b.blade({ p: q, a: side, up: UP, len: 0.62 * scale, wid: 0.34 * scale, profile: [[0, 0.1], [0.28, 0.78], [0.6, 1], [0.88, 0.62], [1, 0.05]], fold: 0.03, curl: 0.06, droop: 0.12, c0: hex(0x1b4f86), c1: hex(0x58a6ec), fl: 0.15 });
      }
    }
    glow.push(V(end.x, end.y + 0.06 * scale, end.z));
    b.blob(glow[glow.length - 1]!, 0.07 * scale, 0.07 * scale, 0.07 * scale, hex(0xfff0b8), hex(0xffd878), 6, 4);
  }
  return glow;
}

// ---- geodesic glass dome -------------------------------------------------------------------------------

export interface DomeParts {
  frame: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  /** Where the arch ribs meet: the oculus ring. */
  topY: number;
}

/** A geodesic dome of R × height with brass-and-white struts, arch ribs, solar petals and a glass skin. */
export function buildDome(R: number, height: number, detail: number, y0: number, r: Rand, panels = 12): DomeParts {
  const b = new GeoBuilder();
  const ico = new THREE.IcosahedronGeometry(1, detail).toNonIndexed();
  const p = ico.getAttribute('position');
  const key = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  const edges = new Map<string, [V3, V3]>();
  const nodes = new Map<string, V3>();
  const tris: [V3, V3, V3][] = [];
  const scale = (v: V3) => V(v.x * R, v.y * height + y0, v.z * R);
  for (let i = 0; i < p.count; i += 3) {
    const tri: V3[] = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
    if (tri.every((v) => v.y < -0.001)) continue;
    if ((tri[0]!.y + tri[1]!.y + tri[2]!.y) / 3 < -0.001) continue;
    tris.push([tri[0]!, tri[1]!, tri[2]!]);
    for (let k = 0; k < 3; k++) {
      const a = tri[k]!;
      const c = tri[(k + 1) % 3]!;
      if (a.y < -0.001 && c.y < -0.001) continue;
      const clampA = a.y < 0 ? a.clone().setY(0) : a;
      const clampC = c.y < 0 ? c.clone().setY(0) : c;
      const ka = key(clampA);
      const kc = key(clampC);
      edges.set(ka < kc ? ka + '|' + kc : kc + '|' + ka, [clampA.clone(), clampC.clone()]);
      nodes.set(ka, clampA.clone());
      nodes.set(kc, clampC.clone());
    }
  }
  // A Victorian palm-house dome (as in the owner's reference): a short glazed drum of
  // upright mullions, then a fine rectangular grid of cream glazing bars, arched main
  // ribs, and a lantern with a finial at the crown.
  void edges;
  void nodes;
  void tris;
  void panels;
  const cream = hex(0xefe9dc);
  const creamShade = hex(0xd8cfbd);
  const brass = hex(0xc29a52);
  const drumH = height * 0.16;
  const dy = y0 + drumH;
  const domeH = height - drumH;
  const at = (a: number, ph: number, k = 1.004) => V(Math.cos(a) * Math.cos(ph) * R * k, Math.sin(ph) * domeH * k + dy, Math.sin(a) * Math.cos(ph) * R * k);
  const lantern = 0.085; // crown opening (radians from the top)
  const bars = R > 15 ? 64 : 48;
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * TAU;
    const main = i % 8 === 0;
    const path: V3[] = [];
    for (let k = 0; k <= 16; k++) path.push(at(a, (k / 16) * (Math.PI / 2 - lantern), main ? 1.008 : 1.004));
    b.tube(path, (t) => (main ? 0.075 * (1 - t * 0.4) : 0.018), main ? 6 : 3, cream, creamShade, 0, { colorFn: () => jitter(cream, r, 0.02) });
    // the drum: an upright mullion under every bar, a pier under every main rib
    b.tube([V(Math.cos(a) * R * 1.004, y0, Math.sin(a) * R * 1.004), V(Math.cos(a) * R * 1.004, dy, Math.sin(a) * R * 1.004)], () => (main ? 0.09 : 0.022), main ? 6 : 3, cream, creamShade);
  }
  // horizontal glazing bars, closer together towards the crown
  const rings = R > 15 ? 12 : 9;
  for (let j = 0; j <= rings; j++) {
    const ph = Math.pow(j / rings, 0.9) * (Math.PI / 2 - lantern);
    const path: V3[] = [];
    for (let k = 0; k <= 96; k++) path.push(at((k / 96) * TAU, ph, 1.005));
    b.tube(path, () => (j === 0 ? 0.1 : 0.016), j === 0 ? 6 : 3, j === 0 ? brass : cream, cream);
  }
  for (const yy of [y0 + 0.04, y0 + drumH * 0.5]) {
    const path: V3[] = [];
    for (let k = 0; k <= 96; k++) {
      const a = (k / 96) * TAU;
      path.push(V(Math.cos(a) * R * 1.006, yy, Math.sin(a) * R * 1.006));
    }
    b.tube(path, () => (yy === y0 + 0.04 ? 0.16 : 0.03), 5, yy === y0 + 0.04 ? hex(0xb8ad98) : cream, cream);
  }
  // the lantern: a small glazed drum, a cap and a finial
  const lr = Math.cos(Math.PI / 2 - lantern) * R;
  const ly = Math.sin(Math.PI / 2 - lantern) * domeH + dy;
  const lh = R * 0.07;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    b.tube([V(Math.cos(a) * lr, ly, Math.sin(a) * lr), V(Math.cos(a) * lr, ly + lh, Math.sin(a) * lr)], () => 0.03, 3, cream, cream);
  }
  for (const yy of [ly, ly + lh]) {
    const path: V3[] = [];
    for (let k = 0; k <= 32; k++) path.push(V(Math.cos((k / 32) * TAU) * lr, yy, Math.sin((k / 32) * TAU) * lr));
    b.tube(path, () => 0.05, 4, brass, cream);
  }
  b.blob(V(0, ly + lh, 0), lr * 1.04, lr * 0.4, lr * 1.04, cream, creamShade, 16, 6);
  b.tube([V(0, ly + lh + lr * 0.5, 0), V(0, ly + lh + lr * 0.5 + R * 0.06, 0)], (t) => 0.05 * (1 - t * 0.7), 5, brass, brass);
  b.blob(V(0, ly + lh + lr * 0.5 + R * 0.065, 0), 0.09, 0.12, 0.09, brass, hex(0x8c6a2a), 6, 4);
  const topY = ly + lh + lr * 0.5 + R * 0.07;
  const frame = b.build({ wind: false });
  // glass skin: the drum, then the dome, a hair inside the bars
  const drum = new THREE.CylinderGeometry(R, R, drumH, 64, 1, true);
  drum.translate(0, y0 + drumH / 2, 0);
  const cap = new THREE.SphereGeometry(1, 64, 20, 0, TAU, 0, Math.PI / 2);
  cap.scale(R * 1.001, domeH * 1.001, R * 1.001);
  cap.translate(0, dy, 0);
  const glass = joinGeometries([drum.toNonIndexed(), cap.toNonIndexed()]);
  drum.dispose();
  cap.dispose();
  return { frame, glass, topY };
}

/** Two or more non-indexed geometries as one (position, normal and uv). */
function joinGeometries(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const parts = gs.map((g) => g.getAttribute(name) as THREE.BufferAttribute);
    const size = parts[0]!.itemSize;
    const arr = new Float32Array(parts.reduce((n, a) => n + a.count * size, 0));
    let o = 0;
    for (const a of parts) {
      arr.set(a.array as Float32Array, o);
      o += a.count * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of gs) g.dispose();
  return out;
}

// ---- small helpers for the scenes ----------------------------------------------------------------------

export function ringPoints(radius: number, n: number, y = 0, from = 0, to = TAU): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + (to - from) * (i / n);
    out.push(V(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  return out;
}

export { lerpColor, range };
