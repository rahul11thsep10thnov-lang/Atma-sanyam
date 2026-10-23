// Snakes and Ladders: race to 100 against the robot, or pass-and-play with
// a friend. Illustrated board with drawn snakes and ladders, tumbling dice,
// gliding pieces, and an exact-100 finish.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { Prompt } from '../shared/Board';
import { Dice, GlidingToken, ModeChooser } from '../shared/boardFx';

const LADDERS: Record<number, number> = { 4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92 };
const SNAKES: Record<number, number> = { 27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41 };

export interface State { pos: [number, number]; turn: 0 | 1; dice: number | null; seed: number; tick: number; message: string; mode: 'computer' | 'friends' | null; via: 'ladder' | 'snake' | null }
export type Action = { type: 'roll' } | { type: 'ai' } | { type: 'mode'; mode: 'computer' | 'friends' };

function advance(p: number, dice: number): { to: number; via: 'ladder' | 'snake' | null } {
  let to = p + dice;
  if (to > 100) return { to: p, via: null };
  if (LADDERS[to]) return { to: LADDERS[to]!, via: 'ladder' };
  if (SNAKES[to]) return { to: SNAKES[to]!, via: 'snake' };
  return { to, via: null };
}

const def: GameDefinition<State, Action> = {
  id: 'snakes-and-ladders',
  init: (ctx) => ({ pos: [0, 0], turn: 0, dice: null, seed: ctx.seed, tick: 0, message: 'Who is playing?', mode: null, via: null }),
  reduce(state, action) {
    if (action.type === 'mode') return { ...state, mode: action.mode, message: 'Tap the dice!' };
    if (state.mode === null || state.pos[0] === 100 || state.pos[1] === 100) return state;
    // In friends mode both players roll by tapping; the robot never acts.
    const who: 0 | 1 = action.type === 'ai' ? 1 : state.turn;
    if (action.type === 'ai' && state.mode === 'friends') return state;
    if (state.turn !== who) return state;
    const dice = Math.floor(rng(state.seed + state.tick)() * 6) + 1;
    const r = advance(state.pos[who]!, dice);
    const pos: [number, number] = [state.pos[0]!, state.pos[1]!];
    pos[who] = r.to;
    const name = state.mode === 'friends' ? (who === 0 ? 'Player 1' : 'Player 2') : who === 0 ? 'You' : 'Robot';
    const message = r.via === 'ladder' ? `${name} rolled ${dice} and climbed a ladder to ${r.to}! 🪜` : r.via === 'snake' ? `${name} rolled ${dice}… a snake! Down to ${r.to} 🐍` : r.to === state.pos[who] && dice + state.pos[who]! > 100 ? `${name} rolled ${dice}: too many to finish (needs exactly 100)` : `${name} rolled ${dice} → ${r.to}`;
    return { ...state, pos, dice, turn: dice === 6 ? state.turn : ((1 - who) as 0 | 1), tick: state.tick + 1, message, via: r.via };
  },
  status(state) {
    if (state.pos[0] === 100) return { phase: 'won', score: 100, stars: 3, hud: state.mode === 'friends' ? 'Player 1 reached 100!' : 'You reached 100!' };
    if (state.pos[1] === 100) return state.mode === 'friends' ? { phase: 'won', score: 60, stars: 1, hud: 'Player 2 reached 100!' } : { phase: 'lost', score: state.pos[0], hud: 'Robot reached 100' };
    return { phase: 'playing', progress: state.pos[0]! / 100, hud: state.mode === 'friends' ? `P1 ${state.pos[0]} · P2 ${state.pos[1]}` : `You ${state.pos[0]} · Robot ${state.pos[1]}` };
  },
  View: SnakesView,
};

function cellXY(n: number): [number, number] {
  const r = Math.floor((n - 1) / 10);
  const c = (n - 1) % 10;
  return [r % 2 === 0 ? c : 9 - c, 9 - r];
}

function centre(n: number, cell: number): [number, number] {
  const [x, y] = cellXY(n);
  return [x * cell + cell / 2, y * cell + cell / 2];
}

