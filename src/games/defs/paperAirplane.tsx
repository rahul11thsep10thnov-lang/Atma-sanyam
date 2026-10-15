// Paper Airplane Designer: fold a real plane with the guide, then test the
// design on screen. Three throws; the best distance scores.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { AppText, BigButton, Chip } from '../../ui';
import { Prompt, Scoreboard } from '../shared/Board';
import { FoldDiagram } from '../../crafts/FoldDiagram';
import { AIRPLANE_MODELS } from '../../crafts/models';
import { usePointer } from '../shared/drag';
import { glide, starsForDistance, type Design } from '../logic/flight';

const THROWS = 3;
const model = AIRPLANE_MODELS[0]!;

export interface State { phase: 'fold' | 'fly'; step: number; design: Design; throws: { distance: number; path: [number, number][] }[]; seed: number; last: number | null }
export type Action = { type: 'next' } | { type: 'back' } | { type: 'skipToFly' } | { type: 'design'; design: Partial<Design> } | { type: 'throw'; power: number; angle: number } | { type: 'dismiss' };

const def: GameDefinition<State, Action> = {
  id: 'paper-airplane',
  init: (ctx) => ({ phase: 'fold', step: 0, design: { nose: 1, wings: 'standard', flaps: 0 }, throws: [], seed: ctx.seed, last: null }),
  reduce(state, action) {
    switch (action.type) {
      case 'next': return state.step + 1 >= model.steps.length ? { ...state, phase: 'fly', step: model.steps.length } : { ...state, step: state.step + 1 };
      case 'back': return { ...state, step: Math.max(0, state.step - 1) };
      case 'skipToFly': return { ...state, phase: 'fly' };
      case 'design': return state.throws.length >= THROWS ? state : { ...state, design: { ...state.design, ...action.design } };
      case 'throw': {
        if (state.phase !== 'fly' || state.throws.length >= THROWS || state.last !== null) return state;
        const wind = (rng(state.seed + state.throws.length)() - 0.5) * 2;
        const g = glide(state.design, { power: action.power, angle: action.angle }, wind);
        return { ...state, throws: [...state.throws, g], last: state.throws.length };
      }
      case 'dismiss': return { ...state, last: null };
    }
  },
  status(state) {
    const best = Math.max(0, ...state.throws.map((t) => t.distance));
    const done = state.throws.length >= THROWS && state.last === null;
    return { phase: done ? 'won' : 'playing', score: Math.round(best * 10), stars: starsForDistance(best), progress: state.phase === 'fold' ? (state.step / model.steps.length) * 0.5 : 0.5 + state.throws.length / THROWS / 2, hud: state.phase === 'fold' ? `Fold ${state.step + 1} / ${model.steps.length}` : `Best ${best} m · throw ${Math.min(state.throws.length + 1, THROWS)} / ${THROWS}` };
  },
  View: PlaneView,
  layout: 'full',
};

function PlaneView({ state, dispatch, width, readOnly, say, sfx }: GameViewProps<State, Action>) {
  if (state.phase === 'fold') return <FoldGuide state={state} dispatch={dispatch} width={width} readOnly={readOnly} say={say} sfx={sfx} />;
  return <FlightTest state={state} dispatch={dispatch} width={width} readOnly={readOnly} say={say} sfx={sfx} />;
}

type Sub = Pick<GameViewProps<State, Action>, 'state' | 'dispatch' | 'width' | 'readOnly' | 'say' | 'sfx'>;

function FoldGuide({ state, dispatch, width, readOnly, say, sfx }: Sub) {
  const step = model.steps[Math.min(state.step, model.steps.length - 1)]!;
  const size = Math.min(280, width - 32);
  return (
    <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 24 }}>
      <RNView style={{ alignSelf: 'stretch' }}><Prompt emoji="✈️">{`Fold ${state.step + 1}: ${step.title}`}</Prompt></RNView>
      <RNView style={styles.card}><FoldDiagram diagram={step.diagram} size={size} stepIndex={state.step} animate={!readOnly} /></RNView>
      <AppText variant="body" align="center" style={{ marginTop: 10, fontFamily: 'Nunito_700Bold', paddingHorizontal: 8 }}>{step.text}</AppText>
      {step.tip && <AppText variant="caption" tone="muted" align="center" style={{ marginTop: 6 }}>💡 {step.tip}</AppText>}
      {!readOnly && (
        <RNView style={styles.nav}>
          <BigButton label="Back" icon="arrowLeft" size="md" color="#C9C4DD" disabled={state.step === 0} onPress={() => dispatch({ type: 'back' })} />
          <BigButton label="Read aloud" emoji="🔊" size="md" color="#4FB3FF" onPress={() => say(step.text)} />
          <BigButton label={state.step + 1 >= model.steps.length ? 'Ready to fly!' : 'Folded it'} emoji="✅" size="md" color="#7ED957" onPress={() => { sfx('good'); dispatch({ type: 'next' }); }} />
        </RNView>
      )}
      {!readOnly && <Chip label="Skip to the flight test" onPress={() => dispatch({ type: 'skipToFly' })} small />}
    </ScrollView>
  );
}

