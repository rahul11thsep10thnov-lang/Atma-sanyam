// Pure activity logic for every ActivityKind in core/content.ts, plus the
// world-state effects of the "world" activities (watering, feeding, cooking,
// cleaning). No React Native imports.
import type { ActivityItem, ActivitySpec, ActivityKind, Localised } from '../core/content';
import type { CharacterKey } from '../core/characters';
import type { PlantState, WorldState } from '../core/worldState';
import { careFor, waterPlant } from '../core/simulation';
import type { CareAction } from '../core/simulation';

export type ActivityAnswer = string | string[] | number | number[] | Record<string, string> | [string, string];

export interface ActivityResult {
  ok: boolean;
  feedback: Localised;
  /** 0..1 how far the child got (used for partial-credit activities such as memory, trace, cook). */
  progress: number;
  /** Optional explanation of what was expected (shown after a retry, never as a score). */
  detail?: string;
}

const KINDS_BY_EVALUATOR: Record<ActivityKind, 'choose' | 'sort' | 'sequence' | 'memory' | 'trace' | 'count' | 'mix' | 'rhythm' | 'draw' | 'code' | 'circuit' | 'maze' | 'balance'> = {
  'tap-target': 'choose', choose: 'choose', pattern: 'choose', water: 'choose', feed: 'choose', groom: 'choose', harvest: 'choose',
  sort: 'sort', clean: 'sort',
  sequence: 'sequence', plant: 'sequence', cook: 'sequence', 'play-notes': 'sequence',
  memory: 'memory', trace: 'trace', count: 'count', 'mix-colours': 'mix', rhythm: 'rhythm', draw: 'draw',
  'code-blocks': 'code', circuit: 'circuit', maze: 'maze', balance: 'balance',
};

const asStrings = (a: ActivityAnswer): string[] => (Array.isArray(a) ? (a as unknown[]).map(String) : typeof a === 'object' ? Object.keys(a) : [String(a)]);

export function expectedSequence(items: ActivityItem[]): string[] {
  return items.filter((i) => i.order !== undefined).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((i) => i.key);
}

