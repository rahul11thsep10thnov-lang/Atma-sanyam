// Play: one stand-alone game for every kind of activity. Big emoji cards.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { GAME_NAMES, gamesFor } from '../../episode/games';
import { P, FONT } from '../../ui/palette';
import { ScreenHeader } from './parts';
import type { DaduStackParamList } from '../../navigation/types';

const COLOURS = [P.saffron, P.rose, P.peepal, P.monsoon, P.plum, P.clay];

export function PlayScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, level, prefs } = useDadu();
  const { width } = useWindowDimensions();
  const hi = prefs.primary === 'hi';
  const games = useMemo(() => gamesFor(child?.band ?? 'A3', level), [child?.band, level]);
  const w = (width - 14 * 3) / 2;
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-play">
      <ScreenHeader title={hi ? 'खेलो' : 'Play'} colour={P.peepal} />
      <ScrollView contentContainerStyle={s.grid}>
        {games.map((g, i) => (
          <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={g.title[hi ? 'hi' : 'en']} onPress={() => nav.navigate('Game', { lessonId: g.lessonId })} testID={`game-${g.kind}`}
            style={({ pressed }) => [s.card, { width: w, backgroundColor: COLOURS[i % COLOURS.length], opacity: pressed ? 0.88 : 1 }]}>
            <Text style={s.emoji}>{GAME_NAMES[g.kind].emoji}</Text>
            <Text style={s.name}>{g.title[hi ? 'hi' : 'en']}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 14, paddingBottom: 40, paddingTop: 6 },
  card: { minHeight: 130, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 3, borderColor: '#fff', elevation: 3 },
  emoji: { fontSize: 46 },
  name: { fontFamily: FONT.displayHeavy, fontSize: 16, color: '#fff', textAlign: 'center' },
});
