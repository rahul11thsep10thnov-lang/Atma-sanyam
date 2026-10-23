// Sudoku with 4×4, 6×6 and 9×9 grids; mistakes are highlighted; notes off.
import React, { useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { conflicts, generateSudoku, isComplete, type SudokuPuzzle } from '../logic/sudoku';
import { Tactile } from '../../ui';

const LEVELS: Record<string, { n: number; clues: number }> = { mini: { n: 4, clues: 0.55 }, easy: { n: 6, clues: 0.55 }, normal: { n: 9, clues: 0.5 }, hard: { n: 9, clues: 0.4 }, expert: { n: 9, clues: 0.33 } };

export interface State { puzzle: SudokuPuzzle; grid: number[]; selected: number | null; mistakes: number; fills: number }
export type Action = { type: 'select'; index: number } | { type: 'enter'; value: number };

const def: GameDefinition<State, Action> = {
  id: 'sudoku',
  init(ctx) {
    const lvl = LEVELS[ctx.difficulty] ?? LEVELS.easy!;
    const puzzle = generateSudoku(lvl.n, lvl.clues, rng(ctx.seed));
    return { puzzle, grid: puzzle.givens.slice(), selected: null, mistakes: 0, fills: 0 };
  },
  reduce(state, action) {
    if (action.type === 'select') return { ...state, selected: state.puzzle.givens[action.index] ? null : action.index };
    if (state.selected === null) return state;
    const grid = state.grid.slice();
    grid[state.selected] = action.value;
    const wrong = action.value !== 0 && action.value !== state.puzzle.solution[state.selected];
    return { ...state, grid, mistakes: state.mistakes + (wrong ? 1 : 0), fills: state.fills + (action.value ? 1 : 0) };
  },
  status(state) {
    const done = isComplete(state.grid, state.puzzle.solution);
    const empty = state.puzzle.givens.filter((v) => !v).length;
    return { phase: done ? 'won' : 'playing', score: Math.max(0, empty * 5 - state.mistakes * 4), stars: state.mistakes === 0 ? 3 : state.mistakes <= 3 ? 2 : 1, progress: state.grid.filter((v, i) => v && v === state.puzzle.solution[i]).length / state.grid.length, hud: `Mistakes ${state.mistakes}` };
  },
  View: SudokuView,
};

function SudokuView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const { n, boxRows, boxCols, givens } = state.puzzle;
  const size = Math.min(width, 520) / n;
  const bad = conflicts(state.grid, n, boxRows, boxCols);
  const [hint] = useState(false);
  void hint;
  return (
    <RNView style={{ alignItems: 'center' }}>
      <RNView style={[styles.grid, { width: size * n + 6, height: size * n + 6 }]}>
        {state.grid.map((v, i) => {
          const r = Math.floor(i / n), c = i % n;
          const given = !!givens[i];
          const selected = state.selected === i;
          const sameRowCol = state.selected !== null && (Math.floor(state.selected / n) === r || state.selected % n === c);
          return (
            <Tactile key={i} haptic={false} disabled={readOnly || given} onPress={() => dispatch({ type: 'select', index: i })} accessibilityRole="button" accessibilityLabel={`Row ${r + 1} column ${c + 1}${v ? ` is ${v}` : ' empty'}`} style={{ width: size, height: size }}>
              <RNView style={[styles.cell, { backgroundColor: selected ? '#FFF4CC' : bad.has(i) ? '#FDE2E3' : sameRowCol ? '#F3EEF9' : '#fff', borderRightWidth: (c + 1) % boxCols === 0 ? 3 : 1, borderBottomWidth: (r + 1) % boxRows === 0 ? 3 : 1 }]}>
                <Text style={[styles.num, { fontSize: size * 0.5, color: given ? '#2E2A4A' : bad.has(i) ? '#E5484D' : '#4F46E5', fontFamily: given ? 'Fredoka_700Bold' : 'Fredoka_600SemiBold' }]}>{v || ''}</Text>
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {!readOnly && (
        <RNView style={styles.pad}>
          {Array.from({ length: n }, (_, i) => i + 1).map((v) => (
            <Tactile key={v} onPress={() => { sfx('tap'); dispatch({ type: 'enter', value: v }); }} disabled={state.selected === null} accessibilityRole="button" accessibilityLabel={String(v)}>
              <RNView style={[styles.key, { opacity: state.selected === null ? 0.4 : 1 }]}><Text style={styles.keyText}>{v}</Text></RNView>
            </Tactile>
          ))}
          <Tactile onPress={() => dispatch({ type: 'enter', value: 0 })} disabled={state.selected === null} accessibilityRole="button" accessibilityLabel="Erase">
            <RNView style={[styles.key, { backgroundColor: '#FDE2E3' }]}><Text style={styles.keyText}>⌫</Text></RNView>
          </Tactile>
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 3, borderColor: '#2E2A4A', borderRadius: 6, overflow: 'hidden' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: '#2E2A4A' },
  num: {},
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  key: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#DDEEFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4FB3FF' },
  keyText: { fontFamily: 'Fredoka_700Bold', fontSize: 22, color: '#2E2A4A' },
});

export default def;
