import { GridDims } from '../types';

const THRESHOLDS: Array<{ maxMinutes: number; size: number }> = [
  { maxMinutes: 5, size: 3 },
  { maxMinutes: 15, size: 4 },
  { maxMinutes: 25, size: 5 },
  { maxMinutes: 45, size: 6 },
  { maxMinutes: 60, size: 7 },
];

const MAX_SIZE = 9;

export function gridForDuration(durationMinutes: number): GridDims {
  for (const t of THRESHOLDS) {
    if (durationMinutes <= t.maxMinutes) {
      return { rows: t.size, cols: t.size };
    }
  }
  const extraSteps = Math.floor((durationMinutes - 60) / 30);
  const size = Math.min(MAX_SIZE, 7 + extraSteps);
  return { rows: size, cols: size };
}

export const DURATION_PRESETS: number[] = [5, 15, 25, 45, 60];
