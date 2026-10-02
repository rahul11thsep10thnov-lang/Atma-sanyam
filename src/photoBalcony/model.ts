// The balcony's persistent state and every rule that changes it. Pure
// functions over plain records; the screens and the focus engine call these.
import { PACK } from './pack.generated';
import { Variant } from './packTypes';
import { ARTWORKS, MINUTES_PER_PIECE, PUZZLE_PIECES, STORE } from './catalog';

export interface PlacedItem {
  uid: string;
  itemId: string;
  slot: string;
  variant: number;
  placedAt: number;
}

export interface StoredItem {
  uid: string;
  itemId: string;
}

export interface FocusPlantState {
  /** Focused minutes this plant has received. Drives its growth stage. */
  minutes: number;
  /** 0..1 — lowered by a paused session, restored by a completed one. */
  health: number;
}

export interface ArtState {
  /** The artwork whose jigsaw is being assembled, if any. */
  currentId: string | null;
  pieces: number;
  /** Finished artworks, oldest first. */
  completed: string[];
  /** Hanging on the wall. */
  mountedId: string | null;
  /** Pieces the person has already watched arrive (the Gallery animates the rest in). */
  seen?: number;
}

export interface BalconyState {
  schemaVersion: 1;
  /** Bumped on every save so screens can tell another screen changed it. */
  version: number;
  placed: PlacedItem[];
  stored: StoredItem[];
  focus: FocusPlantState;
  art: ArtState;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function initialState(): BalconyState {
  const now = Date.now();
  const placed: PlacedItem[] = [];
  const starters: [string, string][] = [
    ['cane_lounge_chair', 'seating'],
    ['teak_coffee_table', 'table'],
    ['snake_plant', 'rail_mid'],
  ];
  for (const [itemId, slot] of starters) placed.push({ uid: uid(), itemId, slot, variant: 0, placedAt: now });
  return {
    schemaVersion: 1,
    version: now,
    placed,
    stored: [],
    focus: { minutes: 0, health: 1 },
    art: { currentId: null, pieces: 0, completed: [], mountedId: null },
  };
}

// ---- the focus plant ------------------------------------------------------------

export const WILT_BELOW = 0.6;

export function stageIndexFor(minutes: number): number {
  const stages = PACK.focusPlant.stages;
  let i = 0;
  stages.forEach((s, k) => {
    if (minutes >= s.minutes) i = k;
  });
  return i;
}

export function focusVariant(minutes: number, health: number): { variant: Variant | null; stage: string; wilted: boolean } {
  const st = PACK.focusPlant.stages[stageIndexFor(minutes)];
  const wilted = health < WILT_BELOW;
  return { variant: (wilted ? st.wilted : st.healthy) ?? st.healthy, stage: st.id, wilted };
}

export const STAGE_WORDS: Record<string, string> = {
  seedling: 'a seedling',
  small: 'a small, healthy plant',
  growing: 'a growing plant',
  mature: 'a mature plant',
  flowering: 'in flower',
};

export function growFocusPlant(f: FocusPlantState, minutes: number): FocusPlantState {
  return { minutes: f.minutes + Math.max(0, minutes), health: Math.min(1, f.health + 0.5 + minutes * 0.01) };
}

export function wiltFocusPlant(f: FocusPlantState): FocusPlantState {
  return { ...f, health: Math.max(0, f.health - 0.45) };
}

// ---- placement -------------------------------------------------------------------

export function slotsFor(itemId: string): string[] {
  return Object.keys(PACK.items[itemId]?.variants ?? {});
}

export function occupant(state: BalconyState, slot: string): PlacedItem | undefined {
  return state.placed.find((p) => p.slot === slot);
}

export function freeSlotFor(state: BalconyState, itemId: string): string | null {
  return slotsFor(itemId).find((s) => !occupant(state, s) && s !== PACK.focusPlant.slot) ?? null;
}

export function variantOf(p: PlacedItem): Variant | null {
  const list = PACK.items[p.itemId]?.variants[p.slot];
  if (!list || list.length === 0) return null;
  return list[Math.min(p.variant, list.length - 1)];
}

export function moveItem(state: BalconyState, itemUid: string, slot: string): BalconyState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (!p || !slotsFor(p.itemId).includes(slot)) return state;
  const other = occupant(state, slot);
  const placed = state.placed.map((x) => {
    if (x.uid === itemUid) return { ...x, slot, variant: 0 };
    // swap places when the target is taken by something that fits back
    if (other && x.uid === other.uid && slotsFor(other.itemId).includes(p.slot)) return { ...x, slot: p.slot, variant: 0 };
    return x;
  });
  const stored = other && !slotsFor(other.itemId).includes(p.slot) ? [...state.stored, { uid: other.uid, itemId: other.itemId }] : state.stored;
  return { ...state, placed: placed.filter((x) => stored.every((s) => s.uid !== x.uid)), stored };
}

