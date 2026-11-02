// Manual verification screen: every character in every view, pose and
// expression; every location in the isometric view with its default props;
// every side-view background; and the camera transition. Reachable from the
// parent dashboard's developer section and in the web export.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CHARACTERS } from '../core/characters';
import type { CharacterKey } from '../core/characters';
import { LOCATIONS } from '../core/locations';
import { createWorldState } from '../core/worldState';
import type { TimeOfDay, Weather } from '../core/worldState';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AnimationClock } from './clock';
import { CharacterFace, CharacterSprite } from './characters';
import { IsoScene } from './iso/IsoScene';
import { DEFAULT_LAYOUTS } from './iso/defaultLayouts';
import { SideScene } from './side/SideScene';
import { SIDE_BACKGROUND_KEYS } from './side/backgrounds';
import { CameraTransition } from './camera';
import { palette } from './palette';
import { SPRITE_EXPRESSIONS, SPRITE_POSES, SPRITE_VIEWS } from './types';

const KEYS = Object.keys(CHARACTERS) as CharacterKey[];
const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rainy', 'stormy', 'foggy'];

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}><Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{label}</Text></Pressable>;
}

export function RenderPlayground() {
  const reduced = useReducedMotion();
  const [time, setTime] = useState<TimeOfDay>('morning');
  const [weather, setWeather] = useState<Weather>('sunny');
  const [locIndex, setLocIndex] = useState(1);
  const [bgIndex, setBgIndex] = useState(0);
  const [camera, setCamera] = useState<'iso' | 'side'>('iso');
  const [world] = useState(() => createWorldState(Date.now()));
  const loc = LOCATIONS[locIndex];
  const characters = world.positions.map((p, i) => ({ ...p, location: loc.id, x: Math.min(loc.size.w - 1, 1 + (i * 2) % Math.max(1, loc.size.w)), y: Math.min(loc.size.d - 1, 2 + Math.floor(i / 3) * 2) }));
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>DADU render playground</Text>
      <Text style={styles.p}>Characters, isometric locations, side-view backgrounds and the camera transition. Reduced motion: {reduced ? 'on' : 'off'}.</Text>

      <Text style={styles.h2}>Height chart</Text>
      <AnimationClock enabled={!reduced}>
        <View style={styles.row}>{KEYS.map((k) => <View key={k} style={styles.cell}><CharacterSprite characterKey={k} size={120 * (CHARACTERS[k].heightWu / CHARACTERS.dadaji.heightWu)} pose="stand" expression="happy" /><Text style={styles.cap}>{CHARACTERS[k].name.en}</Text></View>)}</View>
        <Text style={styles.h2}>Faces</Text>
        <View style={styles.row}>{KEYS.map((k) => <View key={k} style={styles.cell}><CharacterFace characterKey={k} size={56} expression="happy" /></View>)}</View>
        {KEYS.map((k) => (
          <View key={k}>
            <Text style={styles.h2}>{CHARACTERS[k].name.en}: views and poses</Text>
            {SPRITE_VIEWS.map((v) => (
              <View key={v} style={styles.row}>
                {SPRITE_POSES.map((p) => <View key={p} style={styles.cell}><CharacterSprite characterKey={k} size={90} view={v} pose={p} /><Text style={styles.cap}>{v} {p}</Text></View>)}
              </View>
            ))}
            <View style={styles.row}>{SPRITE_EXPRESSIONS.map((e) => <View key={e} style={styles.cell}><CharacterSprite characterKey={k} size={90} expression={e} /><Text style={styles.cap}>{e}</Text></View>)}</View>
          </View>
        ))}
      </AnimationClock>

      <Text style={styles.h2}>Isometric locations</Text>
      <View style={styles.row}>{TIMES.map((t) => <Chip key={t} label={t} on={time === t} onPress={() => setTime(t)} />)}</View>
      <View style={styles.row}>{WEATHERS.map((w) => <Chip key={w} label={w} on={weather === w} onPress={() => setWeather(w)} />)}</View>
      <View style={styles.row}>{LOCATIONS.map((l, i) => <Chip key={l.id} label={l.id} on={locIndex === i} onPress={() => setLocIndex(i)} />)}</View>
      <View style={styles.scene}>
        <IsoScene location={loc} time={time} weather={weather} season="summer" objects={DEFAULT_LAYOUTS[loc.id] ?? []} characters={characters} reducedMotion={reduced} onTapObject={() => undefined} />
      </View>

      <Text style={styles.h2}>Side-view backgrounds</Text>
      <View style={styles.row}>{SIDE_BACKGROUND_KEYS.map((b, i) => <Chip key={b} label={b} on={bgIndex === i} onPress={() => setBgIndex(i)} />)}</View>
      <SideScene background={SIDE_BACKGROUND_KEYS[bgIndex]} time={time} weather={weather} season="summer" reducedMotion={reduced} characters={[{ key: 'dadaji', x: 90, pose: 'teach', expression: 'talk', talking: true }, { key: 'chintu', x: 170, pose: 'stand', expression: 'surprised' }, { key: 'buddy', x: 250, pose: 'walk', expression: 'happy' }, { key: 'chikki', x: 320, pose: 'stand', expression: 'think' }]} />

      <Text style={styles.h2}>Camera transition</Text>
      <View style={styles.row}><Chip label="Isometric" on={camera === 'iso'} onPress={() => setCamera('iso')} /><Chip label="Side view" on={camera === 'side'} onPress={() => setCamera('side')} /></View>
      <View style={styles.scene}>
        <CameraTransition kind={camera} reducedMotion={reduced}
          iso={<IsoScene location={LOCATIONS[3]} time={time} weather={weather} season="summer" objects={DEFAULT_LAYOUTS['villa.living']} characters={world.positions} reducedMotion={reduced} showZoomControls={false} />}
          side={<SideScene background="living" time={time} reducedMotion={reduced} characters={[{ key: 'dadaji', x: 110, pose: 'teach' }, { key: 'chintu', x: 220, pose: 'clap', expression: 'laugh' }]} />} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper },
  content: { padding: 16, gap: 8, paddingBottom: 60 },
  h1: { fontSize: 24, fontWeight: '800', color: palette.indigo },
  h2: { fontSize: 17, fontWeight: '800', color: palette.clay, marginTop: 12 },
  p: { color: palette.inkSoft },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'flex-end' },
  cell: { alignItems: 'center', padding: 4 },
  cap: { fontSize: 10, color: palette.inkSoft },
  scene: { height: 360, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: palette.line },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 2, borderColor: palette.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: palette.indigo, borderColor: palette.indigo },
  chipTxt: { fontSize: 12, fontWeight: '700', color: palette.ink },
  chipTxtOn: { color: '#fff' },
});
