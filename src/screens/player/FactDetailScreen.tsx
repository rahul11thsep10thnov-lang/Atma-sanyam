// One discovery: headline, explanation, "why does this happen", the
// follow-up question, a quick quiz with feedback, the source, read-aloud.
import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { AppText, BigButton, Confetti, EmojiDisc, PlayfulBackdrop, PopIn, RoundButton, Tactile, Badge, LoadingState } from '../../ui';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { playerApi } from '../../api/player';
import { isSpeaking, speak, stopSpeaking } from '../../games/shared/audio';
import { CATEGORY_EMOJI, ILLUSTRATION_EMOJI } from './FactsScreen';
import { palette } from '../../theme/palette';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import type { Fact } from '../../types';
import { t } from '../../i18n';

export function FactDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'FactDetail'>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const { settings } = useSettings();
  const [fact, setFact] = useState<Fact | null>((route.params.fact as Fact | undefined) ?? null);
  const [answers, setAnswers] = useState<Record<string, { chosen: number; correct: boolean; correctIndex: number; explanation: string }>>({});
  const [speaking, setSpeaking] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);
  const favAllowed = p.me?.controls.favouritesEnabled ?? true;

  useEffect(() => {
    playerApi.fact(route.params.factId).then(setFact).catch(() => undefined);
    playerApi.viewFact(route.params.factId).catch(() => undefined);
    return () => stopSpeaking();
  }, [route.params.factId]);

  if (!fact) return <LoadingState />;
  const emoji = ILLUSTRATION_EMOJI[fact.illustration] ?? CATEGORY_EMOJI[fact.category] ?? '✨';
  const readAloud = () => {
    if (speaking || isSpeaking()) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(`${fact.headline}. ${fact.body}. ${t('facts.why')} ${fact.whyText}`, narration || settings.narrationEnabled);
    setTimeout(() => setSpeaking(false), 500 + (fact.body.length + fact.whyText.length) * 60);
  };
  const answer = async (questionId: string, idx: number) => {
    if (answers[questionId]) return;
    try {
      const r = await playerApi.answerQuiz(questionId, idx);
      setAnswers((a) => ({ ...a, [questionId]: { chosen: idx, correct: r.correct, correctIndex: r.correctIndex, explanation: r.explanation } }));
      if (r.correct) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2000);
      }
    } catch {
      // offline: no scoring
    }
  };
  const toggleFav = async () => {
    const next = !fact.favourite;
    setFact({ ...fact, favourite: next });
    await playerApi.favouriteFact(fact.id, next).catch(() => undefined);
  };

  return (
    <PlayfulBackdrop>
      <Confetti play={celebrate} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }]}>
        <View style={styles.top}>
          <RoundButton icon="arrowLeft" label={t('common.back')} onPress={() => navigation.goBack()} color={palette.sky} size={46} />
          <View style={{ flex: 1 }} />
          {favAllowed && <RoundButton emoji={fact.favourite ? '⭐' : '☆'} label={fact.favourite ? t('facts.unsave') : t('facts.save')} onPress={toggleFav} color={palette.sunshine} size={46} />}
          <RoundButton emoji={speaking ? '⏹️' : '🔊'} label={speaking ? t('facts.stop') : t('facts.readAloud')} onPress={readAloud} color={palette.grape} size={46} style={{ marginLeft: space.sm }} />
        </View>
        <PopIn style={{ alignItems: 'center', marginTop: space.md }}>
          <EmojiDisc emoji={emoji} color={palette.sunshine} size={120} />
          <AppText variant="display" align="center" style={{ marginTop: space.md }}>{fact.headline}</AppText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: space.sm }}>
            <Badge label={fact.category} emoji={CATEGORY_EMOJI[fact.category]} />
            <Badge label={t('facts.readingLevel', { n: fact.readingLevel })} />
          </View>
        </PopIn>
        <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
          <AppText variant="body" style={styles.bodyText}>{fact.body}</AppText>
        </View>
        {!!fact.whyText && (
          <View style={[styles.card, { backgroundColor: '#FFF4CC' }]}>
            <AppText variant="heading">🤔 {t('facts.why')}</AppText>
            <AppText variant="body" style={[styles.bodyText, { marginTop: space.sm }]}>{fact.whyText}</AppText>
          </View>
        )}
        {!!fact.followUpQuestion && (
          <View style={[styles.card, { backgroundColor: '#DDEEFF' }]}>
            <AppText variant="heading">💭 {t('facts.question')}</AppText>
            <AppText variant="body" style={[styles.bodyText, { marginTop: space.sm }]}>{fact.followUpQuestion}</AppText>
          </View>
        )}
        {fact.questions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
            <AppText variant="heading">🧠 {t('facts.quiz')}</AppText>
            {fact.questions.map((q) => {
              const a = answers[q.id];
              return (
                <View key={q.id} style={{ marginTop: space.md }}>
                  <AppText variant="subheading">{q.question}</AppText>
                  <View style={styles.options}>
                    {q.options.map((opt, i) => {
                      const state = !a ? 'idle' : i === a.correctIndex ? 'correct' : i === a.chosen ? 'wrong' : 'dim';
                      const bg = state === 'correct' ? palette.lime : state === 'wrong' ? palette.cherry : colors.surfaceMuted;
                      return (
                        <Tactile key={i} onPress={() => answer(q.id, i)} disabled={!!a} accessibilityRole="button" accessibilityLabel={opt}>
                          <View style={[styles.option, { backgroundColor: bg, opacity: state === 'dim' ? 0.5 : 1 }]}>
                            <Text style={styles.optionLetter}>{['A', 'B', 'C', 'D', 'E'][i]}</Text>
                            <AppText variant="bodyStrong" style={{ flex: 1, color: state === 'idle' || state === 'dim' ? colors.text : '#fff' }}>{opt}</AppText>
                          </View>
                        </Tactile>
                      );
                    })}
                  </View>
                  {a && (
                    <AppText variant="bodyStrong" tone={a.correct ? 'success' : 'warning'} style={{ marginTop: space.sm }}>
                      {a.correct ? `🎉 ${t('facts.correct')}` : `💡 ${t('facts.incorrect')}`} {a.explanation}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
        )}
        {fact.source && (
          <View style={[styles.card, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="caption" tone="muted">{t('facts.source')}</AppText>
            <Tactile onPress={() => Linking.openURL(fact.source!.url)} accessibilityRole="link">
              <AppText variant="bodySmallStrong" tone="primary">{fact.source.title} — {fact.source.publisher}</AppText>
            </Tactile>
            {fact.sourceUrl ? (
              <Tactile onPress={() => Linking.openURL(fact.sourceUrl!)} accessibilityRole="link">
                <AppText variant="caption" tone="primary">{fact.sourceUrl}</AppText>
              </Tactile>
            ) : null}
            {fact.attributionText ? <AppText variant="caption" tone="muted" style={{ marginTop: 4 }}>{fact.attributionText}</AppText> : null}
          </View>
        )}
        <BigButton label={t('facts.random')} emoji="🎲" color={palette.grape} fullWidth style={{ marginTop: space.lg }} onPress={() => playerApi.randomFact().then((f) => navigation.replace('FactDetail', { factId: f.id, fact: f })).catch(() => undefined)} />
      </ScrollView>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.screen, maxWidth: 640, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center' },
  card: { borderRadius: 24, padding: space.lg, marginTop: space.lg },
  bodyText: { fontSize: 18, lineHeight: 27 },
  options: { gap: space.sm, marginTop: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 16 },
  optionLetter: { fontFamily: 'Fredoka_700Bold', fontSize: 18, width: 28, textAlign: 'center', color: '#2E2A4A', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 14, overflow: 'hidden' },
});
