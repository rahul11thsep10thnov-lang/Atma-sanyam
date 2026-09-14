import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { PuzzleContent } from './PuzzleContent';
import { SessionRecord } from '../types';
import { colors } from '../theme/colors';

interface SessionThumbProps {
  session: SessionRecord;
  size: number;
}

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return (h % 10000) / 10000;
  };
}

function crackLines(seed: string, size: number, count = 6) {
  const rand = seededRandom(seed);
  const lines = [];
  for (let i = 0; i < count; i++) {
    const x1 = rand() * size;
    const y1 = rand() * size;
    const x2 = x1 + (rand() - 0.5) * size * 0.9;
    const y2 = y1 + (rand() - 0.5) * size * 0.9;
    lines.push({ x1, y1, x2, y2 });
  }
  return lines;
}

export function SessionThumb({ session, size }: SessionThumbProps) {
  const failed = session.outcome === 'failed';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <PuzzleContent image={session.image} size={size} />
      {failed && (
        <>
          <View style={[StyleSheet.absoluteFill, styles.greyOverlay]} />
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={size} height={size} fill="rgba(20,20,20,0.35)" />
            {crackLines(session.id, size).map((l, i) => (
              <Line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={1.5}
              />
            ))}
          </Svg>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  greyOverlay: {
    backgroundColor: 'rgba(80,80,80,0.5)',
  },
});
