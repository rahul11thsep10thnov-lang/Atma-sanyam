// Farm Manager (ages 6–12): plan each day, grow and sell, reach the goal.
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { Tactile, BigButton, AppText } from '../../ui';
import { Prompt } from '../shared/Board';
import { ANIMALS, CROPS, animalById, barnValue, collect, cropById, farmOutcome, feed, harvest, initFarm, nextDay, plant, sellAll, water, type FarmState } from '../logic/farm';

export type State = FarmState;
export type Action =
  | { type: 'plant'; plot: number; crop: string }
  | { type: 'water'; plot: number }
  | { type: 'harvest'; plot: number }
  | { type: 'feed'; animal: number }
  | { type: 'collect'; animal: number }
  | { type: 'sell' }
  | { type: 'nextDay' };

const def: GameDefinition<State, Action> = {
  id: 'farm-manager',
  init: (ctx) => initFarm(ctx.difficulty, rng(ctx.seed)),
  reduce(state, action) {
    if (farmOutcome(state) !== 'playing') return state;
    switch (action.type) {
      case 'plant': return plant(state, action.plot, action.crop);
      case 'water': return water(state, action.plot);
      case 'harvest': return harvest(state, action.plot);
      case 'feed': return feed(state, action.animal);
      case 'collect': return collect(state, action.animal);
      case 'sell': return sellAll(state);
      case 'nextDay': return nextDay(state);
    }
  },
  status(state) {
    const phase = farmOutcome(state);
    const daysLeft = state.days - state.day + 1;
    const stars = phase === 'won' ? (daysLeft >= state.days / 3 ? 3 : daysLeft >= 2 ? 2 : 1) : 0;
    return { phase, score: state.coins, stars, progress: Math.min(1, state.coins / state.goal), hud: `Day ${Math.min(state.day, state.days)} / ${state.days} · 🪙 ${state.coins}` };
  },
  View: FarmView,
  layout: 'full',
};

const WEATHER = { sunny: { emoji: '☀️', text: 'Sunny: crops grow fast' }, rainy: { emoji: '🌧️', text: 'Rainy: normal growth' }, dry: { emoji: '🏜️', text: 'Dry: water your crops!' } };

