// Origami Studio: a step-by-step folding guide with animated diagrams for a
// real sheet of paper. The "game" is finishing a model: each step is ticked
// when the child says their fold matches. No scoring pressure; stars come
// from completing the model (and 3 for using no replay of the animation).
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { AppText, BigButton, Chip, Tactile } from '../../ui';
import { FoldDiagram } from '../../crafts/FoldDiagram';
import { ORIGAMI_MODELS, type OrigamiModel } from '../../crafts/models';
import { Prompt } from '../shared/Board';

export interface State { model: string | null; step: number; done: boolean; replays: number }
export type Action = { type: 'choose'; model: string } | { type: 'next' } | { type: 'back' } | { type: 'replay' } | { type: 'finish' };

export function makeOrigamiGame(id: string, models: OrigamiModel[], emoji: string): GameDefinition<State, Action> {
  const byId = (m: string | null) => models.find((x) => x.id === m);
  return {
    id,
    init(ctx) {
      // Offer the models for this age; auto-select when there is only one.
      const fit = models.filter((m) => m.brackets.includes(ctx.bracket));
      const pool = fit.length ? fit : models;
      return { model: pool.length === 1 ? pool[0]!.id : null, step: 0, done: false, replays: 0 };
    },
    reduce(state, action) {
      const m = byId(state.model);
      switch (action.type) {
        case 'choose': return { ...state, model: action.model, step: 0, done: false };
        case 'next': return m ? { ...state, step: Math.min(m.steps.length, state.step + 1) } : state;
        case 'back': return { ...state, step: Math.max(0, state.step - 1) };
        case 'replay': return { ...state, replays: state.replays + 1 };
        case 'finish': return m && state.step >= m.steps.length ? { ...state, done: true } : state;
      }
    },
    status(state) {
      const m = byId(state.model);
      return { phase: state.done ? 'won' : 'playing', score: state.done ? 100 : 0, stars: state.done ? (state.replays <= 2 ? 3 : state.replays <= 5 ? 2 : 1) : 0, progress: m ? state.step / (m.steps.length + 1) : 0, hud: m ? `${m.emoji} ${Math.min(state.step + 1, m.steps.length)} / ${m.steps.length}` : 'Pick a model' };
    },
    View: (props) => <OrigamiView {...props} models={models} emoji={emoji} />,
    layout: 'full',
  };
}

function OrigamiView({ state, dispatch, ctx, width, readOnly, say, sfx, models, emoji }: GameViewProps<State, Action> & { models: OrigamiModel[]; emoji: string }) {
  const model = models.find((m) => m.id === state.model);
  const [checked, setChecked] = useState(false);
  if (!model) {
    const fit = models.filter((m) => m.brackets.includes(ctx.bracket));
    const pool = fit.length ? fit : models;
    return (
      <RNView style={{ flex: 1 }}>
        <Prompt emoji={emoji}>Pick a model to fold. You need real paper!</Prompt>
        <RNView style={{ gap: 10 }}>
          {pool.map((m) => (
            <Tactile key={m.id} disabled={readOnly} accessibilityRole="button" accessibilityLabel={`${m.name}, ${m.difficulty}, ${m.minutes} minutes`} onPress={() => { sfx('pop'); say(m.name); dispatch({ type: 'choose', model: m.id }); }}>
              <RNView style={[styles.modelCard, { borderColor: m.color }]}>
                <Text style={{ fontSize: 44 }}>{m.emoji}</Text>
                <RNView style={{ flex: 1 }}>
                  <Text style={styles.modelName}>{m.name}</Text>
                  <AppText variant="caption" tone="muted">{m.steps.length} folds · {m.minutes} min · {m.difficulty}</AppText>
                  <AppText variant="caption" tone="muted">Paper: {m.paper}</AppText>
                </RNView>
              </RNView>
            </Tactile>
          ))}
        </RNView>
      </RNView>
    );
  }
  const finished = state.step >= model.steps.length;
  const step = model.steps[Math.min(state.step, model.steps.length - 1)]!;
  const size = Math.min(300, width - 32);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24, alignItems: 'center' }}>
      <RNView style={{ alignSelf: 'stretch' }}>
        <Prompt emoji={model.emoji}>{finished ? `${model.name} finished! ${model.finish}` : `Step ${state.step + 1}: ${step.title}`}</Prompt>
      </RNView>
      <RNView style={styles.stepsRow}>
        {model.steps.map((_, i) => <RNView key={i} style={[styles.dot, i < state.step && styles.dotDone, i === state.step && !finished && styles.dotNow]} />)}
      </RNView>
      {finished ? (
        <RNView style={styles.finalCard}>
          <Text style={{ fontSize: 96 }}>{model.emoji}</Text>
          <AppText variant="body" align="center">{model.finish}</AppText>
          <RNView style={styles.checkRow}>
            <Chip label="My paper looks like this ✔" selected={checked} onPress={readOnly ? undefined : () => setChecked((c) => !c)} color={model.color} />
          </RNView>
          {!readOnly && <BigButton label="Finish" emoji="🎉" color="#7ED957" disabled={!checked} onPress={() => { sfx('win'); say('Beautiful folding!'); dispatch({ type: 'finish' }); }} style={{ marginTop: 10 }} />}
        </RNView>
      ) : (
        <>
          <RNView style={styles.diagramCard}>
            <FoldDiagram diagram={step.diagram} size={size} stepIndex={state.step} animate={!readOnly} />
          </RNView>
          <AppText variant="body" align="center" style={{ marginTop: 10, paddingHorizontal: 8, fontFamily: 'Nunito_700Bold' }}>{step.text}</AppText>
          {step.tip && <AppText variant="caption" tone="muted" align="center" style={{ marginTop: 6, paddingHorizontal: 12 }}>💡 {step.tip}</AppText>}
          {!readOnly && (
            <RNView style={styles.nav}>
              <BigButton label="Back" icon="arrowLeft" size="md" color="#C9C4DD" disabled={state.step === 0} onPress={() => dispatch({ type: 'back' })} />
              <BigButton label="Read aloud" emoji="🔊" size="md" color="#4FB3FF" onPress={() => { dispatch({ type: 'replay' }); say(step.text); }} />
              <BigButton label="My fold matches" emoji="✅" size="md" color="#7ED957" onPress={() => { sfx('good'); dispatch({ type: 'next' }); }} />
            </RNView>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modelCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 14, borderWidth: 4 },
  modelName: { fontFamily: 'Fredoka_700Bold', fontSize: 20, color: '#2E2A4A' },
  stepsRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E2DCF0' },
  dotDone: { backgroundColor: '#7ED957' },
  dotNow: { backgroundColor: '#FFD23F', transform: [{ scale: 1.25 }] },
  diagramCard: { backgroundColor: '#fff', borderRadius: 24, padding: 10, borderWidth: 3, borderColor: '#F0E4EE' },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 },
  finalCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 10, borderWidth: 3, borderColor: '#FFD98A', alignSelf: 'stretch' },
  checkRow: { flexDirection: 'row', justifyContent: 'center' },
});

export default makeOrigamiGame('origami-studio', ORIGAMI_MODELS, '🦢');
