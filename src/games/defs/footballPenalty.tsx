// Football Penalty: swipe towards a corner; the keeper dives (sometimes the
// right way). Five kicks.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { usePointer } from '../shared/drag';
import { Prompt } from '../shared/Board';

const KICKS = 5;
const KEEPER_SKILL: Record<string, number> = { easy: 0.35, normal: 0.55, hard: 0.75 };
type Zone = 0 | 1 | 2 | 3 | 4 | 5; // top-left, top-mid, top-right, bottom-left, bottom-mid, bottom-right
export interface State { kick: number; goals: number; shot: Zone | null; dive: Zone | null; result: string | null; skill: number; seed: number }
export type Action = { type: 'shoot'; zone: Zone } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'football-penalty',
  init: (ctx) => ({ kick: 0, goals: 0, shot: null, dive: null, result: null, skill: KEEPER_SKILL[ctx.difficulty] ?? 0.55, seed: ctx.seed }),
  reduce(state, action) {
    if (state.kick >= KICKS) return state;
    if (action.type === 'next') return state.result === null ? state : { ...state, shot: null, dive: null, result: null };
    if (state.result !== null) return state;
    const random = rng(state.seed + state.kick * 7);
    const guessRight = random() < state.skill;
    const dive: Zone = guessRight ? action.zone : ((Math.floor(random() * 6)) as Zone);
    // Middle shots are easier to save; corners harder even when guessed.
    const saved = dive === action.zone && (action.zone % 3 === 1 ? random() < 0.9 : random() < 0.6);
    return { ...state, shot: action.zone, dive, kick: state.kick + 1, goals: state.goals + (saved ? 0 : 1), result: saved ? 'Saved by the keeper!' : 'GOAL! ⚽🎉' };
  },
  status(state) {
    const done = state.kick >= KICKS && state.result === null;
    return { phase: done ? 'won' : 'playing', score: state.goals * 20, stars: state.goals >= 5 ? 3 : state.goals >= 3 ? 2 : state.goals >= 1 ? 1 : 0, progress: state.kick / KICKS, hud: `${state.goals} goals · ${state.kick}/${KICKS}` };
  },
  View: PenaltyView,
};

function PenaltyView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const W = Math.min(width, 440), H = W * 0.62;
  useEffect(() => {
    if (!state.result || readOnly) return;
    sfx(state.result.startsWith('GOAL') ? 'win' : 'bad');
    say(state.result.replace(/[!⚽🎉]/g, ''));
    const id = setTimeout(() => dispatch({ type: 'next' }), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);
  const pointer = usePointer({
    disabled: readOnly || state.result !== null,
    onUp: (_x, _y, dx, dy) => {
      if (Math.hypot(dx, dy) < 20) return;
      const col = dx < -30 ? 0 : dx > 30 ? 2 : 1;
      const row = dy < -60 ? 0 : 1;
      dispatch({ type: 'shoot', zone: (row * 3 + col) as Zone });
    },
  });
  const zoneXY = (z: Zone) => ({ left: (z % 3) * (W / 3) + W / 6 - 16, top: Math.floor(z / 3) * (H / 2) + H / 4 - 16 });
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="⚽">Swipe up towards a corner to shoot!</Prompt>
      <RNView {...pointer} style={[styles.field, { width: W, height: H + 140 }]}>
        <RNView style={[styles.goal, { width: W, height: H }]}>
          {[0, 1, 2, 3, 4, 5].map((z) => <RNView key={z} style={[styles.zone, { width: W / 3, height: H / 2 }]} />)}
          <Text style={[styles.keeper, { left: state.dive !== null ? zoneXY(state.dive).left - 10 : W / 2 - 26, top: state.dive !== null ? zoneXY(state.dive).top - 14 : H / 2 - 30, transform: [{ rotate: state.dive !== null && state.dive % 3 !== 1 ? (state.dive % 3 === 0 ? '-45deg' : '45deg') : '0deg' }] }]}>🧤</Text>
          {state.shot !== null && <Text style={{ position: 'absolute', ...zoneXY(state.shot), fontSize: 32 }}>⚽</Text>}
        </RNView>
        {state.shot === null && <Text style={styles.ball}>⚽</Text>}
        <Text style={styles.player}>🧒</Text>
        {state.result && <Text style={styles.result}>{state.result}</Text>}
      </RNView>
      <RNView style={styles.row}>
        {Array.from({ length: KICKS }, (_, i) => <Text key={i} style={{ fontSize: 28 }}>{i < state.kick ? (i < state.goals + (state.result?.startsWith('Saved') && i === state.kick - 1 ? 0 : 0) ? '⚽' : '❌') : '⚪'}</Text>)}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  field: { backgroundColor: '#7ED957', borderRadius: 24, overflow: 'hidden', borderWidth: 4, borderColor: '#5CBF34', alignItems: 'center' },
  goal: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 6, borderColor: '#fff', borderBottomWidth: 0 },
  zone: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.5)' },
  keeper: { position: 'absolute', fontSize: 52 },
  ball: { fontSize: 36, marginTop: 40 },
  player: { fontSize: 44, position: 'absolute', bottom: 6 },
  result: { position: 'absolute', top: '40%', fontFamily: 'Fredoka_700Bold', fontSize: 26, color: '#2E2A4A', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
});

export default def;
