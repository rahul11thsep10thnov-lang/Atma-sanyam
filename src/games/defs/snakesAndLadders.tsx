// Snakes and Ladders: race to 100 against a computer player.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const LADDERS: Record<number, number> = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 };
const SNAKES: Record<number, number> = { 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 };

export interface State { pos: [number, number]; turn: 0 | 1; dice: number | null; seed: number; tick: number; message: string }
export type Action = { type: 'roll' } | { type: 'ai' };

function advance(p: number, dice: number): { to: number; via: 'ladder' | 'snake' | null } {
  let to = p + dice;
  if (to > 100) return { to: p, via: null };
  if (LADDERS[to]) return { to: LADDERS[to]!, via: 'ladder' };
  if (SNAKES[to]) return { to: SNAKES[to]!, via: 'snake' };
  return { to, via: null };
}

const def: GameDefinition<State, Action> = {
  id: 'snakes-and-ladders',
  init: (ctx) => ({ pos: [0, 0], turn: 0, dice: null, seed: ctx.seed, tick: 0, message: 'Tap the dice!' }),
  reduce(state, action) {
    if (state.pos[0] === 100 || state.pos[1] === 100) return state;
    const who = action.type === 'roll' ? 0 : 1;
    if (state.turn !== who) return state;
    const dice = Math.floor(rng(state.seed + state.tick)() * 6) + 1;
    const r = advance(state.pos[who]!, dice);
    const pos: [number, number] = [state.pos[0]!, state.pos[1]!];
    pos[who] = r.to;
    const name = who === 0 ? 'You' : 'Robot';
    const message = r.via === 'ladder' ? `${name} rolled ${dice} and climbed a ladder to ${r.to}! 🪜` : r.via === 'snake' ? `${name} rolled ${dice}… a snake! Down to ${r.to} 🐍` : r.to === state.pos[who] && dice + state.pos[who]! > 100 ? `${name} rolled ${dice}: too many to finish` : `${name} rolled ${dice} → ${r.to}`;
    return { ...state, pos, dice, turn: dice === 6 ? state.turn : ((1 - who) as 0 | 1), tick: state.tick + 1, message };
  },
  status(state) {
    if (state.pos[0] === 100) return { phase: 'won', score: 100, stars: 3, hud: 'You reached 100!' };
    if (state.pos[1] === 100) return { phase: 'lost', score: state.pos[0], hud: 'Robot reached 100' };
    return { phase: 'playing', progress: state.pos[0]! / 100, hud: `You ${state.pos[0]} · Robot ${state.pos[1]}` };
  },
  View: SnakesView,
};

function cellXY(n: number): [number, number] {
  const r = Math.floor((n - 1) / 10);
  const c = (n - 1) % 10;
  return [r % 2 === 0 ? c : 9 - c, 9 - r];
}

function SnakesView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  useEffect(() => {
    if (readOnly || state.turn !== 1 || state.pos[0] === 100 || state.pos[1] === 100) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 900);
    return () => clearTimeout(id);
  }, [state.turn, state.tick, dispatch, readOnly, state.pos]);
  const size = Math.min(width, 520);
  const cell = size / 10;
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🐍">{state.message}</Prompt>
      <RNView style={[styles.board, { width: size, height: size }]}>
        {[...Array(100).keys()].map((i) => {
          const n = i + 1;
          const [x, y] = cellXY(n);
          const ladder = LADDERS[n], snake = SNAKES[n];
          return (
            <RNView key={n} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: ladder ? '#E6F8DA' : snake ? '#FDE2E3' : (x + y) % 2 ? '#FFF4CC' : '#fff', borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: cell * 0.26, color: '#9A96B8', position: 'absolute', top: 1, left: 3 }}>{n}</Text>
              {ladder ? <Text style={{ fontSize: cell * 0.4 }}>🪜</Text> : snake ? <Text style={{ fontSize: cell * 0.4 }}>🐍</Text> : null}
              {(ladder || snake) && <Text style={{ fontSize: cell * 0.2, color: '#2E2A4A' }}>→{ladder ?? snake}</Text>}
            </RNView>
          );
        })}
        {[0, 1].map((p) => {
          const n = state.pos[p]!;
          const [x, y] = n === 0 ? [-0.6, 9] : cellXY(n);
          return <Text key={p} style={{ position: 'absolute', left: x * cell + (p ? cell * 0.45 : cell * 0.05), top: y * cell + cell * 0.3, fontSize: cell * 0.55 }}>{p === 0 ? '🧒' : '🤖'}</Text>;
        })}
      </RNView>
      {!readOnly && (
        <Tactile onPress={() => { sfx('tap'); dispatch({ type: 'roll' }); }} disabled={state.turn !== 0} accessibilityRole="button" accessibilityLabel="Roll the dice">
          <RNView style={[styles.dice, { opacity: state.turn === 0 ? 1 : 0.6 }]}><Text style={{ fontSize: 36 }}>{state.dice ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][state.dice - 1] : '🎲'}</Text></RNView>
        </Tactile>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 12, overflow: 'visible', borderWidth: 3, borderColor: '#2E2A4A' },
  dice: { marginTop: 10, width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2E2A4A' },
});

export default def;
