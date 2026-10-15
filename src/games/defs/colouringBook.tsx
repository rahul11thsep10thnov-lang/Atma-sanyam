// Colouring Book: pick a colour, tap a region of the picture to fill it.
// Pictures are SVG regions (ids) so filling is exact and the state is tiny.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, pick } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const PALETTE = ['#FF5F6D', '#FF8A3D', '#FFC93C', '#7ED957', '#4FD1C5', '#4FB3FF', '#9B6BFF', '#FF6B9D', '#8B5A2B', '#2E2A4A', '#FFFFFF', '#C4C4C4'];

type Region = { id: string; kind: 'rect' | 'circle' | 'ellipse' | 'poly' | 'path'; d: Record<string, number | string> };
const PICTURES: { name: string; emoji: string; regions: Region[] }[] = [
  {
    name: 'house',
    emoji: '🏠',
    regions: [
      { id: 'sky', kind: 'rect', d: { x: 0, y: 0, width: 100, height: 62 } },
      { id: 'grass', kind: 'rect', d: { x: 0, y: 62, width: 100, height: 38 } },
      { id: 'wall', kind: 'rect', d: { x: 22, y: 42, width: 56, height: 40 } },
      { id: 'roof', kind: 'poly', d: { points: '16,42 50,12 84,42' } },
      { id: 'door', kind: 'rect', d: { x: 44, y: 58, width: 12, height: 24 } },
      { id: 'window1', kind: 'rect', d: { x: 28, y: 50, width: 10, height: 10 } },
      { id: 'window2', kind: 'rect', d: { x: 62, y: 50, width: 10, height: 10 } },
      { id: 'sun', kind: 'circle', d: { cx: 84, cy: 14, r: 8 } },
    ],
  },
  {
    name: 'butterfly',
    emoji: '🦋',
    regions: [
      { id: 'bg', kind: 'rect', d: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'wingTL', kind: 'ellipse', d: { cx: 32, cy: 36, rx: 22, ry: 20 } },
      { id: 'wingTR', kind: 'ellipse', d: { cx: 68, cy: 36, rx: 22, ry: 20 } },
      { id: 'wingBL', kind: 'ellipse', d: { cx: 36, cy: 68, rx: 16, ry: 16 } },
      { id: 'wingBR', kind: 'ellipse', d: { cx: 64, cy: 68, rx: 16, ry: 16 } },
      { id: 'body', kind: 'ellipse', d: { cx: 50, cy: 52, rx: 5, ry: 30 } },
      { id: 'head', kind: 'circle', d: { cx: 50, cy: 20, r: 6 } },
    ],
  },
  {
    name: 'car',
    emoji: '🚗',
    regions: [
      { id: 'sky', kind: 'rect', d: { x: 0, y: 0, width: 100, height: 70 } },
      { id: 'road', kind: 'rect', d: { x: 0, y: 70, width: 100, height: 30 } },
      { id: 'body', kind: 'path', d: { d: 'M10 70 L10 50 L30 50 L40 30 L70 30 L80 50 L92 50 L92 70 Z' } },
      { id: 'windowL', kind: 'path', d: { d: 'M34 48 L42 34 L54 34 L54 48 Z' } },
      { id: 'windowR', kind: 'path', d: { d: 'M58 48 L58 34 L68 34 L76 48 Z' } },
      { id: 'wheel1', kind: 'circle', d: { cx: 28, cy: 72, r: 9 } },
      { id: 'wheel2', kind: 'circle', d: { cx: 74, cy: 72, r: 9 } },
    ],
  },
  {
    name: 'flower',
    emoji: '🌸',
    regions: [
      { id: 'bg', kind: 'rect', d: { x: 0, y: 0, width: 100, height: 100 } },
      { id: 'stem', kind: 'rect', d: { x: 47, y: 55, width: 6, height: 45 } },
      { id: 'leaf', kind: 'ellipse', d: { cx: 36, cy: 78, rx: 12, ry: 6 } },
      { id: 'p1', kind: 'circle', d: { cx: 50, cy: 22, r: 11 } },
      { id: 'p2', kind: 'circle', d: { cx: 68, cy: 34, r: 11 } },
      { id: 'p3', kind: 'circle', d: { cx: 62, cy: 54, r: 11 } },
      { id: 'p4', kind: 'circle', d: { cx: 38, cy: 54, r: 11 } },
      { id: 'p5', kind: 'circle', d: { cx: 32, cy: 34, r: 11 } },
      { id: 'centre', kind: 'circle', d: { cx: 50, cy: 40, r: 9 } },
    ],
  },
];

