// Traffic Logic: slide vehicles so the red car reaches the exit.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, pick, starsForMoves } from '../engine';
import { canSlide, isSolved, PUZZLES, SIZE, slideVehicle, solve, type Vehicle } from '../logic/traffic';
import { Tactile } from '../../ui';
import { usePointer } from '../shared/drag';
import { rainbow } from '../../theme/palette';
import { Prompt } from '../shared/Board';

export interface State { vehicles: Vehicle[]; moves: number; par: number; selected: number | null }
export type Action = { type: 'select'; id: number } | { type: 'slide'; id: number; delta: number };

const EMOJI = ['🚗', '🚕', '🚙', '🚌', '🚚', '🚛', '🚜', '🚓', '🚑', '🚒', '🛻'];

const def: GameDefinition<State, Action> = {
  id: 'traffic-logic',
  init(ctx) {
    const random = rng(ctx.seed);
    const vehicles = pick(PUZZLES[ctx.difficulty] ?? PUZZLES.normal!, random).map((v) => ({ ...v }));
    return { vehicles, moves: 0, par: Math.max(1, solve(vehicles)), selected: null };
  },
  reduce(state, action) {
    if (action.type === 'select') return { ...state, selected: action.id };
    if (!canSlide(state.vehicles, action.id, action.delta)) return state;
    return { ...state, vehicles: slideVehicle(state.vehicles, action.id, action.delta), moves: state.moves + 1, selected: action.id };
  },
  status(state) {
    return { phase: isSolved(state.vehicles) ? 'won' : 'playing', score: Math.max(0, state.par * 10 - (state.moves - state.par) * 2), stars: starsForMoves(state.moves, state.par), hud: `Moves ${state.moves} · best ${state.par}` };
  },
  View: TrafficView,
};

function TrafficView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const cell = Math.min(width, 520) / SIZE;
  const pointer = usePointer({
    disabled: readOnly,
    onUp: (_x, _y, dx, dy) => {
      if (state.selected === null) return;
      const v = state.vehicles.find((x) => x.id === state.selected)!;
      const d = v.horizontal ? dx : dy;
      if (Math.abs(d) < cell * 0.3) return;
      const steps = Math.max(1, Math.round(Math.abs(d) / cell));
      for (let i = 0; i < steps; i++) dispatch({ type: 'slide', id: v.id, delta: Math.sign(d) });
      sfx('tap');
    },
  });
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🚗">Tap a vehicle, then swipe it. Get the red car to the exit ➡️</Prompt>
      <RNView {...pointer} style={[styles.board, { width: cell * SIZE, height: cell * SIZE }]}>
        <RNView style={[styles.exit, { top: cell * 2, height: cell }]} />
        {state.vehicles.map((v) => (
          <Tactile key={v.id} haptic={false} disabled={readOnly} onPress={() => dispatch({ type: 'select', id: v.id })} accessibilityRole="button" accessibilityLabel={v.id === 0 ? 'Red car' : `Vehicle ${v.id}`} accessibilityState={{ selected: state.selected === v.id }} style={{ position: 'absolute', left: v.x * cell + 3, top: v.y * cell + 3, width: (v.horizontal ? v.len : 1) * cell - 6, height: (v.horizontal ? 1 : v.len) * cell - 6 }}>
            <RNView style={[styles.vehicle, { backgroundColor: v.id === 0 ? '#FF5F6D' : rainbow[(v.id + 2) % rainbow.length], borderColor: state.selected === v.id ? '#2E2A4A' : 'rgba(255,255,255,0.7)' }]}>
              <Text style={{ fontSize: cell * 0.5, transform: [{ rotate: v.horizontal ? '0deg' : '90deg' }] }}>{EMOJI[v.id % EMOJI.length]}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#E5E7EB', borderRadius: 14, borderWidth: 4, borderColor: '#2E2A4A', overflow: 'visible' },
  exit: { position: 'absolute', right: -6, width: 8, backgroundColor: '#7ED957', borderRadius: 4 },
  vehicle: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
});

export default def;
