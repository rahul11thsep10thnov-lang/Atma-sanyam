// The 3D garden's state and every rule that changes it: things stand
// anywhere on the lawn (metres from the centre), can be dragged like a
// cursor, stacked on planter stands, put away, thrown into the dustbin,
// and grow with completed sessions. Penalties leave only for coins.
import { STORE } from '../spaces/catalog';
import { PlacedItem, SpaceState, StoredItem, WILT_BELOW, stageIndexFor } from '../spaces/model';
import { Atmosphere } from '../spaces/model';
import { SPRITES } from './sprites.generated';
import { Sprite, SpriteItem } from './types';

export interface GardenItem {
  uid: string;
  itemId: string;
  /** Metres from the garden centre; +x east, +z toward the viewer (south). */
  x: number;
  z: number;
  placedAt: number;
  minutes?: number;
  health?: number;
  artId?: string | null;
  /** Standing on a planter stand: the stand's uid and the level (0 bottom). */
  standUid?: string;
  level?: number;
}

export interface GardenState {
  schemaVersion: 3;
  version: number;
  items: GardenItem[];
  stored: StoredItem[];
  focus: { minutes: number; health: number };
  atmosphere: Atmosphere;
}

/** The lawn: a 70 × 70 m square; the mansion stands along the north edge. */
export const LAWN_HALF = 35;
export const USABLE_HALF = 31;
/** Planter spots on the ground alone; stands add six each. */
export const GROUND_CAPACITY = 500;
export const STAND_LEVELS = 6;
export const STAND_ITEM = 'planter_stand';
export const FOCUS_TREE_POS: [number, number] = [-6, -4];
export const DUSTBIN_POS: [number, number] = [14, 10];
export const RACK_POS: [number, number] = [-14, 10];

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function spriteItem(itemId: string): SpriteItem | undefined {
  return SPRITES.items[itemId];
}

export function isGrowable(itemId: string): boolean {
  return !!SPRITES.items[itemId]?.growable;
}

export function isPenalty(itemId: string): boolean {
  return itemId === 'dead_sapling' || itemId === 'broken_frame';
}

export function isFixed(itemId: string): boolean {
  return !!SPRITES.items[itemId]?.fixed;
}

/** The sprite to draw for an item right now (growth stage, health, light, stack). */
export function spriteFor(item: GardenItem, opts: { night?: boolean; rackCount?: number } = {}): Sprite | null {
  const def = SPRITES.items[item.itemId];
  if (!def) return null;
  if (def.growable && def.stages) {
    const st = def.stages[stageIndexFor(def.stages.map((s) => ({ id: s.id, minutes: s.minutes })) as never, item.minutes ?? 0)];
    const wilted = (item.health ?? 1) < WILT_BELOW;
    return (wilted ? st?.wilted : st?.healthy) ?? st?.healthy ?? null;
  }
  if (def.stack) {
    const n = Math.min(def.stack.length - 1, Math.max(0, opts.rackCount ?? 0));
    return def.stack[n] ?? def.stack[0] ?? null;
  }
  if (def.lit && opts.night && def.night) return def.night;
  return def.sprite ?? null;
}

export function footprint(itemId: string): number {
  const def = SPRITES.items[itemId];
  const s = def?.sprite ?? def?.stages?.[def.stages.length - 1]?.healthy ?? def?.stack?.[0];
  if (!s) return 0.5;
  return Math.max(0.35, Math.max(s.boxM[0], s.boxM[1]) / 2);
}

export function gardenStarters(): GardenItem[] {
  const now = Date.now();
  const mk = (itemId: string, x: number, z: number): GardenItem => ({ uid: uid(), itemId, x, z, placedAt: now, ...(isGrowable(itemId) ? { minutes: 0, health: 1 } : {}) });
  return [
    mk('dustbin', DUSTBIN_POS[0], DUSTBIN_POS[1]),
    mk('image_rack', RACK_POS[0], RACK_POS[1]),
    mk('garden_bench', 8, -2),
    mk('marigold', 3, 4),
    mk('brass_lantern', -3, 6),
  ].filter((i) => !!SPRITES.items[i.itemId]);
}

