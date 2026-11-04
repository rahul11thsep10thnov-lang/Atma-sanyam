// The three prototype scenes. Each owns a THREE.Group, its planting slots and
// specimens, and its camera presets. Specimen data here is PROTOTYPE data: a
// deterministic stand-in for what the user's focus sessions would grow.
import * as THREE from 'three';
import { buildGrandBanyan, BanyanStats } from './banyan';
import { buildCorridor } from './corridor';
import { Wildlife } from './wildlife';
import { PLANTS, SPECIES, SPECIES_BY_ID, TREES, specimenGeometry } from './catalog';
import { Diorama, DioramaCfg, PondDef } from './diorama';
import { Garden, Slot, makeSlots } from './garden';
import { GeoBuilder, V, V3, hex, jitter, mix } from './geo';
import { clock, makePlantMaterial, makeRockMaterial, noiseTexture } from './materials';
import { Rand, clamp, fbm2, hashStr, lerp, rng, smoothstep } from './rng';
import { buildTerrain } from './structures';
import { ringPoints } from './structures';

const TAU = Math.PI * 2;

export type SceneName = 'conservatory' | 'arboretum' | 'collection' | 'world-conservatory' | 'world-arboretum';

/** Real-data scenes start empty: the person's own plants are added by the world screen, never fake ones. */
export interface SceneOpts {
  populate?: boolean;
}

export interface View {
  target: V3;
  /** Half-width of ground the view fits, in metres (zoom scales it). */
  fit: number;
  yaw: number;
  pitch: number;
}

export interface ProtoScene {
  readonly name: SceneName;
  readonly group: THREE.Group;
  readonly garden: Garden | null;
  readonly diorama: Diorama | null;
  overview: View;
  closeup: View;
  /** A third camera preset where the scene has one (the arboretum's planted landscape). */
  landscape?: View;
  bound: number;
  minFit: number;
  maxFit: number;
  hide: THREE.Object3D[];
  extraPickables: THREE.Object3D[];
  update(dt: number, t: number): void;
  info(): Record<string, string | number>;
  dispose(): void;
}

export const DEG = Math.PI / 180;

// ---- helpers shared by both dioramas ------------------------------------------------------------------

function distToPolyline(x: number, z: number, line: { x: number; z: number }[]): number {
  let best = 1e9;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  return best;
}

/** Walk a ring or line, splitting where it enters water; the gaps become bridge spans. */
function pathAround(points: V3[], waterDist: (x: number, z: number) => number, margin = 0.3) {
  const lines: V3[][] = [];
  const spans: { a: V3; b: V3 }[] = [];
  let cur: V3[] = [];
  let lastLand: V3 | null = null;
  let gap = false;
  for (const p of points) {
    const inWater = waterDist(p.x, p.z) < margin;
    if (inWater) {
      if (cur.length > 1) lines.push(cur);
      cur = [];
      gap = true;
    } else {
      if (gap && lastLand) spans.push({ a: lastLand, b: p.clone() });
      gap = false;
      cur.push(p);
      lastLand = p;
    }
  }
  if (cur.length > 1) lines.push(cur);
  return { lines, spans };
}

function lanternsAlong(ringR: number, count: number, offset: number, waterDist: (x: number, z: number) => number, phase = 0) {
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * TAU;
    const x = Math.cos(a) * (ringR + offset);
    const z = Math.sin(a) * (ringR + offset);
    if (waterDist(x, z) > 1.2) out.push({ x, z });
  }
  return out;
}

const ZONES_CONS = [
  { name: 'Rose & jasmine terrace', from: -36, to: 36, plants: ['rose', 'jasmine', 'marigold', 'hibiscus'], trees: [] as string[] },
  { name: 'Tropical corner', from: 36, to: 108, plants: ['monstera', 'fern', 'orchid', 'hibiscus'], trees: ['coconut'] },
  { name: 'Blossom grove', from: 108, to: 180, plants: ['lavender', 'jasmine'], trees: ['cherry_blossom', 'japanese_maple', 'gulmohar'] },
  { name: 'Herb & sunflower border', from: -180, to: -108, plants: ['lavender', 'marigold', 'sunflower'], trees: [] as string[] },
  { name: 'Orchard shade', from: -108, to: -36, plants: ['fern', 'monstera', 'lavender'], trees: ['mango', 'neem', 'peepal'] },
];

