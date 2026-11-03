// The eight prototype trees. All share one branching skeleton (trunk, main
// limbs, sub-branches) with species parameters, then each dresses it with its
// own leaf shape, bark, flowers or fruit. Seven stages: a sapling with a few
// leaves up to a mature crown; trunk girth, branch levels and leaf count all
// change, so a stage is its own shape rather than a scaled copy.
import * as THREE from 'three';
import { GeoBuilder, UP, V, V3, bezier, hex, jitter, lerpColor, mix, tint } from './geo';
import { Builder, PAL, mature } from './plants';
import { Rand, range } from './rng';

const TAU = Math.PI * 2;
export const SCALE = [0.14, 0.26, 0.42, 0.6, 0.76, 0.9, 1];

interface Tip {
  p: V3;
  d: V3;
  r: number;
}

export interface TreeParams {
  H: number;
  trunkR: number;
  lean: number;
  crownStart: number;
  /** Fraction of the height the trunk itself rises to. */
  trunkTo: number;
  main: [number, number];
  levels: number;
  kids: number;
  spread: number;
  lenF: number;
  childLenF: number;
  up: number;
  taper: number;
  curl: number;
  droop: number;
  bark0: THREE.Color;
  bark1: THREE.Color;
  trunks?: number;
}

export interface TreeOut {
  tips: Tip[];
  /** Points along the outermost branches, for leaves. */
  twigs: { p: V3; d: V3 }[];
  H: number;
  sc: number;
  k: number;
}

function turn(d: V3, angle: number, r: Rand): V3 {
  const perp = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).cross(d).normalize();
  return new THREE.Vector3().copy(d).multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize();
}

