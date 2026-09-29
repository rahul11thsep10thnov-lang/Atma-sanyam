import { ArtworkState, PuzzleState } from '../types';
import { computeUniformRevealOrder } from '../../utils/revealOrder';

/** The spec's worked example uses a 16x16 grid (256 pieces). That's a lot of
 * individually-animated cover pieces for an *ambient background* element on
 * an ordinary phone (section 14: optimize Compose/Canvas rendering, particle
 * count, memory). 8x8 keeps the same reveal choreography and the same
 * "cover pieces flip away" mechanic already proven in the focus-session
 * puzzle, at a cost the balcony scene won't notice. Raise this back to 16 if
 * a target device profile can afford it — nothing else needs to change. */
export const ARTWORK_GRID_ROWS = 8;
export const ARTWORK_GRID_COLS = 8;

/** Extra focus minutes (after the artwork unlocks) needed to reveal one more
 * piece. Configurable — lower it for a faster payoff, raise it for a longer
 * one; the artwork stays a satisfying long-horizon goal past 500 minutes. */
export const MINUTES_PER_PIECE = 5;

export const DEFAULT_ARTWORK_ID = 'lotus-medallion';
export const DEFAULT_ARTWORK_TITLE = 'The Lotus Medallion';

export function createInitialArtworkState(): ArtworkState {
  return {
    id: DEFAULT_ARTWORK_ID,
    title: DEFAULT_ARTWORK_TITLE,
    rows: ARTWORK_GRID_ROWS,
    cols: ARTWORK_GRID_COLS,
    focusMinutes: 0,
    minutesPerPiece: MINUTES_PER_PIECE,
    status: 'LOCKED',
    isMounted: false,
  };
}

export function createInitialPuzzleState(): PuzzleState {
  const totalPieces = ARTWORK_GRID_ROWS * ARTWORK_GRID_COLS;
  return {
    artworkId: DEFAULT_ARTWORK_ID,
    piecesRevealed: 0,
    totalPieces,
    revealOrder: computeUniformRevealOrder(ARTWORK_GRID_ROWS, ARTWORK_GRID_COLS),
  };
}
