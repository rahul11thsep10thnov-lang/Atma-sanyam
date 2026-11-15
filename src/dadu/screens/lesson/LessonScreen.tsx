// The lesson: Dadaji's eight-phase teaching formula on top of the pure lesson
// runner. Resumable, narrated, never shaming.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDadu } from '../../state/DaduContext';
import { adapt } from '../../core/ageBands';
import type { CharacterKey } from '../../core/characters';
import type { LessonStep } from '../../core/content';
import { helperText, tx, ui } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { catalog } from '../../content';
import { startLesson, currentStep, canAdvance, next as nextStep, pick, retry, simpler, advanced, example, repeat, takeBreak, variantText, complete, phases } from '../../engines/lesson';
import type { LessonState, Phase } from '../../engines/lesson';
import { applyLessonResult, updateMastery } from '../../engines';
import { backgroundForLocation, CharacterSprite } from '../../render';
import { EpisodeStage } from '../../episode/EpisodeStage';
import type { StageMotion } from '../../episode/EpisodeStage';
import type { StageCast } from '../../episode/logic';
import { autoAdvanceMs } from '../../episode/logic';
import { SPEED_TABLE } from '../../audio/mixer';
import { CHARACTERS } from '../../core/characters';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row, SpeechBubble, Toast, useLittle } from '../../ui';
import { ActivityView } from '../activities';
import { canonicalLocation } from '../../core/locations';
import type { DaduStackParamList } from '../../navigation/types';
import { SECTIONS } from '../../core/worlds';

const PHASE_KEY: Record<Phase, string> = { intro: 'lesson.steps.intro', question: 'lesson.steps.question', friend: 'lesson.steps.friend', explain: 'lesson.steps.explain', activity: 'lesson.steps.activity', feedback: 'lesson.steps.feedback', quiz: 'lesson.steps.quiz', echo: 'lesson.steps.echo', done: 'common.done' };

