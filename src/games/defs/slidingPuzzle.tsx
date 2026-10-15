// Sliding Puzzle: numbered tiles, one gap.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, starsForMoves } from '../engine';
import { isSolved, neighboursOfBlank, shuffled, slide, type SlidingState } from '../logic/sliding';
import { Tactile } from '../../ui';
import { rainbow } from '../../theme/palette';

const N: Record<string, number> = { easy: 3, normal: 4, hard: 5 };
export type Action = { type: 'tap'; index: number };

const def: GameDefinition<SlidingState, Action> = {
  id: 'sliding-puzzle',
  init(ctx) {
    const n = N[ctx.difficulty] ?? 4;
    return { n, tiles: shuffled(n, rng(ctx.seed)), moves: 0 };
  },
  reduce(state, action) {
    const next = slide(state.tiles, state.n, action.index);
    return next === state.tiles ? state : { ...state, tiles: next, moves: state.moves + 1 };
  },
  status(state) {
    const done = isSolved(state.tiles);
    const par = state.n * state.n * 8;
    return { phase: done ? 'won' : 'playing', score: Math.max(0, par * 2 - state.moves), stars: starsForMoves(state.moves, par), hud: `Moves ${state.moves}` };
  },
  View: SlidingView,
};

function SlidingView({ state, dispatch, width, readOnly, sfx }: GameViewProps<SlidingState, Action>) {
  const { n, tiles } = state;
  const gap = 6;
  const size = (Math.min(width, 520) - gap * (n + 1)) / n;
  const movable = new Set(neighboursOfBlank(tiles, n));
  return (
    <RNView style={[styles.board, { width: size * n + gap * (n + 1), height: size * n + gap * (n + 1), padding: gap, gap }]}>
      {tiles.map((t, i) =>
        t === 0 ? (
          <RNView key={i} style={{ width: size, height: size }} />
        ) : (
          <Tactile key={i} disabled={readOnly || !movable.has(i)} onPress={() => { sfx('tap'); dispatch({ type: 'tap', index: i }); }} accessibilityRole="button" accessibilityLabel={`Tile ${t}`} style={{ width: size, height: size }}>
            <RNView style={[styles.tile, { backgroundColor: rainbow[(t - 1) % rainbow.length], opacity: movable.has(i) ? 1 : 0.9 }]}>
              <Text style={[styles.num, { fontSize: size * 0.45 }]}>{t}</Text>
            </RNView>
          </Tactile>
        )
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#2E2A4A', borderRadius: 18, alignSelf: 'center' },
  tile: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: 'Fredoka_700Bold', color: '#fff' },
});

export default def;
