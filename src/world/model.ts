// The 3D botanical world's own saved state, and the rules that change it.
//
// The plants themselves are NOT stored here. A plant is still the permanent
// record the existing garden already keeps (src/paradise/model.ts:
// PlantInstance, created exactly once per completed session by
// plantFromSession, keyed by sessionId). This world only remembers WHERE in
// the greenhouse each of those plants stands, plus the things only the 3D
// world has: the Grand Banyan landmark, which wings are open, and which
// plants are waiting for room. So:
//  - nothing here can create, duplicate or lose a plant;
//  - the old garden keeps working untouched, and switching back to it loses nothing;
//  - a placement, once made, never moves: it stores its own coordinates.
import { WING_BY_ID, WINGS, WingId, arboretumZoneAt, conservatoryZoneAt, zonesFor } from './zones';

export const WORLD_SCHEMA = 1;

export interface Landmark {
  id: 'grand-banyan';
  wing: WingId;
  x: number;
  z: number;
  species: 'banyan';
  /** Always true: the landmark cannot be moved, removed, replaced or shuffled. */
  permanent: true;
  establishedAt: number;
}

export interface Placement {
  /** A plant (PlantInstance.id) or a wilted sapling (Penalty.id). */
  kind: 'specimen' | 'penalty';
  refId: string;
  wing: WingId;
  slotId: string;
  zone: string;
  /** Wing floor coordinates in metres: where it is drawn, forever. */
  x: number;
  z: number;
  /** Clearance it keeps from its neighbours, in metres. */
  radius: number;
  placedAt: number;
}

export interface WorldState {
  schemaVersion: typeof WORLD_SCHEMA;
  version: number;
  createdAt: number;
  landmarks: Landmark[];
  wings: Partial<Record<WingId, { unlockedAt: number }>>;
  /** By refId. */
  placements: Record<string, Placement>;
  /** Plants grown but waiting for a free position (never discarded). */
  pending: string[];
  /** The last plant the world has welcomed with the camera. */
  lastWelcomed: string | null;
}

/** A planting position offered by a wing's floor. */
export interface SlotDef {
  id: string;
  wing: WingId;
  x: number;
  z: number;
  zone: string;
  water: boolean;
  /** Tallest specimen that fits here under the glass, in metres. */
  maxH: number;
}

/** What the world needs to know about one of the person's plants. */
export interface WorldPlant {
  id: string;
  speciesId: string;
  modelId: string;
  kind: 'plant' | 'tree';
  water: boolean;
  size: number;
  plantedAt: number;
}

export interface WorldPenalty {
  id: string;
  segment: string;
  placedAt: number;
}

export const GRAND_BANYAN: Omit<Landmark, 'establishedAt'> = { id: 'grand-banyan', wing: 'northern-arboretum', x: 0, z: 0, species: 'banyan', permanent: true };
/** No planting within this distance of the banyan's trunk: its roots, ring and pillars. */
export const LANDMARK_CLEARANCE = 4.2;

/** How large a wing draws ordinary plants (a miniature world shows small plants larger than life). */
export const PLANT_BOOST: Partial<Record<WingId, number>> = { 'central-conservatory': 1.7, 'northern-arboretum': 3.0 };

export function clearance(kind: 'plant' | 'tree' | 'penalty', size: number, wing: WingId): number {
  if (kind === 'tree') return 0.5 + size * 0.22;
  if (kind === 'penalty') return 0.3;
  return (0.15 + size * 0.045) * (PLANT_BOOST[wing] ?? 1);
}

