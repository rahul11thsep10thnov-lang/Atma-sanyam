import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { catalog } from '../../content';
import { buildAssessment, buildOlympiad, emptyProgress, isCorrect, recordAnswer, resultWeight, SET_LENGTH } from '../../engines/assessment';
import type { AssessmentSet, AssessmentType, SetProgress } from '../../engines/assessment';
import { updateMastery, masteryState } from '../../engines/mastery';
import { grant } from '../../engines/rewards';
import { nextEcho } from '../../engines/echo';
import { CharacterSprite } from '../../render';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Progress, Row, SpeechBubble, useLittle } from '../../ui';
import { QuizChoice } from '../lesson/LessonScreen';
import type { DaduStackParamList } from '../../navigation/types';

const TYPES: { key: AssessmentType; en: string; hi: string; bands: string[] }[] = [
  { key: 'daily', en: 'Daily practice', hi: 'दैनिक अभ्यास', bands: ['A1', 'A2', 'A3', 'A4', 'A5'] },
  { key: 'chapter', en: 'Chapter', hi: 'अध्याय', bands: ['A2', 'A3', 'A4', 'A5'] },
  { key: 'subject', en: 'Subject', hi: 'विषय', bands: ['A3', 'A4', 'A5'] },
  { key: 'weekly', en: 'Weekly', hi: 'साप्ताहिक', bands: ['A2', 'A3', 'A4', 'A5'] },
  { key: 'monthly', en: 'Monthly', hi: 'मासिक', bands: ['A3', 'A4', 'A5'] },
  { key: 'revision', en: 'Revision', hi: 'दोहराव', bands: ['A1', 'A2', 'A3', 'A4', 'A5'] },
  { key: 'comprehensive', en: 'Comprehensive', hi: 'व्यापक', bands: ['A4', 'A5'] },
  { key: 'challenge', en: 'Challenge', hi: 'चुनौती', bands: ['A3', 'A4', 'A5'] },
  { key: 'olympiad', en: 'Olympiad practice', hi: 'ओलंपियाड अभ्यास', bands: ['A4', 'A5'] },
];

