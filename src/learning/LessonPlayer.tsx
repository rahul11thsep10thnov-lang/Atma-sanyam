// The chapter player: nine steps in a fixed order, one card at a time, with
// an age-appropriate text, the step's picture or activity, read-aloud, a
// progress rail, and at the end the sourced Did You Know? fact and the
// chapter challenge. Progress is reported to the server as the child moves
// (the server awards coins once on first completion).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Badge, BigButton, Confetti, PlayfulBackdrop, PopIn, ProgressBar, RoundButton, Tactile } from '../ui';
import { LessonVisual } from './visuals';
import { LessonActivity, type ActivityResult } from './activities';
import { STEP_META, type Lesson, type LessonStep, type ProgressSaveResult } from './types';
import { playSfx, speak, stopSpeaking } from '../games/shared/audio';
import { palette } from '../theme/palette';
import { space } from '../theme/spacing';
import { useTheme } from '../theme/ThemeContext';
import type { AgeBracket } from '../types';
import { t } from '../i18n';

interface Props {
  lesson: Lesson;
  bracket: AgeBracket;
  /** The learning age the child chose (My Age by default). */
  selectedAge: number;
  sound: boolean;
  narration: boolean;
  onSave: (body: { stepsDone: number; activitiesCorrect: number; activitiesTotal: number; quizScore?: number; quizTotal?: number; timeSeconds: number; selectedAge: number; completed?: boolean }) => Promise<ProgressSaveResult | null>;
  onExit: () => void;
}

export function textFor(step: LessonStep, bracket: AgeBracket): string {
  return step.textByBracket?.[bracket] ?? step.text ?? '';
}

