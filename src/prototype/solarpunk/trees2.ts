// The trees that complete the catalogue. Each uses the shared branching
// skeleton (growTree) with its own form and then its own dressing: the
// Ashoka's narrow weeping column, the Jacaranda's open umbrella of violet,
// the Olive's twisted hollow trunk and silver leaves, citrus crowns hung
// with fruit, the Apple's blossom then red fruit, the Cypress's dark flame,
// the Pine's tiers of needles, the Amaltas's hanging golden chains, the
// Kadamba's tiered branches with orange ball flowers, the Magnolia's goblets.
import * as THREE from 'three';
import { GeoBuilder, V, bezier, hex, jitter, mix } from './geo';
import { Builder, mature } from './plants';
import { Rand } from './rng';
import { SCALE, TreeParams, foliage, growTree } from './trees';

const TAU = Math.PI * 2;

function fruit(b: GeoBuilder, r: Rand, tips: { p: THREE.Vector3 }[], n: number, R: number, c0: THREE.Color, c1: THREE.Color, spread: number) {
  for (let i = 0; i < n; i++) {
    const tip = tips[Math.floor(r() * tips.length)]!;
    const p = V(tip.p.x + (r() - 0.5) * spread, tip.p.y - r() * spread * 0.5, tip.p.z + (r() - 0.5) * spread);
    b.blob(p, R, R * 1.05, R, jitter(c0, r, 0.06), c1, 6, 4, 0.2);
  }
}

// ---- Ashoka: tall, narrow, conical, with drooping wavy leaves ----------------------------------
function ashoka(b: GeoBuilder, r: Rand, st: number) {
  const sc = SCALE[st - 1]!;
  const k = mature(st);
  const H = 6.5 * sc;
  const trunk = bezier(V(0, 0, 0), V(0.02, H * 0.33, 0), V(-0.02, H * 0.66, 0.01), V(0, H, 0), 10);
  b.tube(trunk, (t) => 0.13 * Math.pow(sc, 0.8) * (1 - t * 0.85), 7, hex(0x4a3a30), hex(0x6a5848));
  const tiers = 6 + Math.round(k * 16);
  for (let i = 0; i < tiers; i++) {
    const t = 0.12 + (i / tiers) * 0.88;
    const y = H * t;
    const rad = (1 - t) * 0.9 * sc + 0.12;
    const a = i * 2.39;
    const c = V(Math.cos(a) * rad * 0.4, y, Math.sin(a) * rad * 0.4);
    const n = Math.round(10 + k * 14);
    for (let j = 0; j < n; j++) {
      const la = r() * TAU;
      const p = V(c.x + Math.cos(la) * rad * r(), y + (r() - 0.5) * 0.2, c.z + Math.sin(la) * rad * r());
      b.leafLite(p, V(Math.cos(la) * 0.4, -1, Math.sin(la) * 0.4).normalize(), 0.24 * (0.5 + 0.5 * sc), 0.04, jitter(hex(0x1a4a22), r, 0.08), jitter(hex(0x3f8a3a), r, 0.08), 1, 0.35);
    }
  }
}

// ---- Jacaranda: open spreading umbrella, ferny leaves, clouds of violet trumpets ----------------
function jacaranda(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 5.4, trunkR: 0.2, lean: 0.05, crownStart: 0.4, trunkTo: 0.45, main: [3, 5], levels: 2, kids: 3, spread: 1.05, lenF: 0.95, childLenF: 0.6, up: 0.35, taper: 0.7, curl: 0.5, droop: 0.1, bark0: hex(0x5a5048), bark1: hex(0x7a6e64) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) {
    foliage(b, r, tip.p, (0.4 + 0.45 * t.sc) * 0.9, Math.round(14 + t.k * 24), 0.12 * ls, 0.04 * ls, hex(0x3a7a30), hex(0x8ac050), { flat: 0.4, up: 0.4 });
    if (st >= 5) {
      const n = Math.round(10 + (st - 5) * 14);
      for (let i = 0; i < n; i++) {
        const c = V(tip.p.x + (r() - 0.5) * 0.9 * ls, tip.p.y + 0.05 + r() * 0.3, tip.p.z + (r() - 0.5) * 0.9 * ls);
        b.leafLite(c, V(r() - 0.5, 0.6, r() - 0.5).normalize(), 0.09 * ls, 0.07 * ls, jitter(hex(0x6a4ab8), r, 0.08), jitter(hex(0xa688e0), r, 0.06), 1, 0.02);
      }
    }
  }
}

