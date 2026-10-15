// A craft tutorial: materials, hazards and supervision warning, numbered
// steps with the animated fold diagram, the final preview and the checklist.
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, Confetti, PlayfulBackdrop, PopIn, RoundButton, ProgressBar, Badge, LoadingState, Tactile } from '../../ui';
import { FoldDiagram, type Diagram } from '../../crafts/FoldDiagram';
import { playerApi } from '../../api/player';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { speak, stopSpeaking } from '../../games/shared/audio';
import { CRAFT_KIND_META, DIFFICULTY_LABEL } from './CraftLibraryScreen';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Craft } from '../../types';
import { t } from '../../i18n';

export function CraftDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'CraftDetail'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { settings } = useSettings();
  const [craft, setCraft] = useState<Craft | null>(null);
  const [step, setStep] = useState<number>(-1); // -1 = overview
  const [checks, setChecks] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);

  useEffect(() => {
    playerApi
      .craft(route.params.craftId)
      .then((c) => {
        setCraft(c);
        setChecks(c.progress?.checklistDone ?? (c.checklist ?? []).map(() => false));
        if (c.progress && c.progress.stepsDone > 0 && !c.progress.completedAt) setStep(Math.min(c.progress.stepsDone, (c.steps?.length ?? 1) - 1));
      })
      .catch(() => undefined);
    return () => stopSpeaking();
  }, [route.params.craftId]);

  useEffect(() => {
    if (craft && step >= 0 && craft.steps?.[step] && p.child?.effectiveBracket === 'A') speak(`${craft.steps[step]!.title}. ${craft.steps[step]!.text}`, narration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!craft || !craft.steps) return <LoadingState />;
  const m = CRAFT_KIND_META[craft.kind];
  const steps = craft.steps;
  const total = steps.length;
  const save = (stepsDone: number, completed = false) => playerApi.saveCraftProgress(craft.id, { stepsDone, checklistDone: checks, completed }).catch(() => undefined);
  const next = () => {
    if (step + 1 < total) {
      setStep(step + 1);
      void save(step + 1);
    } else {
      setStep(total);
      void save(total);
    }
  };
  const finish = () => {
    setDone(true);
    void save(total, true);
    void p.loadProgress();
  };
  const previewEmoji = (craft.finalPreview as { emoji?: string } | undefined)?.emoji ?? m.emoji;
  const gameId = (craft.finalPreview as { gameId?: string } | undefined)?.gameId;

  return (
    <PlayfulBackdrop colors={[m.color, colors.background]}>
      <Confetti play={done} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.top}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => (step >= 0 ? setStep(-1) : navigation.goBack())} color={palette.sky} size={46} />
          <View style={{ flex: 1, marginHorizontal: space.md }}>
            <AppText variant="heading" numberOfLines={1}>{craft.title}</AppText>
            {step >= 0 && step < total && <AppText variant="caption" tone="secondary">{t('craft.step', { n: step + 1, total })}</AppText>}
          </View>
          <RoundButton emoji="🔊" label={t('facts.readAloud')} onPress={() => speak(step >= 0 && steps[step] ? `${steps[step]!.title}. ${steps[step]!.text}` : `${craft.title}. ${craft.description}`, narration || settings.narrationEnabled)} color={palette.grape} size={46} />
        </View>
        {step >= 0 && <ProgressBar value={Math.min(1, step / total)} color={m.color} height={10} />}

        {step === -1 && (
          <PopIn>
            <View style={{ alignItems: 'center', marginTop: space.lg }}>
              <Text style={{ fontSize: 96 }}>{previewEmoji}</Text>
              <AppText variant="body" tone="secondary" align="center">{craft.description}</AppText>
              <View style={styles.badges}>
                <Badge label={m.label()} emoji={m.emoji} />
                <Badge label={`${t('craft.difficulty')}: ${DIFFICULTY_LABEL[craft.difficulty]}`} emoji="⭐" />
                <Badge label={t('craft.time', { n: craft.estimatedMinutes })} icon="timer" />
                <Badge label={t('craft.steps', { n: total })} icon="scroll" />
              </View>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
              <AppText variant="heading">🧺 {t('craft.materials')}</AppText>
              {craft.materials.map((mat, i) => (
                <AppText key={i} variant="body" style={{ marginTop: 4 }}>• {mat}</AppText>
              ))}
              <View style={{ marginTop: space.sm }}>
                <Badge label={craft.physical ? t('craft.physical') : t('craft.onScreen')} emoji={craft.physical ? '📄' : '📱'} />
              </View>
              {craft.physical && <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>{t('craft.physicalNote')}</AppText>}
            </View>
            {(craft.adultSupervision || craft.hazards.length > 0) && (
              <View style={[styles.card, { backgroundColor: colors.warningSoft }]}>
                <AppText variant="heading">👨‍👧 {t('craft.adult')}</AppText>
                {craft.hazards.map((h) => (
                  <AppText key={h} variant="body" style={{ marginTop: 4 }}>⚠️ {t(`craft.hazard.${h}` as 'craft.hazard.scissors')}</AppText>
                ))}
              </View>
            )}
            <View style={[styles.card, { backgroundColor: colors.surfaceRaised, alignItems: 'center' }]}>
              <AppText variant="heading">🖼️ {t('craft.preview')}</AppText>
              <Text style={{ fontSize: 72, marginTop: space.sm }}>{previewEmoji}</Text>
              {(craft.finalPreview as { diagram?: Diagram } | undefined)?.diagram && <FoldDiagram diagram={(craft.finalPreview as { diagram?: Diagram }).diagram} size={180} animate={false} />}
            </View>
            {gameId && <BigButton label={t('craft.openGame')} emoji="🎮" size="xl" color={palette.sky} fullWidth onPress={() => navigation.navigate('GameDetail', { gameId })} style={{ marginTop: space.lg }} />}
            <BigButton label={craft.progress && craft.progress.stepsDone > 0 && !craft.progress.completedAt ? t('craft.continue') : t('craft.start')} emoji="✂️" size="xl" color={palette.lime} fullWidth onPress={() => setStep(craft.progress && !craft.progress.completedAt ? Math.min(craft.progress.stepsDone, total - 1) : 0)} style={{ marginTop: space.lg }} />
          </PopIn>
        )}

        {step >= 0 && step < total && (
          <PopIn key={step}>
            <View style={[styles.card, { backgroundColor: colors.surfaceRaised, alignItems: 'center' }]}>
              <FoldDiagram diagram={steps[step]!.diagram as Diagram | undefined} size={280} stepIndex={step} />
              <AppText variant="display" align="center" style={{ marginTop: space.md }}>{step + 1}. {steps[step]!.title}</AppText>
              <AppText variant="body" align="center" style={{ marginTop: space.sm, fontSize: 18, lineHeight: 27 }}>{steps[step]!.text}</AppText>
              {steps[step]!.tip && <AppText variant="bodySmall" tone="secondary" align="center" style={{ marginTop: space.sm }}>💡 {t('craft.tip')}: {steps[step]!.tip}</AppText>}
              {steps[step]!.caution && <AppText variant="bodySmall" tone="warning" align="center" style={{ marginTop: space.sm }}>⚠️ {t('craft.caution')}: {steps[step]!.caution}</AppText>}
            </View>
            <View style={styles.nav}>
              <BigButton label={t('common.back')} emoji="⬅️" color={palette.sky} size="md" onPress={() => setStep(step - 1)} disabled={step === 0} />
              <BigButton label={step + 1 === total ? t('common.done') : t('common.next')} emoji="➡️" color={palette.lime} onPress={next} />
            </View>
          </PopIn>
        )}

        {step >= total && (
          <PopIn>
            <View style={[styles.card, { backgroundColor: colors.surfaceRaised, alignItems: 'center' }]}>
              <Text style={{ fontSize: 96 }}>{previewEmoji}</Text>
              <AppText variant="display" align="center">{done ? t('craft.finished') : t('craft.checklist')}</AppText>
              {(craft.checklist ?? []).map((item, i) => (
                <Tactile key={i} onPress={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))} accessibilityRole="checkbox" accessibilityState={{ checked: !!checks[i] }} style={{ alignSelf: 'stretch' }}>
                  <View style={[styles.check, { backgroundColor: checks[i] ? colette(palette.lime) : colors.surfaceMuted }]}>
                    <Text style={{ fontSize: 22 }}>{checks[i] ? '✅' : '⬜'}</Text>
                    <AppText variant="bodyStrong" style={{ flex: 1 }}>{item}</AppText>
                  </View>
                </Tactile>
              ))}
              {!done && <BigButton label={t('craft.finished')} emoji="🎉" size="xl" color={palette.lime} fullWidth onPress={finish} style={{ marginTop: space.lg }} />}
              {done && <BigButton label={t('tabs.craft')} emoji="🏠" color={palette.sky} fullWidth onPress={() => navigation.goBack()} style={{ marginTop: space.lg }} />}
            </View>
          </PopIn>
        )}
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const colette = (c: string) => c + '55';

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 640, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md, justifyContent: 'center' },
  card: { borderRadius: 24, padding: space.lg, marginTop: space.lg },
  nav: { flexDirection: 'row', gap: space.md, marginTop: space.lg, justifyContent: 'space-between' },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 16, marginTop: space.sm },
});