export function LessonScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Lesson'>>();
  const { child, world, level, prefs, updateWorld, hold, release, logEvent } = useDadu();
  const { speak, stop, mixer } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const little = useLittle();
  const lesson = catalog.lessonById(route.params.lessonId);
  const hi = prefs.primary === 'hi';
  const storageKey = child ? `dadu.lesson.v1.${child.id}` : null;
  const [state, setState] = useState<LessonState | null>(null);
  const [echoIndex, setEchoIndex] = useState(0);
  const [echoRepeated, setEchoRepeated] = useState(false);
  const [breakLeft, setBreakLeft] = useState(60);
  const [toast, setToast] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ stars: number; coins: number } | null>(null);
  const spokenRef = useRef<string>('');
  const [auto, setAuto] = useState(true);
  const advanceRef = useRef<() => void>(() => undefined);

  // resume or start
  useEffect(() => {
    if (!lesson) return;
    let alive = true;
    (async () => {
      let resumed: LessonState | null = null;
      if (storageKey) { try { const raw = await AsyncStorage.getItem(storageKey); if (raw) { const saved = JSON.parse(raw) as LessonState; if (saved.lessonId === lesson.meta.id && saved.level === level && saved.phase !== 'done') resumed = saved; } } catch { /* ignore */ } }
      if (alive) setState(resumed ?? startLesson(lesson, level, Date.now()));
    })();
    return () => { alive = false; };
  }, [lesson, level, storageKey]);

  // hold characters in the scene
  useEffect(() => {
    if (!lesson) return;
    const keys: CharacterKey[] = ['dadaji', 'chintu', lesson.companion];
    hold(keys);
    return () => { release(keys); stop(); };
  }, [lesson, hold, release, stop]);

  // persist the resumable state
  useEffect(() => {
    if (!state || !storageKey) return;
    if (state.phase === 'done') { AsyncStorage.removeItem(storageKey).catch(() => undefined); return; }
    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);
  }, [state, storageKey]);

  const step: LessonStep | null = lesson && state ? currentStep(lesson, state) : null;
  const speakerOf = (s: LessonStep | null): CharacterKey => (s?.type === 'dialogue' ? s.who : s?.type === 'echo' ? 'mitthu' : 'dadaji');
  const lineText = useMemo(() => {
    if (!lesson || !state || !step) return '';
    const variant = variantText(lesson, state);
    if (step.type === 'dialogue') return tx(variant ?? step.text, prefs);
    if (step.type === 'activity') return tx(step.activity.prompt, prefs);
    if (step.type === 'quiz') return tx(step.question, prefs);
    if (step.type === 'echo') return tx(step.clauses[Math.min(echoIndex, step.clauses.length - 1)], prefs);
    return '';
  }, [lesson, state, step, prefs, echoIndex]);
  const helper = useMemo(() => {
    if (!step) return null;
    const v = step.type === 'dialogue' ? step.text : step.type === 'activity' ? step.activity.prompt : step.type === 'quiz' ? step.question : null;
    return v ? helperText(v, prefs) : null;
  }, [step, prefs]);

  // auto narration once per new line
  useEffect(() => {
    if (!lineText || mixer.muted) return;
    const id = `${state?.stepIndex}:${state?.variant}:${echoIndex}:${lineText}`;
    if (spokenRef.current === id) return;
    spokenRef.current = id;
    void speak(lineText, speakerOf(step));
  }, [lineText, step, state?.stepIndex, state?.variant, echoIndex, mixer.muted, speak]);

  // auto-play: short talking lines move on by themselves, like an episode; questions always wait for the child
  useEffect(() => {
    if (!auto || !lesson || !state || !step || step.type !== 'dialogue' || state.onBreak || state.phase === 'done' || !lineText) return;
    const id = setTimeout(() => advanceRef.current(), autoAdvanceMs(lineText, SPEED_TABLE[mixer.narrationSpeed].rate));
    return () => clearTimeout(id);
  }, [auto, lesson, state?.stepIndex, state?.variant, state?.onBreak, state?.phase, step?.type, lineText, mixer.narrationSpeed]);

  // break countdown
  useEffect(() => {
    if (!state?.onBreak) { setBreakLeft(60); return; }
    if (breakLeft <= 0) { setState((s) => (s ? takeBreak(s, false) : s)); return; }
    const t = setTimeout(() => setBreakLeft((b) => b - 1), 1000);
    return () => clearTimeout(t);
  }, [state?.onBreak, breakLeft]);

  const finish = useCallback((s: LessonState) => {
    if (!lesson || !child) return;
    const result = complete(lesson, s, Date.now());
    if (!result) return;
    const counts: Record<string, number> = {};
    for (const sec of SECTIONS) counts[sec.key] = (world?.lessonsCompleted ?? []).filter((id) => catalog.lessonById(id)?.meta.section === sec.key).length;
    const first = !(world?.lessonsCompleted ?? []).includes(lesson.meta.id);
    updateWorld((w) => {
      const w2 = applyLessonResult(w, result, lesson.meta.section, counts);
      const mastery = { ...w2.mastery, [lesson.concept]: updateMastery(w2.mastery[lesson.concept], lesson.concept, result.resultWeight, child.difficulty, Date.now()) };
      return { ...w2, mastery };
    });
    logEvent('lesson');
    setFinished({ stars: first ? result.stars : 0, coins: result.coins });
  }, [lesson, child, world, updateWorld, logEvent]);

  const advance = () => {
    if (!lesson || !state) return;
    stop();
    const n = nextStep(lesson, state, Date.now());
    setEchoIndex(0); setEchoRepeated(false);
    setState(n);
    if (n.phase === 'done') finish(n);
  };
  advanceRef.current = advance;

  if (!lesson) return <View style={s.center}><Body>{hi ? 'यह पाठ नहीं मिला।' : 'This lesson was not found.'}</Body><Row style={{ marginTop: 10 }}><BigButton label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></View>;
  if (!state || !world) return <View style={s.center}><Body tone="soft">…</Body></View>;

  const steps = lesson.steps[level];
  const ph = phases(steps);
  const section = SECTIONS.find((x) => x.key === lesson.meta.section);
  const host = canonicalLocation(lesson.host);
  const speaker = speakerOf(step);
  const wrong = !!state.lastResult && !state.lastResult.ok;
  const cast: StageCast[] = [
    { key: 'dadaji', slot: 'left', talking: speaker === 'dadaji', expression: 'idle' },
    { key: 'chintu', slot: 'right', talking: speaker === 'chintu', expression: wrong ? 'think' : state.lastResult?.ok ? 'happy' : 'idle' },
    ...(lesson.companion !== 'chintu' && lesson.companion !== 'dadaji' ? [{ key: lesson.companion, slot: 'far' as const, talking: speaker === lesson.companion, expression: 'idle' }] : []),
  ];
  if (step?.type === 'echo' && lesson.companion !== 'mitthu') cast.push({ key: 'mitthu', slot: 'centre', talking: !echoRepeated, expression: echoRepeated ? 'happy' : 'talk' });
  const MOTIONS: StageMotion[] = ['push', 'panLeft', 'push', 'panRight'];
  const roomKey = backgroundForLocation(host);
  const caption = state.onBreak || state.phase === 'done' ? '' : lineText;
  const adaptation = adapt({ band: child?.band ?? 'A3', difficulty: child?.difficulty ?? 'steady', mastery: world.mastery[lesson.concept]?.score });
  const variant = variantText(lesson, state);
  const pickedKey = state.picked !== null && typeof state.picked === 'string' ? state.picked : Array.isArray(state.picked) ? String(state.picked[0]) : null;

  const controls = (
    <View style={s.controls}>
      <Chip label={ui('lesson.repeat', prefs)} onPress={() => { setState(repeat(state)); void speak(lineText, speaker); }} testID="lesson-repeat" />
      <Chip label={ui('lesson.simpler', prefs)} onPress={() => setState(simpler(state))} selected={state.variant === 'simpler'} testID="lesson-simpler" />
      <Chip label={ui('lesson.break', prefs)} onPress={() => { stop(); setState(takeBreak(state, true)); }} testID="lesson-break" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-lesson">
      <EpisodeStage room={roomKey} fallbackBackground={roomKey} cast={cast} motion={MOTIONS[state.stepIndex % 4]} reducedMotion={reduced} caption={caption} speaker={caption ? CHARACTERS[speaker].name[hi ? 'hi' : 'en'] : undefined} night={world.time === 'night'}>
        <View style={s.overlay} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel={ui('common.back', prefs)} onPress={() => { stop(); nav.goBack(); }} style={s.round} testID="lesson-exit"><Text style={s.roundText}>←</Text></Pressable>
          <View style={s.steps}>{ph.map((p, i) => <View key={i} style={[s.stepBar, i < state.stepIndex && { backgroundColor: P.ok }, i === state.stepIndex && { backgroundColor: P.saffron }]} />)}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={auto ? 'Pause' : 'Play'} onPress={() => setAuto(!auto)} style={s.round} testID="lesson-auto"><Text style={s.roundText}>{auto ? '⏸' : '▶'}</Text></Pressable>
        </View>
      </EpisodeStage>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        {state.onBreak ? (
          <Card accent={P.monsoon}><View style={{ alignItems: 'center', gap: 8 }}><CharacterSprite characterKey="dadaji" pose="sit" expression="sleepy" size={110} reducedMotion={reduced} /><Heading size={18}>{hi ? 'थोड़ा आराम' : 'A little rest'}</Heading><Body tone="soft">{ui('parent.breakReminder', prefs)}</Body><Text style={s.big}>{breakLeft}</Text><Row style={{ paddingHorizontal: 0 }}><BigButton kind="ghost" label={hi ? 'वापस पाठ पर' : 'Back to the lesson'} onPress={() => setState(takeBreak(state, false))} /></Row></View></Card>
        ) : state.phase === 'done' ? (
          <Card accent={P.ok}><View style={{ alignItems: 'center', gap: 8 }}>
            <CharacterSprite characterKey="dadaji" pose="clap" expression="proud" size={120} reducedMotion={reduced} />
            <Heading size={20} colour={P.ok}>{hi ? 'शाबाश! पाठ पूरा।' : 'Shabash! Lesson complete.'}</Heading>
            {finished ? <Body style={{ fontFamily: FONT.bodyBold }}>{ui('rewards.earned', prefs, { stars: finished.stars, coins: finished.coins })}</Body> : null}
            {!little ? <><Body tone="soft" size={13}>{ui('lesson.objective', prefs)}: {tx(lesson.meta.objective, prefs)}</Body></> : null}
            <Row style={{ paddingHorizontal: 0, marginTop: 6 }}>
              {lesson.assignment && catalog.assignmentById(lesson.assignment) ? <BigButton kind="green" label={ui('lesson.realworld', prefs)} onPress={() => nav.replace('Assignment', { assignmentId: lesson.assignment! })} testID="lesson-assignment" /> : null}
              <BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} testID="lesson-back" />
            </Row></View></Card>
        ) : step?.type === 'dialogue' ? (
          <>
            {helper ? <Body tone="soft" size={13} style={{ paddingHorizontal: 18, paddingTop: 8 }}>{helper}</Body> : null}
            {variant ? <Body tone="soft" size={12} style={{ paddingHorizontal: 18 }}>{state.variant === 'simpler' ? (hi ? 'आसान समझ' : 'Simpler explanation') : state.variant === 'advanced' ? (hi ? 'आगे की बात' : 'Going further') : (hi ? 'एक और उदाहरण' : 'Another example')}</Body> : null}
            <Row style={{ marginTop: 6 }}><BigButton kind="ghost" label={ui('common.listen', prefs)} onPress={() => void speak(lineText, step.who)} testID="lesson-listen" /><BigButton label={ui('common.next', prefs)} onPress={advance} testID="lesson-next" /></Row>
            {controls}
          </>
        ) : step?.type === 'activity' ? (
          <>
            {helper ? <Body tone="soft" size={13} style={{ paddingHorizontal: 18, paddingTop: 8 }}>{helper}</Body> : null}
            <ActivityView key={`${state.stepIndex}-${state.attempts > 0 && state.lastResult && !state.lastResult.ok ? 'r' : 'a'}`} spec={step.activity} level={level} prefs={prefs} result={state.lastResult} disabled={state.activityDone} onAnswer={(a) => setState(pick(lesson, state, a))} />
            {state.lastResult ? <SpeechBubble who="dadaji" text={tx(state.lastResult.feedback, prefs)} /> : null}
            <Row style={{ marginTop: 6 }}>
              {state.lastResult && !state.lastResult.ok ? <BigButton kind="ghost" label={ui('common.tryAgain', prefs)} onPress={() => setState(retry(state))} testID="lesson-retry" /> : null}
              <BigButton label={ui('common.next', prefs)} onPress={advance} disabled={!canAdvance(lesson, state)} testID="lesson-next" />
            </Row>
            {controls}
          </>
        ) : step?.type === 'quiz' ? (
          <>
            {helper ? <Body tone="soft" size={13} style={{ paddingHorizontal: 18, paddingTop: 8 }}>{helper}</Body> : null}
            <View style={s.grid}>
              {step.items.map((it) => { const st = pickedKey === it.key ? (state.lastResult ? (state.lastResult.ok ? 'ok' : 'no') : 'selected') : null; return (
                <View key={it.key} style={{ width: '47%', flexGrow: 1 }}>
                  <QuizChoice label={tx(it.label, prefs)} icon={it.icon ?? it.key} little={little} state={st} disabled={state.quizCorrect} onPress={() => setState(pick(lesson, state, it.key))} testID={`quiz-${it.key}`} />
                </View>); })}
            </View>
            {state.lastResult ? <SpeechBubble who="dadaji" text={state.lastResult.ok ? `${ui('lesson.well', prefs)} ${tx(step.explain, prefs)}` : ui('lesson.again', prefs)} /> : null}
            <Row style={{ marginTop: 6 }}>
              {state.lastResult && !state.lastResult.ok ? <BigButton kind="ghost" label={ui('common.tryAgain', prefs)} onPress={() => setState(retry(state))} testID="lesson-retry" /> : null}
              <BigButton kind="green" label={ui('common.next', prefs)} onPress={advance} disabled={!canAdvance(lesson, state)} testID="lesson-next" />
            </Row>
            {controls}
          </>
        ) : step?.type === 'echo' ? (
          <>
            <View style={{ marginLeft: 28 }}><SpeechBubble who="chintu" text={echoRepeated ? lineText : '…'} /></View>
            <Body tone="soft" size={12} style={{ paddingHorizontal: 18 }}>{hi ? `गूँज ${Math.min(echoIndex + 1, step.clauses.length)}/${step.clauses.length}` : `Echo ${Math.min(echoIndex + 1, step.clauses.length)}/${step.clauses.length}`}</Body>
            <Row style={{ marginTop: 6 }}>
              <BigButton kind="ghost" label={ui('common.listen', prefs)} onPress={() => void speak(lineText, 'mitthu')} testID="lesson-listen" />
              {!echoRepeated ? <BigButton label={hi ? 'मैंने दोहराया' : 'I repeated it'} onPress={() => { setEchoRepeated(true); void speak(lineText, 'chintu'); }} testID="echo-repeat" />
                : echoIndex + 1 < step.clauses.length ? <BigButton label={ui('common.next', prefs)} onPress={() => { setEchoIndex(echoIndex + 1); setEchoRepeated(false); }} testID="lesson-next" />
                : <BigButton kind="green" label={ui('common.done', prefs)} onPress={advance} testID="lesson-next" />}
            </Row>
          </>
        ) : null}
      </ScrollView>
      <Toast text={toast} />
    </View>
  );
}

