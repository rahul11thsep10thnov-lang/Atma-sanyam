// The focus → reward loop (architecture doc sections H/I; design spec 17-18,
// 72-74). Pure data and functions; persistence is RewardRepository, the
// orchestration is FocusRewards. Numbers live here so pacing is tuned in one
// place, never in business logic.
import { PlantGrowthState } from './types';

export interface RewardState {
  schemaVersion: 1;
  coins: number;
  lifetimeMinutes: number;
  completedSessions: number;
  pausedSessions: number;
  claimedMilestoneIds: string[];
}

export const INITIAL_REWARD_STATE: RewardState = {
  schemaVersion: 1,
  coins: 0,
  lifetimeMinutes: 0,
  completedSessions: 0,
  pausedSessions: 0,
  claimedMilestoneIds: [],
};

/** One coin per focused minute; milestones add a little on top. Coins buy
 * balcony objects — they are never shown as a score. */
export function coinsForSession(minutes: number): number {
  return Math.max(0, Math.round(minutes));
}

export interface Milestone {
  id: string;
  minutes: number;
  coins: number;
  /** Shown as "<name> unlocked" — the asset becomes available in the store. */
  unlocksAssetId?: string;
  title: string;
}

export const MILESTONES: Milestone[] = [
  { id: 'm-10', minutes: 10, coins: 20, title: 'First focus', unlocksAssetId: 'lantern_black_01' },
  { id: 'm-45', minutes: 45, coins: 40, title: 'Settling in', unlocksAssetId: 'planter_tall_broadleaf_01' },
  { id: 'm-90', minutes: 90, coins: 60, title: 'Golden hour', unlocksAssetId: 'lamp_floor_arc_01' },
  { id: 'm-180', minutes: 180, coins: 100, title: 'Three hours', unlocksAssetId: 'rug_outdoor_01' },
  { id: 'm-300', minutes: 300, coins: 150, title: 'Five hours' },
  { id: 'm-600', minutes: 600, coins: 250, title: 'Deep worker' },
];

export function milestonesCrossed(previousMinutes: number, newMinutes: number, claimed: string[]): Milestone[] {
  return MILESTONES.filter((m) => !claimed.includes(m.id) && m.minutes > previousMinutes && m.minutes <= newMinutes).sort((a, b) => a.minutes - b.minutes);
}

export function isAssetUnlocked(assetId: string, lifetimeMinutes: number, unlockMinutes?: number): boolean {
  return unlockMinutes === undefined || lifetimeMinutes >= unlockMinutes || MILESTONES.some((m) => m.unlocksAssetId === assetId && lifetimeMinutes >= m.minutes);
}

// ---- plant growth ---------------------------------------------------------

export type GrowthStage = 'seed' | 'sprout' | 'young' | 'mature' | 'flowering';

export const GROWTH_THRESHOLDS: { stage: GrowthStage; minutes: number }[] = [
  { stage: 'seed', minutes: 0 },
  { stage: 'sprout', minutes: 10 },
  { stage: 'young', minutes: 25 },
  { stage: 'mature', minutes: 45 },
  { stage: 'flowering', minutes: 90 },
];
export const FULL_GROWTH_MINUTES = GROWTH_THRESHOLDS[GROWTH_THRESHOLDS.length - 1].minutes;
export const HEALTH_LOSS_PER_BREAK = 0.18;
export const HEALTH_GAIN_PER_FOCUS_MINUTE = 0.01;
export const WILT_HEALTH_THRESHOLD = 0.35;

export const NEW_PLANT_GROWTH: PlantGrowthState = { focusMinutes: 0, health: 1 };
/** Starter-set plants arrive already grown; a bought one starts as a seedling. */
export const STARTER_PLANT_GROWTH: PlantGrowthState = { focusMinutes: FULL_GROWTH_MINUTES, health: 1 };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function stageFor(minutes: number): GrowthStage {
  let stage: GrowthStage = 'seed';
  for (const step of GROWTH_THRESHOLDS) if (minutes >= step.minutes) stage = step.stage;
  return stage;
}

/** 0..1 visual growth, eased so early minutes show visibly. */
export function growthFraction(minutes: number): number {
  const t = clamp01(minutes / FULL_GROWTH_MINUTES);
  return Math.sqrt(t);
}

export function isWilted(g: PlantGrowthState): boolean {
  return g.health < WILT_HEALTH_THRESHOLD;
}

export function isFullyGrown(g: PlantGrowthState): boolean {
  return g.focusMinutes >= FULL_GROWTH_MINUTES;
}

export function applyFocusToPlant(g: PlantGrowthState, minutes: number): PlantGrowthState {
  if (minutes <= 0) return g;
  return { focusMinutes: g.focusMinutes + minutes, health: clamp01(g.health + minutes * HEALTH_GAIN_PER_FOCUS_MINUTE) };
}

export function applyBreakToPlant(g: PlantGrowthState): PlantGrowthState {
  return { ...g, health: clamp01(g.health - HEALTH_LOSS_PER_BREAK) };
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  seed: 'a seed',
  sprout: 'a sprout',
  young: 'a young plant',
  mature: 'a mature plant',
  flowering: 'in full bloom',
};
