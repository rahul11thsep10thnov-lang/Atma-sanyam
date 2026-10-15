// Shape Sorting (ages 3–5): drag each shape to the hole with the same shape.
import React from 'react';
import { Animated, StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle } from '../engine';
import { useDrag } from '../shared/drag';
import { Prompt } from '../shared/Board';
import { rainbow } from '../../theme/palette';

const SHAPES = [
  { id: 'circle', name: 'circle', emoji: '🔴' },
  { id: 'square', name: 'square', emoji: '🟦' },
  { id: 'triangle', name: 'triangle', emoji: '🔺' },
  { id: 'star', name: 'star', emoji: '⭐' },
  { id: 'heart', name: 'heart', emoji: '💛' },
  { id: 'diamond', name: 'diamond', emoji: '🔶' },
  { id: 'hexagon', name: 'hexagon', emoji: '⬣' },
];
const COUNT: Record<string, number> = { easy: 3, normal: 5, hard: 7 };

export interface State { holes: string[]; pieces: { id: string; placed: boolean }[]; wrong: number }
export type Action = { type: 'drop'; piece: string; hole: string };

const def: GameDefinition<State, Action> = {
  id: 'shape-sorting',
  init(ctx) {
    const random = rng(ctx.seed);
    const ids = shuffle(SHAPES.map((s) => s.id), random).slice(0, COUNT[ctx.difficulty] ?? 5);
    return { holes: shuffle(ids, random), pieces: shuffle(ids, random).map((id) => ({ id, placed: false })), wrong: 0 };
  },
  reduce(state, action) {
    if (action.type !== 'drop') return state;
    if (action.piece !== action.hole) return { ...state, wrong: state.wrong + 1 };
    return { ...state, pieces: state.pieces.map((p) => (p.id === action.piece ? { ...p, placed: true } : p)) };
  },
  status(state) {
    const placed = state.pieces.filter((p) => p.placed).length;
    const done = placed === state.pieces.length;
    return { phase: done ? 'won' : 'playing', score: placed * 10 - state.wrong * 2, stars: state.wrong === 0 ? 3 : state.wrong <= 2 ? 2 : 1, progress: placed / state.pieces.length, hud: `${placed}/${state.pieces.length}` };
  },
  View: ShapeView,
};

function Piece({ id, size, holeCentres, onDrop, disabled, sfx, say }: { id: string; size: number; holeCentres: React.MutableRefObject<Record<string, { x: number; y: number }>>; onDrop: (piece: string, hole: string | null) => void; disabled?: boolean; sfx: GameViewProps<State, Action>['sfx']; say: GameViewProps<State, Action>['say'] }) {
  const origin = React.useRef({ x: 0, y: 0 });
  const { pan, panHandlers } = useDrag({
    disabled,
    onStart: () => say(SHAPES.find((s) => s.id === id)!.name),
    onEnd: (dx, dy) => {
      const cx = origin.current.x + size / 2 + dx;
      const cy = origin.current.y + size / 2 + dy;
      let best: string | null = null;
      let bestD = size * 0.9;
      for (const [hole, c] of Object.entries(holeCentres.current)) {
        const d = Math.hypot(c.x - cx, c.y - cy);
        if (d < bestD) {
          bestD = d;
          best = hole;
        }
      }
      sfx(best === id ? 'good' : best ? 'bad' : 'tap');
      onDrop(id, best);
    },
  });
  const shape = SHAPES.find((s) => s.id === id)!;
  return (
    <Animated.View {...panHandlers} onLayout={(e) => (origin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.piece, { width: size, height: size, transform: pan.getTranslateTransform() }]} accessibilityLabel={shape.name} accessibilityRole="image">
      <Text style={{ fontSize: size * 0.7 }}>{shape.emoji}</Text>
    </Animated.View>
  );
}

function ShapeView({ state, dispatch, width, height, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const n = state.holes.length;
  const size = Math.min(84, (width - 24) / Math.max(3, Math.ceil(n / 2)) - 12);
  const centres = React.useRef<Record<string, { x: number; y: number }>>({});
  const trayTop = height * 0.55;
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji="🧩">Drag each shape into its hole</Prompt>
      <RNView style={[styles.holes, { height: trayTop - 70 }]}>
        {state.holes.map((h, i) => {
          const placed = state.pieces.find((p) => p.id === h)?.placed;
          const shape = SHAPES.find((s) => s.id === h)!;
          return (
            <RNView key={h} onLayout={(e) => (centres.current[h] = { x: e.nativeEvent.layout.x + size / 2 + 12, y: e.nativeEvent.layout.y + size / 2 + 70 })} style={[styles.hole, { width: size + 10, height: size + 10, borderColor: rainbow[i % rainbow.length], backgroundColor: placed ? '#fff' : 'rgba(0,0,0,0.08)' }]} accessibilityLabel={`${shape.name} hole`}>
              <Text style={{ fontSize: size * 0.7, opacity: placed ? 1 : 0.25 }}>{shape.emoji}</Text>
            </RNView>
          );
        })}
      </RNView>
      <RNView style={[styles.tray, { top: trayTop }]}>
        {state.pieces.filter((p) => !p.placed).map((p) => (
          <Piece key={p.id} id={p.id} size={size} holeCentres={centres} disabled={readOnly} sfx={sfx} say={say} onDrop={(piece, hole) => hole && dispatch({ type: 'drop', piece, hole })} />
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  holes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: 12, padding: 12 },
  hole: { borderRadius: 20, borderWidth: 4, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.6)', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  piece: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 18, borderWidth: 3, borderColor: '#F0E4EE' },
});

export default def;
