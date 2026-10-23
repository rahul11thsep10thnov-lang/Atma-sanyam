import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { applyMove, computerMove, countPieces, initialBoard, legalMoves, type Board, type Move } from '../logic/checkers';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const DEPTH: Record<string, number> = { easy: 1, normal: 3, hard: 5 };
export interface State { board: Board; turn: 1 | -1; selected: number | null; depth: number; seed: number; moves: number; last: Move | null }
export type Action = { type: 'select'; index: number } | { type: 'ai' };

const def: GameDefinition<State, Action> = {
  id: 'checkers',
  init: (ctx) => ({ board: initialBoard(), turn: 1, selected: null, depth: DEPTH[ctx.difficulty] ?? 3, seed: ctx.seed, moves: 0, last: null }),
  reduce(state, action) {
    if (action.type === 'ai') {
      if (state.turn !== -1) return state;
      const m = computerMove(state.board, state.depth, rng(state.seed + state.moves));
      if (!m) return state;
      return { ...state, board: applyMove(state.board, m), turn: 1, moves: state.moves + 1, last: m, selected: null };
    }
    if (state.turn !== 1) return state;
    const moves = legalMoves(state.board, 1);
    if (state.selected !== null) {
      const m = moves.find((x) => x.from === state.selected && x.to === action.index);
      if (m) return { ...state, board: applyMove(state.board, m), turn: -1, selected: null, moves: state.moves + 1, last: m };
    }
    if (state.board[action.index]! > 0 && moves.some((m) => m.from === action.index)) return { ...state, selected: action.index };
    return { ...state, selected: null };
  },
  status(state) {
    const mine = countPieces(state.board, 1), theirs = countPieces(state.board, -1);
    const myMoves = legalMoves(state.board, 1).length, theirMoves = legalMoves(state.board, -1).length;
    if (theirs === 0 || (state.turn === -1 && theirMoves === 0)) return { phase: 'won', score: mine * 10, stars: state.depth >= 5 ? 3 : state.depth >= 3 ? 2 : 1, hud: 'You win!' };
    if (mine === 0 || (state.turn === 1 && myMoves === 0)) return { phase: 'lost', score: 0, hud: 'Robot wins' };
    return { phase: 'playing', hud: `You ${mine} · Robot ${theirs}` };
  },
  View: CheckersView,
};

function CheckersView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  useEffect(() => {
    if (readOnly || state.turn !== -1) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 500);
    return () => clearTimeout(id);
  }, [state.turn, state.board, dispatch, readOnly]);
  const cell = Math.min(width, 520) / 8;
  const moves = state.turn === 1 ? legalMoves(state.board, 1) : [];
  const targets = new Set(moves.filter((m) => m.from === state.selected).map((m) => m.to));
  const movable = new Set(moves.map((m) => m.from));
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="⚫">{state.turn === 1 ? (moves.some((m) => m.captures.length) ? 'You must jump!' : 'Your move (red)') : 'Robot is thinking…'}</Prompt>
      <RNView style={[styles.board, { width: cell * 8 + 8, height: cell * 8 + 8 }]}>
        {state.board.map((p, i) => {
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          return (
            <Tactile key={i} haptic={false} disabled={readOnly || !dark} onPress={() => { sfx('tap'); dispatch({ type: 'select', index: i }); }} accessibilityRole="button" accessibilityLabel={`Square ${i}`} style={{ width: cell, height: cell }}>
              <RNView style={[styles.cell, { backgroundColor: dark ? (targets.has(i) ? '#A3E635' : state.selected === i ? '#FFC93C' : '#8B5A2B') : '#F5DEB3', borderWidth: state.last && (state.last.from === i || state.last.to === i) ? 2 : 0, borderColor: '#4FB3FF' }]}>
                {p !== 0 && (
                  <RNView style={[styles.piece, { width: cell * 0.76, height: cell * 0.76, backgroundColor: p > 0 ? '#FF5F6D' : '#2E2A4A', borderColor: movable.has(i) && state.turn === 1 ? '#fff' : 'rgba(255,255,255,0.4)' }]}>
                    {Math.abs(p) === 2 && <Text style={{ fontSize: cell * 0.4 }}>👑</Text>}
                  </RNView>
                )}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, overflow: 'hidden', borderWidth: 4, borderColor: '#5A3A2C' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  piece: { borderRadius: 999, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});

export default def;
