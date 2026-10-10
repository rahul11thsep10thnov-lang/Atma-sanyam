// The Paradise Garden's state and every rule that changes it. A plant is
// a permanent record of one completed focus session: its species, the
// size those minutes earned, when it was planted, and the slot the
// landscaper gave it. Plants are never lost; a reshuffle only moves them.
import { PlantGrowthSize, sizeForMinutes } from '../growth/size';
import { SEGMENTS, SPECIES_BY_ID, SegmentId, Species } from './catalog';
import { Slot, rng, slotsFor } from './layout';
import { BALCONY_SPOTS } from './balcony';
import { PARADISE_SPRITES } from './sprites.generated';
import { Sprite } from './types';

export type PlantPlace = 'garden' | 'balcony';

export interface PlantInstance {
  id: string;
  speciesId: string;
  segment: SegmentId;
  size: PlantGrowthSize;
  /** The completed minutes that grew it. */
  focusMinutes: number;
  plantedAt: number;
  sessionId: string;
  /** Index into the segment's slots for its layout seed (or into
   * BALCONY_SPOTS on the balcony); -1 while homeless. */
  slot: number;
  /** Where it grows: the paradise garden (the default) or the balcony. */
  place?: PlantPlace;
  /** A little lean and size variation so no two look stamped. */
  rotation: number;
  scale: number;
  flip: boolean;
}

/** An abandoned session's mark: a wilted sapling that clears for coins. */
export interface Penalty {
  id: string;
  segment: SegmentId;
  slot: number;
  placedAt: number;
}

export interface ParadiseState {
  schemaVersion: 1;
  version: number;
  plants: PlantInstance[];
  penalties: Penalty[];
  layoutSeed: Record<SegmentId, number>;
  lastSegment: SegmentId | null;
}

export const INITIAL_PARADISE: ParadiseState = {
  schemaVersion: 1,
  version: 0,
  plants: [],
  penalties: [],
  layoutSeed: { flowers: 11, trees: 23, indoor: 37, fruits: 41, herbs: 53 },
  lastSegment: null,
};

const uid = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---- sprites ---------------------------------------------------------------------------

/** The sprite for a species at a stage (0 seed, 1..7 sizes), falling back
 * to the nearest rendered stage so a species never disappears. */
export function spriteFor(speciesId: string, stage: number): { sprite: Sprite; stage: number } | null {
  const rec = PARADISE_SPRITES[speciesId];
  if (!rec) return null;
  const s = Math.max(0, Math.min(rec.stages.length - 1, Math.round(stage)));
  if (rec.stages[s]) return { sprite: rec.stages[s]!, stage: s };
  for (let d = 1; d < rec.stages.length; d++) {
    if (rec.stages[s - d]) return { sprite: rec.stages[s - d]!, stage: s - d };
    if (rec.stages[s + d]) return { sprite: rec.stages[s + d]!, stage: s + d };
  }
  return null;
}

/** How tall a plant is drawn, in garden metres. The painted garden is
 * stylised: small plants are drawn larger than life and trees smaller, so
 * a size-1 seedling is still visible, a grand tree still fits under the
 * sky, and the seven sizes always keep their order. */
export function gardenMetres(heightM: number): number {
  return 2.2 * (0.42 * Math.pow(Math.max(0.01, heightM), 0.55) + 0.05);
}

export function hasArt(speciesId: string): boolean {
  return !!PARADISE_SPRITES[speciesId]?.stages.some((s) => !!s);
}

// ---- placement -------------------------------------------------------------------------

function bandsFor(species: Species, size: PlantGrowthSize): Slot['band'][] {
  if (species.habit === 'tree') return size >= 4 ? ['back', 'mid'] : ['mid', 'back', 'front'];
  if (species.habit === 'water') return ['front', 'mid', 'back'];
  if (size >= 6) return ['back', 'mid', 'front'];
  if (size >= 4) return ['mid', 'back', 'front'];
  return ['front', 'mid', 'back'];
}

function allowed(slot: Slot, species: Species): boolean {
  // water plants grow in bowls, so any open bed takes them too
  if (!slot.only) return true;
  return slot.only.includes(species.habit as 'water' | 'pot');
}

/** Pick a slot for a plant: among the free slots of its preferred band,
 * the candidate farthest from its neighbours (a few seeded tries), so the
 * garden fills evenly and never in rows. */
