// Planting slots and the specimens that grow in them. This is the part that
// must become the real thing in production: a slot is a fixed, persistent
// planting position, a specimen is one grown plant at one growth stage. The
// banyan is NOT a specimen and has no slot: nothing here can move, remove or
// replace it.
import * as THREE from 'three';
import { SPECIES_BY_ID, specimenGeometry } from './catalog';
import { V } from './geo';
import { Rand, hashStr, rng } from './rng';

export interface Slot {
  id: number;
  x: number;
  y: number;
  z: number;
  water: boolean;
  zone: string;
  taken: string | null;
  /** Too close to a larger specimen to plant in. */
  blocked: boolean;
  /** Tallest a specimen may be here (under the dome). */
  maxH: number;
}

export interface Specimen {
  id: string;
  speciesId: string;
  stage: number;
  slot: number;
  mesh: THREE.Mesh;
  proxy: THREE.Mesh;
  baseScale: number;
  lod: number;
  born: number;
  /** Simulated: days since planted (prototype data, not real focus time). */
  simDays: number;
}

export interface SlotGen {
  seed: number;
  radius: number;
  minDist: number;
  tries: number;
  area: (x: number, z: number) => { zone: string; water: boolean } | null;
  ground: (x: number, z: number) => number;
  maxH: (x: number, z: number) => number;
  waterY: number;
}

/** Dart-throwing Poisson-disc scatter: natural, never a grid. */
export function makeSlots(g: SlotGen): Slot[] {
  const r: Rand = rng(g.seed);
  const cell = g.minDist / Math.SQRT2;
  const n = Math.ceil((g.radius * 2) / cell);
  const grid = new Int32Array(n * n).fill(-1);
  const slots: Slot[] = [];
  for (let i = 0; i < g.tries; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * g.radius;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const area = g.area(x, z);
    if (!area) continue;
    const gx = Math.floor((x + g.radius) / cell);
    const gz = Math.floor((z + g.radius) / cell);
    let ok = true;
    for (let dx = -2; dx <= 2 && ok; dx++) {
      for (let dz = -2; dz <= 2 && ok; dz++) {
        const ix = gx + dx;
        const iz = gz + dz;
        if (ix < 0 || iz < 0 || ix >= n || iz >= n) continue;
        const k = grid[iz * n + ix]!;
        if (k >= 0 && Math.hypot(slots[k]!.x - x, slots[k]!.z - z) < g.minDist) ok = false;
      }
    }
    if (!ok) continue;
    grid[gz * n + gx] = slots.length;
    slots.push({ id: slots.length, x, y: area.water ? g.waterY : g.ground(x, z), z, water: area.water, zone: area.zone, taken: null, blocked: false, maxH: g.maxH(x, z) });
  }
  return slots;
}

/** How much ground a grown specimen occupies, in metres. */
export function footprint(speciesId: string, stage: number): number {
  const s = SPECIES_BY_ID[speciesId];
  if (!s) return 0.5;
  if (s.kind === 'tree') return 0.5 + stage * 0.22;
  return 0.15 + stage * 0.045;
}

const proxyGeom = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
proxyGeom.translate(0, 0.5, 0);
const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

export class Garden {
  readonly group = new THREE.Group();
  readonly specimens = new Map<string, Specimen>();
  readonly proxies: THREE.Mesh[] = [];
  private markers: THREE.InstancedMesh;
  private markerSlots: number[] = [];
  private counter = 0;

