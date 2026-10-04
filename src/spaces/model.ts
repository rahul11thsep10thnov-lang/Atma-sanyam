// A space's persistent state and every rule that changes it. Pure
// functions over plain records; the screens and the focus engine call these.
import { LightState, PackItem, SpaceId, SpacePack, Stage, Variant } from './packTypes';
import { packFor } from './packs';
import { STORE } from './catalog';

export interface PlacedItem {
  uid: string;
  itemId: string;
  slot: string;
  variant: number;
  placedAt: number;
  /** growable plants: focused minutes received while placed, and health. */
  minutes?: number;
  health?: number;
  /** frames and the easel: which finished artwork hangs here. */
  artId?: string | null;
}

export interface StoredItem {
  uid: string;
  itemId: string;
}

export interface FocusPlantState {
  minutes: number;
  /** 0..1 — lowered by an abandoned session, restored by a completed one. */
  health: number;
}

export type Atmosphere = 'auto' | LightState;

export interface SpaceState {
  schemaVersion: 2;
  space: SpaceId;
  version: number;
  placed: PlacedItem[];
  stored: StoredItem[];
  focus: FocusPlantState;
  atmosphere: Atmosphere;
}

/** The jigsaw art wall is shared by the three spaces. */
export interface ArtState {
  currentId: string | null;
  pieces: number;
  seen: number;
  /** Finished artworks, oldest first. Hung ones are referenced by frames. */
  completed: string[];
  /** Thrown away for good. */
  binned: string[];
}

export const INITIAL_ART: ArtState = { currentId: null, pieces: 0, seen: 0, completed: [], binned: [] };

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const STARTERS: Record<SpaceId, [string, string][]> = {
  balcony: [['cane_lounge_chair', 'seating'], ['teak_coffee_table', 'table'], ['snake_plant', 'rail_mid']],
  garden: [['garden_bench', 'seat'], ['marigold', 'bed_r'], ['brass_lantern', 'path_near'], ['dustbin', 'house_r'], ['image_rack', 'house_l']],
};

export function initialState(space: SpaceId): SpaceState {
  const now = Date.now();
  const pack = packFor(space);
  const placed: PlacedItem[] = [];
  for (const [itemId, slot] of STARTERS[space]) {
    if (!pack.items[itemId]) continue;
    placed.push({ uid: uid(), itemId, slot, variant: 0, placedAt: now, ...(pack.items[itemId].growable ? { minutes: 0, health: 1 } : {}) });
  }
  return { schemaVersion: 2, space, version: now, placed, stored: [], focus: { minutes: 0, health: 1 }, atmosphere: 'auto' };
}

// ---- the focus plant ------------------------------------------------------------

export const WILT_BELOW = 0.6;

export function stageIndexFor(stages: Stage[], minutes: number): number {
  let i = 0;
  stages.forEach((s, k) => {
    if (minutes >= s.minutes) i = k;
  });
  return i;
}

export function focusVariant(pack: SpacePack, minutes: number, health: number): { variant: Variant | null; stage: string; wilted: boolean } {
  const stages = pack.focusPlant.stages;
  const st = stages[stageIndexFor(stages, minutes)];
  const wilted = health < WILT_BELOW;
  const v = wilted && st.wilted?.files && Object.keys(st.wilted.files).length ? st.wilted : st.healthy;
  return { variant: v && Object.keys(v.files ?? {}).length ? v : null, stage: st.id, wilted };
}

export const STAGE_WORDS: Record<string, string> = {
  seed: 'a seed',
  seedling: 'a seedling',
  sprout: 'a sprout',
  small: 'a small, healthy plant',
  young: 'a young plant',
  growing: 'a growing plant',
  mature: 'a mature plant',
  large: 'a large tree',
  flowering: 'in flower',
  grand: 'a grand old tree',
};

export function growFocusPlant(f: FocusPlantState, minutes: number): FocusPlantState {
  return { minutes: f.minutes + Math.max(0, minutes), health: Math.min(1, f.health + 0.5 + minutes * 0.01) };
}

export function wiltFocusPlant(f: FocusPlantState): FocusPlantState {
  return { ...f, health: Math.max(0, f.health - 0.45) };
}

/** Growable plants placed in the space grow with every completed session. */
export function growPlacedPlants(state: SpaceState, minutes: number): SpaceState {
  const pack = packFor(state.space);
  return {
    ...state,
    placed: state.placed.map((p) => (pack.items[p.itemId]?.growable ? { ...p, minutes: (p.minutes ?? 0) + minutes, health: Math.min(1, (p.health ?? 1) + 0.5) } : p)),
  };
}

