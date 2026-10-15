// Virtual Cooking (ages 3–8): follow a recipe card step by step. Each step
// names the ingredient or action to tap; wrong taps count as slips. Three
// recipes per round. Digital only: nothing here involves a real stove.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle } from '../engine';
import { Tactile } from '../../ui';
import { Prompt, Scoreboard } from '../shared/Board';

interface Step { emoji: string; label: string; say: string }
interface Recipe { name: string; emoji: string; steps: Step[]; distractors: Step[] }

const R = (emoji: string, label: string, say = `${label}!`): Step => ({ emoji, label, say });

const RECIPES: Recipe[] = [
  { name: 'Lemonade', emoji: '🍋', steps: [R('🍋', 'Squeeze lemons'), R('💧', 'Add water'), R('🍚', 'Add sugar'), R('🥄', 'Stir'), R('🧊', 'Add ice')], distractors: [R('🥚', 'Egg'), R('🧂', 'Salt'), R('🍅', 'Tomato')] },
  { name: 'Fruit salad', emoji: '🥗', steps: [R('🍌', 'Slice banana'), R('🍎', 'Chop apple'), R('🍇', 'Add grapes'), R('🍯', 'Drizzle honey'), R('🥄', 'Mix')], distractors: [R('🧅', 'Onion'), R('🌶️', 'Chilli'), R('🧀', 'Cheese')] },
  { name: 'Sandwich', emoji: '🥪', steps: [R('🍞', 'Bread slice'), R('🧈', 'Spread butter'), R('🥒', 'Add cucumber'), R('🍅', 'Add tomato'), R('🍞', 'Top slice'), R('🔪', 'Cut in half')], distractors: [R('🍫', 'Chocolate'), R('🧊', 'Ice'), R('🍋', 'Lemon')] },
  { name: 'Dosa', emoji: '🥞', steps: [R('🥣', 'Pour batter'), R('🔄', 'Spread it round'), R('🫒', 'Add a little oil'), R('⏳', 'Wait till golden'), R('🥄', 'Fold it over'), R('🥥', 'Serve with chutney')], distractors: [R('🍬', 'Candy'), R('🧊', 'Ice'), R('🍓', 'Strawberry')] },
  { name: 'Pizza', emoji: '🍕', steps: [R('🫓', 'Roll the dough'), R('🍅', 'Tomato sauce'), R('🧀', 'Sprinkle cheese'), R('🫑', 'Add capsicum'), R('🍄', 'Add mushrooms'), R('🔥', 'Bake'), R('🔪', 'Cut slices')], distractors: [R('🍦', 'Ice cream'), R('🍋', 'Lemon'), R('🥛', 'Milk')] },
  { name: 'Chai (with an adult)', emoji: '☕', steps: [R('💧', 'Water in the pot'), R('🍃', 'Add tea leaves'), R('🫚', 'Add ginger'), R('🔥', 'Boil'), R('🥛', 'Add milk'), R('🍚', 'Add sugar'), R('🫖', 'Pour through a strainer')], distractors: [R('🧂', 'Salt'), R('🍌', 'Banana'), R('🧊', 'Ice')] },
];

interface Round { recipe: number; choices: Step[] }
export interface State { rounds: Round[]; round: number; step: number; slips: number; shake: number }
export type Action = { type: 'tap'; label: string } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'virtual-cooking',
  init(ctx) {
    const random = rng(ctx.seed);
    const pool = RECIPES.map((r, i) => i).filter((i) => (ctx.difficulty === 'easy' ? RECIPES[i]!.steps.length <= 5 : RECIPES[i]!.steps.length >= 5));
    const picked = shuffle(pool, random).slice(0, 3);
    const rounds = picked.map((recipe) => {
      const r = RECIPES[recipe]!;
      const uniq = new Map<string, Step>();
      for (const s of [...r.steps, ...r.distractors]) uniq.set(s.label, s);
      return { recipe, choices: shuffle([...uniq.values()], random) };
    });
    return { rounds, round: 0, step: 0, slips: 0, shake: 0 };
  },
  reduce(state, action) {
    const round = state.rounds[state.round];
    if (!round) return state;
    const recipe = RECIPES[round.recipe]!;
    if (action.type === 'next') return state.step >= recipe.steps.length ? { ...state, round: state.round + 1, step: 0 } : state;
    if (state.step >= recipe.steps.length) return state;
    if (action.label === recipe.steps[state.step]!.label) return { ...state, step: state.step + 1 };
    return { ...state, slips: state.slips + 1, shake: state.shake + 1 };
  },
  status(state) {
    const done = state.round >= state.rounds.length;
    const total = state.rounds.reduce((n, r) => n + RECIPES[r.recipe]!.steps.length, 0);
    const doneSteps = state.rounds.slice(0, state.round).reduce((n, r) => n + RECIPES[r.recipe]!.steps.length, 0) + (done ? 0 : state.step);
    return { phase: done ? 'won' : 'playing', score: Math.max(0, total * 10 - state.slips * 5), stars: state.slips === 0 ? 3 : state.slips <= 3 ? 2 : 1, progress: doneSteps / total, hud: `Dish ${Math.min(state.round + 1, state.rounds.length)} / ${state.rounds.length}` };
  },
  View: CookingView,
  layout: 'full',
};

