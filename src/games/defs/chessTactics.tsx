// Chess Tactics: find the best move in a position.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle } from '../engine';
import { fromFen, indexToAlgebra, legalMoves, makeMove, PIECE_GLYPH, type Position } from '../logic/chess';
import { PUZZLES, type ChessPuzzle } from '../logic/chessPuzzles';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const COUNT = 5;
export interface State { puzzles: ChessPuzzle[]; index: number; pos: Position; selected: number | null; solved: boolean; wrong: number; hintUsed: boolean; showHint: boolean }
export type Action = { type: 'select'; index: number } | { type: 'hint' } | { type: 'next' };

const load = (p: ChessPuzzle) => fromFen(p.fen);

const def: GameDefinition<State, Action> = {
  id: 'chess-tactics',
  init(ctx) {
    const puzzles = shuffle(PUZZLES[ctx.difficulty] ?? PUZZLES.easy!, rng(ctx.seed)).slice(0, COUNT);
    return { puzzles, index: 0, pos: load(puzzles[0]!), selected: null, solved: false, wrong: 0, hintUsed: false, showHint: false };
  },
  reduce(state, action) {
    const puzzle = state.puzzles[state.index];
    if (!puzzle) return state;
    if (action.type === 'hint') return { ...state, showHint: true, hintUsed: true };
    if (action.type === 'next') {
      const next = state.puzzles[state.index + 1];
      return { ...state, index: state.index + 1, pos: next ? load(next) : state.pos, selected: null, solved: false, showHint: false };
    }
    if (state.solved) return state;
    const moves = legalMoves(state.pos);
    if (state.selected !== null) {
      const m = moves.find((x) => x.from === state.selected && x.to === action.index && (!x.promo || x.promo.toLowerCase() === 'q'));
      if (m) {
        const alg = indexToAlgebra(m.from) + indexToAlgebra(m.to);
        if (alg === puzzle.solution[0]) return { ...state, pos: makeMove(state.pos, m), solved: true, selected: null };
        return { ...state, wrong: state.wrong + 1, selected: null };
      }
    }
    if (moves.some((m) => m.from === action.index)) return { ...state, selected: action.index };
    return { ...state, selected: null };
  },
  status(state) {
    const done = state.index >= state.puzzles.length;
    return { phase: done ? 'won' : 'playing', score: Math.max(0, state.puzzles.length * 20 - state.wrong * 5), stars: state.wrong === 0 ? 3 : state.wrong <= 2 ? 2 : 1, progress: state.index / state.puzzles.length, hud: `Puzzle ${Math.min(state.index + 1, COUNT)} / ${COUNT}` };
  },
  View: TacticsView,
};

function TacticsView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const puzzle = state.puzzles[Math.min(state.index, state.puzzles.length - 1)]!;
  const cell = Math.min(width, 520) / 8;
  const moves = state.solved ? [] : legalMoves(state.pos);
  const targets = new Set(moves.filter((m) => m.from === state.selected).map((m) => m.to));
  const flip = state.pos.turn === 'b' && !state.solved;
  const order = flip ? [...Array(64).keys()].reverse() : [...Array(64).keys()];
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="♞">{state.solved ? `Correct! ${puzzle.theme} 🎉` : `${state.pos.turn === 'w' ? 'White' : 'Black'} to move. ${puzzle.theme}.`}</Prompt>
      <RNView style={[styles.board, { width: cell * 8, height: cell * 8 }]}>
        {order.map((i) => {
          const p = state.pos.board[i]!;
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          return (
            <Tactile key={i} haptic={false} disabled={readOnly || state.solved} onPress={() => { sfx('tap'); dispatch({ type: 'select', index: i }); }} accessibilityRole="button" accessibilityLabel={`${indexToAlgebra(i)}${p ? ` ${p}` : ''}`} style={{ width: cell, height: cell }}>
              <RNView style={[styles.cell, { backgroundColor: state.selected === i ? '#FFC93C' : dark ? '#7C5CFF' : '#ECE3FF' }]}>
                {targets.has(i) && <RNView style={[styles.dot, { width: cell * 0.28, height: cell * 0.28, backgroundColor: p ? 'rgba(229,72,77,0.7)' : 'rgba(46,42,74,0.35)' }]} />}
                {!!p && <Text style={{ fontSize: cell * 0.72, color: p === p.toUpperCase() ? '#fff' : '#1E1B3A', textShadowColor: p === p.toUpperCase() ? '#1E1B3A' : '#fff', textShadowRadius: 2 }}>{PIECE_GLYPH[p]}</Text>}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {state.showHint && !state.solved && <Text style={styles.hint}>💡 {puzzle.hint}</Text>}
      {!readOnly && (
        <RNView style={styles.actions}>
          {state.solved ? (
            <Tactile onPress={() => { sfx('good'); dispatch({ type: 'next' }); }} accessibilityRole="button" accessibilityLabel="Next puzzle"><Text style={[styles.action, { backgroundColor: '#7ED957' }]}>Next puzzle ➡️</Text></Tactile>
          ) : (
            <Tactile onPress={() => dispatch({ type: 'hint' })} accessibilityRole="button" accessibilityLabel="Hint"><Text style={styles.action}>💡 Hint</Text></Tactile>
          )}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, overflow: 'hidden', borderWidth: 4, borderColor: '#2E2A4A' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', borderRadius: 999 },
  hint: { marginTop: 10, fontFamily: 'Nunito_700Bold', color: '#2E2A4A', textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  action: { fontFamily: 'Fredoka_600SemiBold', fontSize: 18, backgroundColor: '#FFC93C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, color: '#2E2A4A', overflow: 'hidden' },
});

export default def;