export function initialGarden(): GardenState {
  return { schemaVersion: 3, version: Date.now(), items: gardenStarters(), stored: [], focus: { minutes: 0, health: 1 }, atmosphere: 'auto' };
}

/** The old photographed garden's slots, as metres on the new lawn. */
const OLD_SLOT_POS: Record<string, [number, number]> = {
  lawn_near_l: [-2, 6],
  lawn_near_r: [3, 7],
  lawn_mid_r: [6, 2],
  lawn_far_l: [-6, -6],
  lawn_far_r: [6, -8],
  bed_l: [-4, -10],
  bed_r: [10, -4],
  path_near: [1, 9],
  path_far: [-8, -12],
  seat: [8, -2],
  seat_far: [0, -14],
  feature: [2, -8],
  arch: [-10, -4],
  corner_far: [-16, -16],
  corner_far_r: [16, -16],
  house_l: [-14, 10],
  house_r: [14, 10],
  easel: [10, 4],
  branch: [12, 0],
};

export function migrateFromSpace(old: SpaceState): GardenState {
  const taken = new Set<string>();
  const items: GardenItem[] = [];
  for (const p of old.placed as PlacedItem[]) {
    if (!SPRITES.items[p.itemId]) continue;
    let pos = OLD_SLOT_POS[p.slot] ?? [0, 0];
    if (taken.has(p.slot)) pos = [pos[0] + 1.5, pos[1] + 1.5];
    taken.add(p.slot);
    if (p.itemId === 'dustbin') pos = DUSTBIN_POS;
    if (p.itemId === 'image_rack') pos = RACK_POS;
    items.push({ uid: p.uid, itemId: p.itemId, x: pos[0], z: pos[1], placedAt: p.placedAt, minutes: p.minutes, health: p.health, artId: p.artId ?? null });
  }
  for (const id of ['dustbin', 'image_rack']) {
    if (!items.some((i) => i.itemId === id) && SPRITES.items[id]) items.push({ uid: uid(), itemId: id, x: id === 'dustbin' ? DUSTBIN_POS[0] : RACK_POS[0], z: 10, placedAt: Date.now() });
  }
  return { schemaVersion: 3, version: Date.now(), items, stored: old.stored.filter((s) => !!SPRITES.items[s.itemId]), focus: old.focus, atmosphere: old.atmosphere };
}

// ---- growth -----------------------------------------------------------------------------

export function growFocus(g: GardenState, minutes: number): GardenState {
  return { ...g, focus: { minutes: g.focus.minutes + Math.max(0, minutes), health: Math.min(1, g.focus.health + 0.5 + minutes * 0.01) } };
}

export function wiltFocus(g: GardenState): GardenState {
  return { ...g, focus: { ...g.focus, health: Math.max(0, g.focus.health - 0.45) } };
}

/** Every growable plant grows; returns the plants that just reached their last stage. */
export function growPlants(g: GardenState, minutes: number): { state: GardenState; matured: GardenItem[] } {
  const matured: GardenItem[] = [];
  const items = g.items.map((it) => {
    const def = SPRITES.items[it.itemId];
    if (!def?.growable || !def.stages) return it;
    const before = stageIndexFor(def.stages as never, it.minutes ?? 0);
    const next = { ...it, minutes: (it.minutes ?? 0) + minutes, health: Math.min(1, (it.health ?? 1) + 0.5) };
    const after = stageIndexFor(def.stages as never, next.minutes);
    if (after === def.stages.length - 1 && before < after) matured.push(next);
    return next;
  });
  return { state: { ...g, items }, matured };
}

export function wiltNewest(g: GardenState): GardenState {
  const growables = g.items.filter((i) => isGrowable(i.itemId));
  if (growables.length === 0) return g;
  const newest = growables.reduce((a, b) => (a.placedAt > b.placedAt ? a : b));
  return { ...g, items: g.items.map((i) => (i.uid === newest.uid ? { ...i, health: Math.max(0, (i.health ?? 1) - 0.45) } : i)) };
}

