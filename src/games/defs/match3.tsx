import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { adjacent, findMatches, hasMove, makeGrid, resolve, swap, type Grid } from '../logic/match3';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const GEMS = ['', '🍬', '🍭', '🍫', '🍩', '🍪', '🧁'];
const LEVEL: Record<string, { size: number; kinds: number; moves: number; target: number }> = { easy: { size: 6, kinds: 4, moves: 20, target: 600 }, normal: { size: 7, kinds: 5, moves: 20, target: 1000 }, hard: { size: 8, kinds: 6, moves: 25, target: 1800 } };

export interface State { grid: Grid; size: number; kinds: number; selected: number | null; score: number; movesLeft: number; target: number; seed: number; tick: number; stuck: boolean }
export type Action = { type: 'tap'; index: number } | { type: 'reshuffle' };

const def: GameDefinition<State, Action> = {
  id: 'match-3',
  init(ctx) {
    const lvl = LEVEL[ctx.difficulty] ?? LEVEL.normal!;
    return { grid: makeGrid(lvl.size, lvl.kinds, rng(ctx.seed)), size: lvl.size, kinds: lvl.kinds, selected: null, score: 0, movesLeft: lvl.moves, target: lvl.target, seed: ctx.seed, tick: 0, stuck: false };
  },
  reduce(state, action) {
    if (action.type === 'reshuffle') return { ...state, grid: makeGrid(state.size, state.kinds, rng(state.seed + state.tick + 99)), tick: state.tick + 1, stuck: false, selected: null };
    if (state.movesLeft <= 0) return state;
    if (state.selected === null) return { ...state, selected: action.index };
    if (state.selected === action.index) return { ...state, selected: null };
    if (!adjacent(state.selected, action.index, state.size)) return { ...state, selected: action.index };
    const swapped = swap(state.grid, state.selected, action.index);
    if (findMatches(swapped, state.size).size === 0) return { ...state, selected: null };
    const r = resolve(swapped, state.size, state.kinds, rng(state.seed + state.tick + 1));
    return { ...state, grid: r.grid, score: state.score + r.points, movesLeft: state.movesLeft - 1, selected: null, tick: state.tick + 1, stuck: !hasMove(r.grid, state.size) };
  },
  status(state) {
    if (state.score >= state.target) return { phase: 'won', score: state.score, stars: state.movesLeft >= 8 ? 3 : state.movesLeft >= 3 ? 2 : 1, hud: 'Target reached!' };
    if (state.movesLeft <= 0) return { phase: 'lost', score: state.score, hud: 'Out of moves' };
    return { phase: 'playing', score: state.score, progress: state.score / state.target, hud: `${state.movesLeft} moves · goal ${state.target}` };
  },
  View: Match3View,
};

function Match3View({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const cell = Math.min(width, 520) / state.size;
  useEffect(() => {
    if (state.stuck && !readOnly) dispatch({ type: 'reshuffle' });
  }, [state.stuck, dispatch, readOnly]);
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🍬">Swap two sweets next to each other to make a line of 3</Prompt>
      <RNView style={[styles.board, { width: cell * state.size, height: cell * state.size }]}>
        {state.grid.map((v, i) => (
          <Tactile key={i} haptic={false} disabled={readOnly} onPress={() => { sfx('tap'); dispatch({ type: 'tap', index: i }); }} accessibilityRole="button" accessibilityLabel={GEMS[v]} style={{ width: cell, height: cell }}>
            <RNView style={[styles.cell, { backgroundColor: state.selected === i ? '#FFF4CC' : (Math.floor(i / state.size) + i) % 2 ? '#F3EEF9' : '#fff', transform: [{ scale: state.selected === i ? 1.1 : 1 }] }]}>
              <Text style={{ fontSize: cell * 0.6 }}>{GEMS[v]}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 14, overflow: 'hidden', borderWidth: 3, borderColor: '#2E2A4A' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default def;
