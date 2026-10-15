// Draws one origami/paper-craft step as a vector diagram from data: a paper
// shape (polygon in a 0–100 square), fold lines (valley dashed / mountain
// dash-dot), arrows, and an animated "ghost" of the paper after the fold.
// Steps are authored in the admin console as JSON; nothing is hand-drawn.
//
// diagram = {
//   paper: [[x,y],...]            outline before the fold (default: full square)
//   after?: [[x,y],...]           outline after the fold (animated in)
//   folds?: [{ from:[x,y], to:[x,y], kind:'valley'|'mountain' }]
//   arrows?: [{ from:[x,y], to:[x,y], curve?: number }]
//   shade?: [[x,y],...]           part of the paper that flips over (shown darker)
//   color?: '#hex'               paper colour
//   labels?: [{ at:[x,y], text }]
// }
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Marker, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { AppText, Tactile } from '../ui';
import { t } from '../i18n';

type Pt = [number, number];
export interface Diagram {
  paper?: Pt[];
  after?: Pt[];
  folds?: { from: Pt; to: Pt; kind?: 'valley' | 'mountain' }[];
  arrows?: { from: Pt; to: Pt; curve?: number }[];
  shade?: Pt[];
  color?: string;
  labels?: { at: Pt; text: string }[];
}

const SQUARE: Pt[] = [[8, 8], [92, 8], [92, 92], [8, 92]];
const pts = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(' ');

function arrowPath(a: { from: Pt; to: Pt; curve?: number }) {
  const [x1, y1] = a.from;
  const [x2, y2] = a.to;
  const c = a.curve ?? 20;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return `M ${x1} ${y1} Q ${mx + nx * c} ${my + ny * c} ${x2} ${y2}`;
}

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export function FoldDiagram({ diagram, size = 260, animate = true, stepIndex }: { diagram: Diagram | undefined; size?: number; animate?: boolean; stepIndex?: number }) {
  const reduced = useReducedMotion();
  const d = diagram ?? {};
  const paper = d.paper ?? SQUARE;
  const color = d.color ?? '#FFB800';
  const t1 = useRef(new Animated.Value(0)).current;
  const [playing, setPlaying] = useState(false);
  const play = () => {
    if (!d.after || reduced) return;
    t1.setValue(0);
    setPlaying(true);
    Animated.timing(t1, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start(() => setPlaying(false));
  };
  useEffect(() => {
    if (animate) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);
  const afterOpacity = t1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0.95] });
  const shadeOpacity = t1.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Fold diagram">
        <Defs>
          <LinearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.75" />
          </LinearGradient>
          <Marker id="head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <Path d="M0,0 L6,3 L0,6 z" fill="#E5484D" />
          </Marker>
        </Defs>
        <Polygon points={pts(paper)} fill="url(#paper)" stroke="#8a6a00" strokeWidth="1.2" strokeLinejoin="round" />
        {d.shade && <AnimatedPolygon points={pts(d.shade)} fill="#000" opacity={shadeOpacity} />}
        {d.folds?.map((f, i) => (
          <Line key={i} x1={f.from[0]} y1={f.from[1]} x2={f.to[0]} y2={f.to[1]} stroke={f.kind === 'mountain' ? '#1F2340' : '#E5484D'} strokeWidth="1.4" strokeDasharray={f.kind === 'mountain' ? '4 2 1 2' : '4 3'} strokeLinecap="round" />
        ))}
        {d.after && <AnimatedPolygon points={pts(d.after)} fill={color} stroke="#8a6a00" strokeWidth="1.2" opacity={afterOpacity} />}
        {d.arrows?.map((a, i) => (
          <Path key={i} d={arrowPath(a)} stroke="#E5484D" strokeWidth="1.6" fill="none" markerEnd="url(#head)" strokeLinecap="round" />
        ))}
        <G>
          {d.labels?.map((l, i) => (
            <SvgText key={i} x={l.at[0]} y={l.at[1]} fontSize="6" fill="#1F2340" textAnchor="middle" fontWeight="bold">
              {l.text}
            </SvgText>
          ))}
        </G>
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.swatch, styles.valley]} /><AppText variant="caption" tone="muted">valley</AppText></View>
        <View style={styles.legendItem}><View style={[styles.swatch, styles.mountain]} /><AppText variant="caption" tone="muted">mountain</AppText></View>
        {d.after && !reduced && (
          <Tactile onPress={play} disabled={playing} accessibilityRole="button" accessibilityLabel={t('craft.animate')}>
            <AppText variant="caption" tone="primary">▶ {t('craft.animate')}</AppText>
          </Tactile>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 14, marginTop: 6, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 18, height: 0, borderTopWidth: 2 },
  valley: { borderColor: '#E5484D', borderStyle: 'dashed' },
  mountain: { borderColor: '#1F2340', borderStyle: 'dotted' },
});