import { ActivityIcon } from '../activities';
/** A quiz choice card: picture in Little mode, label in Explorer mode; green when right, warm when a retry is needed. */
export function QuizChoice({ label, icon, little, state, disabled, onPress, testID }: { label: string; icon?: string; little: boolean; state: 'ok' | 'no' | 'selected' | null; disabled?: boolean; onPress: () => void; testID?: string }) {
  const border = state === 'ok' ? P.ok : state === 'no' ? P.retry : state === 'selected' ? P.saffron : P.line;
  const bg = state === 'ok' ? P.okSoft : state === 'no' ? P.retrySoft : P.card;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} testID={testID} style={({ pressed }) => [s.choice, { borderColor: border, backgroundColor: bg, minHeight: little ? 118 : 72, opacity: pressed ? 0.85 : 1 }]}>
      {little ? <ActivityIcon name={icon} size={76} label={label} /> : null}
      <Text style={[s.choiceText, little && { fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center', padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8 },
  title: { fontFamily: FONT.displayHeavy, fontSize: 18, flex: 1 },
  overlay: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,246,229,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: P.line },
  roundText: { fontFamily: FONT.displayHeavy, fontSize: 20, color: P.indigo },
  steps: { flex: 1, flexDirection: 'row', gap: 4 },
  stepBar: { flex: 1, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
  phase: { fontFamily: FONT.displayHeavy, fontSize: 12, color: P.clay, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 14, paddingTop: 4 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14 },
  choice: { borderWidth: 3, borderRadius: 20, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  choiceText: { fontFamily: FONT.display, fontSize: 15, color: P.ink, textAlign: 'center' },
  big: { fontFamily: FONT.displayHeavy, fontSize: 40, color: P.monsoon },
});