export function initialWorld(now: number): WorldState {
  return {
    schemaVersion: WORLD_SCHEMA,
    version: now,
    createdAt: now,
    landmarks: [{ ...GRAND_BANYAN, establishedAt: now }],
    wings: { 'central-conservatory': { unlockedAt: now }, 'northern-arboretum': { unlockedAt: now } },
    placements: {},
    pending: [],
    lastWelcomed: null,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function zoneAt(wing: WingId, x: number, z: number, water: boolean): string {
  return wing === 'northern-arboretum' ? arboretumZoneAt(x, z, water) : conservatoryZoneAt(x, z, water);
}

// ---- progression ----------------------------------------------------------------------------------

export interface Progress {
  sessions: number;
  minutes: number;
  species: number;
}

export function progressOf(plants: { speciesId: string; focusMinutes?: number }[]): Progress {
  return { sessions: plants.length, minutes: plants.reduce((m, p) => m + (p.focusMinutes ?? 0), 0), species: new Set(plants.map((p) => p.speciesId)).size };
}

export function meetsUnlock(rule: { sessions?: number; minutes?: number; species?: number }, p: Progress): boolean {
  return p.sessions >= (rule.sessions ?? 0) && p.minutes >= (rule.minutes ?? 0) && p.species >= (rule.species ?? 0);
}

// ---- placement --------------------------------------------------------------------------------------

/** A spatial hash of what already stands in a wing, for fast clearance checks. */
class Occupancy {
  private cells = new Map<string, Placement[]>();
  private static C = 2;
  constructor(placements: Placement[]) {
    for (const p of placements) this.add(p);
  }
  private key(wing: string, cx: number, cz: number) {
    return `${wing}:${cx}:${cz}`;
  }
  add(p: Placement) {
    const k = this.key(p.wing, Math.floor(p.x / Occupancy.C), Math.floor(p.z / Occupancy.C));
    const list = this.cells.get(k) ?? [];
    list.push(p);
    this.cells.set(k, list);
  }
  fits(wing: WingId, x: number, z: number, r: number, slotId: string): boolean {
    const reach = Math.ceil((r + 2.5) / Occupancy.C);
    const cx = Math.floor(x / Occupancy.C);
    const cz = Math.floor(z / Occupancy.C);
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        for (const q of this.cells.get(this.key(wing, cx + dx, cz + dz)) ?? []) {
          if (q.slotId === slotId) return false;
          if (Math.hypot(q.x - x, q.z - z) < Math.max(r, q.radius) * 0.92) return false;
        }
      }
    }
    return true;
  }
}

const PENALTY_ZONE: Record<string, string> = { flowers: 'flower', trees: 'grand_avenue', indoor: 'indoor', fruits: 'orchard', herbs: 'herb' };

function choose(
  slots: SlotDef[],
  occ: Occupancy,
  open: Set<WingId>,
  landmarks: Landmark[],
  want: { kind: 'plant' | 'tree' | 'penalty'; water: boolean; size: number; zones: string[]; height: number; seed: string; wings: WingId[] },
): SlotDef | null {
  const ranked: { s: SlotDef; score: number }[] = [];
  for (const s of slots) {
    if (!open.has(s.wing) || s.water !== want.water) continue;
    if (want.kind === 'tree' && s.maxH < Math.min(want.height, 2.4)) continue;
    const wingRank = want.wings.indexOf(s.wing);
    if (wingRank < 0) continue;
    const zr = want.zones.indexOf(s.zone);
    // a tree outside its zones only in the arboretum (the conservatory's inner beds are too small for trees)
    if (want.kind === 'tree' && zr < 0 && s.wing !== 'northern-arboretum') continue;
    ranked.push({ s, score: (zr < 0 ? 20 : zr * 4) + wingRank * 2 + hash(`${want.seed}|${s.id}`) * 3.9 });
  }
  ranked.sort((a, b) => a.score - b.score);
  for (const { s } of ranked) {
    const r = clearance(want.kind, want.size, s.wing);
    if (landmarks.some((l) => l.wing === s.wing && Math.hypot(l.x - s.x, l.z - s.z) < LANDMARK_CLEARANCE + r * 0.5)) continue;
    if (occ.fits(s.wing, s.x, s.z, r, s.id)) return s;
  }
  return null;
}

/** Expected mature height of a size, roughly (metres), for the ceiling check. */
const TREE_HEIGHT = [0, 1, 1.8, 2.9, 4.2, 5.3, 6.3, 7];

export interface ReconcileResult {
  world: WorldState;
  changed: boolean;
  /** Plants that took a position in this pass (to welcome with the camera). */
  placed: string[];
}

/**
 * Bring the world up to date with the person's plants and saplings:
 * the landmark is restored if missing, wings open by progression, positions
 * of removed plants are released, and every unplaced plant takes the best free
 * position (or waits in `pending`). Placed plants never move.
 */