export function evaluate(spec: ActivitySpec, answer: ActivityAnswer): ActivityResult {
  const ev = KINDS_BY_EVALUATOR[spec.kind];
  const done = (ok: boolean, progress = ok ? 1 : 0, detail?: string): ActivityResult => ({ ok, feedback: ok ? spec.success : spec.retry, progress, detail });
  switch (ev) {
    case 'choose': {
      const key = asStrings(answer)[0];
      const item = spec.items.find((i) => i.key === key);
      return done(!!item?.ok);
    }
    case 'sort': {
      const map = (typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, string>;
      const groupable = spec.items.filter((i) => i.group !== undefined);
      const right = groupable.filter((i) => map[i.key] === i.group).length;
      return done(right === groupable.length && groupable.length > 0, groupable.length ? right / groupable.length : 0);
    }
    case 'sequence': {
      const exp = expectedSequence(spec.items);
      const got = asStrings(answer);
      let prefix = 0;
      while (prefix < exp.length && got[prefix] === exp[prefix]) prefix++;
      return done(prefix === exp.length && got.length === exp.length, exp.length ? prefix / exp.length : 0, exp.join(' → '));
    }
    case 'memory': {
      const [a, b] = asStrings(answer);
      const ia = spec.items.find((i) => i.key === a);
      const ib = spec.items.find((i) => i.key === b);
      const pairs = new Set(spec.items.map((i) => i.group)).size;
      return done(!!ia && !!ib && a !== b && ia.group !== undefined && ia.group === ib.group, pairs ? 1 / pairs : 0);
    }
    case 'trace': {
      const cov = typeof answer === 'number' ? answer : 0;
      return done(cov >= 0.7, Math.min(1, cov));
    }
    case 'count': {
      const n = typeof answer === 'number' ? answer : Number(asStrings(answer)[0]);
      const expected = spec.items.filter((i) => i.ok).length;
      return done(n === expected, 0, String(expected));
    }
    case 'mix': {
      const chosen = asStrings(answer).sort();
      const target = spec.items.find((i) => i.ok)?.key;
      return done(!!target && mixColours(chosen) === target);
    }
    case 'rhythm': {
      const taps = (Array.isArray(answer) ? answer : []) as number[];
      const beat = Number(spec.items.find((i) => i.key === 'beat')?.group ?? 500);
      const exp = expectedSequence(spec.items.filter((i) => i.key !== 'beat')).map((_, idx) => idx * beat);
      if (taps.length !== exp.length) return done(false, exp.length ? Math.min(taps.length, exp.length) / exp.length : 0);
      const t0 = taps[0] ?? 0;
      const err = exp.reduce((s, e, idx) => s + Math.abs((taps[idx] - t0) - e), 0) / Math.max(1, exp.length);
      return done(err <= 150, Math.max(0, 1 - err / 500));
    }
    case 'draw': {
      const strokes = typeof answer === 'number' ? answer : asStrings(answer).length;
      return done(strokes >= 1, Math.min(1, strokes / 3));
    }
    case 'code': return done(runCodeBlocks(spec.items, asStrings(answer)).reachedGoal);
    case 'circuit': {
      const chosen = new Set(asStrings(answer));
      const required = spec.items.filter((i) => i.ok).map((i) => i.key);
      const extra = [...chosen].some((k) => spec.items.find((i) => i.key === k && i.group === 'break'));
      const ok = required.every((k) => chosen.has(k)) && !extra && chosen.has('battery') && chosen.has('bulb');
      return done(ok, required.length ? required.filter((k) => chosen.has(k)).length / required.length : 0);
    }
    case 'maze': return done(walkMaze(spec.items, asStrings(answer)).reachedGoal);
    case 'balance': {
      const exp = expectedSequence(spec.items);
      const got = asStrings(answer);
      const ok = exp.length === got.length && exp.every((k, idx) => k === got[idx]);
      return done(ok, exp.length ? got.filter((k, idx) => k === exp[idx]).length / exp.length : 0);
    }
  }
}

/** Additive mixing of the three paint primaries used by the art room. */
export function mixColours(parts: string[]): string {
  const s = [...new Set(parts)].sort().join('+');
  const table: Record<string, string> = { 'red+yellow': 'orange', 'blue+yellow': 'green', 'blue+red': 'purple', 'blue+red+yellow': 'brown', red: 'red', blue: 'blue', yellow: 'yellow', 'white+red': 'pink' };
  return table[s] ?? 'brown';
}

// ---- tiny grid interpreter for code-blocks and mazes ----
interface Grid { w: number; h: number; walls: Set<string>; start: { x: number; y: number; dir: number }; goal: { x: number; y: number } }
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left

export function parseGrid(items: ActivityItem[]): Grid {
  const g = (k: string) => items.find((i) => i.key === k)?.group ?? '';
  const [w, h] = (g('size') || '5,5').split(',').map(Number);
  const [sx, sy, sd] = (g('start') || '0,0,1').split(',').map(Number);
  const [gx, gy] = (g('goal') || `${w - 1},${h - 1}`).split(',').map(Number);
  const walls = new Set(items.filter((i) => i.key.startsWith('wall')).map((i) => i.group ?? ''));
  return { w, h, walls, start: { x: sx, y: sy, dir: sd || 0 }, goal: { x: gx, y: gy } };
}

/** Program tokens: move | left | right | repeat:N:move (expands N times) | repeat:N:left … */
export function runCodeBlocks(items: ActivityItem[], program: string[]): { reachedGoal: boolean; path: { x: number; y: number }[]; steps: number } {
  const grid = parseGrid(items);
  const tokens: string[] = [];
  for (const t of program) {
    const m = /^repeat:(\d+):(\w+)$/.exec(t);
    if (m) for (let i = 0; i < Math.min(20, Number(m[1])); i++) tokens.push(m[2]); else tokens.push(t);
  }
  let { x, y, dir } = grid.start;
  const path = [{ x, y }];
  for (const t of tokens.slice(0, 200)) {
    if (t === 'left') dir = (dir + 3) % 4;
    else if (t === 'right') dir = (dir + 1) % 4;
    else if (t === 'move') {
      const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1];
      if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h || grid.walls.has(`${nx},${ny}`)) continue; // bump: stay
      x = nx; y = ny; path.push({ x, y });
    }
  }
  return { reachedGoal: x === grid.goal.x && y === grid.goal.y, path, steps: tokens.length };
}

export function walkMaze(items: ActivityItem[], moves: string[]): { reachedGoal: boolean; valid: boolean } {
  const grid = parseGrid(items);
  let { x, y } = grid.start;
  const d: Record<string, number[]> = { U: [0, -1], R: [1, 0], D: [0, 1], L: [-1, 0] };
  for (const m of moves) {
    const v = d[m.toUpperCase()];
    if (!v) return { reachedGoal: false, valid: false };
    const nx = x + v[0], ny = y + v[1];
    if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h || grid.walls.has(`${nx},${ny}`)) return { reachedGoal: false, valid: false };
    x = nx; y = ny;
  }
  return { reachedGoal: x === grid.goal.x && y === grid.goal.y, valid: true };
}

