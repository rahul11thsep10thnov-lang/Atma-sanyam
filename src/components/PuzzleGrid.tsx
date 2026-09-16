import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors, radius } from '../theme/colors';
import { computeUniformRevealOrder } from '../utils/revealOrder';

interface PuzzleGridProps {
  rows: number;
  cols: number;
  width: number;
  height?: number;
  revealedCount: number;
  children: React.ReactNode;
  frozen?: boolean;
  fullBleed?: boolean;
}

export function PuzzleGrid({
  rows,
  cols,
  width,
  height,
  revealedCount,
  children,
  frozen,
  fullBleed,
}: PuzzleGridProps) {
  const gridHeight = height ?? width;
  const totalPieces = rows * cols;
  const cellW = width / cols;
  const cellH = gridHeight / rows;

  const order = useMemo(() => computeUniformRevealOrder(rows, cols), [rows, cols]);
  const flipAnim = useRef<Animated.Value[] | null>(null);
  const prevRevealed = useRef(0);

  if (!flipAnim.current || flipAnim.current.length !== totalPieces) {
    flipAnim.current = Array.from({ length: totalPieces }, () => new Animated.Value(0));
    prevRevealed.current = 0;
  }

  useEffect(() => {
    const from = prevRevealed.current;
    const to = Math.min(revealedCount, totalPieces);
    if (to > from) {
      for (let i = from; i < to; i++) {
        const cellIndex = order[i];
        Animated.timing(flipAnim.current![cellIndex], {
          toValue: 1,
          duration: 420,
          delay: (i - from) * 45,
          useNativeDriver: true,
        }).start();
      }
    } else if (to < from) {
      for (let i = to; i < from; i++) {
        flipAnim.current![order[i]].setValue(0);
      }
    }
    prevRevealed.current = to;
  }, [revealedCount, totalPieces, order]);

  const covers = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const checker = (r + c) % 2 === 0;
      const anim = flipAnim.current[index];
      const animatedStyle = frozen
        ? { opacity: 1, transform: [{ perspective: 700 }, { rotateX: '0deg' as const }] }
        : {
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              { perspective: 700 },
              { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-100deg'] }) },
            ],
          };
      covers.push(
        <Animated.View
          key={`cover-${index}`}
          style={[
            styles.cover,
            {
              left: c * cellW,
              top: r * cellH,
              width: cellW,
              height: cellH,
              backgroundColor: checker ? colors.coverPiece : colors.coverPieceAlt,
              transformOrigin: 'bottom',
            },
            animatedStyle,
          ]}
        />
      );
    }
  }

  const lines = [];
  for (let c = 1; c < cols; c++) {
    lines.push(
      <Line key={`vline-${c}`} x1={c * cellW} y1={0} x2={c * cellW} y2={gridHeight} stroke={colors.overlayLine} strokeWidth={1} />
    );
  }
  for (let r = 1; r < rows; r++) {
    lines.push(
      <Line key={`hline-${r}`} x1={0} y1={r * cellH} x2={width} y2={r * cellH} stroke={colors.overlayLine} strokeWidth={1} />
    );
  }

  return (
    <View style={[fullBleed ? styles.containerFullBleed : styles.container, { width, height: gridHeight }]}>
      <View style={StyleSheet.absoluteFill}>{children}</View>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {covers}
      </View>
      <Svg width={width} height={gridHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
        {lines}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  containerFullBleed: {
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  cover: {
    position: 'absolute',
  },
});
