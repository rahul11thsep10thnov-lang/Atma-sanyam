// Block Puzzle: drag the three offered pieces onto the 10×10 grid.
import React, { useRef } from 'react';
import { Animated, StyleSheet, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { anyFits, canPlace, place, SHAPES, SIZE, type Shape } from '../logic/blocks';
import { useDrag } from '../shared/drag';
import { rainbow } from '../../theme/palette';
import { Prompt } from '../shared/Board';

export interface State { grid: number[]; tray: (number | null)[]; score: number; seed: number; tick: number; pool: number }
export type Action = { type: 'place'; slot: number; x: number; y: number };

const def: GameDefinition<State, Action> = {
  id: 'block-puzzle',
  layout: 'full',
  init(ctx) {
    const pool = ctx.difficulty === 'hard' ? SHAPES.length : 13;
    const random = rng(ctx.seed);
    return { grid: new Array(SIZE * SIZE).fill(0), tray: [0, 1, 2].map(() => Math.floor(random() * pool)), score: 0, seed: ctx.seed, tick: 0, pool };
  },
  reduce(state, action) {
    const shapeIdx = state.tray[action.slot];
    if (shapeIdx === null || shapeIdx === undefined) return state;
    const shape = SHAPES[shapeIdx]!;
    if (!canPlace(state.grid, shape, action.x, action.y)) return state;
    const r = place(state.grid, shape, action.x, action.y, (shapeIdx % 7) + 1);
    let tray = state.tray.map((t, i) => (i === action.slot ? null : t));
    const random = rng(state.seed + state.tick + 1);
    if (tray.every((t) => t === null)) tray = [0, 1, 2].map(() => Math.floor(random() * state.pool));
    return { ...state, grid: r.grid, tray, score: state.score + shape.length + r.cleared * 10 * r.cleared, tick: state.tick + 1 };
  },
  status(state) {
    const shapes = state.tray.filter((t): t is number => t !== null).map((t) => SHAPES[t]!);
    const over = shapes.length > 0 && !anyFits(state.grid, shapes);
    return { phase: over ? (state.score >= 150 ? 'won' : 'lost') : 'playing', score: state.score, stars: state.score >= 400 ? 3 : state.score >= 250 ? 2 : 1, hud: `Score ${state.score}` };
  },
  View: BlockView,
};

function TrayPiece({ shape, slot, cell, colour, gridOrigin, trayOrigin, onDrop, disabled }: { shape: Shape; slot: number; cell: number; colour: string; gridOrigin: React.MutableRefObject<{ x: number; y: number }>; trayOrigin: React.MutableRefObject<{ x: number; y: number }>; onDrop: (slot: number, x: number, y: number) => void; disabled?: boolean }) {
  const origin = useRef({ x: 0, y: 0 });
  const mini = cell * 0.62;
  const { pan, panHandlers } = useDrag({
    disabled,
    onEnd: (dx, dy) => {
      const px = trayOrigin.current.x + origin.current.x + dx - gridOrigin.current.x;
      const py = trayOrigin.current.y + origin.current.y + dy - gridOrigin.current.y;
      onDrop(slot, Math.round(px / cell), Math.round(py / cell));
    },
  });
  const w = (Math.max(...shape.map((p) => p[0])) + 1) * mini, h = (Math.max(...shape.map((p) => p[1])) + 1) * mini;
  return (
    <Animated.View {...panHandlers} onLayout={(e) => (origin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={{ width: w, height: h, transform: pan.getTranslateTransform() }} accessibilityLabel={`Block of ${shape.length}`}>
      {shape.map(([x, y], i) => <RNView key={i} style={{ position: 'absolute', left: x * mini, top: y * mini, width: mini - 2, height: mini - 2, backgroundColor: colour, borderRadius: 4 }} />)}
    </Animated.View>
  );
}

function BlockView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const cell = Math.min((width - 16) / SIZE, (height - 190) / SIZE);
  const gridOrigin = useRef({ x: 0, y: 0 });
  const trayOrigin = useRef({ x: 0, y: 0 });
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="🟦">Drag blocks onto the grid. Fill a row or column to clear it.</Prompt>
      <RNView onLayout={(e) => (gridOrigin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.grid, { width: cell * SIZE, height: cell * SIZE }]}>
        {state.grid.map((v, i) => <RNView key={i} style={{ width: cell, height: cell, padding: 1 }}><RNView style={{ flex: 1, borderRadius: 4, backgroundColor: v ? rainbow[(v - 1) % rainbow.length] : '#F3EEF9' }} /></RNView>)}
      </RNView>
      <RNView onLayout={(e) => (trayOrigin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.tray, { width: cell * SIZE }]}>
        {state.tray.map((t, slot) => (
          <RNView key={`${slot}-${state.tick}`} style={styles.traySlot}>
            {t !== null && <TrayPiece shape={SHAPES[t]!} slot={slot} cell={cell} colour={rainbow[t % rainbow.length]!} gridOrigin={gridOrigin} trayOrigin={trayOrigin} disabled={readOnly} onDrop={(s, x, y) => { sfx(canPlace(state.grid, SHAPES[t]!, x, y) ? 'good' : 'bad'); dispatch({ type: 'place', slot: s, x, y }); }} />}
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, borderWidth: 3, borderColor: '#2E2A4A' },
  tray: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18, minHeight: 110, padding: 8 },
  traySlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
});

export default def;