export function growTree(b: GeoBuilder, r: Rand, st: number, P: TreeParams, origin: V3 = V(0, 0, 0)): TreeOut {
  const sc = SCALE[st - 1]!;
  const H = P.H * sc;
  const R0 = P.trunkR * Math.pow(sc, 0.78);
  const levels = Math.min(P.levels, st <= 2 ? 0 : st <= 4 ? 1 : 2);
  const out: TreeOut = { tips: [], twigs: [], H, sc, k: mature(st) };
  const rough = { noise: r, rough: 0.12 };
  const barkFn = (t: number, th: number) => lerpColor(P.bark0, P.bark1, t * 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(th * 3 + t * 9)));

  // trunk
  const nT = 9;
  const lean = new THREE.Vector3(Math.cos(r() * TAU), 0, Math.sin(r() * TAU)).multiplyScalar(P.lean * H);
  const trunkTop = Math.min(1, P.trunkTo) * H;
  const trunk: V3[] = [];
  for (let i = 0; i <= nT; i++) {
    const t = i / nT;
    trunk.push(V(origin.x + lean.x * t * t + Math.sin(t * 5 + 1) * P.curl * 0.12 * H * 0.1, origin.y + trunkTop * t, origin.z + lean.z * t * t + Math.cos(t * 4) * P.curl * 0.12 * H * 0.1));
  }
  const rTop = R0 * P.taper;
  b.tube(trunk, (t) => (R0 * (1 + Math.pow(1 - t, 6) * 0.9)) * (1 - t) + rTop * t, 8, P.bark0, P.bark1, 0, { ...rough, colorFn: barkFn });

  // root flare
  if (st >= 3) {
    const roots = 4 + Math.round(out.k * 3);
    for (let i = 0; i < roots; i++) {
      const a = (i / roots) * TAU + r() * 0.6;
      const len = R0 * (2.2 + r() * 1.4);
      const path = bezier(V(origin.x + Math.cos(a) * R0 * 0.3, origin.y + R0 * 0.9, origin.z + Math.sin(a) * R0 * 0.3), V(origin.x + Math.cos(a) * len * 0.4, origin.y + R0 * 0.55, origin.z + Math.sin(a) * len * 0.4), V(origin.x + Math.cos(a) * len * 0.75, origin.y + R0 * 0.12, origin.z + Math.sin(a) * len * 0.75), V(origin.x + Math.cos(a) * len, origin.y - R0 * 0.1, origin.z + Math.sin(a) * len), 6);
      b.tube(path, (t) => R0 * 0.55 * (1 - t * 0.85), 5, P.bark0, P.bark1);
    }
  }

  const grow = (p0: V3, dir: V3, len: number, r0: number, depth: number) => {
    const n = 5;
    const path: V3[] = [p0.clone()];
    const d = dir.clone();
    const p = p0.clone();
    for (let i = 1; i <= n; i++) {
      d.x += (r() - 0.5) * P.curl;
      d.z += (r() - 0.5) * P.curl;
      d.y += (r() - 0.5) * P.curl * 0.5 - P.droop * 0.1 * (i / n);
      d.normalize();
      p.addScaledVector(d, len / n);
      path.push(p.clone());
    }
    const rEnd = r0 * 0.5;
    b.tube(path, (t) => r0 * (1 - t) + rEnd * t, depth === 0 ? 6 : 5, P.bark0, P.bark1, 0, { colorFn: barkFn });
    if (depth < levels) {
      const kids = P.kids;
      for (let i = 0; i < kids; i++) {
        const t = 0.45 + (i / Math.max(1, kids)) * 0.55;
        const at = path[Math.min(n, Math.round(t * n))]!;
        const cd = turn(d, P.spread * (0.7 + r() * 0.6), r);
        cd.y += 0.1;
        cd.normalize();
        grow(at, cd, len * P.childLenF * (0.8 + r() * 0.4), rEnd * 0.8, depth + 1);
      }
    } else {
      out.tips.push({ p: p.clone(), d: d.clone(), r: rEnd });
      for (let i = 2; i <= n; i++) out.twigs.push({ p: path[i]!.clone(), d: d.clone() });
    }
  };

  const mains = Math.round(P.main[0] + (P.main[1] - P.main[0]) * out.k);
  const trunkEnd = trunk[trunk.length - 1]!;
  for (let i = 0; i < mains; i++) {
    const t = P.crownStart + (1 - P.crownStart) * ((i + 0.5) / mains) * (P.trunkTo > 0.95 ? 0.96 : 1);
    const idx = Math.min(nT, Math.max(1, Math.round((t / Math.min(1, P.trunkTo)) * nT)));
    const at = trunk[Math.min(idx, nT)]!;
    const a = i * 2.39996 + r() * 0.4;
    const el = P.up + (r() - 0.5) * 0.3;
    const dir = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const lenScale = 1 - 0.35 * Math.pow(i / mains, 1.5);
    grow(at, dir, H * P.lenF * lenScale * (0.8 + r() * 0.4), R0 * 0.5 * (0.8 + r() * 0.3) * (1 - 0.25 * (i / mains)), 0);
  }
  // the leader continues above the last limb
  const leaderLen = Math.max(0, H - trunkEnd.y + origin.y);
  grow(trunkEnd, V(r() * 0.2 - 0.1, 1, r() * 0.2 - 0.1).normalize(), Math.max(H * 0.12, leaderLen + H * 0.1), rTop * 0.9, Math.max(0, levels - 1));
  return out;
}

// ---- foliage ---------------------------------------------------------------------------------

function foliage(
  b: GeoBuilder,
  r: Rand,
  c: V3,
  radius: number,
  count: number,
  len: number,
  wid: number,
  c0: THREE.Color,
  c1: THREE.Color,
  o: { flat?: number; up?: number; droop?: number; yellow?: THREE.Color } = {},
) {
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1;
    const th = r() * TAU;
    const s = Math.sqrt(1 - u * u);
    const rad = radius * Math.cbrt(r());
    const off = V(Math.cos(th) * s * rad, u * rad * (o.flat ?? 1), Math.sin(th) * s * rad);
    const p = new THREE.Vector3().copy(c).add(off);
    const d = new THREE.Vector3(off.x + (r() - 0.5) * radius * 0.8, off.y + radius * (o.up ?? 0.3) + (r() - 0.3) * radius * 0.5, off.z + (r() - 0.5) * radius * 0.8).normalize();
    const lit = 0.5 + 0.5 * u;
    const base = o.yellow && r() < 0.14 ? o.yellow : mix(c0, c1, lit * 0.7 + r() * 0.3);
    b.leafLite(p, d, len * (0.8 + r() * 0.5), wid * (0.8 + r() * 0.4), jitter(c0, r, 0.1), jitter(base, r, 0.1), 1, o.droop ?? 0.12);
  }
}

