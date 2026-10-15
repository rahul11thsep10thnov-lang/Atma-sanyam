// Virtual Garden (ages 3–8): plant, water, weed. Time passes with the engine
// tick; a watered plant grows a stage every few ticks, dry soil stops growth,
// weeds appear now and then and must be pulled. Every bed in bloom wins.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { Tactile } from '../../ui';
import { Prompt, Scoreboard } from '../shared/Board';

const BEDS: Record<string, number> = { easy: 3, normal: 6 };
const STAGES = ['🌱', '🌿', '🌷', '🌻'];
const FLOWERS = ['🌻', '🌷', '🌹', '🌼', '🌺', '💐'];
const GROW_TICKS = 4;
const WATER_TICKS = 7;

interface Bed { stage: number; water: number; weed: boolean; flower: number; grow: number }
export interface State { beds: Bed[]; ticks: number; actions: number; seed: number; tool: 'seed' | 'water' | 'weed' }
export type Action = { type: 'tick' } | { type: 'tap'; bed: number } | { type: 'tool'; tool: State['tool'] };

const def: GameDefinition<State, Action> = {
  id: 'virtual-garden',
  init(ctx) {
    const n = BEDS[ctx.difficulty] ?? 3;
    return { beds: Array.from({ length: n }, (_, i) => ({ stage: -1, water: 0, weed: false, flower: i % FLOWERS.length, grow: 0 })), ticks: 0, actions: 0, seed: ctx.seed, tool: 'seed' };
  },
  reduce(state, action) {
    if (action.type === 'tool') return { ...state, tool: action.tool };
    if (action.type === 'tick') {
      const random = rng(state.seed + state.ticks);
      const beds = state.beds.map((b) => {
        if (b.stage < 0) return b;
        const weed = b.weed || (b.stage < STAGES.length - 1 && random() < 0.06);
        const water = Math.max(0, b.water - 1);
        const growing = water > 0 && !weed && b.stage < STAGES.length - 1;
        const grow = growing ? b.grow + 1 : b.grow;
        return grow >= GROW_TICKS ? { ...b, weed, water, grow: 0, stage: b.stage + 1 } : { ...b, weed, water, grow };
      });
      return { ...state, beds, ticks: state.ticks + 1 };
    }
    const bed = state.beds[action.bed];
    if (!bed) return state;
    let next = bed;
    if (state.tool === 'seed' && bed.stage < 0) next = { ...bed, stage: 0, water: WATER_TICKS };
    else if (state.tool === 'water' && bed.stage >= 0) next = { ...bed, water: WATER_TICKS };
    else if (state.tool === 'weed' && bed.weed) next = { ...bed, weed: false };
    else return state;
    return { ...state, beds: state.beds.map((b, i) => (i === action.bed ? next : b)), actions: state.actions + 1 };
  },
  status(state) {
    const bloomed = state.beds.filter((b) => b.stage === STAGES.length - 1).length;
    const done = bloomed === state.beds.length;
    const par = state.beds.length * 5;
    return { phase: done ? 'won' : 'playing', score: bloomed * 25, stars: done ? (state.actions <= par ? 3 : state.actions <= par * 1.6 ? 2 : 1) : 0, progress: bloomed / state.beds.length, hud: `${bloomed} / ${state.beds.length} in bloom` };
  },
  tick: { intervalMs: 1000, action: { type: 'tick' } },
  View: GardenView,
};

const TOOLS: { tool: State['tool']; emoji: string; label: string; color: string }[] = [
  { tool: 'seed', emoji: '🌰', label: 'Plant a seed', color: '#C58B4A' },
  { tool: 'water', emoji: '💧', label: 'Water', color: '#4FB3FF' },
  { tool: 'weed', emoji: '🧤', label: 'Pull weeds', color: '#7ED957' },
];

function GardenView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const cols = state.beds.length <= 3 ? 3 : 3;
  const size = Math.min(130, (width - 48) / cols);
  const hint = state.tool === 'seed' ? 'Tap an empty bed to plant.' : state.tool === 'water' ? 'Tap a plant when the soil is dry.' : 'Tap a bed with a weed to pull it out.';
  return (
    <RNView style={{ flex: 1 }}>
      <Prompt emoji="🌻">{hint}</Prompt>
      <Scoreboard items={[{ label: 'Day', value: Math.floor(state.ticks / 10) + 1 }, { label: 'Actions', value: state.actions }]} />
      <RNView style={styles.garden}>
        {state.beds.map((b, i) => {
          const dry = b.stage >= 0 && b.water === 0;
          return (
            <Tactile key={i} disabled={readOnly} onPress={() => { sfx('tap'); if (state.tool === 'water' && b.stage >= 0) say('Glug glug'); dispatch({ type: 'tap', bed: i }); }} accessibilityRole="button" accessibilityLabel={`Bed ${i + 1}: ${b.stage < 0 ? 'empty' : dry ? 'dry' : 'watered'}${b.weed ? ', has a weed' : ''}`}>
              <RNView style={[styles.bed, { width: size, height: size, backgroundColor: dry ? '#C9A77A' : '#7A4F2B', borderColor: dry ? '#E5C79B' : '#5A3A1E' }]}>
                <Text style={{ fontSize: size * 0.5 }}>{b.stage < 0 ? '' : b.stage === STAGES.length - 1 ? FLOWERS[b.flower] : STAGES[b.stage]}</Text>
                {b.weed && <Text style={[styles.weed, { fontSize: size * 0.3 }]}>🌾</Text>}
                {b.stage >= 0 && b.stage < STAGES.length - 1 && <RNView style={styles.waterBar}><RNView style={{ width: `${(b.water / WATER_TICKS) * 100}%`, height: 6, backgroundColor: '#4FB3FF', borderRadius: 3 }} /></RNView>}
                {dry && <Text style={styles.dry}>💧?</Text>}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      <RNView style={styles.tools}>
        {TOOLS.map((t) => (
          <Tactile key={t.tool} disabled={readOnly} onPress={() => dispatch({ type: 'tool', tool: t.tool })} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: state.tool === t.tool }}>
            <RNView style={[styles.toolBtn, { backgroundColor: t.color, borderColor: state.tool === t.tool ? '#2E2A4A' : 'transparent', transform: [{ scale: state.tool === t.tool ? 1.1 : 1 }] }]}>
              <Text style={{ fontSize: 30 }}>{t.emoji}</Text>
              <Text style={styles.toolLabel}>{t.label}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  garden: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', padding: 8, backgroundColor: '#A8E063', borderRadius: 24, borderWidth: 4, borderColor: '#7ED957' },
  bed: { borderRadius: 20, borderWidth: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  weed: { position: 'absolute', right: 6, bottom: 14 },
  waterBar: { position: 'absolute', bottom: 4, left: 8, right: 8, height: 6, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3 },
  dry: { position: 'absolute', top: 4, right: 6, fontSize: 14, fontFamily: 'Fredoka_700Bold', color: '#fff' },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14 },
  toolBtn: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 3, minWidth: 96 },
  toolLabel: { fontFamily: 'Fredoka_600SemiBold', color: '#fff', fontSize: 13 },
});

export default def;
