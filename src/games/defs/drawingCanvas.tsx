// Drawing Canvas: finger painting with brushes, colours, stamps and undo.
// Strokes are the state (points in 0–1000 canvas units), so a drawing can be
// mirrored, undone and saved as JSON.
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Polyline, Text as SvgText } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { Tactile } from '../../ui';
import { usePointer } from '../shared/drag';

const PALETTE = ['#2E2A4A', '#FF5F6D', '#FF8A3D', '#FFC93C', '#7ED957', '#4FD1C5', '#4FB3FF', '#9B6BFF', '#FF6B9D', '#8B5A2B', '#FFFFFF'];
const STAMPS = ['⭐', '❤️', '🌸', '🐥', '🌈', '🦋', '🍎', '🚗'];
const SIZES = [4, 10, 20];

type Stroke = { c: string; w: number; p: number[] } | { stamp: string; x: number; y: number; size: number };
export interface State { strokes: Stroke[]; colour: string; width: number; stamp: string | null; finished: boolean }
export type Action = { type: 'stroke'; stroke: Stroke } | { type: 'undo' } | { type: 'clear' } | { type: 'colour'; colour: string } | { type: 'width'; width: number } | { type: 'stamp'; stamp: string | null } | { type: 'done' };

const def: GameDefinition<State, Action> = {
  id: 'drawing-canvas',
  layout: 'full',
  init: () => ({ strokes: [], colour: PALETTE[0]!, width: 10, stamp: null, finished: false }),
  reduce(state, action) {
    switch (action.type) {
      case 'stroke':
        return { ...state, strokes: [...state.strokes.slice(-400), action.stroke] };
      case 'undo':
        return { ...state, strokes: state.strokes.slice(0, -1) };
      case 'clear':
        return { ...state, strokes: [] };
      case 'colour':
        return { ...state, colour: action.colour, stamp: null };
      case 'width':
        return { ...state, width: action.width };
      case 'stamp':
        return { ...state, stamp: action.stamp };
      case 'done':
        return { ...state, finished: true };
    }
  },
  status: (state) => ({ phase: state.finished ? 'won' : 'playing', stars: state.strokes.length > 20 ? 3 : state.strokes.length > 5 ? 2 : 1, hud: `${state.strokes.length} strokes` }),
  View: DrawingView,
};

function DrawingView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const size = Math.min(width - 16, height - 190, 560);
  const scale = 1000 / size;
  const [live, setLive] = useState<number[] | null>(null);
  const liveRef = useRef<number[]>([]);
  const pointer = usePointer({
    disabled: readOnly,
    onDown: (x, y) => {
      if (state.stamp) {
        sfx('pop');
        dispatch({ type: 'stroke', stroke: { stamp: state.stamp, x: x * scale, y: y * scale, size: 90 } });
        return;
      }
      liveRef.current = [x * scale, y * scale];
      setLive(liveRef.current);
    },
    onMove: (x, y) => {
      if (state.stamp) return;
      liveRef.current = [...liveRef.current, x * scale, y * scale];
      setLive(liveRef.current);
    },
    onUp: () => {
      if (state.stamp || liveRef.current.length < 2) return;
      const p = liveRef.current.length === 2 ? [...liveRef.current, liveRef.current[0]! + 1, liveRef.current[1]! + 1] : liveRef.current;
      dispatch({ type: 'stroke', stroke: { c: state.colour, w: state.width, p } });
      liveRef.current = [];
      setLive(null);
    },
  });
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <RNView style={[styles.canvas, { width: size, height: size }]} {...pointer} accessibilityLabel="Drawing canvas">
        <Svg width={size} height={size} viewBox="0 0 1000 1000">
          {state.strokes.map((s, i) =>
            'stamp' in s ? (
              <SvgText key={i} x={s.x} y={s.y + s.size * 0.35} fontSize={s.size} textAnchor="middle">{s.stamp}</SvgText>
            ) : (
              <Polyline key={i} points={pairs(s.p)} fill="none" stroke={s.c} strokeWidth={s.w * 2.2} strokeLinecap="round" strokeLinejoin="round" />
            )
          )}
          {live && <Polyline points={pairs(live)} fill="none" stroke={state.colour} strokeWidth={state.width * 2.2} strokeLinecap="round" strokeLinejoin="round" />}
        </Svg>
      </RNView>
      {!readOnly && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {PALETTE.map((c) => (
              <Tactile key={c} onPress={() => dispatch({ type: 'colour', colour: c })} accessibilityRole="button" accessibilityLabel={`Colour ${c}`}>
                <RNView style={[styles.swatch, { backgroundColor: c, borderColor: state.colour === c && !state.stamp ? '#2E2A4A' : '#ddd' }]} />
              </Tactile>
            ))}
            {SIZES.map((w) => (
              <Tactile key={w} onPress={() => dispatch({ type: 'width', width: w })} accessibilityRole="button" accessibilityLabel={`Brush ${w}`}>
                <RNView style={[styles.swatch, { backgroundColor: '#fff', borderColor: state.width === w ? '#2E2A4A' : '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
                  <RNView style={{ width: w * 1.6, height: w * 1.6, borderRadius: w, backgroundColor: '#2E2A4A' }} />
                </RNView>
              </Tactile>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {STAMPS.map((s) => (
              <Tactile key={s} onPress={() => dispatch({ type: 'stamp', stamp: state.stamp === s ? null : s })} accessibilityRole="button" accessibilityLabel={`Stamp ${s}`}>
                <RNView style={[styles.swatch, { backgroundColor: state.stamp === s ? '#FFF4CC' : '#fff', borderColor: state.stamp === s ? '#2E2A4A' : '#ddd', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 22 }}>{s}</Text>
                </RNView>
              </Tactile>
            ))}
            <Tactile onPress={() => dispatch({ type: 'undo' })} accessibilityRole="button" accessibilityLabel="Undo"><Text style={styles.action}>↩️ Undo</Text></Tactile>
            <Tactile onPress={() => dispatch({ type: 'clear' })} accessibilityRole="button" accessibilityLabel="Clear"><Text style={styles.action}>🧽 Clear</Text></Tactile>
            <Tactile onPress={() => { sfx('win'); dispatch({ type: 'done' }); }} accessibilityRole="button" accessibilityLabel="Finished"><Text style={[styles.action, { backgroundColor: '#7ED957' }]}>✅ Done</Text></Tactile>
          </ScrollView>
        </>
      )}
    </RNView>
  );
}

const pairs = (p: number[]) => {
  let s = '';
  for (let i = 0; i < p.length; i += 2) s += `${p[i]},${p[i + 1]} `;
  return s;
};

const styles = StyleSheet.create({
  canvas: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#F0E4EE' },
  row: { gap: 8, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  action: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, backgroundColor: '#FFC93C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, color: '#2E2A4A', overflow: 'hidden' },
});

export default def;