function chooseSlot(slots: Slot[], taken: Set<number>, species: Species, size: PlantGrowthSize, seed: number, occupied: { x: number; y: number }[]): number {
  const random = rng(seed);
  for (const band of bandsFor(species, size)) {
    const free = slots.map((s, i) => ({ s, i })).filter(({ s, i }) => !taken.has(i) && s.band === band && allowed(s, species));
    if (!free.length) continue;
    let best = -1;
    let bestScore = -1;
    for (let k = 0; k < Math.min(6, free.length); k++) {
      const pick = free[Math.floor(random() * free.length)];
      let near = 1e9;
      for (const o of occupied) {
        const dx = (o.x - pick.s.x) * 3840;
        const dy = (o.y - pick.s.y) * 983 * 1.6;
        near = Math.min(near, dx * dx + dy * dy);
      }
      if (near > bestScore) {
        bestScore = near;
        best = pick.i;
      }
    }
    if (best >= 0) return best;
  }
  // every preferred bed is full: anywhere that allows it
  const any = slots.map((s, i) => i).filter((i) => !taken.has(i) && allowed(slots[i], species));
  return any.length ? any[Math.floor(random() * any.length)] : -1;
}

function occupiedIn(state: ParadiseState, segment: SegmentId, slots: Slot[]): { taken: Set<number>; points: { x: number; y: number }[] } {
  const taken = new Set<number>();
  const points: { x: number; y: number }[] = [];
  for (const p of [...state.plants.filter(inGarden), ...state.penalties]) {
    if (p.segment !== segment || p.slot < 0) continue;
    taken.add(p.slot);
    const s = slots[p.slot];
    if (s) points.push({ x: s.x, y: s.y });
  }
  return { taken, points };
}

export const inGarden = (p: { place?: PlantPlace }) => (p.place ?? 'garden') === 'garden';
export const onBalcony = (p: { place?: PlantPlace }) => p.place === 'balcony';

/** The first free spot on the balcony, far end first; -1 when all are taken. */
export function freeBalconySpot(state: ParadiseState): number {
  const taken = new Set(state.plants.filter(onBalcony).map((p) => p.slot));
  return BALCONY_SPOTS.findIndex((_, i) => !taken.has(i));
}

/** A completed session's plant takes its permanent place. */
export function plantFromSession(state: ParadiseState, speciesId: string, minutes: number, sessionId: string, place: PlantPlace = 'garden'): { state: ParadiseState; plant: PlantInstance | null } {
  const species = SPECIES_BY_ID[speciesId];
  const size = sizeForMinutes(minutes);
  if (!species || !size) return { state, plant: null };
  // one plant per session, whatever happens on the way back from the timer
  const dup = state.plants.find((p) => p.sessionId === sessionId);
  if (dup) return { state, plant: dup };
  const seed = hash(sessionId);
  // the balcony takes it while it has room; a full balcony sends it to the garden
  const balconySpot = place === 'balcony' ? freeBalconySpot(state) : -1;
  const where: PlantPlace = balconySpot >= 0 ? 'balcony' : 'garden';
  let slot = balconySpot;
  if (where === 'garden') {
    const slots = slotsFor(species.segment, state.layoutSeed[species.segment]);
    const { taken, points } = occupiedIn(state, species.segment, slots);
    slot = chooseSlot(slots, taken, species, size, seed, points);
  }
  const r = rng(seed + 1);
  const plant: PlantInstance = {
    id: uid(),
    speciesId,
    segment: species.segment,
    size,
    focusMinutes: Math.round(minutes),
    plantedAt: Date.now(),
    sessionId,
    slot,
    place: where,
    rotation: (r() - 0.5) * 4,
    scale: 0.93 + r() * 0.14,
    flip: r() < 0.5,
  };
  return { state: { ...state, plants: [...state.plants, plant], lastSegment: where === 'garden' ? species.segment : state.lastSegment }, plant };
}

/** Rearrange a segment: same plants, same sizes, new places. */
export function shuffleSegment(state: ParadiseState, segment: SegmentId): ParadiseState {
  const seed = (state.layoutSeed[segment] * 1103515245 + 12345) >>> 0 || 7;
  const slots = slotsFor(segment, seed);
  const next: ParadiseState = { ...state, layoutSeed: { ...state.layoutSeed, [segment]: seed }, plants: state.plants.map((p) => (p.segment === segment && inGarden(p) ? { ...p, slot: -1 } : p)), penalties: state.penalties.map((p) => (p.segment === segment ? { ...p, slot: -1 } : p)) };
  // biggest first, so the back of the beds goes to the tallest
  const order = next.plants.filter((p) => p.segment === segment && inGarden(p)).sort((a, b) => b.size - a.size || a.plantedAt - b.plantedAt);
  const taken = new Set<number>();
  const points: { x: number; y: number }[] = [];
  const placed = new Map<string, number>();
  for (const p of order) {
    const species = SPECIES_BY_ID[p.speciesId];
    if (!species) continue;
    const slot = chooseSlot(slots, taken, species, p.size, hash(p.id) ^ seed, points);
    placed.set(p.id, slot);
    if (slot >= 0) {
      taken.add(slot);
      points.push({ x: slots[slot].x, y: slots[slot].y });
    }
  }
  const penalties = next.penalties.map((pen) => {
    if (pen.segment !== segment) return pen;
    const free = slots.map((s, i) => i).filter((i) => !taken.has(i) && slots[i].band === 'front' && !slots[i].only);
    const slot = free.length ? free[hash(pen.id) % free.length] : -1;
    if (slot >= 0) taken.add(slot);
    return { ...pen, slot };
  });
  return { ...next, plants: next.plants.map((p) => (placed.has(p.id) ? { ...p, slot: placed.get(p.id)! } : p)), penalties };
}

