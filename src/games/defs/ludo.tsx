// Ludo against computer players (2 or 4), or pass-and-play with a friend.
// The child is red (player 0); in friends mode yellow (player 2, the
// opposite corner) is the friend. Dice tumble, tokens glide, captures burst.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { absolute, baseCell, chooseToken, HOME, homeCell, initialLudo, isActive, moveToken, movable, roll, SAFE, trackCell, type LudoState } from '../logic/ludo';
import { Prompt } from '../shared/Board';
import { CaptureBurst, Dice, GlidingToken, ModeChooser } from '../shared/boardFx';

const COLORS = ['#FF5F6D', '#7ED957', '#FFC93C', '#4FB3FF'];
const NAMES = ['You', 'Green', 'Yellow', 'Blue'];
const FRIEND_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
export type Mode = 'computer' | 'friends' | null;
export interface State { game: LudoState; seed: number; tick: number; mode: Mode; lastCapture: number | null }
export type Action = { type: 'roll' } | { type: 'move'; token: number } | { type: 'ai' } | { type: 'mode'; mode: 'computer' | 'friends' };

/** In friends mode the humans control red and yellow (the 2-player board uses opposite corners). */
const isHuman = (s: State, p: number) => (s.mode === 'friends' ? p === 0 || p === 2 : p === 0);

function countTokens(g: LudoState) {
  return g.tokens.flat().filter((t) => t !== -1 && t !== HOME).length;
}

const def: GameDefinition<State, Action> = {
  id: 'ludo',
  init: (ctx) => ({ game: initialLudo(ctx.difficulty === 'easy' ? 2 : 4), seed: ctx.seed, tick: 0, mode: null, lastCapture: null }),
  reduce(state, action) {
    const random = rng(state.seed + state.tick);
    const g = state.game;
    if (action.type === 'mode') return { ...state, mode: action.mode, game: action.mode === 'friends' ? initialLudo(2) : state.game };
    if (g.winner !== null || state.mode === null) return state;
    if (action.type === 'roll') {
      if (!isHuman(state, g.turn) || g.dice !== null) return state;
      return { ...state, game: roll(g, random), tick: state.tick + 1 };
    }
    if (action.type === 'move') {
      if (!isHuman(state, g.turn)) return state;
      const before = countTokens(g);
      const next = moveToken(g, g.turn, action.token);
      return { ...state, game: next, tick: state.tick + 1, lastCapture: countTokens(next) < before ? state.tick + 1 : null };
    }
    // computer turn: roll, then move
    if (isHuman(state, g.turn)) return state;
    if (g.dice === null) return { ...state, game: roll(g, random), tick: state.tick + 1 };
    const before = countTokens(g);
    const next = moveToken(g, g.turn, chooseToken(g, g.turn, random));
    return { ...state, game: next, tick: state.tick + 1, lastCapture: countTokens(next) < before ? state.tick + 1 : null };
  },
  status(state) {
    const g = state.game;
    const names = state.mode === 'friends' ? FRIEND_NAMES : NAMES;
    const home = g.tokens[0]!.filter((t) => t === HOME).length;
    if (g.winner === 0) return { phase: 'won', score: 100, stars: g.players === 4 ? 3 : 2, hud: state.mode === 'friends' ? 'Red wins!' : 'You win!' };
    if (g.winner !== null) return state.mode === 'friends' ? { phase: 'won', score: 50, stars: 1, hud: `${names[g.winner]} wins` } : { phase: 'lost', score: home * 10, hud: `${names[g.winner]} wins` };
    if (state.mode === null) return { phase: 'playing', hud: 'Choose who plays' };
    return { phase: 'playing', progress: g.tokens[0]!.reduce((n, t) => n + Math.max(0, t) / HOME, 0) / 4, hud: isHuman(state, g.turn) ? (g.dice ? `${names[g.turn]} rolled ${g.dice}` : `${names[g.turn]} to roll`) : `${names[g.turn]}'s turn` };
  },
  View: LudoView,
};

