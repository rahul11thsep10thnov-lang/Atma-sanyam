import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { SPEED_TABLE } from '../../audio/mixer';
import { catalog } from '../../content';
import { startReader, nextSentence, nextPage, prevPage, paceMs, questionsFor, sentencesOf } from '../../engines/stories';
import type { ReaderState } from '../../engines/stories';
import { grant } from '../../engines/rewards';
import { SideScene, CharacterSprite } from '../../render';
import type { SideCharacter } from '../../render';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row, SpeechBubble, useLittle } from '../../ui';
import { QuizChoice } from '../lesson/LessonScreen';
import { sceneForIllustration } from './illustration';
import type { DaduStackParamList } from '../../navigation/types';

export function StoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Story'>>();
  const { world, level, prefs, updateWorld, logEvent, hold, release } = useDadu();
  const { speak, stop, mixer } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const little = useLittle();
  const story = catalog.storyById(route.params.storyId);
  const bedtime = !!route.params.bedtime;
  const hi = prefs.primary === 'hi';
  const [rs, setRs] = useState<ReaderState | null>(story ? startReader(story, Date.now(), bedtime) : null);
  const [auto, setAuto] = useState(!mixer.muted);
  const [vocab, setVocab] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { hold(['dadaji', 'chintu']); return () => { release(['dadaji', 'chintu']); stop(); if (timer.current) clearTimeout(timer.current); }; }, [hold, release, stop]);

  const page = story && rs ? story.pages[rs.page] : null;
  const sentences = useMemo(() => (page ? sentencesOf(tx(page.text, prefs)) : []), [page, prefs]);
  const current = sentences[rs?.sentence ?? 0] ?? '';

  // read-along: speak the current sentence and auto-advance at the pace
  useEffect(() => {
    if (!story || !rs || rs.finished || !current) return;
    if (!mixer.muted) void speak(current, 'dadaji');
    if (!auto) return;
    const ms = paceMs(current, rs.bedtime, SPEED_TABLE[mixer.narrationSpeed].rate);
    timer.current = setTimeout(() => setRs((s) => (s ? nextSentence(story, s, prefs.primary) : s)), ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [story, rs, current, auto, mixer.muted, mixer.narrationSpeed, speak, prefs.primary]);

  // finish: mark read, one star, log
  useEffect(() => {
    if (!story || !rs?.finished || rewarded) return;
    setRewarded(true);
    updateWorld((w) => grant({ ...w, storiesRead: w.storiesRead.includes(story.meta.id) ? w.storiesRead : [...w.storiesRead, story.meta.id] }, { stars: w.storiesRead.includes(story.meta.id) ? 0 : 1 }));
    logEvent('story');
  }, [story, rs?.finished, rewarded, updateWorld, logEvent]);

  if (!story || !rs || !world) return <View style={s.center}><Body>{hi ? 'कहानी नहीं मिली।' : 'Story not found.'}</Body><Row style={{ marginTop: 10 }}><BigButton label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></View>;

  const scene = sceneForIllustration(page?.illustration ?? '');
  const chars: SideCharacter[] = [{ key: 'dadaji', x: 60, pose: 'sit', expression: 'talk', facing: 'right', talking: true }, ...scene.extras.map((k, i) => ({ key: k, x: 230 + i * 70, facing: 'left' as const, expression: rs.bedtime ? ('sleepy' as const) : ('listen' as const) }))];
  const questions = questionsFor(story, level, rs.bedtime);
  const q = questions[qIndex];
  const night = rs.bedtime;
  const bg = night ? P.night : P.paper;
  const ink = night ? '#F6EEDC' : P.ink;

  const answer = (key: string) => { if (!q) return; setPicked(key); const ok = !!q.items.find((i) => i.key === key)?.ok; setRight(ok); };
  const nextQ = () => { setPicked(null); setRight(false); setQIndex(qIndex + 1); };

  return (
    <View style={{ flex: 1, backgroundColor: bg }} testID="screen-story">
      <SideScene background={scene.background} time={night ? 'night' : world.time} weather={world.weather} season={world.season} characters={chars} reducedMotion={reduced} style={{ height: little ? 190 : 170 }} />
      <View style={s.head}><Text style={[s.title, { color: night ? '#FFE08A' : P.indigo }]} numberOfLines={1}>{tx(story.title, prefs)}</Text><Chip label={`${Math.min(rs.page + 1, story.pages.length)}/${story.pages.length}`} /></View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        {!rs.finished && page ? (
          <>
            <View style={[s.pageBox, night && { backgroundColor: '#272C52', borderColor: '#3B4270' }]}>
              <Text style={[s.pageText, { color: ink }, little && { fontSize: 19, lineHeight: 28 }]} accessibilityLabel={tx(page.text, prefs)}>
                {sentences.map((sn, i) => <Text key={i} style={i === rs.sentence ? s.hl : undefined}>{sn}{' '}</Text>)}
              </Text>
            </View>
            {story.vocabulary.length ? <View style={s.vocab}>{story.vocabulary.map((v) => <Chip key={v.word.en} label={tx(v.word, prefs)} selected={vocab === v.word.en} onPress={() => setVocab(vocab === v.word.en ? null : v.word.en)} />)}</View> : null}
            {vocab ? <SpeechBubble who="dadaji" text={tx(story.vocabulary.find((v) => v.word.en === vocab)!.meaning, prefs)} /> : null}
            <Row style={{ marginTop: 8 }}>
              <BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => setRs(prevPage(rs))} disabled={rs.page === 0} />
              <BigButton kind="ghost" label={auto ? (hi ? 'रोको' : 'Pause') : ui('common.listen', prefs)} onPress={() => { if (auto) { setAuto(false); stop(); } else { setAuto(true); void speak(current, 'dadaji'); } }} testID="story-listen" />
              <BigButton label={rs.page + 1 >= story.pages.length ? (night ? (hi ? 'समाप्त' : 'The end') : (hi ? 'सवाल' : 'Questions')) : ui('common.next', prefs)} onPress={() => setRs(nextPage(story, rs))} testID="story-next" />
            </Row>
          </>
        ) : night || !questions.length || qIndex >= questions.length ? (
          <Card accent={night ? '#3B4270' : P.ok} style={night ? { backgroundColor: '#272C52' } : undefined}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <CharacterSprite characterKey="dadaji" pose={night ? 'sit' : 'clap'} expression={night ? 'sleepy' : 'proud'} size={110} reducedMotion={reduced} />
              <Heading size={20} colour={night ? '#FFE08A' : P.ok}>{night ? (hi ? 'शुभ रात्रि, बेटा।' : 'Good night, beta.') : (hi ? 'कहानी पूरी!' : 'Story complete!')}</Heading>
              <Body style={{ color: ink, textAlign: 'center' }}>{tx(story.moral, prefs)}</Body>
              {night ? <Body tone="soft" size={12} style={{ color: '#C9BFAE', textAlign: 'center' }}>{hi ? 'सवाल कल सुबह।' : 'Questions wait for the morning.'}</Body> : null}
              <Row style={{ paddingHorizontal: 0, marginTop: 6 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} testID="story-back" /></Row>
            </View>
          </Card>
        ) : (
          <>
            <Body tone="soft" size={12} style={{ paddingHorizontal: 18 }}>{hi ? `सवाल ${qIndex + 1}/${questions.length}` : `Question ${qIndex + 1}/${questions.length}`}</Body>
            <SpeechBubble who="dadaji" text={tx(q.question, prefs)} />
            <View style={s.grid}>{q.items.map((it) => <View key={it.key} style={{ width: '47%', flexGrow: 1 }}><QuizChoice label={tx(it.label, prefs)} icon={it.icon ?? it.key} little={little} state={picked === it.key ? (right ? 'ok' : 'no') : null} disabled={right} onPress={() => answer(it.key)} testID={`quiz-${it.key}`} /></View>)}</View>
            {picked ? <SpeechBubble who="dadaji" text={right ? `${ui('lesson.well', prefs)} ${tx(q.explain, prefs)}` : ui('lesson.again', prefs)} /> : null}
            <Row style={{ marginTop: 6 }}>{picked && !right ? <BigButton kind="ghost" label={ui('common.tryAgain', prefs)} onPress={() => setPicked(null)} /> : null}<BigButton kind="green" label={ui('common.next', prefs)} onPress={nextQ} disabled={!right} testID="story-next" /></Row>
          </>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center', padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8 },
  title: { fontFamily: FONT.displayHeavy, fontSize: 18, flex: 1 },
  pageBox: { margin: 14, marginBottom: 6, backgroundColor: P.card, borderWidth: 3, borderColor: P.line, borderRadius: 22, padding: 14 },
  pageText: { fontFamily: FONT.body, fontSize: 16, lineHeight: 24 },
  hl: { backgroundColor: '#FFE08A', color: P.ink, borderRadius: 4, fontFamily: FONT.bodyBold },
  vocab: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 14 },
});
