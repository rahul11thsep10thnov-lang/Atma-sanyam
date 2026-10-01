import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { ArtworkState, PuzzleState } from '../types';
import { BALCONY_PALETTE as P } from '../config/palette';
import { ArtworkVector } from './ArtworkVector';

interface Props {
  artwork: ArtworkState;
  puzzle: PuzzleState;
  width: number;
  height: number;
}

/**
 * The collectible wall-art puzzle (section 5), reusing the same
 * non-contiguous cover-flip mechanic the main focus-session puzzle already
 * uses (`PuzzleGrid`, `revealOrder.ts`) so unlocking pieces of the balcony's
 * own artwork feels like the same game, just played over a much longer
 * horizon. LOCKED shows an empty frame; MOUNTED drops the cover grid
 * entirely once it's permanently on the wall.
 */
export function JigsawArtwork({ artwork, puzzle, width, height }: Props) {
  if (artwork.status === 'LOCKED') {
    return <LockedFrame width={width} height={height} />;
  }
  return (
    <View style={[styles.frame, { width, height }]}>
      <RevealGrid artwork={artwork} puzzle={puzzle} width={width} height={height} />
    </View>
  );
}

function LockedFrame({ width, height }: { width: number; height: number }) {
  return (
    <View style={[styles.lockedFrame, { width, height }]}>
      <Text style={styles.lockGlyph}>🔒</Text>
    </View>
  );
}

function RevealGrid({ artwork, puzzle, width, height }: Props) {
  const { rows, cols } = artwork;
  const total = rows * cols;
  const cellW = width / cols;
  const cellH = height / rows;
  const mounted = artwork.status === 'MOUNTED';

  const flipAnim = useRef<Animated.Value[] | null>(null);
  const prevRevealed = useRef(0);
  if (!flipAnim.current || flipAnim.current.length !== total) {
    flipAnim.current = Array.from({ length: total }, () => new Animated.Value(0));
    prevRevealed.current = 0;
  }

  useEffect(() => {
    const from = prevRevealed.current;
    const to = Math.min(puzzle.piecesRevealed, total);
    if (to > from) {
      for (let i = from; i < to; i++) {
        const cellIndex = puzzle.revealOrder[i];
        Animated.timing(flipAnim.current![cellIndex], {
          toValue: 1,
          duration: 380,
          delay: (i - from) * 30,
          useNativeDriver: true,
        }).start();
      }
    }
    prevRevealed.current = to;
  }, [puzzle.piecesRevealed, puzzle.revealOrder, total]);

  const covers = [];
  if (!mounted) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const anim = flipAnim.current[index];
        covers.push(
          <Animated.View
            key={index}
            style={[
              styles.cover,
              {
                left: c * cellW,
                top: r * cellH,
                width: cellW,
                height: cellH,
                backgroundColor: (r + c) % 2 === 0 ? P.wallPlaster : P.wallPlasterShadow,
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transformOrigin: 'bottom' as const,
                transform: [
                  { perspective: 500 },
                  { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-100deg'] }) },
                ],
              },
            ]}
          />,
        );
      }
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <ArtworkVector width={width} height={height} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {covers}
      </View>
      {!mounted && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: cols - 1 }, (_, i) => (
            <Line key={`v${i}`} x1={(i + 1) * cellW} y1={0} x2={(i + 1) * cellW} y2={height} stroke={P.charcoal} strokeOpacity={0.08} strokeWidth={1} />
          ))}
          {Array.from({ length: rows - 1 }, (_, i) => (
            <Line key={`h${i}`} x1={0} y1={(i + 1) * cellH} x2={width} y2={(i + 1) * cellH} stroke={P.charcoal} strokeOpacity={0.08} strokeWidth={1} />
          ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: P.brass,
  },
  lockedFrame: {
    borderRadius: 3,
    borderWidth: 2,
    borderColor: P.wallPlasterShadow,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  lockGlyph: { fontSize: 20, opacity: 0.6 },
  cover: { position: 'absolute' },
});