export function turnItem(state: BalconyState, itemUid: string): BalconyState {
  return {
    ...state,
    placed: state.placed.map((x) => {
      if (x.uid !== itemUid) return x;
      const n = PACK.items[x.itemId]?.variants[x.slot]?.length ?? 1;
      return { ...x, variant: (x.variant + 1) % n };
    }),
  };
}

export function storeItem(state: BalconyState, itemUid: string): BalconyState {
  const p = state.placed.find((x) => x.uid === itemUid);
  if (!p) return state;
  return { ...state, placed: state.placed.filter((x) => x.uid !== itemUid), stored: [...state.stored, { uid: p.uid, itemId: p.itemId }] };
}

export function placeStored(state: BalconyState, storedUid: string, slot?: string): BalconyState {
  const s = state.stored.find((x) => x.uid === storedUid);
  if (!s) return state;
  const target = slot ?? freeSlotFor(state, s.itemId);
  if (!target || occupant(state, target)) return state;
  return {
    ...state,
    stored: state.stored.filter((x) => x.uid !== storedUid),
    placed: [...state.placed, { uid: s.uid, itemId: s.itemId, slot: target, variant: 0, placedAt: Date.now() }],
  };
}

export function addPurchase(state: BalconyState, itemId: string): { state: BalconyState; placedAt: string | null } {
  const slot = freeSlotFor(state, itemId);
  const id = uid();
  if (slot) {
    return { state: { ...state, placed: [...state.placed, { uid: id, itemId, slot, variant: 0, placedAt: Date.now() }] }, placedAt: slot };
  }
  return { state: { ...state, stored: [...state.stored, { uid: id, itemId }] }, placedAt: null };
}

export function owns(state: BalconyState, itemId: string): number {
  return state.placed.filter((p) => p.itemId === itemId).length + state.stored.filter((s) => s.itemId === itemId).length;
}

/** Painter's order: flat things first, then far to near. */
export function drawOrder(state: BalconyState): { p: PlacedItem; v: Variant }[] {
  return state.placed
    .map((p) => ({ p, v: variantOf(p) }))
    .filter((x): x is { p: PlacedItem; v: Variant } => !!x.v)
    .sort((a, b) => {
      const fa = PACK.items[a.p.itemId]?.flat ? 1 : 0;
      const fb = PACK.items[b.p.itemId]?.flat ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.v.depth - a.v.depth;
    });
}

// ---- the art wall ------------------------------------------------------------------

export function nextArtwork(art: ArtState): string | null {
  const taken = new Set([...art.completed, ...(art.currentId ? [art.currentId] : [])]);
  return ARTWORKS.find((a) => !taken.has(a.id))?.id ?? null;
}

export function addArtMinutes(art: ArtState, minutes: number): { art: ArtState; newPieces: number; finished: boolean } {
  if (!art.currentId) return { art, newPieces: 0, finished: false };
  const before = art.pieces;
  const pieces = Math.min(PUZZLE_PIECES, before + Math.floor(minutes / MINUTES_PER_PIECE));
  const finished = pieces >= PUZZLE_PIECES && before < PUZZLE_PIECES;
  return { art: { ...art, pieces }, newPieces: pieces - before, finished };
}

export function mountCurrent(state: BalconyState): BalconyState {
  const art = state.art;
  if (!art.currentId || art.pieces < PUZZLE_PIECES) return state;
  const mountedId = art.currentId;
  const completed = [...art.completed, mountedId];
  let placed = state.placed;
  if (!placed.some((p) => p.itemId === 'art_frame')) {
    placed = [...placed, { uid: uid(), itemId: 'art_frame', slot: 'art', variant: 0, placedAt: Date.now() }];
  }
  const nextArt: ArtState = { currentId: null, pieces: 0, completed, mountedId, seen: 0 };
  nextArt.currentId = nextArtwork(nextArt);
  return { ...state, placed, art: nextArt };
}

/** Hang an artwork that's already finished (the Gallery's "hang this"). */
export function hangArtwork(state: BalconyState, artId: string): BalconyState {
  if (!state.art.completed.includes(artId)) return state;
  let placed = state.placed;
  if (!placed.some((p) => p.itemId === 'art_frame')) {
    placed = [...placed, { uid: uid(), itemId: 'art_frame', slot: 'art', variant: 0, placedAt: Date.now() }];
  }
  return { ...state, placed, art: { ...state.art, mountedId: artId } };
}

export function isUnlocked(itemId: string, lifetimeMinutes: number): boolean {
  const e = STORE[itemId];
  return !!e && !e.hidden && lifetimeMinutes >= e.unlockMinutes;
}
