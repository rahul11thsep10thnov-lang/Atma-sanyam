// Anagram Builder: tap letters in order to spell the word; a picture clue helps.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForAccuracy } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';
import { rainbow } from '../../theme/palette';

const WORDS: [string, string][] = [
  ['CAT', '🐱'], ['DOG', '🐶'], ['SUN', '☀️'], ['BUS', '🚌'], ['FISH', '🐟'], ['FROG', '🐸'], ['BOAT', '⛵'], ['CAKE', '🎂'], ['STAR', '⭐'], ['BIRD', '🐦'],
  ['APPLE', '🍎'], ['HOUSE', '🏠'], ['TRAIN', '🚆'], ['TIGER', '🐯'], ['CLOUD', '☁️'], ['HEART', '❤️'], ['PIZZA', '🍕'], ['ROBOT', '🤖'], ['MANGO', '🥭'], ['CAMEL', '🐪'],
  ['ROCKET', '🚀'], ['FLOWER', '🌸'], ['MONKEY', '🐒'], ['CASTLE', '🏰'], ['BANANA', '🍌'], ['GUITAR', '🎸'], ['DRAGON', '🐉'], ['TURTLE', '🐢'], ['ELEPHANT', '🐘'], ['UMBRELLA', '☂️'], ['BUTTERFLY', '🦋'], ['PINEAPPLE', '🍍'],
];
const RANGE: Record<string, [number, number]> = { easy: [3, 4], normal: [5, 6], hard: [7, 9] };
const ROUNDS = 6;

interface Round { word: string; emoji: string; letters: string[] }
export interface State { rounds: Round[]; index: number; typed: number[]; wrong: number; hints: number }
export type Action = { type: 'tap'; letter: number } | { type: 'undo' } | { type: 'hint' } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'anagram-builder',
  init(ctx) {
    const random = rng(ctx.seed);
    const [lo, hi] = RANGE[ctx.difficulty] ?? [5, 6];
    const rounds = shuffle(WORDS.filter(([w]) => w.length >= lo && w.length <= hi), random).slice(0, ROUNDS).map(([word, emoji]) => {
      let letters = shuffle(word.split(''), random);
      if (letters.join('') === word) letters = [...letters.slice(1), letters[0]!];
      return { word, emoji, letters };
    });
    return { rounds, index: 0, typed: [], wrong: 0, hints: 0 };
  },
  reduce(state, action) {
    const round = state.rounds[state.index];
    if (!round) return state;
    switch (action.type) {
      case 'tap': {
        if (state.typed.includes(action.letter)) return state;
        const typed = [...state.typed, action.letter];
        const word = typed.map((i) => round.letters[i]).join('');
        if (word === round.word) return { ...state, typed };
        if (word.length === round.word.length) return { ...state, typed: [], wrong: state.wrong + 1 };
        return { ...state, typed };
      }
      case 'undo':
        return { ...state, typed: state.typed.slice(0, -1) };
      case 'hint': {
        const next = round.word[state.typed.length]!;
        const idx = round.letters.findIndex((l, i) => l === next && !state.typed.includes(i));
        return idx === -1 ? state : { ...state, typed: [...state.typed, idx], hints: state.hints + 1 };
      }
      case 'next':
        return { ...state, index: state.index + 1, typed: [] };
    }
  },
  status(state) {
    const done = state.index >= state.rounds.length;
    return { phase: done ? 'won' : 'playing', score: Math.max(0, state.rounds.length * 10 - state.wrong * 3 - state.hints * 2), stars: starsForAccuracy(state.rounds.length - state.wrong - Math.floor(state.hints / 2), state.rounds.length), progress: state.index / state.rounds.length, hud: `Word ${Math.min(state.index + 1, ROUNDS)} / ${ROUNDS}` };
  },
  View: AnagramView,
};

function AnagramView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const round = state.rounds[Math.min(state.index, state.rounds.length - 1)]!;
  const typedWord = state.typed.map((i) => round.letters[i]).join('');
  const solved = typedWord === round.word;
  const tile = Math.min(56, (width - 24) / round.letters.length - 8);
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji={round.emoji}>Spell the word!</Prompt>
      <Text style={{ fontSize: 96 }}>{round.emoji}</Text>
      <RNView style={styles.slots}>
        {round.word.split('').map((_, i) => (
          <RNView key={i} style={[styles.slot, { width: tile, height: tile + 6, backgroundColor: solved ? '#E6F8DA' : '#fff' }]}>
            <Text style={[styles.letter, { fontSize: tile * 0.55 }]}>{typedWord[i] ?? ''}</Text>
          </RNView>
        ))}
      </RNView>
      <RNView style={styles.tiles}>
        {round.letters.map((l, i) => {
          const used = state.typed.includes(i);
          return (
            <Tactile key={i} disabled={readOnly || used || solved} onPress={() => { sfx('tap'); say(l); dispatch({ type: 'tap', letter: i }); }} accessibilityRole="button" accessibilityLabel={l} style={{ width: tile, height: tile }}>
              <RNView style={[styles.tile, { backgroundColor: used ? '#EEE' : rainbow[i % rainbow.length], opacity: used ? 0.4 : 1 }]}>
                <Text style={[styles.letter, { fontSize: tile * 0.55, color: used ? '#999' : '#fff' }]}>{l}</Text>
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {!readOnly && (
        <RNView style={styles.actions}>
          {solved ? (
            <Tactile onPress={() => { sfx('good'); say(round.word); dispatch({ type: 'next' }); }} accessibilityRole="button" accessibilityLabel="Next word"><Text style={[styles.action, { backgroundColor: '#7ED957' }]}>✅ {round.word}! Next</Text></Tactile>
          ) : (
            <>
              <Tactile onPress={() => dispatch({ type: 'undo' })} accessibilityRole="button" accessibilityLabel="Undo"><Text style={styles.action}>↩️ Undo</Text></Tactile>
              <Tactile onPress={() => dispatch({ type: 'hint' })} accessibilityRole="button" accessibilityLabel="Hint"><Text style={styles.action}>💡 Hint</Text></Tactile>
            </>
          )}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', gap: 6, marginVertical: 12 },
  slot: { borderRadius: 12, borderWidth: 3, borderColor: '#2E2A4A', alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tile: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: 'Fredoka_700Bold', color: '#2E2A4A' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  action: { fontFamily: 'Fredoka_600SemiBold', fontSize: 18, backgroundColor: '#FFC93C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, color: '#2E2A4A', overflow: 'hidden' },
});

export default def;
