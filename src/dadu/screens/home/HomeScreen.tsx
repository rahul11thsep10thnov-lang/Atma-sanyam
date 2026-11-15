// The new home: one painted picture, Dadaji and Chintu, and three big buttons. Nothing else.
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EpisodeStage } from '../../episode/EpisodeStage';
import { isBedtimeHour } from '../../engines/stories';
import { P, FONT } from '../../ui/palette';
import { tx, ui } from '../../i18n';
import { useTodayPlan } from '../world/WorldTab';
import type { DaduStackParamList } from '../../navigation/types';

export function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs } = useDadu();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const plan = useTodayPlan();
  if (!child || !world) return null;
  const hi = prefs.primary === 'hi';
  const night = isBedtimeHour(Date.now());
  const greeting = night
    ? (hi ? `शुभ रात्रि, ${child.name}! एक सोने की कहानी?` : `Good evening, ${child.name}! A bedtime story?`)
    : plan.lesson
      ? (hi ? `नमस्ते ${child.name}! आज: ${tx(plan.lesson.title, prefs)}` : `Namaste ${child.name}! Today: ${tx(plan.lesson.title, prefs)}`)
      : (hi ? `नमस्ते ${child.name}! आज क्या करें?` : `Namaste ${child.name}! What shall we do today?`);
  const buttons = [
    { key: 'watch', emoji: '📺', label: hi ? 'देखो और सीखो' : 'Watch & Learn', colour: P.saffron, go: () => nav.navigate('Watch') },
    { key: 'stories', emoji: '📖', label: hi ? 'कहानियाँ' : 'Stories', colour: P.rose, go: () => nav.navigate('StoryList') },
    { key: 'play', emoji: '🎮', label: hi ? 'खेलो' : 'Play', colour: P.peepal, go: () => nav.navigate('Play') },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-home">
      <EpisodeStage room="veranda" fallbackBackground="veranda" height={height} floor={0.3} reducedMotion={reduced} night={night}
        cast={[{ key: 'dadaji', slot: 'left', talking: true, expression: 'idle' }, { key: 'chintu', slot: 'right', expression: 'idle' }]}>
        <View style={s.top} pointerEvents="box-none">
          <Text style={s.word}>DADU</Text>
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Stars" onPress={() => nav.navigate('Achievements')} style={s.pill} testID="home-stars"><Text style={s.pillText}>★ {world.rewards.stars}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={ui('parent.gate', prefs)} onPress={() => nav.navigate('ParentGate', { next: 'ParentDashboard' })} style={s.pill} testID="parent-lock"><Text style={s.pillText}>🔒</Text></Pressable>
        </View>
        <View style={s.bubble}><Text style={s.who}>{hi ? 'दादाजी' : 'DADAJI'}</Text><Text style={s.bubbleText} testID="home-greeting">{greeting}</Text></View>
        <View style={s.dock} pointerEvents="box-none">
          {buttons.map((b) => (
            <Pressable key={b.key} accessibilityRole="button" accessibilityLabel={b.label} onPress={b.go} testID={`home-${b.key}`} style={({ pressed }) => [s.big, { backgroundColor: b.colour, opacity: pressed ? 0.88 : 1 }]}>
              <Text style={s.emoji}>{b.emoji}</Text>
              <Text style={s.bigText}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
      </EpisodeStage>
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: FONT.displayHeavy, fontSize: 28, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6 },
  pill: { backgroundColor: 'rgba(255,246,229,0.94)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, justifyContent: 'center', borderWidth: 2, borderColor: P.line },
  pillText: { fontFamily: FONT.displayHeavy, fontSize: 16, color: P.indigo },
  bubble: { position: 'absolute', top: 74, left: 16, right: 16, backgroundColor: 'rgba(255,246,229,0.95)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 2, borderColor: P.line },
  who: { fontFamily: FONT.displayHeavy, fontSize: 11, color: P.clay, letterSpacing: 0.8 },
  bubbleText: { fontFamily: FONT.display, fontSize: 20, lineHeight: 26, color: P.ink },
  dock: { position: 'absolute', left: 12, right: 12, bottom: 18, flexDirection: 'row', gap: 10 },
  big: { flex: 1, minHeight: 124, borderRadius: 28, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6, borderWidth: 3, borderColor: '#FFFFFF', elevation: 4 },
  emoji: { fontSize: 40 },
  bigText: { fontFamily: FONT.displayHeavy, fontSize: 16, lineHeight: 19, color: '#FFFFFF', textAlign: 'center' },
});
