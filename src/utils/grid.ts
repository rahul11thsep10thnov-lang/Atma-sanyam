import { GridDims } from '../types';

const MIN_SIDE = 3;
const MAX_SIDE = 12;

// Tile count tracks the number of seconds in the session (one tile flips per
// second) approximated as a near-square grid, capped so the grid stays
// renderable and legible on a phone screen for long sessions.
export function gridForDuration(durationMinutes: number): GridDims {
  const totalSeconds = durationMinutes * 60;
  const side = Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(Math.sqrt(totalSeconds))));
  return { rows: side, cols: side };
}

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 180;
export const DURATION_STEP_MINUTES = 5;