// ---- placement ----------------------------------------------------------------------------

export function planterCount(g: GardenState): number {
  return g.items.filter((i) => isGrowable(i.itemId) || SPRITES.items[i.itemId]?.category === 'PLANTS' || SPRITES.items[i.itemId]?.category === 'TREES').length;
}

export function capacity(g: GardenState): number {
  return GROUND_CAPACITY + g.items.filter((i) => i.itemId === STAND_ITEM).length * STAND_LEVELS;
}

export function clampToLawn(x: number, z: number): [number, number] {
  return [Math.max(-USABLE_HALF, Math.min(USABLE_HALF, x)), Math.max(-USABLE_HALF + 4, Math.min(USABLE_HALF, z))];
}

function overlaps(g: GardenState, x: number, z: number, r: number, ignoreUid?: string): boolean {
  for (const it of g.items) {
    if (it.uid === ignoreUid || it.standUid) continue;
    const d = Math.hypot(it.x - x, it.z - z);
    if (d < r + footprint(it.itemId) * 0.9) return true;
  }
  const fd = Math.hypot(FOCUS_TREE_POS[0] - x, FOCUS_TREE_POS[1] - z);
  return fd < r + 1.5;
}

/** A free spot near a preferred point, searched in a widening spiral. */
export function freeSpot(g: GardenState, itemId: string, near: [number, number] = [2, 4], ignoreUid?: string): [number, number] | null {
  const r = footprint(itemId);
  for (let ring = 0; ring < 40; ring++) {
    const n = ring === 0 ? 1 : ring * 8;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.37;
      const d = ring * (r * 2 + 0.6);
      const [x, z] = clampToLawn(near[0] + Math.cos(a) * d, near[1] + Math.sin(a) * d);
      if (!overlaps(g, x, z, r, ignoreUid)) return [x, z];
    }
  }
  return null;
}

export function addItem(g: GardenState, itemId: string, near?: [number, number]): { state: GardenState; placed: GardenItem | null } {
  const id = uid();
  const growable = isGrowable(itemId);
  const spot = freeSpot(g, itemId, near);
  if (!spot || (growable && planterCount(g) >= capacity(g))) {
    return { state: { ...g, stored: [...g.stored, { uid: id, itemId }] }, placed: null };
  }
  const placed: GardenItem = { uid: id, itemId, x: spot[0], z: spot[1], placedAt: Date.now(), ...(growable ? { minutes: 0, health: 1 } : {}) };
  return { state: { ...g, items: [...g.items, placed] }, placed };
}

export function moveItem(g: GardenState, itemUid: string, x: number, z: number): GardenState {
  const it = g.items.find((i) => i.uid === itemUid);
  if (!it || isFixed(it.itemId)) return g;
  const [cx, cz] = clampToLawn(x, z);
  return { ...g, items: g.items.map((i) => (i.uid === itemUid ? { ...i, x: cx, z: cz, standUid: undefined, level: undefined } : i)) };
}

/** Put a plant on a planter stand (up to six, bottom to top). */
export function putOnStand(g: GardenState, itemUid: string, standUid: string): GardenState | null {
  const it = g.items.find((i) => i.uid === itemUid);
  const stand = g.items.find((i) => i.uid === standUid && i.itemId === STAND_ITEM);
  if (!it || !stand) return g;
  const def = SPRITES.items[it.itemId];
  if (!def || !(def.growable || def.category === 'PLANTS')) return g;
  const used = new Set(g.items.filter((i) => i.standUid === standUid).map((i) => i.level ?? 0));
  let level = -1;
  for (let l = 0; l < STAND_LEVELS; l++) {
    if (!used.has(l)) {
      level = l;
      break;
    }
  }
  if (level < 0) return null;
  return { ...g, items: g.items.map((i) => (i.uid === itemUid ? { ...i, x: stand.x, z: stand.z, standUid, level } : i)) };
}