function zoneOfAngle(zs: typeof ZONES_CONS, x: number, z: number) {
  const a = Math.atan2(z, x) / DEG;
  return zs.find((s) => a >= s.from && a < s.to) ?? zs[0]!;
}

function hashRand(seed: string): number {
  return (hashStr(seed) % 100000) / 100000;
}

// =====================================================================================================
// Scene 1: the Central Conservatory
// =====================================================================================================

export function createConservatory(opts: SceneOpts = {}): ProtoScene {
  const populate = opts.populate !== false;
  const R = 11.6;
  const domeR = 11.2;
  const domeH = 9.2;
  const ponds: PondDef[] = [
    { x: 4.6, z: -3.4, r: 2.4 },
    { x: -3.4, z: 3.2, r: 1.4 },
  ];
  const channel = [
    { x: 3.1, z: -1.6 },
    { x: 2.0, z: 0.4 },
    { x: 0.9, z: 2.2 },
    { x: 0.2, z: 3.6 },
    { x: -1.2, z: 3.9 },
    { x: -2.5, z: 3.5 },
  ];
  const waterDist = (x: number, z: number) => {
    let d = distToPolyline(x, z, channel) - 0.38;
    for (const p of ponds) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - p.r);
    return d;
  };
  const RING = 7.2;
  const waterY = -0.1;
  const height = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    let base = (fbm2(x * 0.17 + 3, z * 0.17, 3) - 0.5) * 0.55;
    base *= smoothstep(1.9, 3.4, r) * smoothstep(0.2, 1.7, Math.abs(r - RING));
    base += 0.06;
    const w = waterDist(x, z);
    const bed = -0.32 - 0.34 * smoothstep(-0.25, -1.4, w);
    let h = lerp(base, bed, smoothstep(0.75, -0.25, w));
    h *= 1 - smoothstep(R - 1.4, R - 0.2, r) * 0.9;
    return h;
  };

  // paths: ring (bridges over the east pond), a south spoke (bridge over the channel), a north-west spoke, a plaza
  const ring = pathAround(ringPoints(RING, 220, 0), waterDist);
  const south = pathAround(
    Array.from({ length: 40 }, (_, i) => V(0, 0, 10.2 - i * 0.2)),
    waterDist,
  );
  const nw = Array.from({ length: 20 }, (_, i) => V(Math.cos(235 * DEG) * (RING + 0.4 + i * 0.16), 0, Math.sin(235 * DEG) * (RING + 0.4 + i * 0.16)));
  const plaza = [ringPoints(1.2, 40, 0), ringPoints(2.1, 60, 0)];
  const paths = [...ring.lines.map((line) => ({ line, width: 1.5 })), ...south.lines.map((line) => ({ line, width: 1.3 })), { line: nw, width: 1.3 }, ...plaza.map((line) => ({ line, width: 0.9 }))];
  const spans = [...ring.spans, ...south.spans].filter((s) => Math.hypot(s.a.x - s.b.x, s.a.z - s.b.z) < 9);
  const bridges = spans.map((s) => {
    const len = Math.hypot(s.a.x - s.b.x, s.a.z - s.b.z);
    return { a: V(s.a.x, waterY + 0.25, s.a.z), b: V(s.b.x, waterY + 0.25, s.b.z), width: len > 3 ? 1.5 : 1.2, arch: Math.min(0.7, 0.18 * len) };
  });

  const sunDir = V(-0.5, 0.78, 0.45).normalize();
  const cfg: DioramaCfg = {
    seed: 4242,
    R,
    domeR,
    domeH,
    domeDetail: 2,
    height,
    waterDist,
    waterY,
    hLo: -0.9,
    hHi: 0.7,
    paths,
    bridges,
    rocks: [
      { x: 6.2, z: -5.6, size: 0.9 },
      { x: 3.3, z: -5.8, size: 0.65 },
      { x: -4.2, z: 2.0, size: 0.55 },
      { x: -6.6, z: -3.4, size: 0.8 },
    ],
    rimRocks: 34,
    lanterns: lanternsAlong(RING, 9, -1.3, waterDist, 0.2),
    centerpiece: true,
    grass: 9000,
    koiPonds: [ponds[0]!, ponds[1]!],
    koi: 7,
    lilies: 14,
    sunDir,
  };
  const dio = new Diorama(cfg);
  const group = new THREE.Group();
  group.add(dio.group);
  // the glass corridor north to the Northern Arboretum (real world only)
  const corridorC = populate ? null : buildCorridor(V(0, 0.05, -(domeR - 0.6)), V(0, 0.05, -(domeR + 9)), 1.35);
  if (corridorC) group.add(corridorC.group);
  const lifeC = new Wildlife(R - 1.5, height, { butterflies: 10, petals: 110, ceiling: 5, seed: 31 });
  group.add(lifeC.group);

  const maxH = (x: number, z: number) => Math.max(0.9, domeH * 0.9 * Math.sqrt(Math.max(0, 1 - (Math.hypot(x, z) / domeR) ** 2)) - 0.7);
  const slots = makeSlots({
    seed: 77,
    radius: 10.6,
    minDist: 0.64,
    tries: 30000,
    ground: height,
    maxH,
    waterY,
    area: (x, z) => {
      const r = Math.hypot(x, z);
      if (r > 10.4 || r < 2.9) return null;
      const w = waterDist(x, z);
      if (w < -0.85) return { zone: 'Lotus pond', water: true };
      if (w < 0.7 || dio.pathEdge(x, z) < 0.5) return null;
      return { zone: zoneOfAngle(ZONES_CONS, x, z).name, water: false };
    },
  });
  const garden = new Garden(slots, dio.plantMat, 1.7);
  group.add(garden.group);

  // prototype population: a deterministic spread of plants and trees
  const r: Rand = rng(99);
  const order = (populate ? slots : []).map((s) => s.id).sort((a, b) => hashRand(`c${a}`) - hashRand(`c${b}`));
  let trees = 0;
  let lotus = 0;
  let plants = 0;
  for (const id of order) {
    const s = slots[id]!;
    if (s.taken || s.blocked) continue;
    if (s.water) {
      if (lotus < 5) {
        garden.add('lotus', 3 + Math.floor(r() * 5), id);
        lotus++;
      }
      continue;
    }
    const zone = ZONES_CONS.find((z) => z.name === s.zone)!;
    const wantTree = zone.trees.length > 0 && trees < 8 && Math.hypot(s.x, s.z) > 6.2 && r() < 0.3;
    if (wantTree) {
      const sp = zone.trees[Math.floor(r() * zone.trees.length)]!;
      if (garden.add(sp, 4 + Math.floor(r() * 4), id)) trees++;
    } else if (plants < 56) {
      const sp = zone.plants[Math.floor(r() * zone.plants.length)]!;
      if (garden.add(sp, 3 + Math.floor(r() * 5), id)) plants++;
    }
  }

  const overview: View = { target: V(0, 1.0, 0), fit: 11.6, yaw: 45 * DEG, pitch: 42 * DEG };
  const closeup: View = { target: V(2.2, 0.7, -0.4), fit: 3.8, yaw: 40 * DEG, pitch: 30 * DEG };
  const scene: ProtoScene = {
    name: populate ? 'conservatory' : 'world-conservatory',
    group,
    garden,
    diorama: dio,
    overview,
    closeup,
    bound: 8,
    minFit: 1.6,
    maxFit: 16,
    hide: [...dio.hideInReflection, garden.group],
    extraPickables: corridorC ? [corridorC.pick] : [],
    update(dt, t) {
      dio.update(dt, t);
      garden.update(t);
      lifeC.update(t);
    },
    info: () => ({ 'planting positions': slots.length, specimens: garden.specimens.size, 'free positions': garden.free.length, 'dome triangles': dio.stats.triangles }),
    dispose() {
      garden.dispose();
      dio.dispose();
      corridorC?.dispose();
      lifeC.dispose();
    },
  };
  return scene;
}