function CookingView({ state, dispatch, width, readOnly, say, sfx }: GameViewProps<State, Action>) {
  const round = state.rounds[Math.min(state.round, state.rounds.length - 1)]!;
  const recipe = RECIPES[round.recipe]!;
  const finished = state.step >= recipe.steps.length;
  const current = recipe.steps[state.step];
  const size = Math.min(110, (width - 60) / 3);
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji={recipe.emoji}>{finished ? `${recipe.name} is ready! Serve it up.` : `${recipe.name}: ${current!.label}`}</Prompt>
      <Scoreboard items={[{ label: 'Step', value: `${Math.min(state.step + 1, recipe.steps.length)} / ${recipe.steps.length}` }, { label: 'Slips', value: state.slips }]} />
      <RNView style={styles.card}>
        {recipe.steps.map((s, i) => (
          <RNView key={i} style={[styles.cardStep, i < state.step && styles.cardDone, i === state.step && !finished && styles.cardNow]}>
            <Text style={{ fontSize: 18 }}>{i < state.step ? '✅' : s.emoji}</Text>
            <Text style={[styles.cardText, i < state.step && { textDecorationLine: 'line-through', color: '#8A86A0' }]}>{i + 1}. {s.label}</Text>
          </RNView>
        ))}
      </RNView>
      <RNView style={styles.pot}>
        <Text style={{ fontSize: 56 }}>{finished ? recipe.emoji : state.step === 0 ? '🥣' : recipe.steps[state.step - 1]!.emoji}</Text>
        {finished && !readOnly && (
          <Tactile onPress={() => { sfx('win'); say('Yummy!'); dispatch({ type: 'next' }); }} accessibilityRole="button" accessibilityLabel="Serve the dish" style={styles.serve}>
            <Text style={styles.serveText}>🍽️ Serve!</Text>
          </Tactile>
        )}
      </RNView>
      {!finished && (
        <RNView style={styles.choices}>
          {round.choices.map((c) => (
            <Tactile key={c.label} disabled={readOnly} onPress={() => { const ok = c.label === current!.label; sfx(ok ? 'good' : 'bad'); if (ok) say(c.say); dispatch({ type: 'tap', label: c.label }); }} accessibilityRole="button" accessibilityLabel={c.label} style={{ width: size }}>
              <RNView style={[styles.choice, { height: size }]}>
                <Text style={{ fontSize: size * 0.42 }}>{c.emoji}</Text>
                <Text style={styles.choiceText} numberOfLines={2}>{c.label}</Text>
              </RNView>
            </Tactile>
          ))}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFF8E7', borderRadius: 18, padding: 10, borderWidth: 3, borderColor: '#FFD98A', gap: 2, marginBottom: 8 },
  cardStep: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 10 },
  cardDone: { opacity: 0.8 },
  cardNow: { backgroundColor: '#FFE9B5' },
  cardText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#2E2A4A' },
  pot: { alignItems: 'center', justifyContent: 'center', height: 110, flexDirection: 'row', gap: 16 },
  serve: { backgroundColor: '#FF7A59', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 12 },
  serveText: { color: '#fff', fontFamily: 'Fredoka_700Bold', fontSize: 20 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  choice: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 3, borderColor: '#E9E2F5', alignItems: 'center', justifyContent: 'center', padding: 4 },
  choiceText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 12, color: '#2E2A4A', textAlign: 'center' },
});

export default def;
