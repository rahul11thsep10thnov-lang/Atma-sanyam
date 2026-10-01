// Orchestrates what a focus session does to the balcony: coins, milestones
// and the active plant's growth or wilt. Called by the session screen; the
// balcony screen reloads the world it writes. Everything here is local-first
// and idempotent per call.
import { getAsset } from '../catalog/AssetCatalog';
import { getEnvironment, STARTER_ENVIRONMENT_ID } from '../environments/EnvironmentRegistry';
import { loadRewards, saveRewards } from './RewardRepository';
import {
  applyBreakToPlant,
  applyFocusToPlant,
  coinsForSession,
  GrowthStage,
  isFullyGrown,
  isWilted,
  Milestone,
  milestonesCrossed,
  NEW_PLANT_GROWTH,
  STARTER_PLANT_GROWTH,
  stageFor,
} from './RewardState';
import { UserPlacedObject, WorldSaveState } from './types';
import { loadWorld, saveWorldNow } from './WorldRepository';

export interface PlantChange {
  objectId: string;
  name: string;
  before: GrowthStage;
  after: GrowthStage;
  wilted: boolean;
  revived: boolean;
}

export interface SessionRewardSummary {
  coinsEarned: number;
  bonusCoins: number;
  coinsTotal: number;
  milestones: Milestone[];
  plant: PlantChange | null;
}

export interface PauseSummary {
  plant: PlantChange | null;
}

/** The plant that receives focus: the least-grown growable object on the
 * balcony (ties → the most recently placed), so attention goes where it
 * shows. A fully grown balcony still earns coins and milestones. */
function pickActivePlant(objects: UserPlacedObject[]): UserPlacedObject | null {
  const plants = objects.filter((o) => getAsset(o.assetId)?.growable);
  if (plants.length === 0) return null;
  const notFull = plants.filter((o) => !isFullyGrown(o.growth ?? STARTER_PLANT_GROWTH));
  const pool = notFull.length > 0 ? notFull : plants;
  return pool.sort((a, b) => (a.growth?.focusMinutes ?? 0) - (b.growth?.focusMinutes ?? 0) || b.createdAt - a.createdAt)[0] ?? null;
}

async function loadStarterWorld(): Promise<WorldSaveState | null> {
  return loadWorld(STARTER_ENVIRONMENT_ID);
}

export async function creditCompletedSession(minutes: number): Promise<SessionRewardSummary> {
  const rewards = await loadRewards();
  const earned = coinsForSession(minutes);
  const lifetime = rewards.lifetimeMinutes + minutes;
  const crossed = milestonesCrossed(rewards.lifetimeMinutes, lifetime, rewards.claimedMilestoneIds);
  const bonus = crossed.reduce((s, m) => s + m.coins, 0);
  const next = {
    ...rewards,
    coins: rewards.coins + earned + bonus,
    lifetimeMinutes: lifetime,
    completedSessions: rewards.completedSessions + 1,
    claimedMilestoneIds: [...rewards.claimedMilestoneIds, ...crossed.map((m) => m.id)],
  };
  await saveRewards(next);

  let plant: PlantChange | null = null;
  const world = await loadStarterWorld();
  if (world) {
    const target = pickActivePlant(world.placedObjects);
    if (target) {
      const before = target.growth ?? STARTER_PLANT_GROWTH;
      const after = applyFocusToPlant(before, minutes);
      plant = {
        objectId: target.id,
        name: getAsset(target.assetId)?.name ?? 'Plant',
        before: stageFor(before.focusMinutes),
        after: stageFor(after.focusMinutes),
        wilted: isWilted(after),
        revived: isWilted(before) && !isWilted(after),
      };
      const placedObjects = world.placedObjects.map((o) => (o.id === target.id ? { ...o, growth: after, updatedAt: Date.now() } : o));
      await saveWorldNow({ ...world, placedObjects });
    }
  }

  return { coinsEarned: earned, bonusCoins: bonus, coinsTotal: next.coins, milestones: crossed, plant };
}

export async function recordPausedSession(): Promise<PauseSummary> {
  const rewards = await loadRewards();
  await saveRewards({ ...rewards, pausedSessions: rewards.pausedSessions + 1 });
  const world = await loadStarterWorld();
  if (!world) return { plant: null };
  const target = pickActivePlant(world.placedObjects);
  if (!target) return { plant: null };
  const before = target.growth ?? STARTER_PLANT_GROWTH;
  const after = applyBreakToPlant(before);
  const placedObjects = world.placedObjects.map((o) => (o.id === target.id ? { ...o, growth: after, updatedAt: Date.now() } : o));
  await saveWorldNow({ ...world, placedObjects });
  return {
    plant: {
      objectId: target.id,
      name: getAsset(target.assetId)?.name ?? 'Plant',
      before: stageFor(before.focusMinutes),
      after: stageFor(after.focusMinutes),
      wilted: isWilted(after),
      revived: false,
    },
  };
}

/** Growth a freshly placed object starts with (seedling for bought plants). */
export function initialGrowthFor(assetId: string, starter: boolean) {
  const def = getAsset(assetId);
  if (!def?.growable) return undefined;
  return starter ? STARTER_PLANT_GROWTH : NEW_PLANT_GROWTH;
}

export { getEnvironment };
