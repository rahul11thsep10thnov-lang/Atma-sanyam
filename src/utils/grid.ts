import { GridDims } from '../types';
import { PORTRAIT_GRID } from '../growth/size';

/** Every jigsaw is made of about this many pieces, whatever its size or the
 * length of the session that reveals it. */
export const JIGSAW_PIECES = 10000;

/** The grid of about JIGSAW_PIECES cells whose cells are as square as the
 * picture allows: `aspect` is the picture's width / height. */
export function gridForAspect(aspect: number): GridDims {
  const cols = Math.max(1, Math.round(Math.sqrt(JIGSAW_PIECES * aspect)));
  const rows = Math.max(1, Math.round(JIGSAW_PIECES / cols));
  return { rows, cols };
}

/** The phone-portrait grid (9:16), 75 x 133 = 9,975 pieces: what is recorded before a
 * screen is known. A session uses the grid of its own screen (gridForAspect). */
export const JIGSAW_GRID: GridDims = PORTRAIT_GRID;

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 180;
export const DURATION_STEP_MINUTES = 5;
