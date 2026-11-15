// Stories: painted covers. Tap to watch; the moon button reads it as a bedtime story.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { catalog } from '../../content';
import { tx } from '../../i18n';
import { P, FONT } from '../../ui/palette';
import { PictureCard, ScreenHeader, pageImage } from './parts';
import type { DaduStackParamList } from '../../navigation/types';

export function StoryListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs } = useDadu();
  const { width } = useWindowDimensions();
  const hi = prefs.primary === 'hi';
  const stories = catalog.storiesForBand(child?.band ?? 'A3');
  const read = new Set(world?.storiesRead ?? []);
  const w = width - 28;
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-stories">
      <ScreenHeader title={hi ? 'कहानियाँ' : 'Stories'} colour={P.rose} />
      <ScrollView contentContainerStyle={s.list}>
        {stories.map((st) => (
          <View key={st.meta.id}>
            <PictureCard width={w} height={170} image={pageImage(st.pages[0].illustration)} title={tx(st.title, prefs)} done={read.has(st.meta.id)} onPress={() => nav.navigate('Story', { storyId: st.meta.id })} testID={`story-${st.meta.id}`} />
            <Pressable accessibilityRole="button" accessibilityLabel={hi ? 'सोने की कहानी' : 'Bedtime story'} onPress={() => nav.navigate('Story', { storyId: st.meta.id, bedtime: true })} style={s.moon}><Text style={s.moonText}>🌙</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  list: { gap: 16, paddingHorizontal: 14, paddingBottom: 40, paddingTop: 6 },
  moon: { position: 'absolute', right: 10, top: 10, width: 46, height: 46, borderRadius: 23, backgroundColor: P.night, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  moonText: { fontFamily: FONT.display, fontSize: 22 },
});