function FarmView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const [crop, setCrop] = useState(CROPS[0]!.id);
  const [plotOpen, setPlotOpen] = useState<number | null>(null);
  const size = Math.min(96, (width - 56) / 4);
  const tomorrow = state.forecast[state.day] ?? 'sunny';
  const act = (a: Action, s: 'tap' | 'good' | 'pop' = 'tap') => { sfx(s); dispatch(a); };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
      <Prompt emoji={WEATHER[state.weather].emoji}>{`${WEATHER[state.weather].text}. Goal: ${state.goal} coins.`}</Prompt>
      <RNView style={styles.statRow}>
        <Stat label="Coins" value={`🪙 ${state.coins}`} />
        <Stat label="Day" value={`${Math.min(state.day, state.days)} / ${state.days}`} />
        <Stat label="Tomorrow" value={WEATHER[tomorrow].emoji} />
      </RNView>

      <AppText variant="heading" style={styles.h}>🌾 Fields</AppText>
      <RNView style={styles.plots}>
        {state.plots.map((p, i) => {
          const c = p.crop ? cropById(p.crop) : null;
          const ripe = !!c && p.grown >= c.days;
          const label = !c ? 'empty' : ripe ? `${c.name} ready` : `${c.name} ${p.grown}/${c.days} days${p.watered ? ', watered' : ''}`;
          return (
            <Tactile key={i} disabled={readOnly} accessibilityRole="button" accessibilityLabel={`Plot ${i + 1}: ${label}`} onPress={() => {
              if (!c) { setPlotOpen(plotOpen === i ? null : i); return; }
              if (ripe) { act({ type: 'harvest', plot: i }, 'good'); say('Harvest!'); return; }
              act({ type: 'water', plot: i });
            }}>
              <RNView style={[styles.plot, { width: size, height: size, backgroundColor: p.watered ? '#6B4423' : '#A5703F', borderColor: plotOpen === i ? '#FFD23F' : ripe ? '#7ED957' : '#7A4F2B' }]}>
                <Text style={{ fontSize: size * 0.4 }}>{!c ? '' : ripe ? c.emoji : p.grown === 0 ? '🌱' : '🌿'}</Text>
                {c && !ripe && <RNView style={styles.growBar}><RNView style={{ width: `${(p.grown / c.days) * 100}%`, height: 5, backgroundColor: '#7ED957', borderRadius: 3 }} /></RNView>}
                {!c && <Text style={styles.plus}>+</Text>}
                {p.watered && <Text style={styles.drop}>💧</Text>}
              </RNView>
            </Tactile>
          );
        })}
      </RNView>
      {plotOpen !== null && !state.plots[plotOpen]?.crop && (
        <RNView style={styles.seedTray}>
          <AppText variant="caption" tone="muted">Pick a seed for plot {plotOpen + 1}:</AppText>
          <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CROPS.map((k) => (
              <Tactile key={k.id} disabled={readOnly || state.coins < k.cost} accessibilityRole="button" accessibilityLabel={`Plant ${k.name} for ${k.cost} coins`} onPress={() => { setCrop(k.id); act({ type: 'plant', plot: plotOpen, crop: k.id }, 'pop'); setPlotOpen(null); }}>
                <RNView style={[styles.seed, { opacity: state.coins < k.cost ? 0.4 : 1, borderColor: crop === k.id ? '#FFD23F' : '#E9E2F5' }]}>
                  <Text style={{ fontSize: 26 }}>{k.emoji}</Text>
                  <Text style={styles.seedText}>{k.name}</Text>
                  <Text style={styles.seedSub}>🪙{k.cost} · {k.days}d · sells {k.price}</Text>
                </RNView>
              </Tactile>
            ))}
          </RNView>
        </RNView>
      )}

      <AppText variant="heading" style={styles.h}>🐾 Animals</AppText>
      <RNView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {state.animals.map((a, i) => {
          const k = animalById(a.kind);
          return (
            <RNView key={i} style={styles.animal}>
              <Text style={{ fontSize: 36 }}>{k.emoji}</Text>
              <Text style={styles.seedText}>{k.name}{a.fed ? ' 😋' : ''}</Text>
              {a.produce > 0 ? (
                <Tactile disabled={readOnly} accessibilityRole="button" accessibilityLabel={`Collect ${a.produce} ${k.produce}`} onPress={() => act({ type: 'collect', animal: i }, 'good')} style={styles.miniBtn}><Text style={styles.miniText}>Collect {k.produceEmoji}×{a.produce}</Text></Tactile>
              ) : (
                <Tactile disabled={readOnly || a.fed || state.coins < k.feedCost} accessibilityRole="button" accessibilityLabel={`Feed ${k.name} for ${k.feedCost} coins`} onPress={() => act({ type: 'feed', animal: i }, 'pop')} style={[styles.miniBtn, { backgroundColor: a.fed ? '#C8E6C9' : '#FFB347', opacity: state.coins < k.feedCost && !a.fed ? 0.5 : 1 }]}><Text style={styles.miniText}>{a.fed ? 'Fed ✓' : `Feed 🪙${k.feedCost}`}</Text></Tactile>
              )}
            </RNView>
          );
        })}
      </RNView>

      <AppText variant="heading" style={styles.h}>🏪 Barn &amp; Market</AppText>
      <RNView style={styles.barn}>
        <RNView style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(state.barn).filter(([, n]) => n > 0).map(([item, n]) => (
            <Text key={item} style={styles.barnItem}>{CROPS.find((c) => c.id === item)?.emoji ?? ANIMALS.find((a) => a.produce === item)?.produceEmoji} ×{n}</Text>
          ))}
          {barnValue(state) === 0 && <AppText variant="caption" tone="muted">Nothing to sell yet.</AppText>}
        </RNView>
        <BigButton label={`Sell for 🪙${barnValue(state)}`} size="md" color="#FF7A59" disabled={readOnly || barnValue(state) === 0} onPress={() => { act({ type: 'sell' }, 'good'); say('Ka-ching!'); }} />
      </RNView>

      <RNView style={styles.log}>
        {state.log.slice(0, 3).map((l, i) => <AppText key={i} variant="caption" tone={i === 0 ? 'text' : 'muted'}>• {l}</AppText>)}
      </RNView>
      {!readOnly && <BigButton label="Next day 🌙" color="#9B6BFF" fullWidth onPress={() => { act({ type: 'nextDay' }, 'pop'); setPlotOpen(null); }} style={{ marginTop: 12 }} />}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <RNView style={styles.stat}>
      <AppText variant="caption" tone="muted">{label}</AppText>
      <Text style={styles.statValue}>{value}</Text>
    </RNView>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 8, alignItems: 'center', borderWidth: 2, borderColor: '#F0E4EE' },
  statValue: { fontFamily: 'Fredoka_700Bold', fontSize: 18, color: '#2E2A4A' },
  h: { marginTop: 10, marginBottom: 6 },
  plots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, backgroundColor: '#A8E063', borderRadius: 18, borderWidth: 3, borderColor: '#7ED957' },
  plot: { borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  growBar: { position: 'absolute', bottom: 4, left: 6, right: 6, height: 5, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 3 },
  plus: { color: '#fff', fontSize: 28, fontFamily: 'Fredoka_700Bold' },
  drop: { position: 'absolute', top: 2, right: 4, fontSize: 12 },
  seedTray: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginTop: 8, gap: 6, borderWidth: 2, borderColor: '#FFD23F' },
  seed: { alignItems: 'center', padding: 8, borderRadius: 14, borderWidth: 2, backgroundColor: '#FFF8E7', width: 120 },
  seedText: { fontFamily: 'Fredoka_600SemiBold', fontSize: 14, color: '#2E2A4A' },
  seedSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#6E6A85' },
  animal: { backgroundColor: '#fff', borderRadius: 16, padding: 10, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: '#F0E4EE', minWidth: 110 },
  miniBtn: { backgroundColor: '#7ED957', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  miniText: { fontFamily: 'Fredoka_600SemiBold', color: '#1F2340', fontSize: 13 },
  barn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 10, borderWidth: 2, borderColor: '#F0E4EE' },
  barnItem: { fontSize: 18, fontFamily: 'Fredoka_600SemiBold' },
  log: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 8, gap: 2 },
});

export default def;