/** Dadaji is the quiz master. Feedback is immediate and never shames; the result lists concepts, never a single score. */
export function TestsTab() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, level, prefs, updateWorld, logEvent } = useDadu();
  const { speak } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const little = useLittle();
  const hi = prefs.primary === 'hi';
  const band = child?.band ?? 'A3';
  const [set, setSet] = useState<AssessmentSet | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState<SetProgress>(emptyProgress());
  const [done, setDone] = useState(false);

  const start = (type: AssessmentType) => {
    const pool = catalog.lessonsForBand(band);
    const s = type === 'olympiad' ? buildOlympiad(pool, level, Date.now()) : buildAssessment(type, pool, level, world?.mastery ?? {}, Date.now());
    setSet(s); setIndex(0); setPicked(null); setRight(false); setAttempt(0); setProgress(emptyProgress()); setDone(false);
    void speak(hi ? 'चलो बेटा, कुछ सवाल। गलती से कोई डर नहीं।' : 'Come, beta, a few questions. No fear of mistakes.', 'dadaji');
  };
  const item = set?.items[index];
  const answer = (key: string) => {
    if (!item || !child) return;
    const ok = isCorrect(item.kind, item.items, key);
    const a = attempt + 1;
    setPicked(key); setRight(ok); setAttempt(a);
    if (ok || a >= 2) {
      const p = recordAnswer(progress, item, ok, a);
      setProgress(p);
      const r = resultWeight(item.kind, ok, a);
      updateWorld((w) => ({ ...w, mastery: { ...w.mastery, [item.concept]: updateMastery(w.mastery[item.concept], item.concept, r, child.difficulty, Date.now()) } }));
    }
  };
  const nextItem = () => {
    if (!set) return;
    if (index + 1 >= set.items.length) { setDone(true); updateWorld((w) => grant(w, { stars: 1, coins: 5 })); logEvent('activity'); void speak(hi ? 'शाबाश! कल फिर मिलेंगे।' : 'Shabash! Same time tomorrow.', 'dadaji'); return; }
    setIndex(index + 1); setPicked(null); setRight(false); setAttempt(0);
  };
  const echo = world && child ? nextEcho({ band, level, lessons: catalog.LESSON_BY_ID, completedInOrder: world.lessonsCompleted, mastery: world.mastery, lastOpenedAt: 0, now: Date.now(), echoedLessonIds: [], parentRequestLessonId: world.lessonsCompleted[world.lessonsCompleted.length - 1] }) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }} testID="screen-tests">
      <View style={s.head}><CharacterSprite characterKey="dadaji" pose="teach" expression="happy" size={96} reducedMotion={reduced} /><View style={{ flex: 1 }}><Heading>{hi ? 'परीक्षा और चुनौतियाँ' : 'Tests and Challenges'}</Heading><Body tone="soft" size={13}>{hi ? 'दादाजी क्विज़ मास्टर हैं' : 'Dadaji is the quiz master'}</Body></View></View>
      {!set ? (
        <>
          <SpeechBubble who="dadaji" text={hi ? 'कौन-सा अभ्यास करें, बेटा?' : 'Which practice shall we do, beta?'} />
          <View style={s.types}>{TYPES.filter((t) => t.bands.includes(band)).map((t) => <View key={t.key} style={{ width: '47%', flexGrow: 1 }}><BigButton kind={t.key === 'daily' ? 'primary' : 'ghost'} label={`${hi ? t.hi : t.en} · ${SET_LENGTH[t.key]}`} onPress={() => start(t.key)} testID={`test-start-${t.key}`} /></View>)}</View>
          {!little && world ? <Card><Heading size={16}>{hi ? 'अवधारणाएँ' : 'Concepts'}</Heading>{Object.values(world.mastery).length === 0 ? <Body tone="soft">{hi ? 'पहले एक पाठ पूरा करो।' : 'Complete a lesson first.'}</Body> : Object.values(world.mastery).slice(0, 8).map((m) => { const st = masteryState(m, Date.now()); return <View key={m.concept} style={{ marginTop: 6 }}><Row style={{ paddingHorizontal: 0, justifyContent: 'space-between' }}><Body size={13}>{m.concept.replace(/[._-]/g, ' ')}</Body><Chip label={st} colour={st === 'mastered' ? P.peepal : st === 'needs-revision' ? P.clay : P.saffron} /></Row><Progress value={m.score} colour={st === 'needs-revision' ? P.clay : P.peepal} /></View>; })}</Card> : null}
          {echo ? <Row><BigButton kind="ghost" label={hi ? 'मिट्ठू के साथ दोहराओ' : 'Revise with Mitthu'} onPress={() => nav.navigate('Echo')} testID="tests-echo" /></Row> : null}
        </>
      ) : done ? (
        <Card accent={P.ok}><View style={{ alignItems: 'center', gap: 8 }}>
          <CharacterSprite characterKey="dadaji" pose="clap" expression="proud" size={110} reducedMotion={reduced} />
          <Heading size={20} colour={P.ok}>{hi ? 'अभ्यास पूरा!' : 'Practice complete!'}</Heading>
          <Body tone="soft" size={13}>{hi ? `${progress.correct}/${progress.answered} सही, ${progress.firstTry} पहली बार में` : `${progress.correct} of ${progress.answered} right, ${progress.firstTry} first time`}</Body>
          <View style={{ width: '100%' }}>
            {Object.entries(progress.byConcept).map(([c, v]) => <Row key={c} style={{ paddingHorizontal: 0, justifyContent: 'space-between', marginTop: 6 }}><Body size={13}>{c.replace(/[._-]/g, ' ')}</Body><Chip label={v.correct === v.total ? (hi ? 'पक्का' : 'Secure') : (hi ? 'फिर देखें' : 'Revisit')} colour={v.correct === v.total ? P.peepal : P.saffron} /></Row>)}
          </View>
          <Row style={{ paddingHorizontal: 0, marginTop: 6 }}>{echo ? <BigButton kind="ghost" label={hi ? 'मिट्ठू के साथ दोहराओ' : 'Revise with Mitthu'} onPress={() => nav.navigate('Echo')} /> : null}<BigButton label={ui('common.done', prefs)} onPress={() => setSet(null)} testID="test-done" /></Row>
        </View></Card>
      ) : item ? (
        <>
          <View style={{ paddingHorizontal: 14 }}><Progress value={index / set.items.length} /><Text style={s.counter}>{index + 1}/{set.items.length}</Text></View>
          <SpeechBubble who="dadaji" text={tx(item.question, prefs)} />
          <View style={s.grid}>{item.items.map((it) => <View key={it.key} style={{ width: '47%', flexGrow: 1 }}><QuizChoice label={tx(it.label, prefs)} icon={it.icon ?? it.key} little={little || item.kind === 'image'} state={picked === it.key ? (right ? 'ok' : 'no') : null} disabled={right || attempt >= 2} onPress={() => answer(it.key)} testID={`quiz-${it.key}`} /></View>)}</View>
          {picked ? <SpeechBubble who="dadaji" text={right ? `${ui('lesson.well', prefs)} ${tx(item.explain, prefs)}` : attempt >= 2 ? `${hi ? 'कोई बात नहीं।' : 'No matter.'} ${tx(item.explain, prefs)}` : ui('lesson.again', prefs)} /> : null}
          <Row style={{ marginTop: 6 }}>
            {picked && !right && attempt < 2 ? <BigButton kind="ghost" label={ui('common.tryAgain', prefs)} onPress={() => setPicked(null)} testID="test-retry" /> : null}
            <BigButton kind="green" label={index + 1 >= set.items.length ? (hi ? 'परिणाम' : 'Result') : ui('common.next', prefs)} onPress={nextItem} disabled={!(right || attempt >= 2)} testID="test-next" />
          </Row>
          <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={hi ? 'बाद में' : 'Later'} onPress={() => setSet(null)} /></Row>
        </>
      ) : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14 },
  counter: { fontFamily: FONT.displayHeavy, fontSize: 12, color: P.inkSoft, textAlign: 'right', marginTop: 2 },
});
