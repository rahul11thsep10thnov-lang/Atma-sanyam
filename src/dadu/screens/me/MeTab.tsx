import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { ui } from '../../i18n';
import { AGE_BANDS } from '../../core/ageBands';
import { CharacterSprite, AnimationClock } from '../../render';
import { BADGES, badgeById } from '../../engines';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row } from '../../ui';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { TopBar } from '../world/WorldTab';
import type { DaduStackParamList } from '../../navigation/types';

const SKINS = ['tan', 'wheat', 'brown', 'deep'] as const;
const TOPS = ['yellow', 'blue', 'green', 'pink'] as const;

export function MeTab() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs, mode, updateProfile } = useDadu();
  const reduced = useReducedMotion();
  const hi = prefs.primary === 'hi';
  if (!child || !world) return null;
  const band = AGE_BANDS.find((b) => b.key === child.band);
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-me">
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.hero}>
          <AnimationClock enabled={!reduced} fps={8}><CharacterSprite characterKey="chintu" size={150} pose="wave" expression="happy" reducedMotion={reduced} /></AnimationClock>
          <Heading size={24}>{child.name}</Heading>
          <Body tone="soft">{band ? (hi ? band.label.hi : band.label.en) : ''} · {ui(`mode.${mode}`, prefs)}</Body>
          <Row style={{ paddingHorizontal: 0, marginTop: 6 }}><Chip label={`★ ${world.rewards.stars} ${ui('rewards.stars', prefs)}`} /><Chip label={`◎ ${world.rewards.coins} ${ui('rewards.coins', prefs)}`} /><Chip label={`${world.rewards.badges.length} ${ui('rewards.badges', prefs)}`} /></Row>
        </View>
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'मेरा अवतार' : 'My avatar'}</Body><Body tone="soft" size={12}>{hi ? 'दादाजी और दोस्त वैसे ही रहते हैं; यह सिर्फ़ तुम्हारी तस्वीर है।' : 'Dadaji and the friends never change; this is only your own picture.'}</Body>
          <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{SKINS.map((k) => <Chip key={k} label={{ tan: hi ? 'गेहुँआ' : 'Tan', wheat: hi ? 'हल्का' : 'Wheat', brown: hi ? 'भूरा' : 'Brown', deep: hi ? 'गहरा' : 'Deep' }[k]} selected={child.avatar.skin === k} onPress={() => updateProfile(child.id, { avatar: { ...child.avatar, skin: k } })} />)}</Row>
          <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{TOPS.map((k) => <Chip key={k} label={{ yellow: hi ? 'पीली' : 'Yellow', blue: hi ? 'नीली' : 'Blue', green: hi ? 'हरी' : 'Green', pink: hi ? 'गुलाबी' : 'Pink' }[k]} selected={child.avatar.top === k} onPress={() => updateProfile(child.id, { avatar: { ...child.avatar, top: k } })} />)}</Row></Card>
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'हाल के बैज' : 'Recent badges'}</Body><Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{world.rewards.badges.slice(-4).map((b) => { const bd = badgeById(b); return bd ? <Chip key={b} label={hi ? bd.name.hi ?? bd.name.en : bd.name.en} colour={P.saffron} /> : null; })}{world.rewards.badges.length === 0 && <Body tone="soft">{hi ? `पहला पाठ पूरा करो और "${BADGES[0].name.hi}" बैज पाओ।` : `Finish a first lesson to earn the "${BADGES[0].name.en}" badge.`}</Body>}</Row></Card>
        <Row style={{ marginTop: 6 }}><BigButton label={hi ? 'मेरी उपलब्धियाँ' : 'My Achievements'} onPress={() => nav.navigate('Achievements')} testID="me-achievements" /></Row>
        <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={hi ? "मिट्ठू की गूँज" : "Mitthu's Echo"} onPress={() => nav.navigate('Echo')} testID="me-echo" /><BigButton kind="ghost" label={ui('parent.gate', prefs)} onPress={() => nav.navigate('ParentGate', { next: 'ParentDashboard' })} /></Row>
        {mode === 'explorer' && <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={hi ? 'पात्र और दृश्य (प्लेग्राउंड)' : 'Characters and scenes (playground)'} onPress={() => nav.navigate('Playground')} testID="me-playground" /></Row>}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({ hero: { alignItems: 'center', paddingVertical: 10, gap: 2 } });
