// The single source of truth for how long a focus session must last to
// earn each of the seven growth sizes. Every plant, jigsaw, reward and
// saved record uses this table; nothing else may define its own.
import type { GridDims } from '../types';

export type PlantGrowthSize = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const GROWTH_SIZES: PlantGrowthSize[] = [1, 2, 3, 4, 5, 6, 7];

/** Minimum completed minutes for each size; below the first there is no plant. */
export const SIZE_MINUTES: Record<PlantGrowthSize, number> = { 1: 15, 2: 30, 3: 60, 4: 90, 5: 120, 6: 150, 7: 180 };

export const MIN_PLANT_MINUTES = SIZE_MINUTES[1];

/** Completed minutes → size, or null when the session was too short. */
export function sizeForMinutes(minutes: number): PlantGrowthSize | null {
  if (!(minutes >= MIN_PLANT_MINUTES)) return null;
  let size: PlantGrowthSize = 1;
  for (const s of GROWTH_SIZES) if (minutes >= SIZE_MINUTES[s]) size = s;
  return size;
}

/** The range of minutes a size covers, as shown in the plant preview. */
export function minutesRange(size: PlantGrowthSize): { from: number; to: number | null } {
  const next = size < 7 ? SIZE_MINUTES[(size + 1) as PlantGrowthSize] : null;
  return { from: SIZE_MINUTES[size], to: next === null ? null : next - 1 };
}

export const SIZE_LABEL: Record<PlantGrowthSize, string> = { 1: 'Size 1', 2: 'Size 2', 3: 'Size 3', 4: 'Size 4', 5: 'Size 5', 6: 'Size 6', 7: 'Size 7' };

/** The jigsaw grid of each size: the picture reveals in this many pieces. */
export const SIZE_GRIDS: Record<PlantGrowthSize, GridDims> = {
  1: { rows: 3, cols: 3 },
  2: { rows: 3, cols: 4 },
  3: { rows: 4, cols: 5 },
  4: { rows: 5, cols: 6 },
  5: { rows: 6, cols: 8 },
  6: { rows: 8, cols: 10 },
  7: { rows: 9, cols: 12 },
};

/** Continuous growth during a session: how far along the seven stages a
 * plant is after `elapsed` of a planned `target` minutes. The final size
 * is still decided by the completed minutes alone. 0 = seed, 7 = size 7. */
export function growthProgress(elapsedMinutes: number, targetMinutes: number): number {
  const finalSize = sizeForMinutes(targetMinutes) ?? 1;
  const t = targetMinutes > 0 ? Math.max(0, Math.min(1, elapsedMinutes / targetMinutes)) : 0;
  // the seed takes the first tenth; then the stages up to the final size share the rest evenly
  if (t < 0.1) return t / 0.1 * 0.6;
  return 0.6 + ((t - 0.1) / 0.9) * (finalSize - 0.6);
}
