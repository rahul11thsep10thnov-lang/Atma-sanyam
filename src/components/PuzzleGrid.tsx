import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface PuzzleGridProps {
  rows: number;
  cols: number;
  size: number;
  revealedCount: number;
  children: React.ReactNode;
  frozen?: boolean;
}

export function PuzzleGrid({ rows, cols, size, revealedCount, children, frozen }: PuzzleGridProps) {
  const totalPieces = rows * cols;
  const cellW = size / cols;
  const cellH = size / rows;

  const coverOpacity = useRef<Animated.Value[] | null>(null);
  const shineOpacity = useRef<Animated.Value[] | null>(null);
  const prevRevealed = useRef(0);

  if (!coverOpacity.current) {
    coverOpacity.current = Array.from({ length: totalPieces }, () => new Animated.Value(1));
  }
  if (!shineOpacity.current) {
    shineOpacity.current = Array.from({ length: totalPieces }, () => new Animated.Value(0));
  }

  useEffect(() => {
    const from = prevRevealed.current;
    const to = Math.min(revealedCount, totalPieces);
    if (to > from) {
      for (let i = from; i < to; i++) {
        const delay = (i - from) * 55;
        Animated.timing(coverOpacity.current![i], {
          toValue: 0,
          duration: 420,
          delay,
          useNativeDriver: false,
        }).start();
        Animated.sequence([
          Animated.timing(shineOpacity.current![i], {
            toValue: 0.55,
            duration: 120,
            delay,
            useNativeDriver: false,
          }),
          Animated.timing(shineOpacity.current![i], {
            toValue: 0,
            duration: 360,
            useNativeDriver: false,
          }),
        ]).start();
      }
    } else if (to < from) {
      for (let i = to; i < from; i++) {
        coverOpacity.current![i].setValue(1);
        shineOpacity.current![i].setValue(0);
      }
    }
    prevRevealed.current = to;
  }, [revealedCount, totalPieces]);

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const checker = (r + c) % 2 === 0;
      cells.push(
        <AnimatedRect
          key={`cover-${index}`}
          x={c * cellW}
          y={r * cellH}
          width={cellW}
          height={cellH}
          fill={checker ? colors.coverPiece : colors.coverPieceAlt}
          opacity={frozen ? 1 : coverOpacity.current![index]}
        />
      );
    }
  }

  const shines = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      shines.push(
        <AnimatedRect
          key={`shine-${index}`}
          x={c * cellW}
          y={r * cellH}
          width={cellW}
          height={cellH}
          fill={colors.white}
          opacity={frozen ? 0 : shineOpacity.current![index]}
        />
      );
    }
  }

  const lines = [];
  for (let c = 1; c < cols; c++) {
    lines.push(
      <Line
        key={`vline-${c}`}
        x1={c * cellW}
        y1={0}
        x2={c * cellW}
        y2={size}
        stroke={colors.overlayLine}
        strokeWidth={1}
      />
    );
  }
  for (let r = 1; r < rows; r++) {
    lines.push(
      <Line
        key={`hline-${r}`}
        x1={0}
        y1={r * cellH}
        x2={size}
        y2={r * cellH}
        stroke={colors.overlayLine}
        strokeWidth={1}
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={StyleSheet.absoluteFill}>{children}</View>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        {cells}
        {lines}
        {shines}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
