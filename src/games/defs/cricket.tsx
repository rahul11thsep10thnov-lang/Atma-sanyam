// Cricket Batting: the ball travels down the pitch; tap when it reaches the
// bat. Timing decides the shot: perfect = six, good = four, early/late = 1–2
// or a dot ball, far off = out.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const BALLS = 6;
const SPEED: Record<string, number> = { easy: 0.012, normal: 0.018, hard: 0.026 };
export interface State { ball: number; t: number; speed: number; runs: number[]; outs: number; swinging: boolean; result: string | null; seed: number }
export type Action = { type: 'tick' } | { type: 'swing' } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'cricket',
  tick: { intervalMs: 32, action: { type: 'tick' } },
  init: (ctx) => ({ ball: 0, t: 0, speed: SPEED[ctx.difficulty] ?? 0.018, runs: [], outs: 0, swinging: false, result: null, seed: ctx.seed }),
  reduce(state, action) {
    if (state.ball >= BALLS) return state;
    if (action.type === 'next') return state.result === null ? state : { ...state, t: 0, result: null, swinging: false, speed: state.speed * (1 + (rng(state.seed + state.ball)() - 0.5) * 0.3) };
    if (state.result !== null) return state;
    if (action.type === 'tick') {
      const t = state.t + state.speed;
      if (t >= 1.12) return { ...state, t, result: 'Missed! Dot ball.', runs: [...state.runs, 0], ball: state.ball + 1 };
      return { ...state, t };
    }
    // swing: timing window around t = 1 (ball at the bat)
    const d = Math.abs(state.t - 1);
    let runs = 0;
    let result = '';
    if (state.t < 0.6) {
      result = 'Way too early… caught! OUT';
      return { ...state, swinging: true, result, outs: state.outs + 1, runs: [...state.runs, 0], ball: state.ball + 1 };
    }
    if (d < 0.03) {
      runs = 6;
      result = 'SIX! Perfect timing! 🎉';
    } else if (d < 0.07) {
      runs = 4;
      result = 'FOUR! Lovely shot!';
    } else if (d < 0.12) {
      runs = 2;
      result = 'Two runs.';
    } else if (d < 0.2) {
      runs = 1;
      result = 'A single.';
    } else {
      result = 'Edged… and caught! OUT';
      return { ...state, swinging: true, result, outs: state.outs + 1, runs: [...state.runs, 0], ball: state.ball + 1 };
    }
    return { ...state, swinging: true, result, runs: [...state.runs, runs], ball: state.ball + 1 };
  },
  status(state) {
    const total = state.runs.reduce((a, b) => a + b, 0);
    const done = state.ball >= BALLS && state.result === null;
    return { phase: done ? 'won' : 'playing', score: total, stars: total >= 24 ? 3 : total >= 12 ? 2 : total >= 4 ? 1 : 0, progress: state.ball / BALLS, hud: `${total} runs · ${state.ball}/${BALLS} balls · ${state.outs} out` };
  },
  View: CricketView,
};

function CricketView({ state, dispatch, width, height, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const H = Math.min(height - 120, 520);
  const ballY = Math.min(1, state.t) * (H - 90) + 20;
  const ballScale = 0.6 + Math.min(1, state.t) * 0.8;
  React.useEffect(() => {
    if (!state.result || readOnly) return;
    say(state.result.replace(/[!…🎉]/g, ''));
    const id = setTimeout(() => dispatch({ type: 'next' }), 1400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🏏">Tap when the ball reaches the bat!</Prompt>
      <Tactile disabled={readOnly || state.result !== null} haptic={false} onPress={() => { sfx('tap'); dispatch({ type: 'swing' }); }} accessibilityRole="button" accessibilityLabel="Swing the bat" style={{ width: Math.min(width, 420), height: H }}>
        <RNView style={[styles.pitch, { height: H }]}>
          <Text style={[styles.bowler, { top: 6 }]}>🧍</Text>
          <RNView style={[styles.crease, { top: H - 70 }]} />
          <Text style={{ position: 'absolute', top: ballY, left: '48%', fontSize: 22, transform: [{ scale: ballScale }] }}>⚾</Text>
          <Text style={[styles.bat, { top: H - 96, transform: [{ rotate: state.swinging ? '-70deg' : '0deg' }] }]}>🏏</Text>
          {state.result && <Text style={styles.result}>{state.result}</Text>}
        </RNView>
      </Tactile>
      <RNView style={styles.over}>
        {Array.from({ length: BALLS }, (_, i) => (
          <RNView key={i} style={[styles.ball, { backgroundColor: i < state.runs.length ? (state.runs[i]! >= 4 ? '#7ED957' : state.runs[i]! > 0 ? '#FFC93C' : '#FDE2E3') : '#fff' }]}>
            <Text style={styles.ballText}>{i < state.runs.length ? state.runs[i] : '·'}</Text>
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  pitch: { flex: 1, backgroundColor: '#7ED957', borderRadius: 24, overflow: 'hidden', borderWidth: 4, borderColor: '#5CBF34' },
  bowler: { position: 'absolute', alignSelf: 'center', fontSize: 34 },
  crease: { position: 'absolute', left: '20%', right: '20%', height: 3, backgroundColor: '#fff' },
  bat: { position: 'absolute', left: '56%', fontSize: 40 },
  result: { position: 'absolute', bottom: 12, alignSelf: 'center', fontFamily: 'Fredoka_700Bold', fontSize: 22, color: '#2E2A4A', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  over: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ball: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2E2A4A' },
  ballText: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: '#2E2A4A' },
});

export default def;