function aerialRoots(b: GeoBuilder, r: Rand, from: V3[], count: number, groundY: number, thick: number) {
  for (let i = 0; i < count; i++) {
    const s = from[Math.floor(r() * from.length)]!;
    const len = s.y - groundY;
    if (len < 0.4) continue;
    const reach = len * range(r, 0.55, 1);
    const drift = V((r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3);
    const end = V(s.x + drift.x, s.y - reach, s.z + drift.z);
    const path = bezier(s.clone(), V(s.x + drift.x * 0.2, s.y - reach * 0.33, s.z + drift.z * 0.2), V(s.x + drift.x * 0.8, s.y - reach * 0.66, s.z + drift.z * 0.8), end, 7);
    b.tube(path, (t) => thick * (1 - t * 0.7), 4, hex(0x7a5a3e), hex(0x9a7a56), 0.25);
  }
}

// ---- species -----------------------------------------------------------------------------------

const BARK_GREY = [hex(0x6c5f52), hex(0x8f8374)] as const;

function banyan(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 5.6, trunkR: 0.24, lean: 0.01, crownStart: 0.3, trunkTo: 0.5, main: [3, 7], levels: 2, kids: 3, spread: 0.7, lenF: 0.82, childLenF: 0.6, up: 0.28, taper: 0.7, curl: 0.34, droop: 0.4, bark0: BARK_GREY[0], bark1: BARK_GREY[1] };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  const cnt = Math.round(22 + t.k * 40);
  for (const tip of t.tips) foliage(b, r, new THREE.Vector3(tip.p.x, tip.p.y + 0.05, tip.p.z), (0.5 + 0.55 * t.sc) * 0.95, cnt, 0.27 * ls, 0.15 * ls, hex(0x1a5028), hex(0x4f9540), { flat: 0.6, up: 0.35, yellow: hex(0xb6d65c) });
  if (st >= 3) aerialRoots(b, r, t.twigs.map((w) => w.p), Math.round(2 + t.k * 12), 0, 0.012 + 0.012 * t.k);
  if (st >= 5) {
    for (let i = 0; i < 2; i++) {
      const a = (i + 0.3) * 2.6;
      const top = V(Math.cos(a) * 0.9 * t.sc * 2, t.H * 0.45, Math.sin(a) * 0.9 * t.sc * 2);
      b.tube(bezier(top, V(top.x * 1.02, top.y * 0.66, top.z * 1.02), V(top.x * 1.02, top.y * 0.33, top.z * 1.02), V(top.x * 1.03, 0, top.z * 1.03), 8), (u) => 0.05 + 0.04 * u, 5, hex(0x7a5a3e), hex(0x6c5f52));
    }
  }
}

function peepal(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 6, trunkR: 0.2, lean: 0.02, crownStart: 0.42, trunkTo: 0.62, main: [4, 8], levels: 3, kids: 3, spread: 0.65, lenF: 0.6, childLenF: 0.62, up: 0.7, taper: 0.55, curl: 0.3, droop: 0.15, bark0: hex(0x8d8272), bark1: hex(0xb9ad9a) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tw of t.twigs) {
    const n = Math.round(5 + t.k * 6);
    for (let i = 0; i < n; i++) {
      const th = r() * TAU;
      const d = V(Math.cos(th), 0.3 + r() * 0.5, Math.sin(th)).normalize();
      b.blade({ p: new THREE.Vector3().copy(tw.p).addScaledVector(d, 0.05), a: d, up: UP, len: 0.17 * ls * (0.8 + r() * 0.4), wid: 0.15 * ls * (0.8 + r() * 0.4), profile: [[0, 0], [0.2, 0.85], [0.5, 1], [0.78, 0.4], [1, 0]], fold: 0.1, droop: 0.5, c0: hex(0x4a8a2e), c1: hex(0x9acb4c), fl: 1 });
    }
  }
}

