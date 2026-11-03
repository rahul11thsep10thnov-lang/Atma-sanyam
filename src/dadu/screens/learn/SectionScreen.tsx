import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { SECTIONS } from '../../core/worlds';
import type { SectionKey } from '../../core/worlds';
import { LOCATION_BY_ID } from '../../core/locations';
import { catalog } from '../../content';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Progress, Row, SpeechBubble } from '../../ui';
import type { DaduStackParamList } from '../../navigation/types';

const ALIGNMENT: Record<SectionKey, string> = { academic: 'NCERT · CBSE · ICSE · IB PYP · Cambridge Primary', stem: 'CBSE Computer Science · ICSE Computer Applications · IB PYP', music: 'NCERT Arts · Prayag Sangeet Samiti (intro)', art: 'NCERT Arts Education · ICSE Art', sports: 'NCERT Health and Physical Education', nature: 'NCERT EVS · CBSE Life Skills', mind: 'NCF 2022 foundational skills', explore: 'NCERT Social Science · General Knowledge' };

export function SectionScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Section'>>();
  const { child, world, prefs, level } = useDadu();
  const sec = SECTIONS.find((x) => x.key === route.params.section) ?? SECTIONS[0];
  const hi = prefs.primary === 'hi';
  if (!child || !world) return null;
  const lessons = catalog.lessonsForBand(child.band, sec.key);
  const done = lessons.filter((l) => world.lessonsCompleted.includes(l.meta.id)).length;
  const pick = lessons.find((l) => !world.lessonsCompleted.includes(l.meta.id));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingTop: 44, paddingBottom: 30 }} testID={`screen-section-${sec.key}`}>
      <View style={[s.hero, { backgroundColor: sec.colour }]}><Heading size={24} colour="#fff">{hi ? sec.name.hi : sec.name.en}</Heading><Body style={{ color: '#fff' }}>{done}/{lessons.length} {hi ? 'पाठ पूरे' : 'lessons done'}</Body><View style={{ marginTop: 6 }}><Progress value={lessons.length ? done / lessons.length : 0} colour="#fff" /></View></View>
      <SpeechBubble who="dadaji" text={pick ? (hi ? `दादाजी की पसंद: ${tx(pick.title, prefs)}` : `Dadaji's pick: ${tx(pick.title, prefs)}`) : (hi ? 'इस खंड के सारे पाठ पूरे! शाबाश।' : 'Every lesson in this section is done! Shabash.')} />
      {pick && <Row><BigButton label={ui('common.start', prefs)} onPress={() => nav.navigate('Lesson', { lessonId: pick.meta.id, objectId: pick.host })} testID="section-start" /></Row>}
      <Card>
        {lessons.map((l) => { const host = catalog.objectById(l.host); const loc = host ? LOCATION_BY_ID[host.location] : undefined; return (
          <Row key={l.meta.id} style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
            <View style={{ flex: 1 }}><Body style={{ fontFamily: FONT.bodyBold }}>{world.lessonsCompleted.includes(l.meta.id) ? '✓ ' : ''}{tx(l.title, prefs)}</Body>{level === 'explorer' && <Body tone="soft" size={12}>{loc ? (hi ? loc.name.hi : loc.name.en) : ''} · {l.meta.topic} · {l.meta.bands.join(' ')}</Body>}</View>
            <Chip label={ui('common.start', prefs)} onPress={() => nav.navigate('Lesson', { lessonId: l.meta.id, objectId: l.host })} testID={`lesson-${l.meta.id}`} />
          </Row>); })}
        {lessons.length === 0 && <Body tone="soft">{hi ? 'इस आयु के लिए पाठ जल्द आ रहे हैं।' : 'Lessons for this age are on their way.'}</Body>}
      </Card>
      {level === 'explorer' && <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'पाठ्यक्रम' : 'Curriculum'}</Body><Body tone="soft" size={12}>{ALIGNMENT[sec.key]}</Body></Card>}
      <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row>
    </ScrollView>
  );
}
const s = StyleSheet.create({ hero: { marginHorizontal: 14, borderRadius: 24, padding: 16, gap: 4 } });
