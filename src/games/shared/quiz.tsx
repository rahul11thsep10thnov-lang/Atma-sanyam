// A multiple-choice quiz as a GameDefinition. Question banks are static,
// checked content (see science-quiz / geography-quiz); the seed picks and
// shuffles 10 questions for the chosen difficulty, so a mirrored or restored
// round shows the same questions.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForAccuracy } from '../engine';
import { AppText, Tactile, BigButton } from '../../ui';
import { Prompt } from './Board';
import { palette } from '../../theme/palette';

export interface QuizQuestion {
  q: string;
  /** The first option is the correct one; options are shuffled per round. */
  options: [string, string, string, string] | [string, string, string] | [string, string];
  why: string;
  emoji?: string;
  level: 'easy' | 'normal' | 'hard';
}

interface Round { q: QuizQuestion; options: string[]; answer: number }
export interface QuizState { rounds: Round[]; index: number; correct: number; picked: number | null }
export type QuizAction = { type: 'pick'; option: number } | { type: 'next' };

export const QUIZ_LENGTH = 10;

export function makeQuizGame(id: string, bank: QuizQuestion[], theme: { emoji: string; color: string }): GameDefinition<QuizState, QuizAction> {
  return {
    id,
    init(ctx) {
      const random = rng(ctx.seed);
      const level = ctx.difficulty === 'easy' || ctx.difficulty === 'hard' ? ctx.difficulty : 'normal';
      // Mostly this level, topped up from the neighbouring ones if the bank is short.
      const order: QuizQuestion['level'][] = level === 'easy' ? ['easy', 'normal', 'hard'] : level === 'hard' ? ['hard', 'normal', 'easy'] : ['normal', 'easy', 'hard'];
      const chosen: QuizQuestion[] = [];
      for (const l of order) {
        for (const q of shuffle(bank.filter((b) => b.level === l), random)) if (chosen.length < QUIZ_LENGTH) chosen.push(q);
      }
      const rounds = chosen.map((q) => {
        const options = shuffle([...q.options], random);
        return { q, options, answer: options.indexOf(q.options[0]) };
      });
      return { rounds, index: 0, correct: 0, picked: null };
    },
    reduce(state, action) {
      if (action.type === 'next') return state.picked === null ? state : { ...state, index: state.index + 1, picked: null };
      if (state.picked !== null || state.index >= state.rounds.length) return state;
      const ok = action.option === state.rounds[state.index]!.answer;
      return { ...state, picked: action.option, correct: state.correct + (ok ? 1 : 0) };
    },
    status(state) {
      const done = state.index >= state.rounds.length;
      return { phase: done ? 'won' : 'playing', score: state.correct * 10, stars: starsForAccuracy(state.correct, state.rounds.length), progress: state.index / state.rounds.length, hud: `${state.correct} ✓ · ${Math.min(state.index + 1, state.rounds.length)} / ${state.rounds.length}` };
    },
    View: (props) => <QuizView {...props} theme={theme} />,
    layout: 'full',
  };
}

const LETTERS = ['A', 'B', 'C', 'D'];
const COLORS = [palette.sky, palette.bubblegum, palette.lime, palette.tangerine];

function QuizView({ state, dispatch, readOnly, say, sfx, theme }: GameViewProps<QuizState, QuizAction> & { theme: { emoji: string; color: string } }) {
  const round = state.rounds[Math.min(state.index, state.rounds.length - 1)]!;
  useEffect(() => {
    if (!readOnly && state.index < state.rounds.length) say(round.q.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);
  const answered = state.picked !== null;
  const right = answered && state.picked === round.answer;
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji={round.q.emoji ?? theme.emoji}>{round.q.q}</Prompt>
      <RNView style={{ gap: 10 }}>
        {round.options.map((o, i) => {
          const isAnswer = i === round.answer;
          const chosen = state.picked === i;
          const tint = answered ? (isAnswer ? '#22A06B' : chosen ? '#E5484D' : '#D7D2E6') : COLORS[i % COLORS.length]!;
          return (
            <Tactile key={i} disabled={readOnly || answered} onPress={() => { sfx(isAnswer ? 'good' : 'bad'); dispatch({ type: 'pick', option: i }); }} accessibilityRole="button" accessibilityLabel={o} style={styles.option}>
              <RNView style={[styles.optionInner, { borderColor: tint, backgroundColor: answered && !isAnswer && !chosen ? '#F6F3FB' : '#fff' }]}>
                <RNView style={[styles.letter, { backgroundColor: tint }]}><Text style={styles.letterText}>{LETTERS[i]}</Text></RNView>
                <AppText variant="body" style={{ flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 17 }}>{o}</AppText>
                {answered && isAnswer ? <Text style={{ fontSize: 22 }}>✅</Text> : answered && chosen ? <Text style={{ fontSize: 22 }}>❌</Text> : null}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {answered && (
        <RNView style={[styles.why, { borderColor: right ? '#22A06B' : '#E5484D' }]}>
          <AppText variant="heading" style={{ color: right ? '#1C7F55' : '#C0392B' }}>{right ? 'Correct! 🎉' : 'Not quite.'}</AppText>
          <AppText variant="body">{round.q.why}</AppText>
          {!readOnly && <BigButton label={state.index + 1 >= state.rounds.length ? 'Finish' : 'Next question'} emoji="➡️" color={theme.color} size="md" onPress={() => dispatch({ type: 'next' })} style={{ marginTop: 10, alignSelf: 'center' }} />}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  option: { alignSelf: 'stretch' },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 3, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12 },
  letter: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: '#fff', fontFamily: 'Fredoka_700Bold', fontSize: 18 },
  why: { marginTop: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 3, padding: 14, gap: 6 },
});
