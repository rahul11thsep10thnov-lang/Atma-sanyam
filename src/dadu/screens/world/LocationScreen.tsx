// One location of the Miniverse: the isometric room or garden, its
// interactive objects, the characters who are there, and the side-view
// activity that opens on top of it through the camera transition.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useDadu } from '../../state/DaduContext';
import { ui, tx } from '../../i18n';
import { LOCATIONS, LOCATION_BY_ID, canonicalLocation } from '../../core/locations';
import type { CharacterKey } from '../../core/characters';
import type { CharacterPosition } from '../../core/worldState';
import { CameraTransition, IsoScene, SideScene, backgroundForLocation, layoutFor, useCamera } from '../../render';
import type { IsoCharacter, SideCharacter } from '../../render';
import { catalog } from '../../content';
import { PLANT_CATALOG } from '../../engines';
import { useAudio } from '../../audio/useAudio';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { P } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Heading, Row, SpeechBubble } from '../../ui';
import { activityFor, buildSceneObjects } from './sceneObjects';
import { WorldActivity, animalForLocation } from './WorldActivity';
import type { WorldActivityKind } from './WorldActivity';
import { EXCURSION_FACTS } from './excursions';
import type { DaduStackParamList } from '../../navigation/types';

const VILLA_ROOMS = LOCATIONS.filter((l) => l.parent === 'villa.exterior').map((l) => l.id);

