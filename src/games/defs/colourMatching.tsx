// Colour Matching (ages 3–5): tap the thing that is the same colour.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForAccuracy } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

const COLOURS = [
  { name: 'red', hex: '#FF5F6D', items: ['🍎', '🍓', '🚒', '🌹'] },
  { name: 'yellow', hex: '#FFC93C', items: ['🍌', '🌻', '🐥', '🧀'] },
  { name: 'green', hex: '#7ED957', items: ['🐸', '🥦', '🍀', '🐢'] },
  { name: 'blue', hex: '#4FB3FF', items: ['🐳', '🫐', '🧊', '💙'] },
  { name: 'orange', hex: '#FF8A3D', items: ['🍊', '🥕', '🦊', '🎃'] },
  { name: 'purple', hex: '#9B6BFF', items: ['🍇', '🍆', '💜', '🔮'] },
  { name: 'pink', hex: '#FF6B9D', items: ['🌸', '🐷', '🎀', '🩷'] },
];
const ROUNDS = 10;
const CHOICES: Record<string, number> = { easy: 3, normal: 4, hard: 6 };

interface Round { target: number; options: { colour: number; item: string }[] }
export interface State { rounds: Round[]; index: number; correct: number; wrong: number; feedback: 'good' | 'bad' | null }
export type Action = { type: 'pick'; option: number } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'colour-matching',
  init(ctx) {
    const random = rng(ctx.seed);
    const n = CHOICES[ctx.difficulty] ?? 4;
    const rounds: Round[] = Array.from({ length: ROUNDS }, () => {
      const target = Math.floor(random() * COLOURS.length);
      const others = shuffle([...COLOURS.keys()].filter((c) => c !== target), random).slice(0, n - 1);
      const options = shuffle([target, ...others].map((colour) => ({ colour, item: COLOURS[colour]!.items[Math.floor(random() * 4)]! })), random);
      return { target, options };
    });
    return { rounds, index: 0, correct: 0, wrong: 0, feedback: null };
  },
  reduce(state, action) {
    if (action.type === 'next') return { ...state, index: state.index + 1, feedback: null };
    if (state.feedback) return state;
    const round = state.rounds[state.index]!;
    const ok = round.options[action.option]!.colour === round.target;
    return { ...state, correct: state.correct + (ok ? 1 : 0), wrong: state.wrong + (ok ? 0 : 1), feedback: ok ? 'good' : 'bad' };
  },
  status(state) {
    const done = state.index >= state.rounds.length;
    return { phase: done ? 'won' : 'playing', score: state.correct * 10, stars: starsForAccuracy(state.correct, state.rounds.length), progress: state.index / state.rounds.length, hud: `Round ${Math.min(state.index + 1, ROUNDS)} / ${ROUNDS}` };
  },
  View: ColourView,
};

function ColourView({ state, dispatch, width, readOnly, say, sfx }: GameViewProps<State, Action>) {
  const round = state.rounds[Math.min(state.index, state.rounds.length - 1)]!;
  const colour = COLOURS[round.target]!;
  useEffect(() => {
    if (!readOnly && state.index < state.rounds.length) say(`Find something ${colour.name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);
  useEffect(() => {
    if (!state.feedback || readOnly) return;
    const id = setTimeout(() => dispatch({ type: 'next' }), state.feedback === 'good' ? 700 : 1000);
    return () => clearTimeout(id);
  }, [state.feedback, dispatch, readOnly]);
  const cols = round.options.length <= 4 ? 2 : 3;
  const size = (width - 24 - (cols - 1) * 12) / cols;
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji="🎨">Find something {colour.name}!</Prompt>
      <RNView style={[styles.splash, { backgroundColor: colour.hex }]}>
        <Text style={styles.splashText}>{colour.name.toUpperCase()}</Text>
      </RNView>
      <RNView style={styles.options}>
        {round.options.map((o, i) => (
          <Tactile key={i} disabled={readOnly || !!state.feedback} onPress={() => { sfx(o.colour === round.target ? 'good' : 'bad'); dispatch({ type: 'pick', option: i }); }} accessibilityRole="button" accessibilityLabel={`${COLOURS[o.colour]!.name} ${o.item}`} style={{ width: size, height: size * 0.8 }}>
            <RNView style={[styles.option, state.feedback && o.colour === round.target && { borderColor: '#22A06B', borderWidth: 5 }]}>
              <Text style={{ fontSize: size * 0.4 }}>{o.item}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
      {state.feedback && <Text style={styles.feedback}>{state.feedback === 'good' ? '🎉 Yes!' : '🙈 Try the next one'}</Text>}
    </RNView>
  );
}

const styles = StyleSheet.create({
  splash: { height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginHorizontal: 40, marginBottom: 16, borderWidth: 5, borderColor: '#fff' },
  splashText: { fontFamily: 'Fredoka_700Bold', fontSize: 30, color: '#fff', letterSpacing: 2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingHorizontal: 12 },
  option: { flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 3, borderColor: '#F0E4EE', alignItems: 'center', justifyContent: 'center' },
  feedback: { textAlign: 'center', fontFamily: 'Fredoka_700Bold', fontSize: 26, marginTop: 16, color: '#2E2A4A' },
});

export default def;
