// Detective Mystery (ages 9–12): read the clues, cross suspects off, accuse.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { AppText, BigButton, Tactile } from '../../ui';
import { Prompt } from '../shared/Board';
import { TRAITS, makeCase, type Case } from '../logic/detective';

const SUSPECTS: Record<string, number> = { easy: 3, normal: 4, hard: 5 };
const CASES = 2;

export interface State { cases: Case[]; index: number; crossed: number[][]; revealed: number[]; wrong: number; solved: boolean }
export type Action = { type: 'cross'; suspect: number } | { type: 'reveal' } | { type: 'accuse'; suspect: number } | { type: 'next' };

const def: GameDefinition<State, Action> = {
  id: 'detective-mystery',
  init(ctx) {
    const random = rng(ctx.seed);
    const cases = Array.from({ length: CASES }, () => makeCase(random, SUSPECTS[ctx.difficulty] ?? 4));
    return { cases, index: 0, crossed: cases.map(() => []), revealed: cases.map(() => 1), wrong: 0, solved: false };
  },
  reduce(state, action) {
    const c = state.cases[state.index];
    if (!c) return state;
    switch (action.type) {
      case 'cross': {
        if (state.solved) return state;
        const cur = state.crossed[state.index]!;
        const next = cur.includes(action.suspect) ? cur.filter((s) => s !== action.suspect) : [...cur, action.suspect];
        return { ...state, crossed: state.crossed.map((x, i) => (i === state.index ? next : x)) };
      }
      case 'reveal': return { ...state, revealed: state.revealed.map((n, i) => (i === state.index ? Math.min(c.clues.length, n + 1) : n)) };
      case 'accuse': {
        if (state.solved) return state;
        if (action.suspect === c.culprit) return { ...state, solved: true };
        return { ...state, wrong: state.wrong + 1, crossed: state.crossed.map((x, i) => (i === state.index && !x.includes(action.suspect) ? [...x, action.suspect] : x)) };
      }
      case 'next': return state.solved ? { ...state, index: state.index + 1, solved: false } : state;
    }
  },
  status(state) {
    const done = state.index >= state.cases.length;
    return { phase: done ? 'won' : 'playing', score: Math.max(0, 100 * state.cases.length - state.wrong * 25), stars: state.wrong === 0 ? 3 : state.wrong <= 2 ? 2 : 1, progress: state.index / state.cases.length, hud: `Case ${Math.min(state.index + 1, state.cases.length)} / ${state.cases.length}` };
  },
  View: DetectiveView,
  layout: 'full',
};