  constructor(
    readonly slots: Slot[],
    private material: THREE.Material,
    /** Small plants are drawn this much larger than life (the existing garden's convention). */
    private plantBoost = 1,
  ) {
    const ring = new THREE.RingGeometry(0.34, 0.5, 20);
    ring.rotateX(-Math.PI / 2);
    this.markers = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }), Math.max(1, slots.length));
    this.markers.count = 0;
    this.markers.frustumCulled = false;
    this.markers.renderOrder = 5;
    this.group.add(this.markers);
  }

  get free(): Slot[] {
    return this.slots.filter((s) => !s.taken && !s.blocked);
  }

  /** Plant a specimen. Returns null if the slot is taken or blocked. */
  add(speciesId: string, stage: number, slotId: number, o: { animate?: boolean; time?: number; days?: number; id?: string; force?: boolean; at?: { x: number; z: number } } = {}): Specimen | null {
    const slot = this.slots[slotId];
    const sp = SPECIES_BY_ID[speciesId];
    if (!slot || !sp || slot.taken || (slot.blocked && !o.force)) return null;
    if (slot.water !== !!sp.water) return null;
    const variant = slotId % 3;
    const built = specimenGeometry(speciesId, stage, variant, 2);
    const baseScale = this.scaleFor(sp.kind, slot, built.height);
    const mesh = new THREE.Mesh(built.geometry, this.material);
    // a saved specimen stands exactly where it was planted, even if the floor's positions are ever regenerated
    mesh.position.set(o.at?.x ?? slot.x, slot.y, o.at?.z ?? slot.z);
    mesh.rotation.y = (hashStr(`${slotId}`) % 628) / 100;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(o.animate ? 0.01 : baseScale);
    const proxy = new THREE.Mesh(proxyGeom, proxyMat);
    const w = Math.max(0.25, footprint(speciesId, stage) * 0.7) * baseScale;
    proxy.position.copy(mesh.position);
    proxy.scale.set(w, Math.max(0.3, built.height * baseScale), w);
    const id = o.id ?? `${speciesId}-${slotId}-${this.counter++}`;
    proxy.userData = { kind: 'specimen', id };
    const spec: Specimen = { id, speciesId, stage, slot: slotId, mesh, proxy, baseScale, lod: 2, born: o.time ?? 0, simDays: o.days ?? 0 };
    mesh.userData = { kind: 'specimen', id };
    slot.taken = id;
    this.specimens.set(id, spec);
    this.proxies.push(proxy);
    this.group.add(mesh);
    this.group.add(proxy);
    this.block(slot, speciesId, stage);
    return spec;
  }

  private scaleFor(kind: 'plant' | 'tree', slot: Slot, height: number): number {
    const boost = kind === 'plant' ? this.plantBoost : 1;
    return Math.min(boost, Math.max(0.2, slot.maxH / Math.max(0.01, height)));
  }

  private block(slot: Slot, speciesId: string, stage: number) {
    const fr = footprint(speciesId, stage) * (SPECIES_BY_ID[speciesId]?.kind === 'plant' ? this.plantBoost : 1);
    for (const s of this.slots) if (s !== slot && s.water === slot.water && Math.hypot(s.x - slot.x, s.z - slot.z) < fr) s.blocked = true;
  }

  private reblock() {
    for (const s of this.slots) s.blocked = false;
    for (const sp of this.specimens.values()) this.block(this.slots[sp.slot]!, sp.speciesId, sp.stage);
  }

  remove(id: string) {
    const sp = this.specimens.get(id);
    if (!sp) return;
    this.group.remove(sp.mesh, sp.proxy);
    this.proxies.splice(this.proxies.indexOf(sp.proxy), 1);
    this.slots[sp.slot]!.taken = null;
    this.specimens.delete(id);
    this.reblock();
  }

  clear() {
    for (const id of [...this.specimens.keys()]) this.remove(id);
  }

  /** Give a specimen its next (or any) growth stage; its shape changes, it is not scaled. */
  setStage(id: string, stage: number): Specimen | null {
    const sp = this.specimens.get(id);
    if (!sp) return null;
    const st = Math.max(1, Math.min(7, stage));
    const slot = this.slots[sp.slot]!;
    const built = specimenGeometry(sp.speciesId, st, sp.slot % 3, sp.lod);
    sp.stage = st;
    sp.mesh.geometry = built.geometry;
    sp.baseScale = this.scaleFor(SPECIES_BY_ID[sp.speciesId]!.kind, slot, built.height);
    sp.mesh.scale.setScalar(sp.baseScale);
    const w = Math.max(0.25, footprint(sp.speciesId, st) * 0.7) * sp.baseScale;
    sp.proxy.scale.set(w, Math.max(0.3, built.height * sp.baseScale), w);
    this.reblock();
    return sp;
  }

  /**
   * Level of detail by size on screen: far specimens use thinned geometry (the
   * same shape, fewer, larger leaves). `px` returns a specimen's height in
   * screen pixels. Returns how many specimens changed level.
   */
  updateLod(px: (s: Specimen) => number): number {
    let changed = 0;
    for (const sp of this.specimens.values()) {
      const h = px(sp);
      // hysteresis: a specimen must clearly cross a threshold before it changes level
      let want = sp.lod;
      if (sp.lod > 0 && h > (sp.lod === 2 ? 56 : 150)) want = sp.lod - 1;
      else if (sp.lod < 2 && h < (sp.lod === 0 ? 90 : 30)) want = sp.lod + 1;
      if (want === sp.lod) continue;
      sp.lod = want;
      const built = specimenGeometry(sp.speciesId, sp.stage, sp.slot % 3, want);
      sp.mesh.geometry = built.geometry;
      changed++;
    }
    return changed;
  }

  /** Light up the free slots (land or water) so a plant can be placed. */
  showMarkers(kind: 'land' | 'water' | null, size = 1) {
    if (!kind) {
      this.markers.count = 0;
      this.markerSlots = [];
      return;
    }
    const m = new THREE.Matrix4();
    this.markerSlots = [];
    for (const s of this.slots) {
      if (s.taken || s.blocked || s.water !== (kind === 'water')) continue;
      m.compose(new THREE.Vector3(s.x, s.y + 0.05, s.z), new THREE.Quaternion(), new THREE.Vector3(size, 1, size));
      this.markers.setMatrixAt(this.markerSlots.length, m);
      this.markerSlots.push(s.id);
    }
    this.markers.count = this.markerSlots.length;
    this.markers.instanceMatrix.needsUpdate = true;
  }

  get markerCount() {
    return this.markerSlots.length;
  }

  /** The free slot nearest a ground point, if close enough. */
  nearestMarker(x: number, z: number, within = 1.1): Slot | null {
    let best: Slot | null = null;
    let bd = within;
    for (const id of this.markerSlots) {
      const s = this.slots[id]!;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  /** Growth-in animation for new specimens. */
  update(t: number) {
    for (const sp of this.specimens.values()) {
      const age = t - sp.born;
      if (age >= 0 && age < 1.2) {
        const k = Math.min(1, age / 1.0);
        const e = 1 - Math.pow(1 - k, 3);
        sp.mesh.scale.setScalar(Math.max(0.01, sp.baseScale * (0.15 + 0.85 * e)));
      } else if (sp.mesh.scale.x !== sp.baseScale && age >= 1.2) sp.mesh.scale.setScalar(sp.baseScale);
    }
  }

  dispose() {
    this.clear();
    this.markers.geometry.dispose();
    (this.markers.material as THREE.Material).dispose();
  }
}

export const _V = V;