// ---- Olive: a short, twisted, often split trunk; small silvery leaves; olives ----------------
function olive(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 3.8, trunkR: 0.2, lean: 0.18, crownStart: 0.3, trunkTo: 0.4, main: [3, 6], levels: 2, kids: 3, spread: 0.8, lenF: 0.75, childLenF: 0.6, up: 0.45, taper: 0.6, curl: 0.8, droop: 0.15, bark0: hex(0x5a5248), bark1: hex(0x8a8274), trunks: st >= 5 ? 2 : 1 };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) foliage(b, r, tip.p, (0.38 + 0.5 * t.sc) * 0.85, Math.round(40 + t.k * 60), 0.15 * ls, 0.04 * ls, hex(0x56664c), hex(0xb4c0aa), { flat: 0.7, up: 0.3, droop: 0.1 });
  if (st >= 6) fruit(b, r, t.tips, 18 + (st - 6) * 18, 0.018, hex(0x3a4a20), hex(0x2a2a20), 0.6 * ls);
}

// ---- Citrus: compact round crowns of glossy leaves, white blossom then fruit --------------
function citrus(fruitTop: number, fruitBottom: number, H: number, R: number) {
  return (b: GeoBuilder, r: Rand, st: number) => {
    const P: TreeParams = { H, trunkR: 0.09, lean: 0.03, crownStart: 0.25, trunkTo: 0.35, main: [4, 7], levels: 2, kids: 3, spread: 0.75, lenF: 0.6, childLenF: 0.6, up: 0.55, taper: 0.55, curl: 0.35, droop: 0.15, bark0: hex(0x4a4238), bark1: hex(0x6a6052) };
    const t = growTree(b, r, st, P);
    const ls = 0.55 + 0.45 * t.sc;
    for (const tip of t.tips) foliage(b, r, tip.p, (0.35 + 0.4 * t.sc) * 0.9, Math.round(22 + t.k * 34), 0.11 * ls, 0.05 * ls, hex(0x14401f), hex(0x3a8030), { flat: 0.9, up: 0.25 });
    if (st === 5) fruit(b, r, t.tips, 20, 0.012, hex(0xfaf6ee), hex(0xf0e8d0), 0.5 * ls);
    if (st >= 6) fruit(b, r, t.tips, 10 + (st - 6) * 14, R, hex(fruitTop), hex(fruitBottom), 0.55 * ls);
  };
}

// ---- Apple: a spreading open crown; pink-white blossom at 5, red fruit at 6-7 ---------------
function apple(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 4.2, trunkR: 0.13, lean: 0.06, crownStart: 0.3, trunkTo: 0.4, main: [3, 6], levels: 2, kids: 3, spread: 0.95, lenF: 0.75, childLenF: 0.6, up: 0.35, taper: 0.6, curl: 0.45, droop: 0.25, bark0: hex(0x4a3c34), bark1: hex(0x6a5a4c) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) foliage(b, r, tip.p, (0.4 + 0.45 * t.sc) * 0.9, Math.round(20 + t.k * 30), 0.1 * ls, 0.055 * ls, hex(0x2a5a28), hex(0x6a9a40), { flat: 0.7, up: 0.3 });
  if (st === 5) for (const tip of t.tips) for (let i = 0; i < 8; i++) b.leafLite(V(tip.p.x + (r() - 0.5) * 0.6 * ls, tip.p.y + r() * 0.25, tip.p.z + (r() - 0.5) * 0.6 * ls), V(r() - 0.5, 0.7, r() - 0.5).normalize(), 0.06 * ls, 0.06 * ls, hex(0xf4c8d4), hex(0xfcf2f4), 1, 0.02);
  if (st >= 6) fruit(b, r, t.tips, 12 + (st - 6) * 16, 0.045, hex(0xc8202a), hex(0x8a3a20), 0.6 * ls);
}

