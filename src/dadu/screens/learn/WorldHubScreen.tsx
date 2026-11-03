import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { SECTIONS, WORLD_BY_KEY } from '../../core/worlds';
import type { WorldKey } from '../../core/worlds';
import { LOCATION_BY_ID } from '../../core/locations';
import { CharacterSprite, AnimationClock } from '../../render';
import { catalog } from '../../content';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row } from '../../ui';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { DaduStackParamList } from '../../navigation/types';

export function WorldHubScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'WorldHub'>>();
  const { child, world, prefs } = useDadu();
  const reduced = useReducedMotion();
  const w = WORLD_BY_KEY[route.params.world as WorldKey] ?? WORLD_BY_KEY.home;
  const hi = prefs.primary === 'hi';
  if (!child || !world) return null;
  const lessons = catalog.lessonsForBand(child.band).filter((l) => l.world === w.key || w.sections.includes(l.meta.section) && w.locations.includes(catalog.objectById(l.host)?.location ?? ''));
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingTop: 44, paddingBottom: 30 }} testID={`screen-world-${w.key}`}>
      <View style={[s.hero, { backgroundColor: w.colour }]}>
        <Heading size={24} colour="#fff">{hi ? w.name.hi : w.name.en}</Heading>
        <Body style={{ color: '#fff' }}>{hi ? w.tagline.hi : w.tagline.en}</Body>
        <AnimationClock enabled={!reduced} fps={8}><Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{['dadaji', ...w.companions].slice(0, 4).map((k) => <CharacterSprite key={k} characterKey={k} size={k === 'dadaji' ? 110 : 80} expression="happy" reducedMotion={reduced} />)}</Row></AnimationClock>
      </View>
      <View style={s.h}><Heading size={17}>{hi ? 'जगहें' : 'Places'}</Heading></View>
      <Row>{w.locations.filter((id) => LOCATION_BY_ID[id]).map((id) => <Chip key={id} label={hi ? LOCATION_BY_ID[id].name.hi : LOCATION_BY_ID[id].name.en} onPress={() => nav.navigate('Location', { id })} testID={`place-${id}`} />)}</Row>
      <View style={s.h}><Heading size={17}>{hi ? 'पाठ' : 'Lessons'}</Heading></View>
      {SECTIONS.filter((sec) => lessons.some((l) => l.meta.section === sec.key)).map((sec) => (
        <Card key={sec.key} accent={sec.colour}>
          <Body style={{ fontFamily: FONT.bodyBold, color: sec.colour }}>{hi ? sec.name.hi : sec.name.en}</Body>
          {lessons.filter((l) => l.meta.section === sec.key).map((l) => (
            <Row key={l.meta.id} style={{ paddingHorizontal: 0, marginTop: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
              <Body style={{ flex: 1 }}>{world.lessonsCompleted.includes(l.meta.id) ? '✓ ' : ''}{tx(l.title, prefs)}</Body>
              <Chip label={ui('common.start', prefs)} onPress={() => nav.navigate('Lesson', { lessonId: l.meta.id, objectId: l.host })} testID={`lesson-${l.meta.id}`} />
            </Row>
          ))}
        </Card>
      ))}
      {lessons.length === 0 && <Card><Body tone="soft">{hi ? 'इस दुनिया के पाठ जल्द आ रहे हैं। तब तक जगहों में घूमो।' : 'Lessons for this world are on their way. Explore its places meanwhile.'}</Body></Card>}
      <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={ui('common.back', prefs)} onPress={() => nav.goBack()} /></Row>
    </ScrollView>
  );
}
const s = StyleSheet.create({ hero: { marginHorizontal: 14, borderRadius: 24, padding: 16, gap: 4 }, h: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 } });
