// Ludo against computer players (2 or 4). The child is red (player 0).
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { absolute, baseCell, chooseToken, HOME, homeCell, initialLudo, isActive, moveToken, movable, roll, SAFE, trackCell, type LudoState } from '../logic/ludo';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const COLORS = ['#FF5F6D', '#7ED957', '#FFC93C', '#4FB3FF'];
const NAMES = ['You', 'Green', 'Yellow', 'Blue'];
export interface State { game: LudoState; seed: number; tick: number }
export type Action = { type: 'roll' } | { type: 'move'; token: number } | { type: 'ai' };

const def: GameDefinition<State, Action> = {
  id: 'ludo',
  init: (ctx) => ({ game: initialLudo(ctx.difficulty === 'easy' ? 2 : 4), seed: ctx.seed, tick: 0 }),
  reduce(state, action) {
    const random = rng(state.seed + state.tick);
    const g = state.game;
    if (g.winner !== null) return state;
    if (action.type === 'roll') {
      if (g.turn !== 0 || g.dice !== null) return state;
      return { ...state, game: roll(g, random), tick: state.tick + 1 };
    }
    if (action.type === 'move') {
      if (g.turn !== 0) return state;
      return { ...state, game: moveToken(g, 0, action.token), tick: state.tick + 1 };
    }
    // computer turn: roll, then move
    if (g.turn === 0) return state;
    if (g.dice === null) return { ...state, game: roll(g, random), tick: state.tick + 1 };
    return { ...state, game: moveToken(g, g.turn, chooseToken(g, g.turn, random)), tick: state.tick + 1 };
  },
  status(state) {
    const g = state.game;
    const home = g.tokens[0]!.filter((t) => t === HOME).length;
    if (g.winner === 0) return { phase: 'won', score: 100, stars: g.players === 4 ? 3 : 2, hud: 'You win!' };
    if (g.winner !== null) return { phase: 'lost', score: home * 10, hud: `${NAMES[g.winner]} wins` };
    return { phase: 'playing', progress: g.tokens[0]!.reduce((n, t) => n + Math.max(0, t) / HOME, 0) / 4, hud: g.turn === 0 ? (g.dice ? `You rolled ${g.dice}` : 'Your roll') : `${NAMES[g.turn]}'s turn` };
  },
  View: LudoView,
};

function LudoView({ state, dispatch, width, readOnly, sfx }: GameViewProps<State, Action>) {
  const g = state.game;
  const size = Math.min(width, 520);
  const cell = size / 15;
  useEffect(() => {
    if (readOnly || g.turn === 0 || g.winner !== null) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 650);
    return () => clearTimeout(id);
  }, [g.turn, g.dice, g.tokens, dispatch, readOnly, g.winner]);
  // Auto-move when only one token can move.
  useEffect(() => {
    if (readOnly || g.turn !== 0 || g.dice === null) return;
    const opts = movable(g, 0, g.dice);
    if (opts.length === 1) {
      const id = setTimeout(() => dispatch({ type: 'move', token: opts[0]! }), 400);
      return () => clearTimeout(id);
    }
  }, [g, dispatch, readOnly]);
  const canMove = g.turn === 0 && g.dice !== null ? new Set(movable(g, 0, g.dice)) : new Set<number>();
  const pos = (p: number, t: number): [number, number] => {
    const v = g.tokens[p]![t]!;
    if (v === -1) return baseCell(p, t);
    if (v >= 51) return v === HOME ? [7, 7] : homeCell(p, v - 50);
    return trackCell(absolute(p, v));
  };
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🎲">{g.winner !== null ? (g.winner === 0 ? 'You win! 🎉' : `${NAMES[g.winner]} wins`) : g.turn === 0 ? (g.dice === null ? 'Tap the dice to roll' : canMove.size ? `You rolled ${g.dice}. Tap a token.` : 'No move') : `${NAMES[g.turn]} is playing…`}</Prompt>
      <RNView style={[styles.board, { width: size, height: size }]}>
        {[0, 1, 2, 3].map((p) => (
          <RNView key={p} style={{ position: 'absolute', left: [0, 9, 9, 0][p]! * cell, top: [0, 0, 9, 9][p]! * cell, width: cell * 6, height: cell * 6, backgroundColor: COLORS[p], opacity: isActive(g, p) ? 1 : 0.3, borderRadius: 8 }} />
        ))}
        {[...Array(52).keys()].map((a) => {
          const [x, y] = trackCell(a);
          return <RNView key={a} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: SAFE.has(a) ? '#FFF4CC' : '#fff', borderWidth: 0.5, borderColor: '#ccc' }} />;
        })}
        {[0, 1, 2, 3].flatMap((p) => [1, 2, 3, 4, 5].map((s) => { const [x, y] = homeCell(p, s); return <RNView key={`${p}-${s}`} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: COLORS[p] + '88', borderWidth: 0.5, borderColor: '#ccc' }} />; }))}
        <RNView style={{ position: 'absolute', left: 6 * cell, top: 6 * cell, width: cell * 3, height: cell * 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: cell * 1.6 }}>🏠</Text></RNView>
        {[0, 1, 2, 3].filter((p) => isActive(g, p)).flatMap((p) => g.tokens[p]!.map((_, t) => {
          const [x, y] = pos(p, t);
          const mine = p === 0 && canMove.has(t);
          return (
            <Tactile key={`${p}-${t}`} haptic={false} disabled={readOnly || !mine} onPress={() => { sfx('pop'); dispatch({ type: 'move', token: t }); }} accessibilityRole="button" accessibilityLabel={`${NAMES[p]} token ${t + 1}`} style={{ position: 'absolute', left: x * cell + cell * 0.1, top: y * cell + cell * 0.1, width: cell * 0.8, height: cell * 0.8 }}>
              <RNView style={[styles.token, { backgroundColor: COLORS[p], borderColor: mine ? '#2E2A4A' : '#fff', transform: [{ scale: mine ? 1.2 : 1 }] }]} />
            </Tactile>
          );
        }))}
      </RNView>
      {!readOnly && (
        <Tactile onPress={() => { sfx('tap'); dispatch({ type: 'roll' }); }} disabled={g.turn !== 0 || g.dice !== null || g.winner !== null} accessibilityRole="button" accessibilityLabel="Roll the dice">
          <RNView style={[styles.dice, { opacity: g.turn === 0 && g.dice === null ? 1 : 0.6 }]}><Text style={{ fontSize: 36 }}>{g.dice ? ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][g.dice - 1] : '🎲'}</Text></RNView>
        </Tactile>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: '#2E2A4A' },
  token: { flex: 1, borderRadius: 999, borderWidth: 3 },
  dice: { marginTop: 10, width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2E2A4A' },
});

export default def;
