// The illustrated learning tabs: twelve worlds, eight sections and the
// companion areas, all reachable without exploring the Miniverse.
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { tx, ui } from '../../i18n';
import { SECTIONS, worldsForMode } from '../../core/worlds';
import { CharacterFace } from '../../render';
import { P } from '../../ui/palette';
import { Heading, SectionTile, SpeechBubble } from '../../ui';
import { TopBar, useTodayPlan } from '../world/WorldTab';
import type { DaduStackParamList } from '../../navigation/types';

export function LearnTab() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, prefs, mode } = useDadu();
  const plan = useTodayPlan();
  const hi = prefs.primary === 'hi';
  if (!child) return null;
  const worlds = worldsForMode(mode, child.templeEnabled);
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-learn">
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <SpeechBubble who="dadaji" text={plan.lesson ? (hi ? `बेटा, आज ${tx(plan.lesson.title, prefs)} सीखें?` : `Beta, shall we learn ${tx(plan.lesson.title, prefs)} today?`) : (hi ? 'बेटा, आज क्या सीखें?' : 'Beta, what shall we learn today?')} />
        <View style={s.h}><Heading size={18}>{hi ? 'बारह दुनियाएँ' : 'Twelve worlds'}</Heading></View>
        <View style={s.grid}>{worlds.map((w) => <SectionTile key={w.key} label={hi ? w.name.hi : w.name.en} sub={hi ? w.tagline.hi : w.tagline.en} colour={w.colour} onPress={() => nav.navigate('WorldHub', { world: w.key })} testID={`world-${w.key}`} icon={<CharacterFace characterKey={w.companions[0] ?? 'chintu'} size={44} expression="happy" />} />)}</View>
        <View style={s.h}><Heading size={18}>{hi ? 'आठ खंड' : 'Eight sections'}</Heading></View>
        <View style={s.grid}>{SECTIONS.map((sec) => <SectionTile key={sec.key} label={hi ? sec.name.hi : sec.name.en} colour={sec.colour} onPress={() => nav.navigate('Section', { section: sec.key })} testID={`section-${sec.key}`} />)}</View>
        <View style={s.h}><Heading size={18}>{hi ? 'और भी' : 'Also'}</Heading></View>
        <View style={s.grid}>
          <SectionTile label={hi ? 'दादाजी की कहानियाँ' : "Dadaji's Story Corner"} colour="#8B5A2B" onPress={() => nav.navigate('Tabs', { screen: 'Stories' })} testID="companion-stories" />
          <SectionTile label={hi ? 'परीक्षा और चुनौतियाँ' : 'Tests and Challenges'} colour={P.monsoon} onPress={() => (mode === 'explorer' ? nav.navigate('Tabs', { screen: 'Tests' }) : nav.navigate('Echo'))} testID="companion-tests" />
          <SectionTile label={hi ? 'मेरी उपलब्धियाँ' : 'My Achievements'} colour={P.saffron} onPress={() => nav.navigate('Achievements')} testID="companion-achievements" />
          <SectionTile label={ui('parent.dashboard', prefs)} colour={P.indigo} onPress={() => nav.navigate('ParentGate', { next: 'ParentDashboard' })} testID="companion-parents" />
        </View>
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({ h: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 14 } });