// ---- memory game state ----
export interface MemoryState { revealed: string[]; matched: string[]; moves: number }
export function memoryFlip(spec: ActivitySpec, state: MemoryState, key: string): { state: MemoryState; matched: boolean | null; complete: boolean } {
  if (state.matched.includes(key) || state.revealed.includes(key)) return { state, matched: null, complete: false };
  const revealed = [...state.revealed, key];
  if (revealed.length < 2) return { state: { ...state, revealed }, matched: null, complete: false };
  const r = evaluate(spec, [revealed[0], revealed[1]] as [string, string]);
  const matched = r.ok ? [...state.matched, ...revealed] : state.matched;
  const complete = matched.length === spec.items.length;
  return { state: { revealed: [], matched, moves: state.moves + 1 }, matched: r.ok, complete };
}

// ---- world-state effects ----
const PLANT_SPECIES: Record<string, { name: Localised; stages: string }> = {
  tulsi: { name: { en: 'Tulsi', hi: 'तुलसी' }, stages: 'herb' },
  tomato: { name: { en: 'Tomato', hi: 'टमाटर' }, stages: 'veg' },
  marigold: { name: { en: 'Marigold', hi: 'गेंदा' }, stages: 'flower' },
  spinach: { name: { en: 'Spinach', hi: 'पालक' }, stages: 'veg' },
  chilli: { name: { en: 'Chilli', hi: 'मिर्च' }, stages: 'veg' },
  sunflower: { name: { en: 'Sunflower', hi: 'सूरजमुखी' }, stages: 'flower' },
  mint: { name: { en: 'Mint', hi: 'पुदीना' }, stages: 'herb' },
  brinjal: { name: { en: 'Brinjal', hi: 'बैंगन' }, stages: 'veg' },
};
export const PLANT_CATALOG = PLANT_SPECIES;

export function plantSeed(w: WorldState, species: string, plot: string, now: number): WorldState {
  if (!PLANT_SPECIES[species] || (w.inventory.seeds ?? 0) <= 0) return w;
  const n = w.plants.filter((p) => p.species === species).length + 1;
  const plant: PlantState = { id: `plant.${species}.${n}`, species, plot, stage: 'seed', progress: 0, plantedAt: now, lastWateredAt: now, waterings: [now], harvested: 0 };
  return { ...w, plants: [...w.plants, plant], inventory: { ...w.inventory, seeds: (w.inventory.seeds ?? 0) - 1 } };
}

export function waterPlantInWorld(w: WorldState, plantId: string, now: number): WorldState {
  return { ...w, plants: w.plants.map((p) => (p.id === plantId ? waterPlant(p, now) : p)) };
}

export function harvestPlant(w: WorldState, plantId: string): WorldState {
  const p = w.plants.find((x) => x.id === plantId);
  if (!p || p.stage !== 'harvest') return w;
  const produce = `produce.${p.species}`;
  return {
    ...w,
    plants: w.plants.map((x) => (x.id === plantId ? { ...x, stage: 'growing', progress: 0, harvested: x.harvested + 1 } : x)),
    inventory: { ...w.inventory, [produce]: (w.inventory[produce] ?? 0) + 1, seeds: (w.inventory.seeds ?? 0) + 1 },
  };
}

export function careForAnimal(w: WorldState, key: CharacterKey, action: CareAction, now: number): WorldState {
  const cost: Partial<Record<CareAction, string>> = { feed: 'fodder', water: 'water' };
  const item = cost[action];
  if (item && (w.inventory[item] ?? 0) <= 0) return w;
  return {
    ...w,
    animals: w.animals.map((a) => (a.key === key ? careFor(a, action, now) : a)),
    inventory: item ? { ...w.inventory, [item]: (w.inventory[item] ?? 0) - 1 } : w.inventory,
  };
}

export function setObjectFlag(w: WorldState, objectId: string, flag: keyof NonNullable<WorldState['objects'][string]['flags']>, value: boolean, now: number): WorldState {
  const prev = w.objects[objectId] ?? { id: objectId, flags: {}, completions: 0 };
  return { ...w, objects: { ...w.objects, [objectId]: { ...prev, flags: { ...prev.flags, [flag]: value }, lastInteractedAt: now } } };
}

/** The inventory refills a little every real day so care never runs dry (no scarcity mechanic). */
export function refillInventory(w: WorldState, now: number): WorldState {
  const last = w.objects['inventory.refill']?.lastInteractedAt ?? 0;
  if (now - last < 24 * 3_600_000) return w;
  const inv = { ...w.inventory, seeds: Math.max(w.inventory.seeds ?? 0, 3), water: Math.max(w.inventory.water ?? 0, 5), fodder: Math.max(w.inventory.fodder ?? 0, 3) };
  return setObjectFlag({ ...w, inventory: inv }, 'inventory.refill', 'ready', true, now);
}

/** Cooking: a recipe is a 'cook' sequence; measurement questions are 'count' items. Returns the dish to the inventory. */
export function cookDish(w: WorldState, dish: string): WorldState {
  return { ...w, inventory: { ...w.inventory, [`dish.${dish}`]: (w.inventory[`dish.${dish}`] ?? 0) + 1 } };
}