export function reconcile(world: WorldState, plants: WorldPlant[], penalties: WorldPenalty[], slots: SlotDef[], progress: Progress, now: number): ReconcileResult {
  let changed = false;
  const next: WorldState = { ...world, landmarks: [...world.landmarks], wings: { ...world.wings }, placements: { ...world.placements }, pending: [] };

  // the landmark: always present, always at its own coordinates
  const lm = next.landmarks.find((l) => l.id === GRAND_BANYAN.id);
  if (!lm || lm.x !== GRAND_BANYAN.x || lm.z !== GRAND_BANYAN.z || lm.wing !== GRAND_BANYAN.wing || lm.permanent !== true) {
    next.landmarks = [...next.landmarks.filter((l) => l.id !== GRAND_BANYAN.id), { ...GRAND_BANYAN, establishedAt: lm?.establishedAt ?? now }];
    changed = true;
  }

  for (const w of WINGS) {
    if (next.wings[w.id]) continue;
    if (w.id === 'central-conservatory' || w.id === 'northern-arboretum' || meetsUnlock(w.unlock, progress)) {
      next.wings[w.id] = { unlockedAt: now };
      changed = true;
    }
  }
  const open = new Set(WINGS.filter((w) => w.built && next.wings[w.id]).map((w) => w.id));

  // release positions of plants the person has removed (or saplings they cleared) in the garden
  const alive = new Set([...plants.map((p) => p.id), ...penalties.map((p) => p.id)]);
  for (const id of Object.keys(next.placements)) {
    if (!alive.has(id)) {
      delete next.placements[id];
      changed = true;
    }
  }

  const occ = new Occupancy(Object.values(next.placements));
  const placed: string[] = [];
  // oldest first, so a long-time garden fills in the order it grew
  const todo = plants.filter((p) => !next.placements[p.id]).sort((a, b) => a.plantedAt - b.plantedAt || b.size - a.size);
  for (const p of todo) {
    const zones = zonesFor(p.speciesId, p.modelId, p.kind);
    const wings: WingId[] = p.kind === 'tree' ? ['northern-arboretum', 'central-conservatory'] : ['central-conservatory', 'northern-arboretum'];
    const s = choose(slots, occ, open, next.landmarks, { kind: p.kind, water: p.water, size: p.size, zones, height: p.kind === 'tree' ? TREE_HEIGHT[p.size] ?? 7 : 0.5, seed: p.id, wings });
    if (!s) {
      next.pending.push(p.id);
      continue;
    }
    const pl: Placement = { kind: 'specimen', refId: p.id, wing: s.wing, slotId: s.id, zone: s.zone, x: s.x, z: s.z, radius: clearance(p.kind, p.size, s.wing), placedAt: now };
    next.placements[p.id] = pl;
    occ.add(pl);
    placed.push(p.id);
    changed = true;
  }
  for (const pen of penalties) {
    if (next.placements[pen.id]) continue;
    const s = choose(slots, occ, open, next.landmarks, { kind: 'penalty', water: false, size: 1, zones: [PENALTY_ZONE[pen.segment] ?? 'flower'], height: 0.3, seed: pen.id, wings: ['central-conservatory', 'northern-arboretum'] });
    if (!s) continue;
    const pl: Placement = { kind: 'penalty', refId: pen.id, wing: s.wing, slotId: s.id, zone: s.zone, x: s.x, z: s.z, radius: clearance('penalty', 1, s.wing), placedAt: now };
    next.placements[pen.id] = pl;
    occ.add(pl);
    changed = true;
  }
  if (next.pending.join(',') !== world.pending.join(',')) changed = true;
  if (changed) next.version = now;
  return { world: changed ? next : world, changed, placed };
}

export function wingName(id: WingId): string {
  return WING_BY_ID[id]?.name ?? id;
}

/** Is a value a world this version can use? */
export function isWorld(v: unknown): v is WorldState {
  const w = v as WorldState;
  return !!w && w.schemaVersion === WORLD_SCHEMA && Array.isArray(w.landmarks) && typeof w.placements === 'object' && !!w.placements && Array.isArray(w.pending);
}