function neem(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 6.2, trunkR: 0.26, lean: 0.02, crownStart: 0.3, trunkTo: 0.5, main: [4, 8], levels: 3, kids: 3, spread: 0.75, lenF: 0.6, childLenF: 0.6, up: 0.55, taper: 0.62, curl: 0.3, droop: 0.2, bark0: hex(0x5a4838), bark1: hex(0x7a6650) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) {
    const comps = Math.round(5 + t.k * 7);
    for (let c = 0; c < comps; c++) {
      const th = r() * TAU;
      const d = V(Math.cos(th) * 0.8, 0.25 + r() * 0.5, Math.sin(th) * 0.8).normalize();
      const base = new THREE.Vector3().copy(tip.p).addScaledVector(d, 0.04).add(V((r() - 0.5) * 0.3, (r() - 0.3) * 0.3, (r() - 0.5) * 0.3).multiplyScalar(ls));
      const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
      for (let j = 0; j < 7; j++) {
        const q = new THREE.Vector3().copy(base).addScaledVector(d, j * 0.045 * ls);
        for (const sg of [-1, 1]) {
          const ld = new THREE.Vector3().copy(d).addScaledVector(side, sg * 0.9).addScaledVector(UP, 0.1).normalize();
          b.leafLite(q, ld, 0.1 * ls * (1.1 - j * 0.07), 0.04 * ls, hex(0x2f6a2f), jitter(hex(0x86bb48), r, 0.1), 1, 0.15);
        }
      }
    }
  }
}

function mango(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 5.6, trunkR: 0.3, lean: 0.01, crownStart: 0.22, trunkTo: 0.42, main: [4, 8], levels: 2, kids: 4, spread: 0.85, lenF: 0.55, childLenF: 0.62, up: 0.6, taper: 0.7, curl: 0.3, droop: 0.2, bark0: hex(0x4a3a30), bark1: hex(0x6a5646) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  const cnt = Math.round(30 + t.k * 46);
  for (const tip of t.tips) foliage(b, r, new THREE.Vector3(tip.p.x, tip.p.y + 0.02, tip.p.z), (0.5 + 0.6 * t.sc) * 0.95, cnt, 0.3 * ls, 0.12 * ls, hex(0x174a26), hex(0x3a7f35), { flat: 0.8, up: 0.15, droop: 0.28, yellow: hex(0xc6a54a) });
  if (st >= 6) {
    for (let i = 0; i < 6 + (st - 6) * 4; i++) {
      const tip = t.tips[Math.floor(r() * t.tips.length)]!;
      const p = V(tip.p.x + (r() - 0.5) * 0.8, tip.p.y - 0.1 - r() * 0.3, tip.p.z + (r() - 0.5) * 0.8);
      b.tube([V(p.x, p.y + 0.18, p.z), p], () => 0.004, 3, hex(0x5a7a30), hex(0x5a7a30));
      b.blob(V(p.x, p.y - 0.06, p.z), 0.05, 0.075, 0.045, hex(0xe8a030), hex(0xb8c040), 7, 5, 0.2);
    }
  }
}

