// Lightweight living-world simulation. Nothing runs in the background: the
// app calls `tick(state, now)` when it opens, when a screen comes into focus
// and after an activity. The tick advances plants, animal needs, time,
// weather, seasons and character routines from the elapsed wall-clock time.
// Deterministic for a given (state, now) so it can be unit tested.
import type { CharacterKey } from './characters';
import { PLANT_STAGES, seasonFor, timeOfDayFor } from './worldState';
import type { AnimalState, CharacterPosition, PlantState, PlantStage, TimeOfDay, Weather, WorldState } from './worldState';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Hours of real time (while watered) needed to pass each stage. */
export const STAGE_HOURS: Record<PlantStage, number> = {
  seed: 6, germination: 12, seedling: 24, growing: 48, mature: 24, flowering: 24, fruiting: 24, harvest: Infinity,
};

/** A plant grows only while it has been watered in the last 36 hours; growth never reverses. */
export function advancePlant(p: PlantState, from: number, to: number): PlantState {
  if (to <= from || p.stage === 'harvest') return p;
  const wateredUntil = p.lastWateredAt + 36 * HOUR;
  const effectiveTo = Math.min(to, wateredUntil);
  if (effectiveTo <= from) return p;
  let stageIdx = PLANT_STAGES.indexOf(p.stage);
  let progress = p.progress + (effectiveTo - from) / (STAGE_HOURS[p.stage] * HOUR);
  while (progress >= 1 && stageIdx < PLANT_STAGES.length - 1) {
    progress -= 1;
    stageIdx += 1;
    const hrs = STAGE_HOURS[PLANT_STAGES[stageIdx]];
    if (!isFinite(hrs)) { progress = 0; break; }
    // the remainder carries over proportionally to the new stage length
    progress = progress * STAGE_HOURS[PLANT_STAGES[stageIdx - 1]] / hrs;
  }
  return { ...p, stage: PLANT_STAGES[stageIdx], progress: Math.min(progress, 0.999) };
}

export function waterPlant(p: PlantState, now: number): PlantState {
  return { ...p, lastWateredAt: now, waterings: [...p.waterings.slice(-29), now] };
}

/** Needs rise slowly and cap at 1; care is never punished, a neglected animal only asks for help. */
export function advanceAnimal(a: AnimalState, from: number, to: number): AnimalState {
  const dh = Math.max(0, (to - from) / HOUR);
  const hunger = Math.min(1, a.hunger + dh / 10);
  const thirst = Math.min(1, a.thirst + dh / 8);
  const rest = Math.min(1, a.rest + dh / 16);
  const groom = Math.min(1, a.groom + dh / 48);
  const worst = Math.max(hunger, thirst, rest, groom);
  return { ...a, hunger, thirst, rest, groom, mood: worst > 0.75 ? 'needs-care' : worst > 0.45 ? 'content' : 'happy' };
}

export type CareAction = 'feed' | 'water' | 'rest' | 'groom';
export function careFor(a: AnimalState, action: CareAction, now: number): AnimalState {
  const next = { ...a, lastCaredAt: now };
  if (action === 'feed') next.hunger = 0;
  if (action === 'water') next.thirst = 0;
  if (action === 'rest') next.rest = 0;
  if (action === 'groom') next.groom = 0;
  const worst = Math.max(next.hunger, next.thirst, next.rest, next.groom);
  next.mood = worst > 0.75 ? 'needs-care' : worst > 0.45 ? 'content' : 'happy';
  return next;
}

/** Weather is a deterministic function of the day and season, so every device agrees without a server. */
export function weatherFor(epochMs: number): Weather {
  const season = seasonFor(epochMs);
  const day = Math.floor((epochMs + 5.5 * HOUR) / DAY); // IST day number
  const r = ((day * 9301 + 49297) % 233280) / 233280;
  const table: Record<ReturnType<typeof seasonFor>, [Weather, number][]> = {
    spring: [['sunny', 0.7], ['cloudy', 0.9], ['rainy', 1]],
    summer: [['sunny', 0.85], ['cloudy', 0.95], ['stormy', 1]],
    monsoon: [['rainy', 0.5], ['cloudy', 0.7], ['stormy', 0.85], ['sunny', 1]],
    autumn: [['sunny', 0.75], ['cloudy', 0.95], ['foggy', 1]],
    winter: [['foggy', 0.3], ['sunny', 0.8], ['cloudy', 1]],
  };
  for (const [w, p] of table[season]) if (r <= p) return w;
  return 'sunny';
}

/** Daily routines: where each character is and what they do at a time of day, unless an activity holds them. */
export const ROUTINES: Record<CharacterKey, Record<TimeOfDay, { location: string; activity: CharacterPosition['activity'] }>> = {
  dadaji: { morning: { location: 'garden.vegetables', activity: 'garden' }, afternoon: { location: 'villa.living', activity: 'read' }, evening: { location: 'villa.kitchen', activity: 'cook' }, night: { location: 'villa.bedroom_dadaji', activity: 'sleep' } },
  chintu: { morning: { location: 'villa.dining', activity: 'idle' }, afternoon: { location: 'villa.study', activity: 'read' }, evening: { location: 'villa.driveway', activity: 'play' }, night: { location: 'villa.bedroom_chintu', activity: 'sleep' } },
  buddy: { morning: { location: 'villa.exterior', activity: 'play' }, afternoon: { location: 'animalia.dog', activity: 'sleep' }, evening: { location: 'villa.driveway', activity: 'play' }, night: { location: 'villa.bedroom_chintu', activity: 'sleep' } },
  chikki: { morning: { location: 'animalia.rabbit', activity: 'idle' }, afternoon: { location: 'garden.flowers', activity: 'idle' }, evening: { location: 'animalia.rabbit', activity: 'idle' }, night: { location: 'animalia.rabbit', activity: 'sleep' } },
  gauri: { morning: { location: 'garden.vegetables', activity: 'graze' }, afternoon: { location: 'animalia.cowshed', activity: 'sleep' }, evening: { location: 'animalia.calf', activity: 'graze' }, night: { location: 'animalia.cowshed', activity: 'sleep' } },
  nandu: { morning: { location: 'garden.vegetables', activity: 'play' }, afternoon: { location: 'animalia.cowshed', activity: 'sleep' }, evening: { location: 'animalia.calf', activity: 'play' }, night: { location: 'animalia.cowshed', activity: 'sleep' } },
  mitthu: { morning: { location: 'villa.veranda', activity: 'idle' }, afternoon: { location: 'villa.terrace', activity: 'idle' }, evening: { location: 'villa.veranda', activity: 'idle' }, night: { location: 'villa.veranda', activity: 'sleep' } },
};

export function applyRoutines(positions: CharacterPosition[], time: TimeOfDay, held: Set<CharacterKey>): CharacterPosition[] {
  return positions.map((p) => {
    if (held.has(p.key)) return p;
    const r = ROUTINES[p.key][time];
    if (p.location === r.location && p.activity === r.activity) return p;
    return { ...p, location: r.location, activity: r.activity };
  });
}

export function tick(state: WorldState, now: number, held: Set<CharacterKey> = new Set()): WorldState {
  const from = state.tickedAt;
  if (now <= from) return state;
  const time = timeOfDayFor(now);
  return {
    ...state,
    tickedAt: now,
    time,
    season: seasonFor(now),
    weather: weatherFor(now),
    plants: state.plants.map((p) => advancePlant(p, from, now)),
    animals: state.animals.map((a) => advanceAnimal(a, from, now)),
    positions: applyRoutines(state.positions, time, held),
  };
}