export function LessonPlayer({ lesson, bracket, selectedAge, sound, narration, onSave, onExit }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const steps = lesson.steps;
  const startIndex = Math.min(lesson.progress?.completedAt ? 0 : lesson.progress?.stepsDone ?? 0, steps.length - 1);
  const [index, setIndex] = useState(startIndex);
  const [activities, setActivities] = useState<Record<number, ActivityResult>>({});
  const [quiz, setQuiz] = useState<Record<number, number>>({});
  const [result, setResult] = useState<ProgressSaveResult | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef(Date.now());
  const savedSeconds = useRef(0);
  const step = steps[index]!;
  const meta = STEP_META[step.kind];
  const sfx = useCallback((kind: Parameters<typeof playSfx>[0]) => playSfx(kind, sound), [sound]);

  const elapsed = () => Math.round((Date.now() - startedAt.current) / 1000) - savedSeconds.current;
  const stats = () => {
    const done = Object.values(activities);
    return { activitiesCorrect: done.filter((a) => a.correct).length, activitiesTotal: done.length };
  };

  // Read the card aloud for the little ones (and on demand).
  const narrate = useCallback(() => {
    const parts = [step.title ?? t(meta.key as 'learn.step.objective'), textFor(step, bracket), ...(step.points ?? []), ...(step.example?.steps ?? []), step.fact ? `${step.fact.headline}. ${step.fact.body}` : ''];
    speak(parts.filter(Boolean).join('. '), narration);
  }, [step, bracket, narration, meta.key]);
  useEffect(() => {
    if (bracket === 'A') narrate();
    return () => stopSpeaking();
  }, [index, bracket, narrate]);

  const save = useCallback(
    async (stepsDone: number, completed?: boolean) => {
      const s = stats();
      const quizTotal = steps[steps.length - 1]?.questions?.length ?? 0;
      const quizScore = Object.entries(quiz).filter(([qi, a]) => steps[steps.length - 1]!.questions![Number(qi)]!.correctIndex === a).length;
      const secs = elapsed();
      savedSeconds.current += secs;
      return onSave({ stepsDone, ...s, quizScore: Object.keys(quiz).length ? quizScore : undefined, quizTotal: Object.keys(quiz).length ? quizTotal : undefined, timeSeconds: secs, selectedAge, completed });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activities, quiz, steps, selectedAge, onSave]
  );

  const next = async () => {
    stopSpeaking();
    sfx('tap');
    if (index < steps.length - 1) {
      const n = index + 1;
      setIndex(n);
      void save(n);
    } else {
      setSaving(true);
      const r = await save(steps.length, true);
      setSaving(false);
      setResult(r ?? { progress: { stepsDone: steps.length, stepsTotal: steps.length, activitiesCorrect: 0, activitiesTotal: 0, bestQuizScore: null, quizTotal: null, timeSeconds: 0, completedAt: new Date().toISOString() }, completed: true, firstCompletion: false, coins: null, levelUp: null, newAchievements: [] });
      sfx('win');
    }
  };
  const back = () => {
    stopSpeaking();
    if (index > 0) setIndex(index - 1);
  };

  // The challenge must be answered before finishing; Try It must be attempted.
  const challengeQuestions = step.kind === 'challenge' ? step.questions ?? [] : [];
  const canAdvance = step.kind === 'tryIt' ? !!activities[index] || !step.activity : step.kind === 'challenge' ? challengeQuestions.every((_, qi) => quiz[qi] !== undefined) && (!step.activity || !!activities[index]) : true;
  const quizScore = useMemo(() => challengeQuestions.filter((q, qi) => quiz[qi] === q.correctIndex).length, [challengeQuestions, quiz]);

  if (result) {
    const total = challengeQuestions.length;
    return (
      <PlayfulBackdrop colors={[palette.sunshine, palette.vanilla]}>
        <Confetti play />
        <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}>
          <PopIn style={{ alignItems: 'center', gap: space.md }}>
            <Text style={{ fontSize: 88 }}>🎓</Text>
            <AppText variant="display" align="center">{t('learn.done.title')}</AppText>
            <AppText variant="subheading" tone="secondary" align="center">{lesson.title}</AppText>
            <View style={styles.badges}>
              {total > 0 && <Badge label={t('learn.done.quiz', { n: quizScore, total })} emoji="🏁" color={colors.surfaceRaised} />}
              {result.coins && result.coins.awarded > 0 && <Badge label={t('learn.done.coins', { n: result.coins.awarded })} emoji="🪙" color="#FFF4CC" />}
              {result.coins && result.coins.capped && result.coins.awarded === 0 && <Badge label={t('rewards.capReached')} emoji="⏳" color={colors.surfaceRaised} />}
              {result.levelUp && <Badge label={t('learn.done.levelUp', { age: result.levelUp.to })} emoji="🚀" color="#E6F8DA" />}
              {!result.firstCompletion && <Badge label={t('learn.done.again')} emoji="🔁" color={colors.surfaceRaised} />}
            </View>
            {result.newAchievements.length > 0 && <AppText variant="bodyStrong" align="center">🏅 {t('games.newBadge')}</AppText>}
            <BigButton label={t('learn.done.back')} emoji="📚" color={palette.lime} size="lg" onPress={onExit} />
          </PopIn>
        </ScrollView>
      </PlayfulBackdrop>
    );
  }

  return (
    <PlayfulBackdrop shapes={false} colors={[palette.vanilla, '#FFFFFF']}>
      <View style={[styles.hud, { paddingTop: insets.top + space.sm }]}>
        <RoundButton icon="close" label={t('common.close')} onPress={() => { void save(index); onExit(); }} color={palette.cherry} size={44} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>{lesson.title}</AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>{t('learn.stepOf', { n: index + 1, total: steps.length })} · {t('learn.ageLabel', { age: selectedAge })}</AppText>
        </View>
        <RoundButton emoji="🔊" label={t('facts.readAloud')} onPress={narrate} color={palette.sky} size={44} />
      </View>
      <View style={styles.rail}>
        {steps.map((s, i) => (
          <Tactile key={i} disabled={i > index} onPress={() => setIndex(i)} accessibilityRole="button" accessibilityLabel={t(STEP_META[s.kind].key as 'learn.step.objective')} accessibilityState={{ selected: i === index }}>
            <View style={[styles.dot, { backgroundColor: i < index ? palette.lime : i === index ? palette.sunshine : colors.surfaceMuted, borderColor: i === index ? palette.sunshineDeep : 'transparent' }]}><Text style={{ fontSize: 14 }}>{STEP_META[s.kind].emoji}</Text></View>
          </Tactile>
        ))}
      </View>
      <ProgressBar value={index / steps.length} color={palette.grape} height={8} />
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
        <PopIn key={index} style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
          <View style={styles.cardHead}>
            <Text style={{ fontSize: 34 }}>{meta.emoji}</Text>
            <AppText variant="heading" style={{ flex: 1 }}>{step.title ?? t(meta.key as 'learn.step.objective')}</AppText>
          </View>
          {step.safety && (
            <View style={styles.safety}><Text>⚠️</Text><AppText variant="bodySmallStrong" style={{ flex: 1 }}>{step.safety}</AppText></View>
          )}
          {textFor(step, bracket) ? <AppText variant={bracket === 'A' ? 'subheading' : 'body'} style={{ marginBottom: space.md }}>{textFor(step, bracket)}</AppText> : null}
          {step.visual && step.kind !== 'tryIt' && <View style={styles.visual}><LessonVisual visual={step.visual} /></View>}
          {step.points && step.points.length > 0 && (
            <View style={{ gap: 8 }}>
              {step.points.map((p, i) => (
                <View key={i} style={styles.point}><View style={[styles.bullet, { backgroundColor: palette.grape }]} /><AppText variant="body" style={{ flex: 1 }}>{p}</AppText></View>
              ))}
            </View>
          )}
          {step.example && (
            <View style={{ gap: 8 }}>
              {step.example.visual && <View style={styles.visual}><LessonVisual visual={step.example.visual} /></View>}
              {step.example.steps.map((s, i) => (
                <View key={i} style={styles.point}><View style={styles.stepNum}><Text style={{ color: '#fff', fontFamily: 'Fredoka_700Bold' }}>{i + 1}</Text></View><AppText variant="body" style={{ flex: 1 }}>{s}</AppText></View>
              ))}
            </View>
          )}
          {step.kind === 'tryIt' && step.activity && (
            <LessonActivity key={`a-${index}`} activity={step.activity as { kind: string }} seed={lesson.id.length + index} sfx={sfx} onResult={(r) => setActivities((a) => ({ ...a, [index]: r }))} />
          )}
          {step.kind === 'didYouKnow' && step.fact && (
            <View style={[styles.fact, { backgroundColor: '#FFF4CC' }]}>
              <AppText variant="heading">💡 {step.fact.headline}</AppText>
              <AppText variant="body">{step.fact.body}</AppText>
              <Tactile onPress={() => void Linking.openURL(step.fact!.source.url)} accessibilityRole="link" accessibilityLabel={step.fact.source.title}>
                <AppText variant="caption" tone="secondary">{t('facts.source')}: {step.fact.source.title} — {step.fact.source.publisher}</AppText>
              </Tactile>
            </View>
          )}
          {step.kind === 'challenge' && (
            <View style={{ gap: space.md }}>
              {challengeQuestions.map((q, qi) => (
                <View key={qi} style={[styles.question, { borderColor: colors.borderStrong }]}>
                  <AppText variant="bodyStrong">{qi + 1}. {q.question}</AppText>
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {q.options.map((o, oi) => {
                      const picked = quiz[qi];
                      const show = picked !== undefined;
                      const bg = show && oi === q.correctIndex ? '#E6F8DA' : show && picked === oi ? '#FDE2E3' : colors.surface;
                      return (
                        <Tactile key={oi} disabled={show} onPress={() => { setQuiz((z) => ({ ...z, [qi]: oi })); sfx(oi === q.correctIndex ? 'good' : 'bad'); }} accessibilityRole="button" accessibilityLabel={o}>
                          <View style={[styles.optionRow, { backgroundColor: bg, borderColor: colors.borderStrong }]}><AppText variant="body">{o}</AppText></View>
                        </Tactile>
                      );
                    })}
                  </View>
                  {quiz[qi] !== undefined && q.explanation && <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>{q.explanation}</AppText>}
                </View>
              ))}
              {step.activity && <LessonActivity key={`c-${index}`} activity={step.activity as { kind: string }} seed={index} sfx={sfx} onResult={(r) => setActivities((a) => ({ ...a, [index]: r }))} />}
              {challengeQuestions.length > 0 && Object.keys(quiz).length === challengeQuestions.length && <AppText variant="heading" align="center">🏁 {quizScore} / {challengeQuestions.length}</AppText>}
            </View>
          )}
        </PopIn>
        {index === 0 && lesson.curriculum && (
          <View style={styles.curriculum}>
            <Text>{lesson.curriculum.status === 'verified' ? '📗' : '📘'}</Text>
            <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{lesson.curriculum.text}</AppText>
          </View>
        )}
        {index === 0 && lesson.adultAssisted && (
          <View style={styles.curriculum}><Text>🧑‍🤝‍🧑</Text><AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{t('learn.adultAssisted')}</AppText></View>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.surfaceRaised }]}>
        <BigButton label={t('common.back')} icon="arrowLeft" color={palette.sky} size="md" onPress={back} disabled={index === 0} />
        <BigButton label={index === steps.length - 1 ? t('learn.finish') : t('common.next')} icon={index === steps.length - 1 ? 'check' : 'arrowRight'} color={palette.lime} size="md" onPress={() => void next()} disabled={!canAdvance || saving} style={{ flex: 1 }} />
      </View>
    </PlayfulBackdrop>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.sm },
  rail: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingHorizontal: space.md, paddingBottom: 6, flexWrap: 'wrap' },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  wrap: { paddingHorizontal: space.screen, maxWidth: 640, width: '100%', alignSelf: 'center', paddingTop: space.md },
  card: { borderRadius: 24, padding: space.lg, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  visual: { alignItems: 'center', marginVertical: space.sm },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: palette.grape, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  safety: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FDF0DA', borderRadius: 14, padding: 10, marginBottom: 8 },
  fact: { borderRadius: 18, padding: space.md, gap: 8 },
  question: { borderWidth: 2, borderRadius: 18, padding: space.md },
  optionRow: { borderWidth: 2, borderRadius: 14, padding: 10 },
  curriculum: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: space.md, paddingHorizontal: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: space.sm, padding: space.md, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
});