// ---- Cypress: a dense, narrow, dark-green flame -------------------------------------------------
function cypress(b: GeoBuilder, r: Rand, st: number) {
  const sc = SCALE[st - 1]!;
  const k = mature(st);
  const H = 7 * sc;
  b.tube([V(0, 0, 0), V(0, H * 0.9, 0)], (t) => 0.1 * Math.pow(sc, 0.8) * (1 - t * 0.8), 6, hex(0x4a3a2e), hex(0x6a5444));
  const n = Math.round(120 + k * 380);
  for (let i = 0; i < n; i++) {
    const y = H * (0.05 + 0.95 * Math.pow(r(), 0.8));
    const t = y / H;
    const prof = Math.sin(Math.min(1, t * 1.25) * Math.PI) * (0.35 * sc + 0.05) * (1 - t * 0.35);
    const a = r() * TAU;
    const rad = prof * Math.sqrt(r());
    const p = V(Math.cos(a) * rad, y, Math.sin(a) * rad);
    b.leafLite(p, V(Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3).normalize(), 0.12 * (0.5 + 0.5 * sc), 0.035, jitter(hex(0x10301c), r, 0.08), jitter(hex(0x2f5a2e), r, 0.08), 0.6, 0.05);
  }
}

// ---- Pine: a straight trunk and whorled tiers of needle tufts ------------------------------
function pine(b: GeoBuilder, r: Rand, st: number) {
  const sc = SCALE[st - 1]!;
  const k = mature(st);
  const H = 7.5 * sc;
  b.tube([V(0, 0, 0), V(0, H * 0.5, 0), V(0, H, 0)], (t) => 0.16 * Math.pow(sc, 0.8) * (1 - t * 0.88), 7, hex(0x5a3a28), hex(0x8a5a3a));
  const tiers = 3 + Math.round(k * 6);
  for (let i = 0; i < tiers; i++) {
    const t = 0.3 + (i / tiers) * 0.68;
    const y = H * t;
    const L = (1 - t) * 1.6 * sc + 0.15;
    const arms = 5 + Math.round(r() * 2);
    for (let a = 0; a < arms; a++) {
      const th = (a / arms) * TAU + i;
      const end = V(Math.cos(th) * L, y - L * 0.15, Math.sin(th) * L);
      b.tube([V(0, y, 0), end], (u) => 0.03 * sc * (1 - u * 0.8) + 0.004, 4, hex(0x5a3a28), hex(0x7a5236));
      for (let s = 0; s < 4; s++) {
        const c = new THREE.Vector3().lerpVectors(V(0, y, 0), end, 0.4 + s * 0.2);
        for (let q = 0; q < 8; q++) b.leafLite(c, V(r() - 0.5, 0.4 + r() * 0.5, r() - 0.5).normalize(), 0.12 * (0.5 + 0.5 * sc), 0.012, hex(0x1a3a22), hex(0x3a6a34), 0.6, 0.05);
      }
    }
  }
}

// ---- Magnolia: a rounded crown of large glossy leaves and big creamy goblet flowers -----------
function magnolia(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 4.8, trunkR: 0.16, lean: 0.04, crownStart: 0.3, trunkTo: 0.45, main: [3, 6], levels: 2, kids: 3, spread: 0.75, lenF: 0.65, childLenF: 0.6, up: 0.55, taper: 0.6, curl: 0.3, droop: 0.15, bark0: hex(0x6a6258), bark1: hex(0x8a8274) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) {
    foliage(b, r, tip.p, (0.4 + 0.45 * t.sc) * 0.85, Math.round(12 + t.k * 18), 0.2 * ls, 0.09 * ls, hex(0x14401f), hex(0x3a7a30), { flat: 0.8, up: 0.25 });
    if (st >= 5) for (let i = 0; i < 1 + (st - 5) * 2; i++) {
      const c = V(tip.p.x + (r() - 0.5) * 0.5 * ls, tip.p.y + 0.1 + r() * 0.2, tip.p.z + (r() - 0.5) * 0.5 * ls);
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * TAU;
        b.leafLite(c, V(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize(), 0.12 * ls, 0.06 * ls, hex(0xf0d8d8), hex(0xfcf6ee), 0.8, 0.0);
      }
    }
  }
}