function coconut(b: GeoBuilder, r: Rand, st: number) {
  const sc = SCALE[st - 1]!;
  const k = mature(st);
  const H = 7 * sc;
  const lean = V(0.8, 0, 0.35).multiplyScalar(sc * 1.1);
  const path = bezier(V(0, 0, 0), V(lean.x * 0.05, H * 0.35, lean.z * 0.05), V(lean.x * 0.4, H * 0.75, lean.z * 0.4), V(lean.x, H, lean.z), 12);
  const R0 = 0.17 * Math.pow(sc, 0.7);
  b.tube(path, (t) => R0 * (1 + Math.pow(1 - t, 5) * 0.9) * (1 - t * 0.38), 8, hex(0x8a7455), hex(0x6c5a43), 0, {
    colorFn: (t, th) => (Math.floor(t * H * 7) % 2 === 0 ? mix(hex(0x9a8564), hex(0x7a6648), 0.5 + 0.5 * Math.sin(th * 2)) : hex(0x6a5740)),
  });
  const top = path[path.length - 1]!;
  const fronds = 6 + Math.round(k * 9);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * TAU + r() * 0.3;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const L = (1.1 + k * 2.2) * (0.85 + r() * 0.3) * (0.7 + 0.3 * sc);
    const up = i % 3 === 0 ? 0.8 : 0.35 + r() * 0.3;
    const end = V(top.x + dx * L * 0.85, top.y + L * up * 0.3 - L * 0.42, top.z + dz * L * 0.85);
    const rachis = bezier(new THREE.Vector3().copy(top), V(top.x + dx * L * 0.3, top.y + L * up * 0.8, top.z + dz * L * 0.3), V(top.x + dx * L * 0.68, top.y + L * up * 0.75, top.z + dz * L * 0.68), end, 9);
    b.tube(rachis, (t) => 0.02 * (1 - t * 0.8), 4, hex(0x7a8a3a), hex(0x93a84a), 0.3);
    const pairs = 13 + Math.round(k * 9);
    for (let j = 1; j < pairs; j++) {
      const t = j / pairs;
      const idx = Math.min(rachis.length - 1, Math.round(t * (rachis.length - 1)));
      const q = rachis[idx]!;
      const tan = new THREE.Vector3().subVectors(rachis[Math.min(rachis.length - 1, idx + 1)]!, rachis[Math.max(0, idx - 1)]!).normalize();
      const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const pl = L * 0.2 * (1 - 0.6 * t) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.1)));
      for (const sg of [-1, 1]) {
        const d = new THREE.Vector3().copy(side).multiplyScalar(sg).addScaledVector(tan, 0.35).addScaledVector(UP, -0.35).normalize();
        b.leafLite(q, d, pl, pl * 0.1, jitter(hex(0x3d7a32), r, 0.1), jitter(hex(0x86b83e), r, 0.1), 1, 0.2);
      }
    }
  }
  if (st >= 5) {
    for (let i = 0; i < 4 + (st - 5) * 3; i++) {
      const a = r() * TAU;
      b.blob(V(top.x + Math.cos(a) * 0.17, top.y - 0.18 - r() * 0.1, top.z + Math.sin(a) * 0.17), 0.11, 0.13, 0.11, hex(0x6a9a3a), hex(0x4a7a2a), 7, 5, 0.2);
    }
  }
}

function gulmohar(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 5.2, trunkR: 0.26, lean: 0.03, crownStart: 0.4, trunkTo: 0.5, main: [3, 6], levels: 2, kids: 3, spread: 0.95, lenF: 0.95, childLenF: 0.55, up: 0.2, taper: 0.7, curl: 0.34, droop: 0.12, bark0: hex(0x6a5c4a), bark1: hex(0x8c7c64) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  const cnt = Math.round(26 + t.k * 54);
  for (const tip of t.tips) {
    foliage(b, r, new THREE.Vector3(tip.p.x, tip.p.y + 0.05, tip.p.z), (0.45 + 0.55 * t.sc) * 0.95, cnt, 0.12 * ls, 0.05 * ls, hex(0x4a8a30), hex(0x9cd05a), { flat: 0.35, up: 0.4, yellow: hex(0xc8dc6a) });
    if (st >= 5) {
      const blooms = Math.round(1 + (st - 5) * 2 + r() * 2);
      for (let i = 0; i < blooms; i++) {
        const c = V(tip.p.x + (r() - 0.5) * 0.7 * ls, tip.p.y + 0.1 + r() * 0.35, tip.p.z + (r() - 0.5) * 0.7 * ls);
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * TAU + r();
          b.leafLite(c, V(Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9).normalize(), 0.11 * ls, 0.08 * ls, hex(0xc0200f), hex(0xf0502a), 0.9, 0.05);
        }
        b.blob(V(c.x, c.y + 0.01, c.z), 0.015, 0.012, 0.015, hex(0xf6d23a), hex(0xe0b02a), 4, 3);
      }
    }
  }
}

