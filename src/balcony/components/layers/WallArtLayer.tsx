import React from 'react';
import { ArtworkState, PuzzleState } from '../../types';
import { AnchoredSprite } from '../AnchoredSprite';
import { JigsawArtwork } from '../JigsawArtwork';

interface Props {
  artwork: ArtworkState;
  puzzle: PuzzleState;
}

// One wall slot for now — a second artwork would promote this into the
// catalog the way plants and objects already work.
const ARTWORK_POSITION = { x: 0.83, y: 0.32 };
const ARTWORK_SIZE = 92;

/** Layer 3 — wall artwork. Sits between the architecture and the plants, so
 * a tall plant can still overlap the bottom edge of the frame the way it
 * would in a real balcony. */
export function WallArtLayer({ artwork, puzzle }: Props) {
  return (
    <AnchoredSprite position={ARTWORK_POSITION} width={ARTWORK_SIZE} height={ARTWORK_SIZE} anchor="center">
      <JigsawArtwork artwork={artwork} puzzle={puzzle} width={ARTWORK_SIZE} height={ARTWORK_SIZE} />
    </AnchoredSprite>
  );
}
