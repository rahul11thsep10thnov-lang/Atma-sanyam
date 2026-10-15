import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { bestMove, COLS, drop, empty, isFull, ROWS, winner, type Board } from '../logic/connectFour';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const DEPTH: Record<string, number> = { easy: 1, normal: 3, hard: 5 };
export interface State { board: Board; turn: 1 | 2; last: number | null; depth: number; seed: number; moves: number }
export type Action = { type: 'drop'; col: number } | { type: 'ai' };

const def: GameDefinition<State, Action> = {
  id: 'connect-four',
  init: (ctx) => ({ board: empty(), turn: 1, last: null, depth: DEPTH[ctx.difficulty] ?? 3, seed: ctx.seed, moves: 0 }),
  reduce(state, action) {
    if (winner(state.board) || isFull(state.board)) return state;
    if (action.type === 'drop') {
      if (state.turn !== 1) return state;
      const r = drop(state.board, action.col, 1);
      return r ? { ...state, board: r.board, turn: 2, last: r.row * COLS + action.col, moves: state.moves + 1 } : state;
    }
    if (state.turn !== 2) return state;
    const col = bestMove(state.board, 2, state.depth, rng(state.seed + state.moves));
    const r = drop(state.board, col, 2)!;
    return { ...state, board: r.board, turn: 1, last: r.row * COLS + col, moves: state.moves + 1 };
  },
  status(state) {
    const w = winner(state.board);
    if (w) return { phase: w.who === 1 ? 'won' : 'lost', score: w.who === 1 ? 100 - state.moves : 0, stars: w.who === 1 ? (state.depth >= 5 ? 3 : state.depth >= 3 ? 2 : 1) + (state.moves < 20 ? 0 : 0) : 0, hud: w.who === 1 ? 'You win!' : 'Robot wins' };
    if (isFull(state.board)) return { phase: 'won', score: 20, stars: 1, hud: 'Draw' };
    return { phase: 'playing', hud: state.turn === 1 ? 'Your turn' : 'Robot thinking…' };
  },
  View: C4View,
};

function C4View({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  useEffect(() => {
    if (readOnly || state.turn !== 2 || winner(state.board)) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 600);
    return () => clearTimeout(id);
  }, [state.turn, state.board, dispatch, readOnly]);
  const cell = Math.min(width, 520) / COLS;
  const w = winner(state.board);
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji={state.turn === 1 ? '🔴' : '🟡'}>{w ? (w.who === 1 ? 'Four in a row! 🎉' : 'The robot got four.') : state.turn === 1 ? 'Tap a column to drop your red disc' : 'Robot is thinking…'}</Prompt>
      <RNView style={[styles.board, { width: cell * COLS, height: cell * ROWS }]}>
        {state.board.map((v, i) => (
          <RNView key={i} style={[styles.cell, { width: cell, height: cell }]}>
            <RNView style={[styles.disc, { width: cell * 0.78, height: cell * 0.78, backgroundColor: v === 1 ? '#FF5F6D' : v === 2 ? '#FFC93C' : '#fff', borderColor: w?.cells.includes(i) ? '#2E2A4A' : 'transparent', transform: [{ scale: state.last === i ? 1.08 : 1 }] }]} />
          </RNView>
        ))}
        {!readOnly && state.turn === 1 && !w && [...Array(COLS).keys()].map((c) => (
          <Tactile key={c} haptic={false} onPress={() => { sfx('pop'); dispatch({ type: 'drop', col: c }); }} accessibilityRole="button" accessibilityLabel={`Column ${c + 1}`} style={{ position: 'absolute', left: c * cell, top: 0, width: cell, height: cell * ROWS }} />
        ))}
      </RNView>
      <Text style={styles.legend}>🔴 You   🟡 Robot</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#4FB3FF', borderRadius: 16, borderWidth: 4, borderColor: '#2A94E8' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  disc: { borderRadius: 999, borderWidth: 3 },
  legend: { marginTop: 10, fontFamily: 'Nunito_700Bold', color: '#2E2A4A' },
});

export default def;