// ---- Amaltas: open crown, long hanging chains of golden flowers ------------------------------
function amaltas(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 5.2, trunkR: 0.17, lean: 0.06, crownStart: 0.38, trunkTo: 0.5, main: [3, 6], levels: 2, kids: 3, spread: 0.85, lenF: 0.8, childLenF: 0.6, up: 0.45, taper: 0.6, curl: 0.4, droop: 0.2, bark0: hex(0x6a5e52), bark1: hex(0x8c8070) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) {
    foliage(b, r, tip.p, (0.35 + 0.4 * t.sc) * 0.8, Math.round(10 + t.k * 16), 0.13 * ls, 0.055 * ls, hex(0x2a6a28), hex(0x7ab04a), { flat: 0.6 });
    if (st >= 5) for (let i = 0; i < 2 + (st - 5) * 3; i++) {
      const top = V(tip.p.x + (r() - 0.5) * 0.6 * ls, tip.p.y, tip.p.z + (r() - 0.5) * 0.6 * ls);
      const L = (0.3 + r() * 0.3) * ls;
      b.tube([top, V(top.x, top.y - L, top.z)], () => 0.004, 3, hex(0x7a8a30), hex(0x7a8a30));
      for (let q = 0; q < 10; q++) b.blob(V(top.x + (r() - 0.5) * 0.04, top.y - (q / 10) * L, top.z + (r() - 0.5) * 0.04), 0.022 * ls, 0.018 * ls, 0.022 * ls, hex(0xf8d830), hex(0xe8b820), 5, 3, 0.4);
    }
  }
}

// ---- Kadamba: a straight trunk with horizontal tiers of big leaves and orange ball flowers ----
function kadamba(b: GeoBuilder, r: Rand, st: number) {
  const P: TreeParams = { H: 6.2, trunkR: 0.2, lean: 0.01, crownStart: 0.35, trunkTo: 0.85, main: [5, 9], levels: 1, kids: 3, spread: 1.35, lenF: 0.5, childLenF: 0.55, up: 0.05, taper: 0.65, curl: 0.15, droop: 0.12, bark0: hex(0x5a4a3e), bark1: hex(0x7a6a5a) };
  const t = growTree(b, r, st, P);
  const ls = 0.55 + 0.45 * t.sc;
  for (const tip of t.tips) {
    foliage(b, r, tip.p, (0.4 + 0.4 * t.sc) * 0.85, Math.round(14 + t.k * 18), 0.2 * ls, 0.1 * ls, hex(0x1a4a22), hex(0x4a8a34), { flat: 0.4, up: 0.2 });
    if (st >= 6) for (let i = 0; i < 3 + (st - 6) * 4; i++) b.blob(V(tip.p.x + (r() - 0.5) * 0.6 * ls, tip.p.y + (r() - 0.5) * 0.2, tip.p.z + (r() - 0.5) * 0.6 * ls), 0.05 * ls, 0.05 * ls, 0.05 * ls, hex(0xf2a030), mix(hex(0xf2a030), hex(0xf8e8a0), 0.5), 7, 5, 0.2, r, 0.25);
  }
}

export const TREE_BUILDERS_2: Record<string, Builder> = {
  ashoka, jacaranda, olive, lemon: citrus(0xf4e040, 0xd8c030, 3.2, 0.035), orange: citrus(0xf2902a, 0xd8701a, 3.8, 0.042), apple, cypress,
  pine, magnolia, amaltas, kadamba,
};
