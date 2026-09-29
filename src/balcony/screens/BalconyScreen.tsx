import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { BalconyScene } from '../components/BalconyScene';
import { useBalconyEngine } from '../hooks/useBalconyEngine';
import { createInitialState } from '../repository/BalconyRepository';
import { EnvironmentMode } from '../types';
import { REWARD_TABLE } from '../config/rewardConfig';
import { getNextRule } from '../engine/RewardManager';

const ENVIRONMENT_CYCLE: EnvironmentMode[] = ['MORNING', 'AFTERNOON', 'SUNSET', 'EVENING', 'NIGHT'];

export function BalconyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { engine, state, ready } = useBalconyEngine();
  const [demoOpen, setDemoOpen] = useState(false);

  if (!ready) {
    return <View style={styles.screen} />;
  }

  const activePlant = state.plants.find((p) => p.id === state.activePlantId);
  const nextRule = getNextRule(state.reward.totalFocusMinutes, state.reward.claimedRewardIds, REWARD_TABLE);

  const cycleEnvironment = () => {
    const idx = ENVIRONMENT_CYCLE.indexOf(state.environment.mode);
    const next = ENVIRONMENT_CYCLE[(idx + 1) % ENVIRONMENT_CYCLE.length] ?? ENVIRONMENT_CYCLE[0];
    engine.setEnvironment(next);
  };

  const showCollection = () => {
    const unlockedObjects = state.objects.filter((o) => o.isUnlocked).map((o) => o.asset.replace(/-/g, ' '));
    const unlockedPlants = state.plants.map((p) => p.name);
    const items = [...unlockedPlants, ...unlockedObjects];
    Alert.alert(
      'Collection',
      items.length
        ? `Unlocked so far:\n\n${items.map((i) => `• ${i}`).join('\n')}`
        : 'Nothing unlocked yet — a focus session is the first step.',
    );
  };

  const showGallery = () => {
    const { artwork, puzzle } = state;
    if (artwork.status === 'LOCKED') {
      Alert.alert('Gallery', `"${artwork.title}" is still locked. Keep focusing to reveal it.`);
      return;
    }
    Alert.alert(
      'Gallery',
      `"${artwork.title}" — ${puzzle.piecesRevealed}/${puzzle.totalPieces} pieces revealed (${artwork.status.replace('_', ' ').toLowerCase()}).`,
    );
  };

  const showCustomize = () => {
    Alert.alert('Customize', 'Rearranging the balcony is coming in the next phase.');
  };

  return (
    <View style={styles.screen}>
      <BalconyScene state={state} />

      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <Text style={styles.title}>Balcony</Text>
        <View style={styles.statPill}>
          <Text style={styles.statText}>{state.reward.totalFocusMinutes} min focused</Text>
        </View>
        {activePlant && (
          <View style={styles.statPill}>
            <Text style={styles.statText}>Growing: {activePlant.name}</Text>
          </View>
        )}
        {!activePlant && nextRule && (
          <View style={styles.statPill}>
            <Text style={styles.statText}>{nextRule.minutes - state.reward.totalFocusMinutes} min to first unlock</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <View style={styles.controlRow}>
          <ControlButton label="Focus" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
          <ControlButton label="Customize" onPress={showCustomize} />
          <ControlButton label="Collection" onPress={showCollection} />
          <ControlButton label="Gallery" onPress={showGallery} />
          <ControlButton label="Environment" onPress={cycleEnvironment} />
        </View>
        <Pressable onPress={() => setDemoOpen((v) => !v)} style={styles.demoToggle} accessibilityRole="button">
          <Text style={styles.demoToggleText}>{demoOpen ? 'Hide demo controls ▾' : 'Demo controls ▴'}</Text>
        </Pressable>
        {demoOpen && <DemoPanel engine={engine} motionEnabled={state.environment.motionEffectsEnabled} />}
      </View>
    </View>
  );
}

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.controlBtn} accessibilityRole="button">
      <Text style={styles.controlBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Section 16 — every button here exists purely to exercise BalconyEngine
 * end-to-end before the real focus timer is wired in (a later phase). */
function DemoPanel({ engine, motionEnabled }: { engine: ReturnType<typeof useBalconyEngine>['engine']; motionEnabled: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.demoPanel} contentContainerStyle={styles.demoPanelContent}>
      <DemoButton label="+10 min" onPress={() => engine.completeFocusSession(10)} />
      <DemoButton label="+25 min" onPress={() => engine.completeFocusSession(25)} />
      <DemoButton label="+60 min" onPress={() => engine.completeFocusSession(60)} />
      <DemoButton label="Complete focus" onPress={() => engine.completeFocusSession(5)} />
      <DemoButton label="Break focus" onPress={() => engine.breakFocusSession()} tone="danger" />
      <DemoButton label="Unlock artwork" onPress={() => engine.unlockArtworkNow()} />
      <DemoButton label="Complete puzzle" onPress={() => engine.completePuzzleNow()} />
      <DemoButton label="Toggle night" onPress={() => engine.toggleNight()} />
      <DemoButton label="Toggle rain" onPress={() => engine.toggleRain()} />
      <DemoButton label={`Motion: ${motionEnabled ? 'ON' : 'OFF'}`} onPress={() => engine.setMotionEffectsEnabled(!motionEnabled)} />
      <DemoButton label="Reset balcony" onPress={() => engine.reset(createInitialState())} tone="danger" />
    </ScrollView>
  );
}

function DemoButton({ label, onPress, tone }: { label: string; onPress: () => void; tone?: 'danger' }) {
  return (
    <Pressable onPress={onPress} style={[styles.demoBtn, tone === 'danger' && styles.demoBtnDanger]} accessibilityRole="button">
      <Text style={[styles.demoBtnText, tone === 'danger' && styles.demoBtnDangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { ...typography.heading, color: colors.card, marginRight: 4, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 4 },
  statPill: { backgroundColor: 'rgba(0,0,0,0.32)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statText: { ...typography.caption, color: colors.card, fontWeight: '600' },
  bottomOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: 8,
  },
  controlBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlBtnText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  demoToggle: { alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 12 },
  demoToggleText: { ...typography.caption, color: colors.card, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 3 },
  demoPanel: { maxHeight: 60, marginTop: 4 },
  demoPanelContent: { paddingHorizontal: spacing.screenPadding, gap: 8, alignItems: 'center' },
  demoBtn: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 12, paddingVertical: 8 },
  demoBtnDanger: { backgroundColor: '#FCE4E4' },
  demoBtnText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  demoBtnDangerText: { color: colors.danger },
});
