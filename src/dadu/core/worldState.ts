// The single shared world model used by both camera views, the simulation,
// the activity engine and the parent dashboard. Pure data + pure reducers.
import type { CharacterKey } from './characters';
import type { AgeBand, Difficulty } from './ageBands';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';
export type Season = 'spring' | 'summer' | 'monsoon' | 'autumn' | 'winter';
export type PlantStage = 'seed' | 'germination' | 'seedling' | 'growing' | 'mature' | 'flowering' | 'fruiting' | 'harvest';
export const PLANT_STAGES: PlantStage[] = ['seed', 'germination', 'seedling', 'growing', 'mature', 'flowering', 'fruiting', 'harvest'];

export interface PlantState {
  id: string;            // e.g. plant.tulsi.1
  species: string;       // catalog key
  plot: string;          // location id
  stage: PlantStage;
  /** Accumulated growth 0..1 within the current stage. */
  progress: number;
  plantedAt: number;     // epoch ms
  lastWateredAt: number;
  waterings: number[];   // epoch ms history (capped)
  harvested: number;
}

export interface AnimalState {
  key: CharacterKey;     // buddy | chikki | gauri | nandu
  hunger: number;        // 0 (full) .. 1 (hungry)
  thirst: number;
  rest: number;          // 0 (rested) .. 1 (tired)
  groom: number;         // 0 (clean) .. 1 (needs grooming)
  mood: 'happy' | 'content' | 'needs-care';
  lastCaredAt: number;
  location: string;
}

export type ObjectFlag = 'open' | 'on' | 'full' | 'clean' | 'ready' | 'inUse' | 'unlocked';

export interface ObjectState {
  id: string;            // location.object
  flags: Partial<Record<ObjectFlag, boolean>>;
  /** Number of times the lesson attached to this object was completed. */
  completions: number;
  lastInteractedAt?: number;
}

export interface CharacterPosition {
  key: CharacterKey;
  location: string;
  x: number;
  y: number;
  facing: 'ne' | 'nw' | 'se' | 'sw';
  activity: 'idle' | 'walk' | 'sit' | 'sleep' | 'read' | 'garden' | 'cook' | 'play' | 'graze' | 'teach';
}

export interface Rewards {
  stars: number;
  coins: number;
  badges: string[];
  certificates: string[];
}

export interface MasteryRecord {
  concept: string;
  score: number;         // 0..1
  attempts: number;
  correct: number;
  lastSeenAt: number;
  nextReviewAt: number;
}

export interface WorldState {
  version: 1;
  /** Sim clock: epoch ms of the last tick. */
  tickedAt: number;
  time: TimeOfDay;
  weather: Weather;
  season: Season;
  plants: PlantState[];
  animals: AnimalState[];
  objects: Record<string, ObjectState>;
  positions: CharacterPosition[];
  inventory: Record<string, number>;
  decorations: string[];
  rewards: Rewards;
  mastery: Record<string, MasteryRecord>;
  lessonsCompleted: string[];
  storiesRead: string[];
  assignments: Record<string, { status: 'available' | 'started' | 'completed'; completedAt?: number; note?: string; photoId?: string }>;
  echoQueue: string[];   // lesson ids whose key clauses Mitthu may repeat
  unlockedLocations: string[];
}

export interface ChildProfile {
  id: string;
  name: string;
  band: AgeBand;
  difficulty: Difficulty;
  language: string;
  helperLanguage?: string;
  avatar: { skin: string; hair: string; top: string };
  templeEnabled: boolean;
  createdAt: number;
}

export function createWorldState(now: number): WorldState {
  return {
    version: 1,
    tickedAt: now,
    time: timeOfDayFor(now),
    weather: 'sunny',
    season: seasonFor(now),
    plants: [],
    animals: (['buddy', 'chikki', 'gauri', 'nandu'] as CharacterKey[]).map((key) => ({
      key, hunger: 0.2, thirst: 0.2, rest: 0.1, groom: 0.1, mood: 'happy', lastCaredAt: now,
      location: { buddy: 'animalia.dog', chikki: 'animalia.rabbit', gauri: 'animalia.cowshed', nandu: 'animalia.cowshed' }[key as 'buddy' | 'chikki' | 'gauri' | 'nandu'],
    })),
    objects: {},
    positions: [
      { key: 'dadaji', location: 'villa.living', x: 4, y: 4, facing: 'se', activity: 'idle' },
      { key: 'chintu', location: 'villa.living', x: 6, y: 5, facing: 'sw', activity: 'idle' },
      { key: 'buddy', location: 'villa.exterior', x: 7, y: 8, facing: 'se', activity: 'idle' },
      { key: 'chikki', location: 'animalia.rabbit', x: 3, y: 3, facing: 'sw', activity: 'idle' },
      { key: 'gauri', location: 'animalia.cowshed', x: 4, y: 4, facing: 'se', activity: 'graze' },
      { key: 'nandu', location: 'animalia.cowshed', x: 6, y: 5, facing: 'sw', activity: 'play' },
      { key: 'mitthu', location: 'villa.veranda', x: 2, y: 1, facing: 'se', activity: 'idle' },
    ],
    inventory: { seeds: 3, water: 5, fodder: 3 },
    decorations: [],
    rewards: { stars: 0, coins: 0, badges: [], certificates: [] },
    mastery: {},
    lessonsCompleted: [],
    storiesRead: [],
    assignments: {},
    echoQueue: [],
    unlockedLocations: ['map', 'villa.exterior', 'villa.veranda', 'villa.living', 'villa.kitchen', 'villa.dining', 'villa.bedroom_dadaji', 'villa.bedroom_chintu', 'villa.study', 'villa.activity', 'villa.bathroom', 'villa.terrace', 'villa.driveway', 'garden.flowers', 'garden.vegetables', 'garden.fruit', 'garden.pond', 'animalia.dog', 'animalia.rabbit', 'animalia.cowshed', 'animalia.calf', 'town.public_garden', 'town.library'],
  };
}

export function timeOfDayFor(epochMs: number): TimeOfDay {
  const h = new Date(epochMs).getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 16) return 'afternoon';
  if (h >= 16 && h < 20) return 'evening';
  return 'night';
}

/** Indian seasons by month (IST calendar): spring Feb–Mar, summer Apr–Jun, monsoon Jul–Sep, autumn Oct–Nov, winter Dec–Jan. */
export function seasonFor(epochMs: number): Season {
  const m = new Date(epochMs).getMonth() + 1;
  if (m === 2 || m === 3) return 'spring';
  if (m >= 4 && m <= 6) return 'summer';
  if (m >= 7 && m <= 9) return 'monsoon';
  if (m === 10 || m === 11) return 'autumn';
  return 'winter';
}
