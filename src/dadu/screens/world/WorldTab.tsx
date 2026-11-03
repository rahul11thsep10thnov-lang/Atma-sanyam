// The Miniverse map: the world is the dashboard. One isometric map of the
// whole town, Dadaji's suggestion for today, the sim clock and a daily plan.
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDadu } from '../../state/DaduContext';
import { ui, tx } from '../../i18n';
import { LOCATION_BY_ID } from '../../core/locations';
import { IsoScene, layoutFor } from '../../render';
import type { IsoObject } from '../../render';
import { catalog } from '../../content';
import { P, FONT } from '../../ui/palette';
import { Chip, SpeechBubble } from '../../ui';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { DaduStackParamList } from '../../navigation/types';

export function useTodayPlan() {
  const { child, world } = useDadu();
  return useMemo(() => {
    if (!child || !world) return { lesson: undefined, story: undefined, assignment: undefined };
    const lesson = catalog.lessonsForBand(child.band).find((l) => !world.lessonsCompleted.includes(l.meta.id));
    const story = catalog.storiesForBand(child.band).find((s) => !world.storiesRead.includes(s.meta.id)) ?? catalog.storiesForBand(child.band)[0];
    const assignment = catalog.ASSIGNMENTS.find((a) => a.meta.bands.includes(child.band) && world.assignments[a.meta.id]?.status !== 'completed');
    return { lesson, story, assignment };
  }, [child, world]);
}

export function TopBar() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { world, prefs, mode } = useDadu();
  return (
    <View style={s.top}>
      <View><Text style={s.wordmark}>DADU</Text><Text style={s.sub}>{prefs.primary === 'hi' ? 'दादाजी का मिनीवर्स' : "Dadaji's Miniverse"}</Text></View>
      <View style={{ flex: 1 }} />
      <Chip label={`★ ${world?.rewards.stars ?? 0}`} />
      {mode === 'explorer' && <Chip label={`◎ ${world?.rewards.coins ?? 0}`} />}
      <Pressable accessibilityRole="button" accessibilityLabel={ui('parent.gate', prefs)} onPress={() => nav.navigate('ParentGate', { next: 'ParentDashboard' })} style={s.lock} testID="parent-lock"><Text style={s.lockText}>🔒</Text></Pressable>
    </View>
  );
}

export function WorldTab() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const { child, world, prefs, mode } = useDadu();
  const reduced = useReducedMotion();
  const plan = useTodayPlan();
  const hi = prefs.primary === 'hi';
  const { objects, targets } = useMemo(() => {
    const targets: Record<string, string> = {};
    const objects: IsoObject[] = layoutFor('map').map((o) => {
      if (!o.label) return o;
      targets[o.id] = o.label;
      const loc = LOCATION_BY_ID[o.label];
      return { ...o, label: loc ? (hi ? loc.name.hi : loc.name.en) : o.label };
    });
    return { objects, targets };
  }, [hi]);
  if (!child || !world) return null;
  const mapLoc = LOCATION_BY_ID.map;
  const greeting = plan.lesson
    ? (hi ? `आज: ${tx(plan.lesson.title, prefs)}। चलें?` : `Today: ${tx(plan.lesson.title, prefs)}. Shall we?`)
    : (hi ? 'कहाँ चलें, बेटा? घर, बगीचा, या पुस्तकालय?' : 'Where shall we go, beta? The house, the garden, or the library?');
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID="screen-world">
      <TopBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={s.chips}>
          <Chip label={ui(`time.${world.time}`, prefs)} /><Chip label={ui(`weather.${world.weather}`, prefs)} /><Chip label={ui(`season.${world.season}`, prefs)} />
        </View>
        <View style={s.map}>
          <IsoScene location={mapLoc} time={world.time} weather={world.weather} season={world.season} objects={objects} little={mode !== 'explorer'} reducedMotion={reduced}
            characters={world.positions.filter((p) => p.key === 'dadaji' || p.key === 'chintu' || p.key === 'buddy').map((p, i) => ({ ...p, location: 'map', x: 11 + i, y: 7 + (i % 2), facing: 'se' as const, activity: 'walk' as const }))}
            onTapObject={(id) => { const target = targets[id]; if (target) nav.navigate('Location', { id: target }); }} />
        </View>
        <SpeechBubble who="dadaji" text={greeting} />
        <View style={s.plan}>
          {[
            { key: 'learn', label: hi ? 'सीखो' : 'Learn', sub: plan.lesson ? tx(plan.lesson.title, prefs) : '', colour: P.indigo, go: () => plan.lesson && nav.navigate('Lesson', { lessonId: plan.lesson.meta.id, objectId: plan.lesson.host }) },
            { key: 'enjoy', label: hi ? 'आनंद लो' : 'Enjoy', sub: plan.story ? tx(plan.story.title, prefs) : '', colour: P.rose, go: () => plan.story && nav.navigate('Story', { storyId: plan.story.meta.id }) },
            { key: 'do', label: hi ? 'करो' : 'Do', sub: plan.assignment ? tx(plan.assignment.title, prefs) : '', colour: P.peepal, go: () => plan.assignment && nav.navigate('Assignment', { assignmentId: plan.assignment.meta.id }) },
          ].map((t) => (
            <Pressable key={t.key} accessibilityRole="button" accessibilityLabel={`${t.label}: ${t.sub}`} onPress={t.go} testID={`plan-${t.key}`} style={[s.planTile, { backgroundColor: t.colour }]}>
              <Text style={s.planLabel}>{t.label}</Text>
              {mode === 'explorer' && !!t.sub && <Text style={s.planSub} numberOfLines={2}>{t.sub}</Text>}
            </Pressable>
          ))}
        </View>
        <View style={s.places}>
          {['villa.exterior', 'garden.vegetables', 'animalia.cowshed', 'town.public_garden', 'town.library', 'town.bazaar', ...(child.templeEnabled ? ['town.temple'] : []), 'excursion.space'].map((id) => (
            <Chip key={id} label={hi ? LOCATION_BY_ID[id].name.hi : LOCATION_BY_ID[id].name.en} onPress={() => nav.navigate('Location', { id })} testID={`place-${id}`} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 44, paddingBottom: 6 },
  wordmark: { fontFamily: FONT.displayHeavy, fontSize: 22, color: P.indigo, letterSpacing: 1, lineHeight: 26 },
  sub: { fontFamily: FONT.bodyBold, fontSize: 10, color: P.clay },
  lock: { width: 40, height: 36, borderRadius: 999, borderWidth: 2, borderColor: P.line, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center' },
  lockText: { fontSize: 16 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 4, flexWrap: 'wrap' },
  map: { height: 360, marginHorizontal: 14, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: P.line },
  plan: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, marginTop: 4 },
  planTile: { flex: 1, minHeight: 84, borderRadius: 20, padding: 10, justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,.18)' },
  planLabel: { fontFamily: FONT.displayHeavy, color: '#fff', fontSize: 17 },
  planSub: { fontFamily: FONT.bodyBold, color: '#fff', fontSize: 11, opacity: 0.9 },
  places: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 12 },
});
