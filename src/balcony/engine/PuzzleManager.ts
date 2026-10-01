import { ArtworkState, PuzzleState, PuzzleStatus } from '../types';

function computeStatus(piecesRevealed: number, totalPieces: number, isMounted: boolean): PuzzleStatus {
  if (isMounted) return 'MOUNTED';
  if (piecesRevealed >= totalPieces) return 'COMPLETE';
  if (piecesRevealed >= totalPieces * 0.85) return 'NEARLY_COMPLETE';
  return 'PARTIALLY_REVEALED';
}

/** Fired once, when the 500-minute (configurable) reward claims — the frame
 * appears on the wall, empty, ready to start revealing pieces. */
export function unlockArtwork(artwork: ArtworkState): ArtworkState {
  if (artwork.status !== 'LOCKED') return artwork;
  return { ...artwork, status: 'PARTIALLY_REVEALED' };
}

/** Every focus minute earned *after* the artwork unlocks also counts toward
 * its puzzle — this is on top of, not instead of, plant growth and the
 * generic reward table, so finishing the artwork is a long-horizon goal that
 * quietly advances alongside everything else. */
export function addFocusMinutes(
  artwork: ArtworkState,
  puzzle: PuzzleState,
  minutes: number,
): { artwork: ArtworkState; puzzle: PuzzleState } {
  if (artwork.status === 'LOCKED' || minutes <= 0) return { artwork, puzzle };
  const focusMinutes = artwork.focusMinutes + minutes;
  const piecesRevealed = Math.min(puzzle.totalPieces, Math.floor(focusMinutes / artwork.minutesPerPiece));
  return {
    artwork: { ...artwork, focusMinutes, status: computeStatus(piecesRevealed, puzzle.totalPieces, artwork.isMounted) },
    puzzle: { ...puzzle, piecesRevealed },
  };
}

/** Demo-mode shortcut ("Complete puzzle") — jumps straight to fully revealed
 * without needing to simulate hundreds of focus minutes. */
export function revealAllPieces(
  artwork: ArtworkState,
  puzzle: PuzzleState,
): { artwork: ArtworkState; puzzle: PuzzleState } {
  if (artwork.status === 'LOCKED') return { artwork, puzzle };
  return {
    artwork: { ...artwork, status: 'COMPLETE' },
    puzzle: { ...puzzle, piecesRevealed: puzzle.totalPieces },
  };
}

/** The final pieces animate into place, the completed artwork is briefly
 * shown, then it's mounted on the balcony wall for good (section 5, steps
 * 1-5) — the UI drives the timing; this just flips the persistent state. */
export function mountArtwork(artwork: ArtworkState): ArtworkState {
  if (artwork.status !== 'COMPLETE') return artwork;
  return { ...artwork, status: 'MOUNTED', isMounted: true };
}
