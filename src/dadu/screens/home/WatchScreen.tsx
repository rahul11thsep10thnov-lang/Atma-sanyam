// Watch & Learn: every lesson is an episode. Big painted cards, nothing else.
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { catalog } from '../../content';
import { tx } from '../../i18n';
import { backgroundForLocation } from '../../render';
import { canonicalLocation } from '../../core/locations';
import { P } from '../../ui/palette';
import { PictureCard, ScreenHeader, roomImage } from './parts';
import type { DaduStackParamList } from '../../navigation/types';

export function WatchScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs } = useDadu();
  const { width } = useWindowDimensions();
  const hi = prefs.primary === 'hi';
  const lessons = catalog.lessonsForBand(child?.band ?? 'A3');
  const done = new Set(world?.lessonsCompleted ?? []);
  const next = lessons.find((l) => !done.has(l.meta.id));
  const ordered = next ? [next, ...lessons.filter((l) => l !== next)] : lessons;
  const w = (width - 14 * 3) / 2;
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-watch">
      <ScreenHeader title={hi ? 'देखो और सीखो' : 'Watch & Learn'} colour={P.saffron} />
      <ScrollView contentContainerStyle={s.grid}>
        {ordered.map((l) => (
          <PictureCard key={l.meta.id} width={w} image={roomImage(backgroundForLocation(canonicalLocation(l.host)))} title={tx(l.title, prefs)} done={done.has(l.meta.id)} tag={l === next ? (hi ? 'आज' : 'Today') : undefined}
            onPress={() => nav.navigate('Lesson', { lessonId: l.meta.id })} testID={`watch-${l.meta.id}`} />
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 14, paddingBottom: 40, paddingTop: 6 } });