function SnakesView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const [rollKey, setRollKey] = useState(0);
  useEffect(() => {
    if (readOnly || state.mode !== 'computer' || state.turn !== 1 || state.pos[0] === 100 || state.pos[1] === 100) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 1000);
    return () => clearTimeout(id);
  }, [state.turn, state.tick, dispatch, readOnly, state.pos, state.mode]);
  useEffect(() => {
    if (state.dice !== null) setRollKey((k) => k + 1);
    if (state.via === 'ladder') sfx('good');
    if (state.via === 'snake') sfx('bad');
  }, [state.tick, state.dice, state.via, sfx]);
  const size = Math.min(width, 520);
  const cell = size / 10;
  const canRoll = state.mode !== null && state.pos[0] !== 100 && state.pos[1] !== 100 && (state.mode === 'friends' || state.turn === 0);
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🐍">{state.message}</Prompt>
      <RNView style={[styles.board, { width: size, height: size }]}>
        {[...Array(100).keys()].map((i) => {
          const n = i + 1;
          const [x, y] = cellXY(n);
          const shade = (x + y) % 2 ? '#FFF4CC' : '#FFFDF5';
          return (
            <RNView key={n} style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell, backgroundColor: n === 100 ? '#E6F8DA' : shade, borderWidth: 0.5, borderColor: '#E8E2D0', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: cell * 0.24, color: '#9A96B8', position: 'absolute', top: 1, left: 3, fontFamily: 'Nunito_700Bold' }}>{n}</Text>
              {n === 100 && <Text style={{ fontSize: cell * 0.5 }}>🏁</Text>}
            </RNView>
          );
        })}
        <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
          {Object.entries(LADDERS).map(([from, to]) => {
            const [x1, y1] = centre(Number(from), cell);
            const [x2, y2] = centre(to, cell);
            const dx = x2 - x1, dy = y2 - y1;
            const len = Math.hypot(dx, dy) || 1;
            const nx = (-dy / len) * cell * 0.18, ny = (dx / len) * cell * 0.18;
            const rungs = Math.max(2, Math.floor(len / (cell * 0.5)));
            return (
              <React.Fragment key={`l${from}`}>
                <Line x1={x1 + nx} y1={y1 + ny} x2={x2 + nx} y2={y2 + ny} stroke="#B8732E" strokeWidth={4} strokeLinecap="round" />
                <Line x1={x1 - nx} y1={y1 - ny} x2={x2 - nx} y2={y2 - ny} stroke="#B8732E" strokeWidth={4} strokeLinecap="round" />
                {Array.from({ length: rungs }, (_, i) => { const f = (i + 0.5) / rungs; const cx = x1 + dx * f, cy = y1 + dy * f; return <Line key={i} x1={cx + nx} y1={cy + ny} x2={cx - nx} y2={cy - ny} stroke="#8B5A2B" strokeWidth={3} />; })}
              </React.Fragment>
            );
          })}
          {Object.entries(SNAKES).map(([from, to], i) => {
            const [x1, y1] = centre(Number(from), cell);
            const [x2, y2] = centre(to, cell);
            const mx = (x1 + x2) / 2 + (i % 2 ? 1 : -1) * cell * 1.2;
            const my = (y1 + y2) / 2;
            const color = ['#4CAF50', '#7E57C2', '#26A69A', '#EF6C00'][i % 4]!;
            return (
              <React.Fragment key={`s${from}`}>
                <Path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke={color} strokeWidth={cell * 0.22} fill="none" strokeLinecap="round" />
                <Path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke="rgba(255,255,255,0.45)" strokeWidth={cell * 0.07} fill="none" strokeDasharray={`${cell * 0.2} ${cell * 0.25}`} />
              </React.Fragment>
            );
          })}
        </Svg>
        {Object.keys(SNAKES).map((from) => { const [x, y] = centre(Number(from), cell); return <Text key={`h${from}`} style={{ position: 'absolute', left: x - cell * 0.3, top: y - cell * 0.32, fontSize: cell * 0.55 }} pointerEvents="none">🐍</Text>; })}
        {[0, 1].map((p) => {
          const n = state.pos[p]!;
          const [x, y] = n === 0 ? [-0.6, 9] : cellXY(n);
          return (
            <GlidingToken key={p} x={x * cell + (p ? cell * 0.42 : cell * 0.02)} y={y * cell + cell * 0.22} size={cell * 0.6} label={p === 0 ? 'Your piece' : 'Robot piece'} disabled>
              <Text style={{ fontSize: cell * 0.55 }}>{state.mode === 'friends' ? (p === 0 ? '🧒' : '🧑') : p === 0 ? '🧒' : '🤖'}</Text>
            </GlidingToken>
          );
        })}
        {state.mode === null && !readOnly && (
          <RNView style={styles.modeWrap}><ModeChooser emoji="🐍" onPick={(m) => { sfx('tap'); dispatch({ type: 'mode', mode: m }); say(m === 'friends' ? 'Player 1 rolls first.' : 'Tap the dice to roll.'); }} /></RNView>
        )}
      </RNView>
      {!readOnly && state.mode !== null && (
        <Dice value={state.dice} rollKey={rollKey} disabled={!canRoll} onPress={() => { sfx('tap'); dispatch({ type: 'roll' }); }} label="Roll the dice" />
      )}
      {state.mode === 'friends' && state.pos[0] !== 100 && state.pos[1] !== 100 && <Text style={styles.turn}>{state.turn === 0 ? '🧒 Player 1 to roll' : '🧑 Player 2 to roll'}</Text>}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 14, overflow: 'visible', borderWidth: 4, borderColor: '#2E2A4A' },
  modeWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,42,74,0.35)', borderRadius: 14 },
  turn: { marginTop: 6, fontFamily: 'Nunito_700Bold', color: '#2E2A4A' },
});

export default def;