/** Plants without a place (a full bed at the time, or carried over from an
 * older garden) take the best free slot, biggest first. Placed plants never move. */
export function rehome(state: ParadiseState): ParadiseState {
  if (!state.plants.some((p) => p.slot < 0 && inGarden(p))) return state;
  let plants = state.plants;
  for (const segment of SEGMENTS) {
    const homeless = plants.filter((p) => p.segment === segment && p.slot < 0 && inGarden(p)).sort((a, b) => b.size - a.size || a.plantedAt - b.plantedAt);
    if (!homeless.length) continue;
    const slots = slotsFor(segment, state.layoutSeed[segment]);
    const { taken, points } = occupiedIn({ ...state, plants }, segment, slots);
    const placed = new Map<string, number>();
    for (const p of homeless) {
      const species = SPECIES_BY_ID[p.speciesId];
      if (!species) continue;
      const slot = chooseSlot(slots, taken, species, p.size, hash(p.id), points);
      if (slot < 0) continue;
      taken.add(slot);
      points.push({ x: slots[slot].x, y: slots[slot].y });
      placed.set(p.id, slot);
    }
    plants = plants.map((p) => (placed.has(p.id) ? { ...p, slot: placed.get(p.id)! } : p));
  }
  return { ...state, plants };
}

/** An abandoned session leaves a wilted sapling in the segment it was meant for. */
export function addPenalty(state: ParadiseState, segment: SegmentId): ParadiseState {
  const slots = slotsFor(segment, state.layoutSeed[segment]);
  const { taken } = occupiedIn(state, segment, slots);
  const free = slots.map((s, i) => i).filter((i) => !taken.has(i) && slots[i].band === 'front' && !slots[i].only);
  const id = uid();
  const slot = free.length ? free[hash(id) % free.length] : -1;
  return { ...state, penalties: [...state.penalties, { id, segment, slot, placedAt: Date.now() }] };
}

/** The person removes a plant they grew: its place frees up for the next one. */
export function removePlant(state: ParadiseState, id: string): ParadiseState {
  if (!state.plants.some((p) => p.id === id)) return state;
  return { ...state, plants: state.plants.filter((p) => p.id !== id) };
}

export function clearPenalty(state: ParadiseState, id: string): ParadiseState {
  if (!state.penalties.some((p) => p.id === id)) return state;
  return { ...state, penalties: state.penalties.filter((p) => p.id !== id) };
}

// ---- queries ---------------------------------------------------------------------------

export function plantsIn(state: ParadiseState, segment: SegmentId): PlantInstance[] {
  return state.plants.filter((p) => p.segment === segment && inGarden(p));
}

/** Plants of a segment's species grown anywhere (garden or balcony): this opens rarer species. */
export function grownIn(state: ParadiseState, segment: SegmentId): number {
  return state.plants.filter((p) => p.segment === segment).length;
}

export function counts(state: ParadiseState): Record<SegmentId, number> {
  const c = Object.fromEntries(SEGMENTS.map((s) => [s, 0])) as Record<SegmentId, number>;
  for (const p of state.plants) if (inGarden(p)) c[p.segment]++;
  return c;
}

/** A plant's place on the plate (fractions), or null while homeless. */
export function positionOf(state: ParadiseState, p: { segment: SegmentId; slot: number }): Slot | null {
  if (p.slot < 0) return null;
  return slotsFor(p.segment, state.layoutSeed[p.segment])[p.slot] ?? null;
}

/** The old 3D garden's growable plants carried over as paradise plants. */
export function fromOldGarden(items: { itemId: string; minutes?: number; placedAt: number }[]): ParadiseState {
  const map: Record<string, string> = { rose_bush: 'rose', marigold: 'marigold', hibiscus: 'hibiscus', jasmine: 'jasmine', bougainvillea: 'bougainvillea', sunflower: 'sunflower', dahlia: 'dahlia', chrysanthemum: 'chrysanthemum', petunia: 'petunia', geranium: 'carnation', zinnia: 'gerbera', cosmos: 'chamomile', periwinkle: 'petunia', ixora: 'hibiscus', lantana: 'marigold' };
  let state: ParadiseState = { ...INITIAL_PARADISE, version: Date.now() };
  for (const it of items) {
    const sid = map[it.itemId];
    if (!sid || !(it.minutes && it.minutes >= 15)) continue;
    const r = plantFromSession(state, sid, it.minutes, `old-${it.itemId}-${it.placedAt}`);
    state = r.state;
  }
  return state;
}
