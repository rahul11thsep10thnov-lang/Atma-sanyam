import { PlantGrowthLevel } from '../types';

/** Cumulative focus minutes (on the active plant) needed to reach each stage —
 * configurable, matching the spec's worked example (10/25/45/90). FLOWERING
 * is the resting "fully grown" state a plant settles into once mature; there
 * is no further stage past it (that focus time instead goes toward unlocking
 * the *next* balcony object via the reward table). */
export const GROWTH_THRESHOLDS: { level: PlantGrowthLevel; minutes: number }[] = [
  { level: 'SEED', minutes: 0 },
  { level: 'SPROUT', minutes: 10 },
  { level: 'YOUNG', minutes: 25 },
  { level: 'MATURE', minutes: 45 },
  { level: 'FLOWERING', minutes: 90 },
];

/** How much a broken session costs a plant's health, and how much health one
 * successful minute restores — small, so a single lapse never feels punitive. */
export const HEALTH_LOSS_PER_BREAK = 0.18;
export const HEALTH_GAIN_PER_FOCUS_MINUTE = 0.01;
export const WILT_HEALTH_THRESHOLD = 0.35;

export function growthLevelForMinutes(minutes: number): PlantGrowthLevel {
  let level: PlantGrowthLevel = 'SEED';
  for (const step of GROWTH_THRESHOLDS) {
    if (minutes >= step.minutes) level = step.level;
  }
  return level;
}
