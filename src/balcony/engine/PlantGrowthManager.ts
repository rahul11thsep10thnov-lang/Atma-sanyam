import { Plant } from '../types';
import {
  GROWTH_THRESHOLDS,
  HEALTH_GAIN_PER_FOCUS_MINUTE,
  HEALTH_LOSS_PER_BREAK,
  WILT_HEALTH_THRESHOLD,
  growthLevelForMinutes,
} from '../config/plantConfig';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** What the plant should *look* like right now, given its health and the
 * focus minutes it's earned. Health always wins: a wilted plant reads as
 * wilted even if it had reached FLOWERING before the break, and a plant
 * crossing back above the wilt threshold gets one REVIVING beat before
 * settling into the level its minutes actually earned. */
function displayLevel(plant: Plant, justRevived: boolean): Plant['growthLevel'] {
  if (plant.health < WILT_HEALTH_THRESHOLD) return 'WILTED';
  if (justRevived) return 'REVIVING';
  return growthLevelForMinutes(plant.currentFocusMinutes);
}

/** Applied when focus minutes are credited to this plant — during a running
 * session (gradual growth) or on successful completion (the final credit). */
export function applyFocusMinutes(plant: Plant, minutes: number): Plant {
  if (minutes <= 0) return plant;
  const wasWilted = plant.growthLevel === 'WILTED';
  const health = clamp01(plant.health + minutes * HEALTH_GAIN_PER_FOCUS_MINUTE);
  const currentFocusMinutes = plant.currentFocusMinutes + minutes;
  const justRevived = wasWilted && health >= WILT_HEALTH_THRESHOLD;
  const next: Plant = { ...plant, health, currentFocusMinutes };
  next.growthLevel = displayLevel(next, justRevived);
  return next;
}

/** Applied when a focus session on this plant is intentionally broken. Never
 * destroys progress — only health and the displayed state take a hit, and a
 * later successful session can fully restore it. */
export function applyBreak(plant: Plant): Plant {
  const health = clamp01(plant.health - HEALTH_LOSS_PER_BREAK);
  const next: Plant = { ...plant, health };
  next.growthLevel = displayLevel(next, false);
  return next;
}

export function isFullyGrown(plant: Plant): boolean {
  const maxMinutes = GROWTH_THRESHOLDS[GROWTH_THRESHOLDS.length - 1].minutes;
  return plant.growthLevel === 'FLOWERING' || plant.currentFocusMinutes >= maxMinutes;
}
