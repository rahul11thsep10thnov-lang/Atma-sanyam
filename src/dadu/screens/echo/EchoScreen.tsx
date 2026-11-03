import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { useAudio } from '../../audio/useAudio';
import { catalog } from '../../content';
import { nextEcho, startEcho, echoRepeat, echoDone } from '../../engines/echo';
import type { EchoSession } from '../../engines/echo';
import { CharacterSprite } from '../../render';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P } from '../../ui/palette';
import { BigButton, Body, Card, Heading, Row, SpeechBubble } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

/** Mitthu's Echo: Mitthu repeats key clauses from recent lessons; Chintu repeats after him. Revision only. */
export function EchoScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, level, prefs, updateWorld, hold, release } = useDadu();
  const { speak, stop } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const hi = prefs.primary === 'hi';
  const session: EchoSession | null = useMemo(() => {
    if (!child || !world) return null;
    const queued = world.echoQueue[world.echoQueue.length - 1];
    return nextEcho({ band: child.band, level, lessons: catalog.LESSON_BY_ID, completedInOrder: world.lessonsCompleted, mastery: world.mastery, lastOpenedAt: 0, now: Date.now(), echoedLessonIds: [], parentRequestLessonId: queued ?? world.lessonsCompleted[world.lessonsCompleted.length - 1] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);
  const [st, setSt] = useState(session ? startEcho(session) : null);
  const [repeated, setRepeated] = useState(false);
  useEffect(() => { hold(['chintu', 'mitthu']); return () => { release(['chintu', 'mitthu']); stop(); }; }, [hold, release, stop]);
  const clause = session && st && !echoDone(st, session) ? tx(session.clauses[st.index], prefs) : null;
  useEffect(() => { if (clause) void speak(clause, 'mitthu'); }, [clause, speak]);
  const finishSession = () => {
    if (session) updateWorld((w) => ({ ...w, echoQueue: w.echoQueue.filter((id) => !session.lessonIds.includes(id)) }));
    nav.goBack();
  };
  const title = session ? { 'lesson-count': [hi ? 'हाल के पाठ' : 'Recent lessons'], 'end-of-topic': [hi ? 'विषय पूरा हुआ' : 'Topic finished'], 'mastery-dip': [hi ? 'थोड़ा दोहराव' : 'A little revision'], 'parent-request': [hi ? 'दोहराव' : 'Revision'], 'return-after-absence': [hi ? 'वापसी पर दोहराव' : 'Welcome back revision'] }[session.trigger][0] : '';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }} testID="screen-echo">
      <View style={{ alignItems: 'center', gap: 4 }}><CharacterSprite characterKey="mitthu" expression={repeated ? 'happy' : 'talk'} size={100} reducedMotion={reduced} /><Heading colour={P.peepal}>{ui('lesson.steps.echo', prefs)}</Heading><Body tone="soft" size={13}>{title}</Body></View>
      {!session || !st ? (
        <Card><Body>{hi ? 'अभी दोहराने को कुछ नहीं। पहले एक पाठ पूरा करो।' : 'Nothing to revise yet. Complete a lesson first.'}</Body><Row style={{ paddingHorizontal: 0, marginTop: 8 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row></Card>
      ) : echoDone(st, session) ? (
        <Card accent={P.ok}><View style={{ alignItems: 'center', gap: 6 }}><CharacterSprite characterKey="chintu" pose="clap" expression="proud" size={100} reducedMotion={reduced} /><Heading size={18} colour={P.ok}>{hi ? 'दोहराव पूरा!' : 'Revision complete!'}</Heading><Row style={{ paddingHorizontal: 0, marginTop: 6 }}><BigButton kind="green" label={ui('common.done', prefs)} onPress={finishSession} testID="echo-done" /></Row></View></Card>
      ) : (
        <>
          <Body tone="soft" size={12} style={{ paddingHorizontal: 18 }}>{st.index + 1}/{session.clauses.length}</Body>
          <SpeechBubble who="mitthu" text={clause ?? ''} />
          <View style={{ marginLeft: 28 }}><SpeechBubble who="chintu" text={repeated ? clause ?? '' : '…'} /></View>
          <Row style={{ marginTop: 8 }}>
            <BigButton kind="ghost" label={ui('common.listen', prefs)} onPress={() => clause && void speak(clause, 'mitthu')} testID="echo-listen" />
            {!repeated ? <BigButton label={hi ? 'मैंने दोहराया' : 'I repeated it'} onPress={() => { setRepeated(true); if (clause) void speak(clause, 'chintu'); }} testID="echo-repeat" /> : <BigButton kind="green" label={ui('common.next', prefs)} onPress={() => { setSt(echoRepeat(st, session)); setRepeated(false); }} testID="echo-next" />}
          </Row>
        </>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({});
void s;
