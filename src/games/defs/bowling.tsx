// Bowling: drag to aim and set power, release to bowl. Ten frames, real
// scoring with strikes and spares.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { nextBall, scoreFrames } from '../logic/bowling';
import { usePointer } from '../shared/drag';
import { Prompt } from '../shared/Board';

const WOBBLE: Record<string, number> = { easy: 0.05, normal: 0.12, hard: 0.2 };
export interface State { rolls: number[]; last: { knocked: number; aim: number } | null; wobble: number; seed: number }
export type Action = { type: 'bowl'; aim: number; power: number } | { type: 'clear' };

const def: GameDefinition<State, Action> = {
  id: 'bowling',
  init: (ctx) => ({ rolls: [], last: null, wobble: WOBBLE[ctx.difficulty] ?? 0.12, seed: ctx.seed }),
  reduce(state, action) {
    if (action.type === 'clear') return { ...state, last: null };
    const nb = nextBall(state.rolls);
    if (nb.done) return state;
    const random = rng(state.seed + state.rolls.length);
    const aim = action.aim + (random() - 0.5) * state.wobble; // -1 left … 1 right, 0 is the pocket
    const power = Math.max(0.2, Math.min(1, action.power));
    const accuracy = Math.max(0, 1 - Math.abs(aim) * 2.2);
    let knocked = Math.round(nb.standing * accuracy * (0.6 + power * 0.5));
    if (Math.abs(aim) > 0.6) knocked = 0; // gutter
    knocked = Math.max(0, Math.min(nb.standing, knocked));
    return { ...state, rolls: [...state.rolls, knocked], last: { knocked, aim } };
  },
  status(state) {
    const s = scoreFrames(state.rolls);
    const nb = nextBall(state.rolls);
    return { phase: nb.done ? 'won' : 'playing', score: s.total, stars: s.total >= 150 ? 3 : s.total >= 90 ? 2 : 1, progress: nb.frame / 10, hud: `Frame ${Math.min(nb.frame + 1, 10)} · ${s.total}` };
  },
  View: BowlingView,
};

function BowlingView({ state, dispatch, width, height, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const W = Math.min(width, 400), H = Math.min(height - 150, 460);
  const nb = nextBall(state.rolls);
  const score = scoreFrames(state.rolls);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  useEffect(() => {
    if (!state.last || readOnly) return;
    const msg = state.last.knocked === nb.standing + state.last.knocked && state.last.knocked === 10 ? 'STRIKE!' : state.last.knocked === 0 ? 'Gutter ball…' : `${state.last.knocked} pins!`;
    say(msg);
    sfx(state.last.knocked >= 7 ? 'win' : state.last.knocked ? 'good' : 'bad');
    const id = setTimeout(() => dispatch({ type: 'clear' }), 1300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.last]);
  const pointer = usePointer({
    disabled: readOnly || nb.done || !!state.last,
    onMove: (_x, _y) => undefined,
    onUp: (_x, _y, dx, dy) => {
      setDrag(null);
      if (dy > -30) return;
      dispatch({ type: 'bowl', aim: dx / (W / 2), power: Math.min(1, -dy / (H * 0.6)) });
    },
  });
  void drag;
  const pins = [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-3, 3], [-1, 3], [1, 3], [3, 3]];
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🎳">Drag the ball up and release to bowl. {nb.standing} pins standing.</Prompt>
      <RNView {...pointer} style={[styles.lane, { width: W, height: H }]}>
        {pins.map(([x, y], i) => (
          <Text key={i} style={{ position: 'absolute', left: W / 2 + x! * 20 - 12, top: 70 - y! * 16, fontSize: 24, opacity: i < nb.standing ? 1 : 0.15 }}>🎳</Text>
        ))}
        <Text style={[styles.ball, { bottom: 24 }]}>🔵</Text>
        {state.last && <Text style={styles.result}>{state.last.knocked === 10 && nb.roll !== 1 ? 'STRIKE! 🎉' : state.last.knocked === 0 ? 'Gutter…' : `${state.last.knocked} pins!`}</Text>}
      </RNView>
      <RNView style={styles.frames}>
        {score.frames.map((f, i) => (
          <RNView key={i} style={[styles.frame, { backgroundColor: i === nb.frame ? '#FFF4CC' : '#fff' }]}>
            <Text style={styles.frameNum}>{i + 1}</Text>
            <Text style={styles.frameScore}>{f ?? ''}</Text>
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  lane: { backgroundColor: '#D9A066', borderRadius: 20, overflow: 'hidden', borderWidth: 4, borderColor: '#8B5A2B', alignItems: 'center' },
  ball: { position: 'absolute', fontSize: 40 },
  result: { position: 'absolute', top: '45%', fontFamily: 'Fredoka_700Bold', fontSize: 26, color: '#2E2A4A', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, overflow: 'hidden' },
  frames: { flexDirection: 'row', gap: 3, marginTop: 10 },
  frame: { width: 34, borderRadius: 6, alignItems: 'center', paddingVertical: 3, borderWidth: 1, borderColor: '#2E2A4A' },
  frameNum: { fontSize: 9, color: '#9A96B8' },
  frameScore: { fontFamily: 'Fredoka_700Bold', fontSize: 14, color: '#2E2A4A' },
});

export default def;