export function LocationScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DaduStackParamList>>();
  const route = useRoute<RouteProp<DaduStackParamList, 'Location' | 'Activity'>>();
  const rawId = 'id' in route.params ? route.params.id : catalog.objectById(route.params.objectId)?.location ?? 'villa.living';
  const id = canonicalLocation(rawId);
  const loc = LOCATION_BY_ID[id] ?? LOCATION_BY_ID['villa.living'];
  const { child, world, prefs, mode, level, hold, release, updateWorld } = useDadu();
  const { speak } = useAudio(prefs.primary);
  const reduced = useReducedMotion();
  const camera = useCamera(loc.id, loc.camera);
  const [selected, setSelected] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ who: CharacterKey; text: string; objective?: string } | null>(null);
  const [activity, setActivity] = useState<{ kind: WorldActivityKind; objectId?: string; plantId?: string } | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const hi = prefs.primary === 'hi';
  const little = mode !== 'explorer';

  const built = useMemo(() => buildSceneObjects(loc.id, layoutFor(loc.id), catalog.objectsForLocation(loc.id), world, prefs.primary, PLANT_CATALOG), [loc.id, world, prefs.primary]);

  // Dadaji teaches here, so he is always present; the location's idlers join if routines left them elsewhere.
  const characters = useMemo<IsoCharacter[]>(() => {
    if (!world) return [];
    const here = world.positions.filter((p) => p.location === loc.id);
    const keys = new Set(here.map((p) => p.key));
    const extra: CharacterPosition[] = [];
    const wanted: CharacterKey[] = ['dadaji', ...loc.idlers];
    wanted.forEach((k, i) => { if (!keys.has(k)) { keys.add(k); extra.push({ key: k, location: loc.id, x: Math.max(0, loc.entry.x - 1 + i), y: Math.max(0, loc.entry.y - 1 - (i % 2)), facing: 'sw', activity: k === 'dadaji' ? 'teach' : 'idle' }); } });
    return [...here, ...extra].map((p) => ({ ...p, talking: !!bubble && bubble.who === p.key }));
  }, [world, loc, bubble]);

  // hold the characters who take part in an activity so routines do not move them mid-way
  useEffect(() => {
    if (!activity) return;
    const held: CharacterKey[] = ['dadaji', 'chintu', ...(activity.kind === 'animal' ? [animalForLocation(loc.id, loc.idlers)] : [])];
    hold(held);
    return () => release(held);
  }, [activity, hold, release, loc]);

  const openActivity = useCallback((kind: WorldActivityKind, objectId?: string, plantId?: string) => {
    setActivity({ kind, objectId, plantId });
    camera.enterActivity(loc.id, kind, objectId);
  }, [camera, loc.id]);

  const onTapObject = useCallback((isoId: string) => {
    setSelected(isoId);
    const obj = built.content[isoId];
    const lesson = obj?.lesson ? catalog.lessonById(obj.lesson) : catalog.lessonForObject(isoId);
    if (lesson) { nav.navigate('Lesson', { lessonId: lesson.meta.id, objectId: isoId }); return; }
    const act = activityFor(obj, isoId);
    if (act) { openActivity(act, isoId, built.plants[isoId]?.id); return; }
    const text = obj ? tx(obj.preview, prefs) : (hi ? 'चलो इसे साथ देखें।' : 'Let us look at this together.');
    const objective = !little && obj ? `${ui('lesson.objective', prefs)}: ${hi ? 'पूरा पाठ जल्द ही (' + obj.section + ')' : 'full lesson coming soon (' + obj.section + ')'}` : undefined;
    setBubble({ who: 'dadaji', text, objective });
    void speak(text, 'dadaji');
  }, [built, nav, openActivity, prefs, hi, little, speak]);

  // excursions are side-view scenes with Dadaji's facts
  const isExcursion = loc.camera === 'side';
  const facts = EXCURSION_FACTS[loc.id] ?? [];
  useEffect(() => { if (isExcursion && facts[factIndex]) void speak(hi ? facts[factIndex].hi : facts[factIndex].en, 'dadaji'); }, [isExcursion, factIndex, facts, hi, speak]);

  if (!child || !world) return null;

  const sideCharacters: SideCharacter[] = [
    { key: 'dadaji', x: 80, pose: 'teach', expression: 'happy', facing: 'right', talking: !!bubble },
    { key: 'chintu', x: 200, pose: 'stand', expression: 'happy', facing: 'left' },
    ...(activity?.kind === 'animal' ? [{ key: animalForLocation(loc.id, loc.idlers), x: 290, pose: 'stand' as const, expression: 'happy' as const, facing: 'left' as const }] : loc.idlers.filter((k) => k !== 'dadaji' && k !== 'chintu').slice(0, 1).map((k) => ({ key: k, x: 300, facing: 'left' as const }))),
  ];
  const background = backgroundForLocation(loc.id);
  const name = hi ? loc.name.hi : loc.name.en;

  const header = (
    <View style={s.header}>
      <Chip label={`← ${ui('world.leave', prefs)}`} onPress={() => nav.navigate('Tabs', { screen: 'World' })} testID="back-to-world" />
      <Heading size={18}>{name}</Heading>
      {!isExcursion && <Chip label={ui('world.switchCamera', prefs)} onPress={() => { if (camera.kind === 'side' && activity) { setActivity(null); camera.exitActivity(); } else camera.toggle(); }} testID="switch-camera" />}
    </View>
  );

  if (isExcursion) {
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }} testID={`screen-location-${loc.id}`}>
        {header}
        <View style={s.scene}><SideScene background={background} time={world.time} weather={world.weather} season={world.season} characters={sideCharacters} reducedMotion={reduced} /></View>
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <SpeechBubble who="dadaji" text={facts[factIndex] ? (hi ? facts[factIndex].hi : facts[factIndex].en) : name} />
          <Row><BigButton kind="ghost" label={ui('common.listen', prefs)} onPress={() => facts[factIndex] && void speak(hi ? facts[factIndex].hi : facts[factIndex].en, 'dadaji')} /><BigButton label={factIndex < facts.length - 1 ? ui('common.next', prefs) : ui('common.done', prefs)} onPress={() => { if (factIndex < facts.length - 1) setFactIndex(factIndex + 1); else { updateWorld((w) => ({ ...w, unlockedLocations: w.unlockedLocations.includes(loc.id) ? w.unlockedLocations : [...w.unlockedLocations, loc.id] })); nav.goBack(); } }} testID="excursion-next" /></Row>
          <Row style={{ marginTop: 10 }}>{Object.keys(EXCURSION_FACTS).filter((k) => k !== loc.id).map((k) => <Chip key={k} label={hi ? LOCATION_BY_ID[k].name.hi : LOCATION_BY_ID[k].name.en} onPress={() => nav.replace('Location', { id: k })} />)}</Row>
        </ScrollView>
      </View>
    );
  }

  const iso = (
    <IsoScene location={loc} time={world.time} weather={world.weather} season={world.season} objects={built.objects} characters={characters} little={little} reducedMotion={reduced}
      selectedObject={selected ?? undefined} onTapObject={onTapObject} onTapCharacter={(k) => { const line = hi ? `${k === 'dadaji' ? 'हाँ बेटा?' : 'नमस्ते!'}` : (k === 'dadaji' ? 'Yes, beta?' : 'Hello!'); setBubble({ who: k, text: line }); void speak(line, k); }} />
  );
  const side = (
    <View style={{ flex: 1 }}>
      <View style={s.sideScene}><SideScene background={background} time={world.time} weather={world.weather} season={world.season} characters={sideCharacters} reducedMotion={reduced} /></View>
      <View style={{ flex: 1 }}>
        {activity ? <WorldActivity kind={activity.kind} locationId={loc.id} objectId={activity.objectId} plantId={activity.plantId} onDone={() => { setActivity(null); camera.exitActivity(); }} /> : <ScrollView><SpeechBubble who="dadaji" text={hi ? 'यहाँ से हम काम करते हैं। किसी चीज़ पर जाने के लिए दृश्य बदलो।' : 'This is where we do things. Change view to tap an object.'} /></ScrollView>}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }} testID={`screen-location-${loc.id}`}>
      {header}
      <View style={{ flex: 1 }}><CameraTransition kind={camera.kind} iso={iso} side={side} reducedMotion={reduced} /></View>
      {camera.kind === 'iso' && (
        <View style={s.footer}>
          <SpeechBubble who={bubble?.who ?? 'dadaji'} text={bubble?.text ?? ui('world.tap', prefs)}>{bubble?.objective ? <Body tone="soft" size={12}>{bubble.objective}</Body> : null}</SpeechBubble>
          {VILLA_ROOMS.includes(loc.id) && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rooms}>{VILLA_ROOMS.filter((r) => r !== loc.id).map((r) => <Chip key={r} label={hi ? LOCATION_BY_ID[r].name.hi : LOCATION_BY_ID[r].name.en} onPress={() => nav.replace('Location', { id: r })} testID={`room-${r}`} />)}</ScrollView>}
          {loc.id === 'villa.exterior' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rooms}>{['villa.veranda', 'villa.living', 'garden.vegetables', 'animalia.cowshed'].map((r) => <Chip key={r} label={hi ? LOCATION_BY_ID[r].name.hi : LOCATION_BY_ID[r].name.en} onPress={() => nav.replace('Location', { id: r })} testID={`room-${r}`} />)}</ScrollView>}
          {(loc.id.startsWith('garden.') || loc.id.startsWith('animalia.')) && <Row style={{ paddingBottom: 8 }}>{loc.id.startsWith('garden.') ? <BigButton kind="green" label={hi ? 'बगीचे का काम' : 'Garden work'} onPress={() => openActivity('garden')} testID="open-garden" /> : <BigButton kind="green" label={hi ? 'देखभाल करो' : 'Care for them'} onPress={() => openActivity('animal')} testID="open-animal" />}</Row>}
          {loc.id === 'villa.kitchen' && <Row style={{ paddingBottom: 8 }}><BigButton kind="green" label={hi ? 'खाना बनाओ' : 'Cook something'} onPress={() => openActivity('kitchen')} testID="open-kitchen" /></Row>}
          {level === 'explorer' && <Card><Body tone="soft" size={12}>{hi ? `${catalog.lessonsAtLocation(loc.id).length} पाठ यहाँ · ${built.objects.filter((o) => o.interactive).length} चीज़ें छूने के लिए` : `${catalog.lessonsAtLocation(loc.id).length} lessons here · ${built.objects.filter((o) => o.interactive).length} things to tap`}</Body></Card>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 44, paddingBottom: 6, flexWrap: 'wrap' },
  scene: { height: 220, marginHorizontal: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: P.line },
  sideScene: { height: 200, borderBottomWidth: 3, borderBottomColor: P.line },
  footer: { maxHeight: 260 },
  rooms: { gap: 6, paddingHorizontal: 14, paddingBottom: 6 },
});