// =====================================================================================================
// Scene 3: the Northern Arboretum and its Grand Banyan
// =====================================================================================================

export interface LandscapeState {
  index: number;
  name: string;
  short: string;
  note: string;
  target: number;
}

export const LANDSCAPE_STATES: LandscapeState[] = [
  { index: 0, short: 'Beginning', name: 'Beginning', note: 'An open landscape with the permanent banyan.', target: 0 },
  { index: 1, short: 'Early', name: 'Early development', note: 'Flowers and small plants appear along the pathway.', target: 34 },
  { index: 2, short: 'Developing', name: 'Developing', note: 'More plants, young trees and pond vegetation.', target: 90 },
  { index: 3, short: 'Flourishing', name: 'Flourishing', note: 'A rich botanical landscape surrounds the banyan.', target: 190 },
];

const POND_ANGLE = 65 * DEG;
const POND_MID = 11.8;

export interface Arboretum extends ProtoScene {
  setState(i: number): void;
  readonly state: number;
  readonly banyan: THREE.Mesh;
  readonly banyanStats: BanyanStats;
}

export function createArboretum(opts: SceneOpts = {}): Arboretum {
  const populate = opts.populate !== false;
  const R = 23;
  const domeR = 22.2;
  const domeH = 17.5;
  const waterY = -0.1;
  const ponds: PondDef[] = [-3, -2, -1, 0, 1, 2, 3].map((k) => ({ x: Math.cos(POND_ANGLE + k * 13 * DEG) * POND_MID, z: Math.sin(POND_ANGLE + k * 13 * DEG) * POND_MID, r: 2.5 - Math.abs(k) * 0.22 }));
  const small: PondDef = { x: Math.cos(142 * DEG) * 19.2, z: Math.sin(142 * DEG) * 19.2, r: 1.9 };
  // channel from the crescent's far end, across the ring path, into the small pond
  const channel = [
    { x: Math.cos(98 * DEG) * 12.4, z: Math.sin(98 * DEG) * 12.4 },
    { x: Math.cos(112 * DEG) * 14.4, z: Math.sin(112 * DEG) * 14.4 },
    { x: Math.cos(124 * DEG) * 16.2, z: Math.sin(124 * DEG) * 16.2 },
    { x: Math.cos(134 * DEG) * 17.9, z: Math.sin(134 * DEG) * 17.9 },
    { x: Math.cos(142 * DEG) * 19.2, z: Math.sin(142 * DEG) * 19.2 },
  ];
  const waterDist = (x: number, z: number) => {
    let d = distToPolyline(x, z, channel) - 0.42;
    for (const p of [...ponds, small]) d = Math.min(d, Math.hypot(x - p.x, z - p.z) - p.r);
    return d;
  };
  const RING = 16.4;
  const height = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    let base = (fbm2(x * 0.12 + 9, z * 0.12, 3) - 0.5) * 0.7;
    base *= smoothstep(3, 6, r) * smoothstep(0.2, 1.8, Math.abs(r - RING));
    base += 0.05 + 0.32 * (1 - smoothstep(0, 7, r)); // a low root-mound under the banyan
    const w = waterDist(x, z);
    const bed = -0.34 - 0.36 * smoothstep(-0.25, -1.5, w);
    let h = lerp(base, bed, smoothstep(0.8, -0.25, w));
    h *= 1 - smoothstep(R - 1.4, R - 0.2, r) * 0.9;
    return h;
  };

  const ring = pathAround(ringPoints(RING, 300, 0), waterDist);
  // spur from the root lawn across the crescent pond to the ring path (bridge 1) and a spoke to the gate
  const spur = pathAround(Array.from({ length: 36 }, (_, i) => V(Math.cos(POND_ANGLE) * (8.4 + i * 0.22), 0, Math.sin(POND_ANGLE) * (8.4 + i * 0.22))), waterDist);
  const gate = Array.from({ length: 26 }, (_, i) => V(Math.cos(-30 * DEG) * (RING + 0.9 + i * 0.2), 0, Math.sin(-30 * DEG) * (RING + 0.9 + i * 0.2)));
  const paths = [...ring.lines.map((line) => ({ line, width: 1.9 })), ...spur.lines.map((line) => ({ line, width: 1.4 })), { line: gate, width: 1.5 }];
  const spans = [...ring.spans, ...spur.spans].filter((s) => Math.hypot(s.a.x - s.b.x, s.a.z - s.b.z) < 11);
  const bridges = spans.map((s) => {
    const len = Math.hypot(s.a.x - s.b.x, s.a.z - s.b.z);
    return { a: V(s.a.x, waterY + 0.28, s.a.z), b: V(s.b.x, waterY + 0.28, s.b.z), width: len > 3.2 ? 1.6 : 1.4, arch: Math.min(0.8, 0.17 * len) };
  });

  const sunDir = V(-0.5, 0.78, 0.45).normalize();
  const cfg: DioramaCfg = {
    seed: 9001,
    R,
    domeR,
    domeH,
    domeDetail: 4,
    height,
    waterDist,
    waterY,
    hLo: -0.9,
    hHi: 0.9,
    paths,
    bridges,
    rocks: [
      { x: 6.5, z: 8.0, size: 0.8 },
      { x: -8.2, z: -5.6, size: 1.0 },
      { x: 9.5, z: -9.0, size: 1.1 },
      { x: -13.4, z: 8.6, size: 0.7 },
      { x: 4.4, z: -3.0, size: 0.6, squash: 0.6 },
    ],
    rimRocks: 54,
    lanterns: lanternsAlong(RING, 14, -1.55, waterDist, 0.12),
    centerpiece: false,
    grass: 13000,
    koiPonds: [ponds[3]!, ponds[2]!, ponds[4]!, small],
    koi: 11,
    lilies: 26,
    sunDir,
    noGrass: (x, z) => Math.hypot(x, z) < 2.4,
  };
  const dio = new Diorama(cfg);
  const group = new THREE.Group();
  group.add(dio.group);
  // the glass corridor south, back to the Central Conservatory (real world only)
  const corridorA = populate ? null : buildCorridor(V(0, 0.05, domeR - 0.8), V(0, 0.05, domeR + 12), 1.7);
  if (corridorA) group.add(corridorA.group);
  const lifeA = new Wildlife(R - 3, height, { butterflies: 16, petals: 220, ceiling: 9, seed: 47 });
  group.add(lifeA.group);

  // ---- the Grand Banyan: built once, never moved, never replaced ---------------------------------------
  const built = buildGrandBanyan();
  const banyan = new THREE.Mesh(built.geometry, dio.plantMat);
  banyan.name = 'grand-banyan';
  banyan.castShadow = true;
  banyan.receiveShadow = true;
  const BS = 1.5; // the landmark's scale: it must dominate the dome
  banyan.scale.setScalar(BS);
  banyan.position.set(0, height(0, 0) - 0.02, 0);
  banyan.userData = { kind: 'banyan', permanent: true, id: 'grand-banyan' };
  group.add(banyan);
  // pick volumes (invisible): trunk and canopy
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const trunkPick = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.9, 9.3, 12), pickMat);
  trunkPick.position.set(0, 4.6, 0);
  const canopyPick = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), pickMat);
  canopyPick.scale.set(12.9, 4.5, 12.9);
  canopyPick.position.set(0, 9.9, 0);
  for (const p of [trunkPick, canopyPick]) {
    p.userData = { kind: 'banyan', permanent: true, id: 'grand-banyan' };
    group.add(p);
  }

  const maxH = (x: number, z: number) => Math.max(1.0, domeH * 0.88 * Math.sqrt(Math.max(0, 1 - (Math.hypot(x, z) / domeR) ** 2)) - 1.2);
  const slots = makeSlots({
    seed: 311,
    radius: 21.4,
    minDist: 1.25,
    tries: 90000,
    ground: height,
    maxH,
    waterY,
    area: (x, z) => {
      const r = Math.hypot(x, z);
      if (r > 21.2 || r < 4.2) return null;
      if (built.stats.pillarAt.some((q) => Math.hypot(q.x * BS - x, q.z * BS - z) < 1.5)) return null;
      const w = waterDist(x, z);
      if (w < -0.9) return { zone: 'Reflecting pond', water: true };
      if (w < 0.7 || dio.pathEdge(x, z) < 0.55) return null;
      if (r < 12.4) return { zone: 'Shade garden', water: false };
      if (r < 15.2) return { zone: 'Banyan meadow', water: false };
      return { zone: 'Outer grove', water: false };
    },
  });
  const garden = new Garden(slots, dio.plantMat, 3.0);
  group.add(garden.group);

  // species chosen per slot once, so states only differ in HOW MANY are planted and how old they are
  const choose = (s: Slot): string => {
    const h = hashRand(`sp${s.id}`);
    if (s.water) return 'lotus';
    if (s.zone === 'Shade garden') return ['fern', 'monstera', 'orchid', 'fern', 'hibiscus'][Math.floor(h * 5)]!;
    if (s.zone === 'Banyan meadow') return ['rose', 'marigold', 'lavender', 'sunflower', 'jasmine', 'hibiscus', 'marigold', 'lavender'][Math.floor(h * 8)]!;
    const trees = ['cherry_blossom', 'japanese_maple', 'gulmohar', 'mango', 'neem', 'peepal', 'coconut'];
    return h < 0.6 ? trees[Math.floor((h / 0.6) * trees.length)]! : ['rose', 'jasmine', 'hibiscus', 'lavender'][Math.floor(((h - 0.6) / 0.4) * 4)]!;
  };
  // people plant along the path and the pond first, and in this demo nearest the front of the dome
  const priority = (s: Slot) => Math.min(dio.pathEdge(s.x, s.z), 6) + hashRand(`pr${s.id}`) * 4.5 + (s.water ? 1.5 : 0) + 0.16 * Math.hypot(s.x - 5, s.z - 11);
  const order = [...slots].sort((a, b) => priority(a) - priority(b));
  let state = -1;
  const banyanStats = built.stats;

  const setState = (i: number) => {
    const st = LANDSCAPE_STATES[clamp(i, 0, 3)]!;
    garden.clear();
    state = st.index;
    const N = st.target;
    let n = 0;
    for (let k = 0; k < order.length && n < N; k++) {
      const s = order[k]!;
      if (s.taken || s.blocked) continue;
      const sp = choose(s);
      const rank = n / Math.max(1, N);
      const age = (1 + st.index * 1.7) * (1 - rank * 0.72);
      const stage = clamp(Math.round(age), 1, 7);
      // young trees only appear once the landscape has developed
      const isTree = SPECIES_BY_ID[sp]?.kind === 'tree';
      if (isTree && st.index < 2) continue;
      if (garden.add(sp, stage, s.id, { animate: true, time: clock.uTime.value + n * 0.03, days: Math.round(stage * 22 + hashRand(`d${s.id}`) * 12) })) n++;
    }
  };
  setState(0);

  const overview: View = { target: V(0, 4.0, 2), fit: 25.5, yaw: 45 * DEG, pitch: 36 * DEG };
  const closeup: View = { target: V(0, 6.2, 0), fit: 13, yaw: 40 * DEG, pitch: 22 * DEG };
  // where the planted landscape is best seen: the pond, the path and the plantings, with the banyan behind
  const landscape: View = { target: V(5.0, 1.8, 11.0), fit: 12.5, yaw: 45 * DEG, pitch: 34 * DEG };
  const scene: Arboretum = {
    name: populate ? 'arboretum' : 'world-arboretum',
    group,
    garden,
    diorama: dio,
    overview,
    closeup,
    bound: 12,
    minFit: 2.2,
    maxFit: 30,
    hide: [...dio.hideInReflection, garden.group],
    landscape,
    extraPickables: corridorA ? [trunkPick, canopyPick, corridorA.pick] : [trunkPick, canopyPick],
    update(dt, t) {
      dio.update(dt, t);
      garden.update(t);
      lifeA.update(t);
    },
    info: () => ({ 'planting positions': slots.length, specimens: garden.specimens.size, 'free positions': garden.free.length, 'banyan triangles': built.stats.triangles, 'dome triangles': dio.stats.triangles }),
    setState,
    get state() {
      return state;
    },
    banyan,
    banyanStats,
    dispose() {
      garden.dispose();
      dio.dispose();
      built.geometry.dispose();
      corridorA?.dispose();
      lifeA.dispose();
    },
  };
  return scene;
}

