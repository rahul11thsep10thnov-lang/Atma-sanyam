// Animal Sound Quiz (ages 3–5): hear the sound (spoken), tap the animal.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForAccuracy } from '../engine';
import { Tactile, RoundButton } from '../../ui';
import { Prompt } from '../shared/Board';
import { palette } from '../../theme/palette';

const ANIMALS = [
  { name: 'cow', emoji: '🐄', sound: 'Moo! Moo!' },
  { name: 'dog', emoji: '🐶', sound: 'Woof woof!' },
  { name: 'cat', emoji: '🐱', sound: 'Meow!' },
  { name: 'duck', emoji: '🦆', sound: 'Quack quack!' },
  { name: 'lion', emoji: '🦁', sound: 'Roar!' },
  { name: 'sheep', emoji: '🐑', sound: 'Baa baa!' },
  { name: 'frog', emoji: '🐸', sound: 'Ribbit ribbit!' },
  { name: 'elephant', emoji: '🐘', sound: 'Trumpet! Toot toot!' },
  { name: 'rooster', emoji: '🐓', sound: 'Cock-a-doodle-doo!' },
  { name: 'pig', emoji: '🐷', sound: 'Oink oink!' },
  { name: 'horse', emoji: '🐴', sound: 'Neigh!' },
  { name: 'owl', emoji: '🦉', sound: 'Hoot hoot!' },
];
const ROUNDS = 8;
const CHOICES: Record<string, number> = { easy: 2, normal: 4 };

interface Round { answer: number; options: number[] }
export interface State { rounds: Round[]; index: number; correct: number; feedback: 'good' | 'bad' | null; plays: number }
export type Action = { type: 'pick'; animal: number } | { type: 'next' } | { type: 'replay' };

const def: GameDefinition<State, Action> = {
  id: 'animal-sounds',
  init(ctx) {
    const random = rng(ctx.seed);
    const n = CHOICES[ctx.difficulty] ?? 4;
    const rounds = shuffle([...ANIMALS.keys()], random).slice(0, ROUNDS).map((answer) => ({ answer, options: shuffle([answer, ...shuffle([...ANIMALS.keys()].filter((a) => a !== answer), random).slice(0, n - 1)], random) }));
    return { rounds, index: 0, correct: 0, feedback: null, plays: 0 };
  },
  reduce(state, action) {
    if (action.type === 'replay') return { ...state, plays: state.plays + 1 };
    if (action.type === 'next') return { ...state, index: state.index + 1, feedback: null };
    if (state.feedback) return state;
    const ok = action.animal === state.rounds[state.index]!.answer;
    return { ...state, correct: state.correct + (ok ? 1 : 0), feedback: ok ? 'good' : 'bad' };
  },
  status(state) {
    const done = state.index >= state.rounds.length;
    return { phase: done ? 'won' : 'playing', score: state.correct * 10, stars: starsForAccuracy(state.correct, state.rounds.length), progress: state.index / state.rounds.length, hud: `${Math.min(state.index + 1, ROUNDS)} / ${ROUNDS}` };
  },
  View: AnimalView,
};

function AnimalView({ state, dispatch, width, readOnly, say, sfx }: GameViewProps<State, Action>) {
  const round = state.rounds[Math.min(state.index, state.rounds.length - 1)]!;
  const answer = ANIMALS[round.answer]!;
  useEffect(() => {
    if (!readOnly && state.index < state.rounds.length) say(answer.sound);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, state.plays]);
  useEffect(() => {
    if (!state.feedback || readOnly) return;
    const id = setTimeout(() => dispatch({ type: 'next' }), 900);
    return () => clearTimeout(id);
  }, [state.feedback, dispatch, readOnly]);
  const size = (width - 36) / 2;
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji="🔊">Who makes this sound?</Prompt>
      <RNView style={{ alignItems: 'center', marginBottom: 12 }}>
        <RoundButton emoji="🔊" label="Play the sound again" size={72} color={palette.sky} onPress={() => dispatch({ type: 'replay' })} disabled={readOnly} />
        <Text style={styles.sound}>{state.feedback ? answer.sound : '…'}</Text>
      </RNView>
      <RNView style={styles.options}>
        {round.options.map((a) => (
          <Tactile key={a} disabled={readOnly || !!state.feedback} onPress={() => { sfx(a === round.answer ? 'good' : 'bad'); say(ANIMALS[a]!.name); dispatch({ type: 'pick', animal: a }); }} accessibilityRole="button" accessibilityLabel={ANIMALS[a]!.name} style={{ width: size, height: size * 0.85 }}>
            <RNView style={[styles.option, state.feedback && a === round.answer && { borderColor: '#22A06B', borderWidth: 5 }]}>
              <Text style={{ fontSize: size * 0.42 }}>{ANIMALS[a]!.emoji}</Text>
              <Text style={styles.name}>{ANIMALS[a]!.name}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  sound: { fontFamily: 'Fredoka_600SemiBold', fontSize: 22, marginTop: 8, color: '#2E2A4A' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingHorizontal: 12 },
  option: { flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 3, borderColor: '#F0E4EE', alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Fredoka_600SemiBold', fontSize: 18, color: '#2E2A4A', textTransform: 'capitalize' },
});

export default def;
