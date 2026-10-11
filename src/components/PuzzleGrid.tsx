// The jigsaw cover: about 10,000 pieces over the picture. Each second a few
// pieces open, spread uniformly over the whole picture (never clustered, never
// row by row); in a session of S seconds that is about 10,000 / S pieces a
// second. Ten thousand animated views would be far too heavy, so the pieces
// still closed are drawn as two flat shapes (a checker of two tones) that are
// rebuilt once a second, and only the handful of pieces that just opened are
// real views, which flip away.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

/** How many of the pieces that opened in a tick are flipped as views (the rest just open). */
const MAX_FLIPS = 48;
/** The flips of one tick are spread over this long, so a burst of pieces does not open at once. */
const FLIP_SPREAD_MS = 800;
const FLIP_MS = 420;

interface Flip {
  key: number;
  cell: number;
  delay: number;
}

export function PuzzleGrid({ rows, cols, width, height, revealedCount, children, frozen, fullBleed }: PuzzleGridProps) {
  const gridHeight = height ?? width;
  const total = rows * cols;
  const cellW = width / cols;
  const cellH = gridHeight / rows;
  const shown = Math.max(0, Math.min(total, Math.floor(revealedCount)));

  // the order the pieces open in, and when each one opens (its rank)
  const order = useMemo(() => computeUniformRevealOrder(rows, cols), [rows, cols]);
  const rank = useMemo(() => {
    const r = new Int32Array(total);
    for (let i = 0; i < order.length; i++) r[order[i]] = i;
    return r;
  }, [order, total]);

  // each piece as a path (a little oversize, so neighbours of the other tone leave no seam)
  const cellPaths = useMemo(() => {
    const out = new Array<string>(total);
    const e = 0.3;
    const f = (n: number) => Math.round(n * 100) / 100;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out[r * cols + c] = `M${f(c * cellW - e)} ${f(r * cellH - e)}h${f(cellW + 2 * e)}v${f(cellH + 2 * e)}h${f(-(cellW + 2 * e))}z`;
      }
    }
    return out;
  }, [rows, cols, cellW, cellH, total]);

  // the closed pieces: the checker's two tones, rebuilt whenever a piece opens
  const [pathA, pathB] = useMemo(() => {
    const closed = frozen ? 0 : shown;
    const a: string[] = [];
    const b: string[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (rank[i] < closed) continue;
        ((r + c) % 2 === 0 ? a : b).push(cellPaths[i]);
      }
    }
    return [a.join(''), b.join('')];
  }, [rows, cols, rank, cellPaths, shown, frozen]);

  // the pieces that just opened flip away
  const [flips, setFlips] = useState<Flip[]>([]);
  const prev = useRef(shown);
  const keySeq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const from = prev.current;
    prev.current = shown;
    if (frozen || shown <= from) {
      if (shown < from) setFlips([]);
      return;
    }
    const opened = order.slice(Math.max(from, shown - MAX_FLIPS), shown);
    const fresh: Flip[] = opened.map((cell, j) => ({ key: keySeq.current++, cell, delay: (j / opened.length) * FLIP_SPREAD_MS }));
    setFlips((cur) => [...cur, ...fresh]);
    const keys = new Set(fresh.map((x) => x.key));
    const timer = setTimeout(() => setFlips((cur) => cur.filter((x) => !keys.has(x.key))), FLIP_SPREAD_MS + FLIP_MS + 200);
    timers.current.push(timer);
  }, [shown, order, frozen]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <View style={[fullBleed ? styles.containerFullBleed : styles.container, { width, height: gridHeight }]}>
      <View style={StyleSheet.absoluteFill}>{children}</View>
      <Svg width={width} height={gridHeight} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={pathA} fill={colors.coverPiece} />
        <Path d={pathB} fill={colors.coverPieceAlt} />
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {flips.map((fl) => {
          const r = Math.floor(fl.cell / cols);
          const c = fl.cell % cols;
          return <FlipPiece key={fl.key} left={c * cellW} top={r * cellH} w={cellW} h={cellH} color={(r + c) % 2 === 0 ? colors.coverPiece : colors.coverPieceAlt} delay={fl.delay} />;
        })}
      </View>
    </View>
  );
}

/** One piece that has just opened: it tips up from its bottom edge and fades. */
function FlipPiece({ left, top, w, h, color, delay }: { left: number; top: number; w: number; h: number; color: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: FLIP_MS, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  return (
    <Animated.View
      style={[
        styles.cover,
        {
          left,
          top,
          width: w + 0.6,
          height: h + 0.6,
          backgroundColor: color,
          transformOrigin: 'bottom',
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ perspective: 700 }, { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-100deg'] }) }],
        },
      ]}
    />
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