function cherry(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 4.2, trunkR: 0.12, lean: 0.06, crownStart: 0.38, trunkTo: 0.6, main: [3, 6], levels: 3, kids: 3, spread: 0.85, lenF: 0.7, childLenF: 0.6, up: 0.55, taper: 0.5, curl: 0.4, droop: 0.2, bark0: hex(0x3c2e2e), bark1: hex(0x5a4642) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  const pale = hex(0xfde4ec);
  const pink = hex(0xf2a6bd);
  const deep = hex(0xe27d9a);
  for (const tip of t.tips) {
    const flowers = st < 2 ? 3 : Math.round(8 + t.k * 22);
    for (let i = 0; i < flowers; i++) {
      const c = V(tip.p.x + (r() - 0.5) * 0.7 * ls, tip.p.y + (r() - 0.3) * 0.4 * ls, tip.p.z + (r() - 0.5) * 0.7 * ls);
      const d = V(r() - 0.5, 0.3 + r() * 0.7, r() - 0.5).normalize();
      b.leafLite(c, d, 0.11 * ls, 0.12 * ls, jitter(pink, r, 0.08), jitter(pale, r, 0.05), 1, 0.02);
      b.leafLite(c, V(d.z, d.y, -d.x).normalize(), 0.1 * ls, 0.11 * ls, jitter(deep, r, 0.06), jitter(pale, r, 0.05), 1, 0.02);
    }
    if (st <= 3) foliage(b, r, tip.p, 0.3 * ls, 5, 0.1 * ls, 0.05 * ls, hex(0x6a8a40), hex(0xa8cc60), { flat: 0.6 });
  }
}

function starLeaf(b: GeoBuilder, r: Rand, p: V3, dir: V3, size: number, c0: THREE.Color, c1: THREE.Color) {
  const f = new THREE.Vector3().copy(dir);
  const side = new THREE.Vector3(-f.z, 0, f.x).normalize();
  for (let i = -2; i <= 2; i++) {
    const d = new THREE.Vector3().copy(f).addScaledVector(side, i * 0.62).normalize();
    b.leafLite(p, d, size * (i === 0 ? 1 : 0.85 - Math.abs(i) * 0.08), size * 0.34, c0, c1, 1, 0.1);
  }
}

function maple(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 3.4, trunkR: 0.07, lean: 0.12, crownStart: 0.28, trunkTo: 0.55, main: [5, 9], levels: 2, kids: 3, spread: 0.7, lenF: 0.8, childLenF: 0.62, up: 0.15, taper: 0.5, curl: 0.35, droop: 0.3, bark0: hex(0x4a3a36), bark1: hex(0x6a5650) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  const deep = hex(0x7e0f22);
  const bright = hex(0xd2332f);
  for (const tip of t.tips) {
    const n = Math.round(8 + t.k * 16);
    for (let i = 0; i < n; i++) {
      const th = r() * TAU;
      const rad = r() * 0.45 * ls;
      const p = V(tip.p.x + Math.cos(th) * rad, tip.p.y + (r() - 0.4) * 0.12, tip.p.z + Math.sin(th) * rad);
      starLeaf(b, r, p, V(Math.cos(th) * 0.8, 0.12 + r() * 0.3, Math.sin(th) * 0.8).normalize(), 0.16 * ls, jitter(deep, r, 0.12), jitter(bright, r, 0.1));
    }
  }
}

export const TREE_BUILDERS: Record<string, Builder> = { banyan, peepal, neem, mango, coconut, gulmohar, cherry_blossom: cherry, japanese_maple: maple };

export { foliage, aerialRoots, tint, UP as _UP };