function DetectiveView({ state, dispatch, readOnly, say, sfx }: GameViewProps<State, Action>) {
  const c = state.cases[Math.min(state.index, state.cases.length - 1)]!;
  const crossed = state.crossed[state.index] ?? [];
  const shown = state.revealed[state.index] ?? 1;
  const [open, setOpen] = useState<number | null>(null);
  const allClues = shown >= c.clues.length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <Prompt emoji="🕵️">{`${c.title}: ${c.crime}`}</Prompt>
      <AppText variant="heading" style={styles.h}>📋 Clue board</AppText>
      <RNView style={styles.clues}>
        {c.clues.slice(0, shown).map((cl, i) => (
          <RNView key={i} style={styles.clue}><Text style={{ fontSize: 18 }}>🔎</Text><AppText variant="body" style={{ flex: 1, fontFamily: 'Nunito_700Bold' }}>{cl.text}</AppText></RNView>
        ))}
        {!allClues && !readOnly && !state.solved && (
          <Tactile onPress={() => { sfx('pop'); dispatch({ type: 'reveal' }); say(c.clues[shown]!.text); }} accessibilityRole="button" accessibilityLabel="Find the next clue" style={styles.more}>
            <Text style={styles.moreText}>🔦 Search for another clue ({c.clues.length - shown} left)</Text>
          </Tactile>
        )}
      </RNView>
      <AppText variant="heading" style={styles.h}>👥 Suspects (tap to question, long-press to cross off)</AppText>
      <RNView style={{ gap: 8 }}>
        {c.suspects.map((s, i) => {
          const out = crossed.includes(i);
          return (
            <RNView key={i} style={[styles.suspect, out && styles.out, state.solved && i === c.culprit && styles.guilty]}>
              <Tactile disabled={readOnly} accessibilityRole="button" accessibilityLabel={`${s.name}${out ? ', crossed off' : ''}`} onPress={() => setOpen(open === i ? null : i)} onLongPress={() => { sfx('tap'); dispatch({ type: 'cross', suspect: i }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 34, opacity: out ? 0.4 : 1 }}>{s.emoji}</Text>
                <RNView style={{ flex: 1 }}>
                  <Text style={[styles.name, out && { textDecorationLine: 'line-through', color: '#8A86A0' }]}>{s.name}{state.solved && i === c.culprit ? '  — it was them!' : ''}</Text>
                  <AppText variant="caption" tone="muted">{open === i ? 'Tap to close' : 'Tap to question'}</AppText>
                </RNView>
                {!readOnly && !state.solved && (
                  <Tactile accessibilityRole="button" accessibilityLabel={out ? `Un-cross ${s.name}` : `Cross off ${s.name}`} onPress={() => { sfx('tap'); dispatch({ type: 'cross', suspect: i }); }} style={styles.cross}><Text style={{ fontSize: 18 }}>{out ? '↩️' : '❌'}</Text></Tactile>
                )}
              </Tactile>
              {open === i && (
                <RNView style={styles.answers}>
                  {Object.entries(s.traits).map(([k, v]) => (
                    <Text key={k} style={styles.answer}>• {TRAITS[k]!.label}: <Text style={{ fontFamily: 'Nunito_800ExtraBold' }}>{v}</Text></Text>
                  ))}
                  {!readOnly && !state.solved && (
                    <BigButton label={`Accuse ${s.name}`} emoji="⚖️" size="md" color="#E5484D" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => { const ok = i === c.culprit; sfx(ok ? 'win' : 'bad'); say(ok ? `${s.name} did it! Case closed.` : `${s.name} is innocent. Keep looking.`); dispatch({ type: 'accuse', suspect: i }); setOpen(null); }} />
                  )}
                </RNView>
              )}
            </RNView>
          );
        })}
      </RNView>
      {state.wrong > 0 && !state.solved && <AppText variant="caption" tone="danger" style={{ marginTop: 8 }}>Wrong accusations: {state.wrong}. Check every clue against the suspect.</AppText>}
      {state.solved && !readOnly && (
        <RNView style={{ alignItems: 'center', marginTop: 14 }}>
          <AppText variant="heading" style={{ marginBottom: 8 }}>Case closed! 🎉</AppText>
          <BigButton label={state.index + 1 >= state.cases.length ? 'Finish' : 'Next case'} emoji="📁" color="#9B6BFF" onPress={() => { setOpen(null); dispatch({ type: 'next' }); }} />
        </RNView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h: { marginTop: 10, marginBottom: 6 },
  clues: { backgroundColor: '#FFF8E7', borderRadius: 16, padding: 10, gap: 6, borderWidth: 3, borderColor: '#FFD98A' },
  clue: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  more: { backgroundColor: '#FFD23F', borderRadius: 12, padding: 10, alignItems: 'center' },
  moreText: { fontFamily: 'Fredoka_600SemiBold', color: '#2E2A4A' },
  suspect: { backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 3, borderColor: '#E9E2F5' },
  out: { backgroundColor: '#F3F1F8' },
  guilty: { borderColor: '#E5484D', backgroundColor: '#FFF0F0' },
  name: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: '#2E2A4A' },
  cross: { padding: 6 },
  answers: { marginTop: 8, backgroundColor: '#F6F3FB', borderRadius: 12, padding: 10, gap: 2 },
  answer: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#2E2A4A' },
});

export default def;
