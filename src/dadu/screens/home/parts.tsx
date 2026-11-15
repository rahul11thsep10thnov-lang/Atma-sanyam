import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ART } from '../../art';
import { P, FONT } from '../../ui/palette';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import type { DaduStackParamList } from '../../navigation/types';

/** "← Home" pill plus a big title. */
export function ScreenHeader({ title, colour }: { title: string; colour?: string }) {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { prefs } = useDadu();
  return (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={ui('common.back', prefs)} onPress={() => nav.navigate('Tabs')} style={s.home} testID="back-home"><Text style={s.homeText}>←  {prefs.primary === 'hi' ? 'घर' : 'Home'}</Text></Pressable>
      <Text style={[s.title, { color: colour ?? P.indigo }]} numberOfLines={1}>{title}</Text>
    </View>
  );
}

/** A picture card: a painted image with the title over a soft strip. */
export function PictureCard({ image, title, tag, done, onPress, width, height = 128, testID }: { image?: number; title: string; tag?: string; done?: boolean; onPress: () => void; width: number; height?: number; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} testID={testID} style={({ pressed }) => [s.card, { width, height, opacity: pressed ? 0.88 : 1 }]}>
      {image ? <Image source={image} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', resizeMode: 'cover' }} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: P.cream }]} />}
      {done ? <View style={s.done}><Text style={s.doneText}>✓</Text></View> : null}
      {tag ? <View style={s.tag}><Text style={s.tagText}>{tag}</Text></View> : null}
      <View style={s.strip}><Text style={s.cardTitle} numberOfLines={2}>{title}</Text></View>
    </Pressable>
  );
}

export const roomImage = (key: string) => ART.rooms[key]?.src as number | undefined;
export const pageImage = (key: string) => ART.story[key]?.src as number | undefined;

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  home: { backgroundColor: P.card, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: P.line, minHeight: 44, justifyContent: 'center' },
  homeText: { fontFamily: FONT.displayHeavy, fontSize: 15, color: P.indigo },
  title: { flex: 1, fontFamily: FONT.displayHeavy, fontSize: 26 },
  card: { borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: P.cream, elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  strip: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,246,229,0.93)', paddingHorizontal: 10, paddingVertical: 7 },
  cardTitle: { fontFamily: FONT.display, fontSize: 14, lineHeight: 18, color: P.ink },
  done: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: P.ok, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#fff', fontFamily: FONT.displayHeavy, fontSize: 16 },
  tag: { position: 'absolute', top: 8, left: 8, backgroundColor: P.saffron, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: '#fff', fontFamily: FONT.displayHeavy, fontSize: 12 },
});