export function storeItem(g: GardenState, itemUid: string): GardenState {
  const it = g.items.find((i) => i.uid === itemUid);
  if (!it || isPenalty(it.itemId) || isFixed(it.itemId)) return g;
  const orphans = it.itemId === STAND_ITEM ? g.items.filter((i) => i.standUid === itemUid) : [];
  return {
    ...g,
    items: g.items.filter((i) => i.uid !== itemUid && !orphans.includes(i)),
    stored: [...g.stored, { uid: it.uid, itemId: it.itemId }, ...orphans.map((o) => ({ uid: o.uid, itemId: o.itemId }))],
  };
}

export function binItem(g: GardenState, itemUid: string): GardenState {
  const it = g.items.find((i) => i.uid === itemUid);
  if (it) {
    if (isPenalty(it.itemId) || isFixed(it.itemId)) return g;
    const orphans = it.itemId === STAND_ITEM ? g.items.filter((i) => i.standUid === itemUid) : [];
    return { ...g, items: g.items.filter((i) => i.uid !== itemUid && !orphans.includes(i)), stored: [...g.stored, ...orphans.map((o) => ({ uid: o.uid, itemId: o.itemId }))] };
  }
  return { ...g, stored: g.stored.filter((s) => s.uid !== itemUid) };
}

export function clearPenalty(g: GardenState, itemUid: string): GardenState {
  const it = g.items.find((i) => i.uid === itemUid);
  if (!it || !isPenalty(it.itemId)) return g;
  return { ...g, items: g.items.filter((i) => i.uid !== itemUid) };
}

export function placeStored(g: GardenState, storedUid: string, near?: [number, number]): GardenState {
  const s = g.stored.find((x) => x.uid === storedUid);
  if (!s) return g;
  const spot = freeSpot(g, s.itemId, near);
  if (!spot) return g;
  if (isGrowable(s.itemId) && planterCount(g) >= capacity(g)) return g;
  return {
    ...g,
    stored: g.stored.filter((x) => x.uid !== storedUid),
    items: [...g.items, { uid: s.uid, itemId: s.itemId, x: spot[0], z: spot[1], placedAt: Date.now(), ...(isGrowable(s.itemId) ? { minutes: 0, health: 1 } : {}) }],
  };
}

export function addPenalties(g: GardenState): GardenState {
  let next = g;
  for (const itemId of ['dead_sapling', 'broken_frame']) {
    if (!SPRITES.items[itemId]) continue;
    next = addItem(next, itemId, [Math.random() * 8 - 4, 6]).state;
  }
  return next;
}

export function penaltyCount(g: GardenState): number {
  return g.items.filter((i) => isPenalty(i.itemId)).length + g.stored.filter((s) => isPenalty(s.itemId)).length;
}

export function owns(g: GardenState, itemId: string): number {
  return g.items.filter((i) => i.itemId === itemId).length + g.stored.filter((s) => s.itemId === itemId).length;
}

/** Hang a finished artwork on an easel (adds one if none is free). */
export function hangArtwork(g: GardenState, artId: string): GardenState {
  if (!SPRITES.items.easel) return g;
  let items = g.items.map((i) => (i.artId === artId ? { ...i, artId: null } : i));
  const free = items.find((i) => i.itemId === 'easel' && !i.artId);
  if (free) {
    items = items.map((i) => (i.uid === free.uid ? { ...i, artId } : i));
    return { ...g, items };
  }
  const spot = freeSpot({ ...g, items }, 'easel', [10, 4]);
  if (!spot) return g;
  return { ...g, items: [...items, { uid: uid(), itemId: 'easel', x: spot[0], z: spot[1], placedAt: Date.now(), artId }] };
}

export function hungArtworks(g: GardenState): string[] {
  return g.items.map((i) => i.artId).filter((a): a is string => !!a);
}

export function storeEntry(itemId: string) {
  return STORE[itemId];
}