function LudoView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const g = state.game;
  const size = Math.min(width, 520);
  const cell = size / 15;
  const [rollKey, setRollKey] = useState(0);
  const names = state.mode === 'friends' ? FRIEND_NAMES : NAMES;
  const human = isHuman(state, g.turn);
  useEffect(() => {
    if (readOnly || human || g.winner !== null || state.mode === null) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 700);
    return () => clearTimeout(id);
  }, [g.turn, g.dice, g.tokens, dispatch, readOnly, g.winner, human, state.mode]);
  // Auto-move when only one token can move.
  useEffect(() => {
    if (readOnly || !human || g.dice === null) return;
    const opts = movable(g, g.turn, g.dice);
    if (opts.length === 1) {
      const id = setTimeout(() => dispatch({ type: 'move', token: opts[0]! }), 450);
      return () => clearTimeout(id);
    }
  }, [g, dispatch, readOnly, human]);
  useEffect(() => {
    if (g.dice !== null) setRollKey((k) => k + 1);
  }, [g.dice, g.turn]);
  useEffect(() => {
    if (state.lastCapture !== null) sfx('pop');
  }, [state.lastCapture, sfx]);
  const canMove = human && g.dice !== null ? new Set(movable(g, g.turn, g.dice)) : new Set<number>();
  const pos = (p: number, t: number): [number, number] => {
    const v = g.tokens[p]![t]!;
    if (v === -1) return baseCell(p, t);
    if (v >= 51) return v === HOME ? [7, 7] : homeCell(p, v - 50);
    return trackCell(absolute(p, v));
  };
  const prompt = g.winner !== null ? (g.winner === 0 ? (state.mode === 'friends' ? 'Red wins! 🎉' : 'You win! 🎉') : `${names[g.winner]} wins${state.mode === 'friends' ? ' 🎉' : ''}`) : human ? (g.dice === null ? `${names[g.turn]}: tap the dice to roll` : canMove.size ? `${names[g.turn]} rolled ${g.dice}. Tap a token.` : 'No move') : `${names[g.turn]} is playing…`;
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🎲">{prompt}</Prompt>
      <RNView style={[styles.board, { width: size, height: size }]}>
        {[0, 1, 2, 3].map((p) => (
          <RNView key={p} style={{ position: 'absolute', left: [0, 9, 9, 0][p]! * cell, top: [0, 0, 9, 9][p]! * cell, width: cell * 6, height: cell * 6, backgroundColor: COLORS[p], opacity: isActive(g, p) ? 1 : 0.3, borderRadius: 12 }}>
            <RNView style={{ position: 'absolute', left: cell, top: cell, width: cell * 4, height: cell * 4, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)' }} />
            {isActive(g, p) && g.turn === p && g.winner === null && <Text style={{ position: 'absolute', right: 6, top: 4, fontSize: cell * 0.8 }}>👉</Text>}
          </RNView>
        ))}
        {[...Array(52).keys()].map((a) => {
          const [x, y] = trackCell(a);
          const start = [0, 13, 26, 39].indexOf(a);
          return (
            <RNView key={a} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: start >= 0 ? COLORS[start] + '66' : SAFE.has(a) ? '#FFF4CC' : '#fff', borderWidth: 0.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' }}>
              {SAFE.has(a) && <Text style={{ fontSize: cell * 0.55, color: '#E0B000' }}>★</Text>}
            </RNView>
          );
        })}
        {[0, 1, 2, 3].flatMap((p) => [1, 2, 3, 4, 5].map((s) => { const [x, y] = homeCell(p, s); return <RNView key={`${p}-${s}`} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: COLORS[p] + '99', borderWidth: 0.5, borderColor: '#ccc' }} />; }))}
        <RNView style={{ position: 'absolute', left: 6 * cell, top: 6 * cell, width: cell * 3, height: cell * 3, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}><Text style={{ fontSize: cell * 1.6 }}>🏠</Text></RNView>
        {[0, 1, 2, 3].filter((p) => isActive(g, p)).flatMap((p) => g.tokens[p]!.map((_, t) => {
          const [x, y] = pos(p, t);
          const mine = human && p === g.turn && canMove.has(t);
          const atHome = g.tokens[p]![t] === HOME;
          return (
            <GlidingToken key={`${p}-${t}`} x={x * cell + cell * 0.1 + (atHome ? (t % 2) * cell * 0.4 : 0)} y={y * cell + cell * 0.1 + (atHome ? Math.floor(t / 2) * cell * 0.4 : 0)} size={cell * 0.8} disabled={readOnly || !mine} onPress={() => { sfx('pop'); dispatch({ type: 'move', token: t }); }} label={`${names[p]} token ${t + 1}`} highlight={mine}>
              <RNView style={[styles.token, { backgroundColor: COLORS[p], borderColor: mine ? '#2E2A4A' : '#fff' }]}>
                <RNView style={styles.tokenShine} />
              </RNView>
            </GlidingToken>
          );
        }))}
        <CaptureBurst x={size / 2 - cell} y={size / 2 - cell} size={cell * 2} show={state.lastCapture !== null && state.lastCapture === state.tick} />
        {state.mode === null && !readOnly && (
          <RNView style={styles.modeWrap}><ModeChooser onPick={(m) => { sfx('tap'); dispatch({ type: 'mode', mode: m }); say(m === 'friends' ? 'Red rolls first. Pass the device to your friend for yellow.' : 'You are red. Tap the dice to roll.'); }} /></RNView>
        )}
      </RNView>
      {!readOnly && state.mode !== null && (
        <Dice value={g.dice} rollKey={rollKey} disabled={!human || g.dice !== null || g.winner !== null} onPress={() => { sfx('tap'); dispatch({ type: 'roll' }); }} label="Roll the dice" color={human ? COLORS[g.turn] + '55' : '#fff'} />
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 4, borderColor: '#2E2A4A' },
  token: { flex: 1, borderRadius: 999, borderWidth: 3, overflow: 'hidden' },
  tokenShine: { position: 'absolute', left: '20%', top: '12%', width: '35%', height: '28%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)' },
  modeWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,42,74,0.35)' },
});

export default def;