// =====================================================================================================
// Scene 2: the plant and tree collection
// =====================================================================================================

export interface Collection extends ProtoScene {
  setMode(mode: 'shelf' | 'trees' | 'growth', speciesId: string, stage: number): void;
  labels(project: (v: THREE.Vector3) => { x: number; y: number } | null): { id: string; speciesId: string; name: string; x: number; y: number }[];
  readonly mode: 'shelf' | 'trees' | 'growth';
}

export function createCollection(): Collection {
  const group = new THREE.Group();
  const plantMat = makePlantMaterial();
  const bump = noiseTexture(128, 8);
  const stoneMat = makeRockMaterial(bump, 0.7);
  stoneMat.bumpScale = 0.4;
  const r = rng(5);

  // a calm stone terrace to stand the specimens on
  const floor = new THREE.Mesh(
    buildTerrain({
      R: 30,
      height: () => 0,
      rings: 24,
      segs: 96,
      color: (x, z) => jitter(mix(hex(0xe8dfcd), hex(0xc9bfa9), smoothstep(8, 28, Math.hypot(x, z)) + fbm2(x * 0.4, z * 0.4, 2) * 0.15), r, 0.02),
    }),
    stoneMat,
  );
  floor.receiveShadow = true;
  group.add(floor);

  const pedestalGeo = new THREE.CylinderGeometry(1, 1.12, 0.22, 20);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.55, metalness: 0.0 });
  const basinGeo = new THREE.CylinderGeometry(1, 1.1, 0.36, 24);
  const waterGeo = new THREE.CircleGeometry(0.92, 24);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f6d66, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.9 });

  const items = new THREE.Group();
  group.add(items);
  const meshes: { id: string; speciesId: string; stage: number; pos: THREE.Vector3; top: number }[] = [];
  const pickables: THREE.Mesh[] = [];
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  let mode: 'shelf' | 'trees' | 'growth' = 'shelf';

  // The gallery is laid out in SCREEN space (u across, v towards the viewer) so it
  // fits a portrait phone; plants are shown larger and trees smaller than life, on
  // pedestals, so the whole collection is comparable. (A display scale, not real size.)
  const GYAW = 45 * DEG;
  const PLANT_DS = 2.3;
  const TREE_DS = 0.5;
  const place = (speciesId: string, stage: number, u: number, v: number, ped: number) => {
    const x = u * Math.cos(GYAW) + v * Math.sin(GYAW);
    const z = -u * Math.sin(GYAW) + v * Math.cos(GYAW);
    const sp = SPECIES_BY_ID[speciesId]!;
    const ds = sp.kind === 'tree' ? TREE_DS : PLANT_DS;
    const built = specimenGeometry(speciesId, stage, 0);
    const baseY = 0.22;
    const pg = new THREE.Mesh(sp.water ? basinGeo : pedestalGeo, pedMat);
    pg.scale.set(ped, 1, ped);
    pg.position.set(x, baseY / 2, z);
    pg.receiveShadow = true;
    pg.castShadow = true;
    items.add(pg);
    let y = baseY;
    if (sp.water) {
      const w = new THREE.Mesh(waterGeo, waterMat);
      w.scale.set(ped, 1, ped);
      w.position.set(x, 0.3, z);
      items.add(w);
      y = 0.3;
    }
    const m = new THREE.Mesh(built.geometry, plantMat);
    m.position.set(x, y, z);
    m.scale.setScalar(ds);
    m.rotation.y = (hashStr(speciesId + stage) % 628) / 100;
    m.castShadow = true;
    m.receiveShadow = true;
    items.add(m);
    const id = `${speciesId}:${stage}`;
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), proxyMat);
    const h = built.height * ds;
    const w = Math.max(0.5, Math.min(2.2, h * 0.3));
    proxy.scale.set(w, h, w);
    proxy.position.set(x, y + h / 2, z);
    proxy.userData = { kind: 'collection', id, speciesId, stage };
    items.add(proxy);
    pickables.push(proxy);
    meshes.push({ id, speciesId, stage, pos: new THREE.Vector3(x, y, z), top: y + h });
  };

  const clear = () => {
    for (const c of [...items.children]) {
      items.remove(c);
      const m = c as THREE.Mesh;
      if (m.geometry && m.geometry !== pedestalGeo && m.geometry !== basinGeo && m.geometry !== waterGeo && !(m.material === plantMat)) {
        if ((m.material as THREE.Material) === proxyMat) m.geometry.dispose();
      }
    }
    meshes.length = 0;
    pickables.length = 0;
  };

  const overview: View = { target: V(0, 1.6, 0), fit: 9.5, yaw: GYAW, pitch: 36 * DEG };
  const closeup: View = { target: V(0, 1.2, 0), fit: 3.6, yaw: GYAW, pitch: 22 * DEG };

  const scene: Collection = {
    name: 'collection',
    group,
    garden: null,
    diorama: null,
    overview,
    closeup,
    bound: 14,
    minFit: 1.4,
    maxFit: 24,
    hide: [],
    extraPickables: pickables,
    get mode() {
      return mode;
    },
    setMode(m, speciesId, stage) {
      mode = m;
      clear();
      if (m === 'shelf') {
        // plants in two rows nearest the viewer, trees in two rows behind
        // the thirty plants, six to a row
        const stg = clamp(stage, 1, 7);
        PLANTS.forEach((p, i) => place(p.id, stg, ((i % 6) - 2.5) * 2.1, 6 - Math.floor(i / 6) * 2.6, 1.0));
        overview.fit = 9.4;
        overview.target.set(0, 1.2, 0.8);
      } else if (m === 'trees') {
        const stg = clamp(stage, 1, 7);
        TREES.forEach((t, i) => place(t.id, stg, ((i % 5) - 2) * 4.2, 8 - Math.floor(i / 5) * 4.6, 1.6));
        overview.fit = 13;
        overview.target.set(0, 2.2, 1.2);
      } else {
        const sp = SPECIES_BY_ID[speciesId] ?? SPECIES[0]!;
        const tree = sp.kind === 'tree';
        const span = tree ? 3.0 : 2.0;
        for (let s = 1; s <= 7; s++) place(sp.id, s, (s - 4) * span, 0, tree ? 1.6 : 1.0);
        overview.fit = tree ? 11.2 : 7.4;
        overview.target.set(0, tree ? 1.8 : 1.4, 0);
      }
    },
    labels(project) {
      return meshes.map((m) => {
        const p = project(new THREE.Vector3(m.pos.x, m.pos.y - 0.28, m.pos.z));
        return p ? { id: m.id, speciesId: m.speciesId, name: SPECIES_BY_ID[m.speciesId]!.name, x: p.x, y: p.y } : { id: m.id, speciesId: m.speciesId, name: '', x: -999, y: -999 };
      });
    },
    update(_dt, t) {
      clock.uTime.value = t;
    },
    info: () => ({ specimens: meshes.length, mode }),
    dispose() {
      clear();
      pedestalGeo.dispose();
      basinGeo.dispose();
      waterGeo.dispose();
      floor.geometry.dispose();
    },
  };
  scene.setMode('shelf', 'rose', 5);
  void GeoBuilder;
  return scene;
}

export { SPECIES, PLANTS, TREES };