export function wiltNewestPlant(state: SpaceState): SpaceState {
  const pack = packFor(state.space);
  const growables = state.placed.filter((p) => pack.items[p.itemId]?.growable);
  if (growables.length === 0) return state;
  const newest = growables.reduce((a, b) => (a.placedAt > b.placedAt ? a : b));
  return { ...state, placed: state.placed.map((p) => (p.uid === newest.uid ? { ...p, health: Math.max(0, (p.health ?? 1) - 0.45) } : p)) };
}

// ---- placement -------------------------------------------------------------------

export function slotsFor(space: SpaceId, itemId: string): string[] {
  const item = packFor(space).items[itemId];
  if (!item) return [];
  const keys = new Set([...Object.keys(item.variants ?? {}), ...Object.keys(item.stages ?? {}), ...Object.keys(item.stackFiles ?? {})]);
  return [...keys];
}

export function occupant(state: SpaceState, slot: string): PlacedItem | undefined {
  return state.placed.find((p) => p.slot === slot);
}

/** A surface slot is usable only while the furniture that carries it is there. */
export function slotAvailable(state: SpaceState, slot: string): boolean {
  const s = packFor(state.space).slots[slot];
  if (!s) return false;
  if (s.requires && !occupant(state, s.requires)) return false;
  return true;
}

export function freeSlotFor(state: SpaceState, itemId: string): string | null {
  const focus = packFor(state.space).focusPlant.slot;
  return slotsFor(state.space, itemId).find((s) => s !== focus && slotAvailable(state, s) && !occupant(state, s)) ?? null;
}

/** The layer to draw for a placed item (its growth stage, stack count or variant). */
export function variantOf(state: SpaceState, p: PlacedItem, rackCount = 0): Variant | null {
  const item = packFor(state.space).items[p.itemId];
  if (!item) return null;
  if (item.growable && item.stages?.[p.slot]) {
    const stages = item.stages[p.slot];
    const st = stages[stageIndexFor(stages, p.minutes ?? 0)];
    const wilted = (p.health ?? 1) < WILT_BELOW && st.wilted?.files && Object.keys(st.wilted.files).length;
    return wilted ? st.wilted : st.healthy;
  }
  if (item.stack && item.stackFiles?.[p.slot]) {
    const stack = item.stackFiles[p.slot];
    return stack[Math.min(stack.length - 1, rackCount)];
  }
  const list = item.variants?.[p.slot];
  if (!list || list.length === 0) return null;
  return list[Math.min(p.variant, list.length - 1)];
}

export function isPenalty(itemId: string): boolean {
  return itemId === 'dead_sapling' || itemId === 'broken_frame';
}

export function isFixed(space: SpaceId, itemId: string): boolean {
  return !!packFor(space).items[itemId]?.fixed;
}

export function moveItem(state: SpaceState, itemUid: string, slot: string): SpaceState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (!p || !slotsFor(state.space, p.itemId).includes(slot) || !slotAvailable(state, slot)) return state;
  if (isFixed(state.space, p.itemId)) return state;
  const other = occupant(state, slot);
  if (other && (isFixed(state.space, other.itemId) || !slotsFor(state.space, other.itemId).includes(p.slot))) return state;
  const placed = state.placed.map((x) => {
    if (x.uid === itemUid) return { ...x, slot, variant: 0 };
    if (other && x.uid === other.uid) return { ...x, slot: p.slot, variant: 0 };
    return x;
  });
  return dropOrphans({ ...state, placed });
}

export function turnItem(state: SpaceState, itemUid: string): SpaceState {
  return {
    ...state,
    placed: state.placed.map((x) => {
      if (x.uid !== itemUid) return x;
      const n = packFor(state.space).items[x.itemId]?.variants?.[x.slot]?.length ?? 1;
      return { ...x, variant: (x.variant + 1) % n };
    }),
  };
}

/** Things standing on furniture that was taken away go back to storage. */
function dropOrphans(state: SpaceState): SpaceState {
  const pack = packFor(state.space);
  const orphans = state.placed.filter((p) => {
    const s = pack.slots[p.slot];
    return s?.requires && !state.placed.some((q) => q.slot === s.requires);
  });
  if (orphans.length === 0) return state;
  return {
    ...state,
    placed: state.placed.filter((p) => !orphans.includes(p)),
    stored: [...state.stored, ...orphans.map((o) => ({ uid: o.uid, itemId: o.itemId }))],
  };
}

export function storeItem(state: SpaceState, itemUid: string): SpaceState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (!p || isPenalty(p.itemId) || isFixed(state.space, p.itemId)) return state;
  return dropOrphans({ ...state, placed: state.placed.filter((x) => x.uid !== itemUid), stored: [...state.stored, { uid: p.uid, itemId: p.itemId }] });
}