function FlightTest({ state, dispatch, width, readOnly, say, sfx }: Sub) {
  const W = Math.min(width - 8, 480), H = 180;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [anim, setAnim] = useState(0);
  const last = state.last !== null ? state.throws[state.last] : null;
  useEffect(() => {
    if (!last || readOnly) return;
    setAnim(0);
    let i = 0;
    const id = setInterval(() => { i++; setAnim(i); if (i >= 24) { clearInterval(id); } }, 50);
    const t = setTimeout(() => { sfx(last.distance >= 18 ? 'win' : 'pop'); say(`${last.distance} metres`); dispatch({ type: 'dismiss' }); }, 2400);
    return () => { clearInterval(id); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.last]);
  const pointer = usePointer({
    disabled: readOnly || state.last !== null || state.throws.length >= THROWS,
    onMove: (_x, _y) => undefined,
    onUp: (_x, _y, dx, dy) => {
      setDrag(null);
      const len = Math.hypot(dx, dy);
      if (len < 15) return;
      const power = Math.min(1, len / 220);
      const angle = Math.max(-10, Math.min(60, (-dy / Math.max(1, Math.abs(dx))) * 45));
      dispatch({ type: 'throw', power, angle });
    },
  });
  const best = Math.max(0, ...state.throws.map((t) => t.distance));
  const scaleX = W / 40, groundY = H - 16;
  const shown = last ? last.path.slice(0, Math.max(1, anim)) : null;
  const d = shown ? shown.map(([x, y], i) => `${i ? 'L' : 'M'} ${8 + x * scaleX} ${groundY - y * 14}`).join(' ') : '';
  const tip = shown ? shown[shown.length - 1]! : null;
  const set = (design: Partial<Design>) => { sfx('tap'); dispatch({ type: 'design', design }); };
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <Prompt emoji="✈️">{state.throws.length >= THROWS ? `Best flight: ${best} m!` : 'Tune your plane, then swipe right to throw.'}</Prompt>
      <Scoreboard items={[{ label: 'Throw', value: `${Math.min(state.throws.length + 1, THROWS)} / ${THROWS}` }, { label: 'Best', value: `${best} m` }, ...state.throws.map((t, i) => ({ label: `#${i + 1}`, value: `${t.distance} m` }))]} />
      <RNView {...pointer} style={[styles.sky, { width: W, height: H }]} accessibilityLabel="Launch area: swipe right to throw" accessibilityRole="button">
        <Svg width={W} height={H}>
          <Line x1={0} y1={groundY} x2={W} y2={groundY} stroke="#5CBF34" strokeWidth={6} />
          {[10, 20, 30].map((m) => <SvgText key={m} x={8 + m * scaleX} y={H - 2} fontSize={10} fill="#1F2340" textAnchor="middle">{m} m</SvgText>)}
          {d ? <Path d={d} stroke="#4FB3FF" strokeWidth={3} fill="none" strokeDasharray="6 4" /> : null}
        </Svg>
        <Text style={{ position: 'absolute', left: tip ? 8 + tip[0] * scaleX - 14 : 2, top: tip ? groundY - tip[1] * 14 - 14 : groundY - 36, fontSize: 28, transform: [{ rotate: '-10deg' }] }}>✈️</Text>
        <Text style={{ position: 'absolute', left: 4, bottom: 18, fontSize: 30 }}>🧒</Text>
        {!last && state.throws.length < THROWS && <Text style={styles.hint}>👉 swipe to throw</Text>}
      </RNView>
      <AppText variant="heading" style={{ marginTop: 10, marginBottom: 6 }}>🛠️ Design</AppText>
      <RNView style={styles.row}>
        <AppText variant="caption" tone="muted" style={{ width: 70 }}>Nose</AppText>
        {([0, 1, 2] as const).map((n) => <Chip key={n} label={['Light', 'Medium', 'Heavy'][n]!} selected={state.design.nose === n} onPress={readOnly ? undefined : () => set({ nose: n })} small />)}
      </RNView>
      <RNView style={styles.row}>
        <AppText variant="caption" tone="muted" style={{ width: 70 }}>Wings</AppText>
        {(['narrow', 'standard', 'wide'] as const).map((w) => <Chip key={w} label={w} selected={state.design.wings === w} onPress={readOnly ? undefined : () => set({ wings: w })} small />)}
      </RNView>
      <RNView style={styles.row}>
        <AppText variant="caption" tone="muted" style={{ width: 70 }}>Flaps</AppText>
        {([-1, 0, 1] as const).map((f) => <Chip key={f} label={f === -1 ? 'Down' : f === 0 ? 'Flat' : 'Up'} selected={state.design.flaps === f} onPress={readOnly ? undefined : () => set({ flaps: f })} small />)}
      </RNView>
      <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>Tip: a medium nose, flat flaps and a smooth, level throw usually fly furthest. Try changing one thing at a time, like a real scientist.</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 10, borderWidth: 3, borderColor: '#F0E4EE' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 14 },
  sky: { backgroundColor: '#BFE9FF', borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#8CD3FF', alignSelf: 'center' },
  hint: { position: 'absolute', right: 12, top: 12, fontFamily: 'Fredoka_600SemiBold', color: '#1F2340', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
});

export default def;