export interface State { picture: number; fills: Record<string, string>; colour: string; taps: number }
export type Action = { type: 'fill'; region: string } | { type: 'colour'; colour: string } | { type: 'done' } | { type: 'clear' };

const def: GameDefinition<State, Action> = {
  id: 'colouring-book',
  layout: 'full',
  init(ctx) {
    const random = rng(ctx.seed);
    return { picture: PICTURES.indexOf(pick(PICTURES, random)), fills: {}, colour: PALETTE[0]!, taps: 0 };
  },
  reduce(state, action) {
    switch (action.type) {
      case 'colour':
        return { ...state, colour: action.colour };
      case 'fill':
        return { ...state, fills: { ...state.fills, [action.region]: state.colour }, taps: state.taps + 1 };
      case 'clear':
        return { ...state, fills: {} };
      case 'done':
        return { ...state, taps: -1 };
    }
  },
  status(state) {
    const pic = PICTURES[state.picture]!;
    const filled = Object.keys(state.fills).length;
    return { phase: state.taps === -1 ? 'won' : 'playing', stars: filled >= pic.regions.length ? 3 : filled >= pic.regions.length / 2 ? 2 : 1, progress: filled / pic.regions.length, hud: `${filled}/${pic.regions.length} coloured` };
  },
  View: ColouringView,
};

function Shape({ r, fill, onPress }: { r: Region; fill: string; onPress?: () => void }) {
  const common = { fill, stroke: '#2E2A4A', strokeWidth: 1.2, onPress };
  switch (r.kind) {
    case 'rect':
      return <Rect {...(r.d as object)} {...common} />;
    case 'circle':
      return <Circle {...(r.d as object)} {...common} />;
    case 'ellipse':
      return <Ellipse {...(r.d as object)} {...common} />;
    case 'poly':
      return <Polygon points={String(r.d.points)} {...common} />;
    case 'path':
      return <Path d={String(r.d.d)} {...common} />;
  }
}

function ColouringView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const pic = PICTURES[state.picture]!;
  const size = Math.min(width - 24, height - 170, 520);
  const [, bump] = useState(0);
  void bump;
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji={pic.emoji}>Pick a colour, tap a part of the {pic.name}</Prompt>
      <RNView style={[styles.canvas, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {pic.regions.map((r) => (
            <Shape key={r.id} r={r} fill={state.fills[r.id] ?? '#FFFFFF'} onPress={readOnly ? undefined : () => { sfx('pop'); dispatch({ type: 'fill', region: r.id }); }} />
          ))}
        </Svg>
      </RNView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
        {PALETTE.map((c) => (
          <Tactile key={c} disabled={readOnly} onPress={() => dispatch({ type: 'colour', colour: c })} accessibilityRole="button" accessibilityLabel={`Colour ${c}`} accessibilityState={{ selected: state.colour === c }}>
            <RNView style={[styles.swatch, { backgroundColor: c, borderColor: state.colour === c ? '#2E2A4A' : '#fff', transform: [{ scale: state.colour === c ? 1.15 : 1 }] }]} />
          </Tactile>
        ))}
      </ScrollView>
      {!readOnly && (
        <RNView style={styles.actions}>
          <Tactile onPress={() => dispatch({ type: 'clear' })} accessibilityRole="button" accessibilityLabel="Clear"><Text style={styles.action}>🧽 Clear</Text></Tactile>
          <Tactile onPress={() => { sfx('win'); dispatch({ type: 'done' }); }} accessibilityRole="button" accessibilityLabel="Finished"><Text style={[styles.action, { backgroundColor: '#7ED957' }]}>✅ Finished!</Text></Tactile>
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#F0E4EE' },
  palette: { gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { fontFamily: 'Fredoka_600SemiBold', fontSize: 18, backgroundColor: '#FFC93C', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, color: '#2E2A4A', overflow: 'hidden' },
});

export default def;