/** Into the garden's dustbin: gone for good. Penalties and fixtures never. */
export function binItem(state: SpaceState, itemUid: string): SpaceState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (p) {
    if (isPenalty(p.itemId) || isFixed(state.space, p.itemId)) return state;
    return dropOrphans({ ...state, placed: state.placed.filter((x) => x.uid !== itemUid) });
  }
  return { ...state, stored: state.stored.filter((x) => x.uid !== itemUid) };
}

/** Penalties leave only for coins. */
export function clearPenalty(state: SpaceState, itemUid: string): SpaceState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (!p || !isPenalty(p.itemId)) return state;
  return { ...state, placed: state.placed.filter((x) => x.uid !== itemUid) };
}

export function placeStored(state: SpaceState, storedUid: string, slot?: string): SpaceState {
  const s = state.stored.find((x) => x.uid === storedUid);
  if (!s) return state;
  const target = slot ?? freeSlotFor(state, s.itemId);
  if (!target || occupant(state, target) || !slotAvailable(state, target)) return state;
  const growable = packFor(state.space).items[s.itemId]?.growable;
  return {
    ...state,
    stored: state.stored.filter((x) => x.uid !== storedUid),
    placed: [...state.placed, { uid: s.uid, itemId: s.itemId, slot: target, variant: 0, placedAt: Date.now(), ...(growable ? { minutes: 0, health: 1 } : {}) }],
  };
}

export function addItem(state: SpaceState, itemId: string): { state: SpaceState; placedAt: string | null } {
  const slot = freeSlotFor(state, itemId);
  const id = uid();
  const growable = packFor(state.space).items[itemId]?.growable;
  if (slot) {
    return {
      state: { ...state, placed: [...state.placed, { uid: id, itemId, slot, variant: 0, placedAt: Date.now(), ...(growable ? { minutes: 0, health: 1 } : {}) }] },
      placedAt: slot,
    };
  }
  return { state: { ...state, stored: [...state.stored, { uid: id, itemId }] }, placedAt: null };
}

/** An abandoned session leaves its mark: a wilted sapling and a broken
 * picture, placed wherever there is room (or stored, still counting). */
export function addPenalties(state: SpaceState): SpaceState {
  let next = state;
  for (const itemId of ['dead_sapling', 'broken_frame']) {
    if (!packFor(state.space).items[itemId]) continue;
    next = addItem(next, itemId).state;
  }
  return next;
}

export function penaltyCount(state: SpaceState): number {
  return state.placed.filter((p) => isPenalty(p.itemId)).length + state.stored.filter((s) => isPenalty(s.itemId)).length;
}

export function owns(state: SpaceState, itemId: string): number {
  return state.placed.filter((p) => p.itemId === itemId).length + state.stored.filter((s) => s.itemId === itemId).length;
}

/** Painter's order: flat things first, then far to near. */
export function drawOrder(state: SpaceState, rackCount = 0): { p: PlacedItem; v: Variant; item: PackItem }[] {
  const pack = packFor(state.space);
  return state.placed
    .map((p) => ({ p, v: variantOf(state, p, rackCount), item: pack.items[p.itemId] }))
    .filter((x): x is { p: PlacedItem; v: Variant; item: PackItem } => !!x.v && !!x.item)
    .sort((a, b) => {
      const fa = a.item.flat ? 1 : 0;
      const fb = b.item.flat ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.v.depth - a.v.depth;
    });
}

// ---- the art wall (shared) --------------------------------------------------------

/** Hang a finished artwork in a frame slot of this space (adds the frame). */
export function hangArtwork(state: SpaceState, artId: string, slot?: string): SpaceState {
  const pack = packFor(state.space);
  const frameId = state.space === 'garden' ? 'easel' : 'art_frame';
  if (!pack.items[frameId]) return state;
  // take it down anywhere it already hangs in this space
  let placed = state.placed.map((p) => (p.artId === artId ? { ...p, artId: null } : p));
  const existing = slot ? placed.find((p) => p.slot === slot && p.itemId === frameId) : placed.find((p) => p.itemId === frameId && !p.artId);
  if (existing) {
    placed = placed.map((p) => (p.uid === existing.uid ? { ...p, artId } : p));
    return { ...state, placed };
  }
  const target = slot ?? slotsFor(state.space, frameId).find((s) => !placed.some((p) => p.slot === s));
  if (!target) return state;
  placed = [...placed, { uid: uid(), itemId: frameId, slot: target, variant: 0, placedAt: Date.now(), artId }];
  return { ...state, placed };
}

export function hungArtworks(state: SpaceState): string[] {
  return state.placed.map((p) => p.artId).filter((a): a is string => !!a);
}

export function isUnlocked(itemId: string, lifetimeMinutes: number): boolean {
  const e = STORE[itemId];
  return !!e && !e.hidden && lifetimeMinutes >= e.unlockMinutes;
}
