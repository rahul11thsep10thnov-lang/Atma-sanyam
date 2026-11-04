// DEVELOPMENT PROTOTYPE: the Solarpunk Botanical Conservatory. A separate
// screen, reachable only when EXPO_PUBLIC_SOLARPUNK_PROTOTYPE=1, that touches
// no production state: it does not read or write the garden, coins, timer or
// any saved data. Everything planted here is simulated and lives in memory.
//
// The 3D scene is three.js on an expo-gl view (the same stack the app used
// for its earlier 3D garden). Gestures: one finger orbits (or pans, by the
// toggle), two fingers pan and pinch-zoom and twist, a tap inspects.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, PixelRatio, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';
import { AppText } from '../../ui/AppText';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { SPECIES, PLANTS, TREES } from './catalog';
import { Engine, PickInfo, Stats, TimeOfDay } from './engine';
import { LANDSCAPE_STATES, SceneName } from './scenes';

type Labels = { id: string; speciesId: string; name: string; x: number; y: number }[];

export function SolarpunkPrototypeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const engineRef = useRef<Engine | null>(null);
  const rafRef = useRef<number | null>(null);
  const alive = useRef(true);
  const layout = useRef({ w: 0, h: 0 });
  const bufferW = useRef(0);
  const viewRef = useRef<View>(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>('Preparing the conservatory…');
  const [scene, setScene] = useState<SceneName>('conservatory');
  const [landscape, setLandscape] = useState(0);
  const [view, setView] = useState<'overview' | 'closeup' | 'landscape'>('overview');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [selected, setSelected] = useState<PickInfo | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [placeFree, setPlaceFree] = useState(0);
  const [picker, setPicker] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [cMode, setCMode] = useState<'shelf' | 'trees' | 'growth'>('shelf');
  const [cSpecies, setCSpecies] = useState('rose');
  const [cStage, setCStage] = useState(5);
  const [labels, setLabels] = useState<Labels>([]);
  const panModeRef = useRef(false);
  panModeRef.current = panMode;

  // ---- renderer -------------------------------------------------------------------------------------
  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const renderer = new THREE.WebGLRenderer({ context: gl as unknown as WebGLRenderingContext, antialias: Platform.OS === 'web', alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    const engine = new Engine(renderer, w, h, { quality: 'high', onStats: setStats, onSelect: setSelected, onLabels: setLabels, onPlaced: () => { setPlacing(null); setPicker(false); } });
    bufferW.current = w;
    engine.uiScale = layout.current.w > 0 ? w / layout.current.w : 1;
    engineRef.current = engine;
    if (__DEV__ || process.env.EXPO_PUBLIC_SOLARPUNK_PROTOTYPE === '1') (globalThis as unknown as { __solarpunk?: unknown }).__solarpunk = { engine, THREE };
    // building the first scene blocks the JS thread for about a second: show the busy card first
    setTimeout(() => {
      if (!alive.current) return;
      engine.setScene('conservatory');
      setBusy(null);
      setReady(true);
      let last = Date.now();
      const loop = () => {
        if (!alive.current) return;
        const now = Date.now();
        engine.frame((now - last) / 1000);
        last = now;
        (gl as unknown as { endFrameEXP?: () => void }).endFrameEXP?.();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }, 60);
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      engineRef.current?.dispose();
      engineRef.current = null;
      (globalThis as unknown as { __solarpunk?: unknown }).__solarpunk = undefined;
    };
  }, []);

  // ---- gestures ---------------------------------------------------------------------------------------
  const responder = useMemo(() => {
    let prev1: { x: number; y: number } | null = null;
    let prev2: { x: number; y: number; d: number; a: number } | null = null;
    let moved = false;
    let t0 = 0;
    let start = { x: 0, y: 0 };
    let startPage = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const t = e.nativeEvent.touches;
        prev1 = t[0] ? { x: t[0].pageX, y: t[0].pageY } : null;
        prev2 = null;
        moved = false;
        t0 = Date.now();
        start = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        startPage = prev1 ?? { x: 0, y: 0 };
      },
      onPanResponderMove: (e) => {
        const eng = engineRef.current;
        if (!eng) return;
        const t = e.nativeEvent.touches;
        if (t.length >= 2) {
          const a = t[0]!;
          const b = t[1]!;
          const mid = { x: (a.pageX + b.pageX) / 2, y: (a.pageY + b.pageY) / 2 };
          const d = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const ang = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
          if (prev2) {
            eng.panBy(mid.x - prev2.x, mid.y - prev2.y);
            if (prev2.d > 8) eng.zoomBy(d / prev2.d);
            let da = ang - prev2.a;
            da = Math.atan2(Math.sin(da), Math.cos(da));
            eng.rotateBy(da);
          }
          prev2 = { x: mid.x, y: mid.y, d, a: ang };
          prev1 = null;
          moved = true;
        } else if (t.length === 1) {
          const p = { x: t[0]!.pageX, y: t[0]!.pageY };
          if (prev2) {
            prev2 = null;
            prev1 = p;
            return;
          }
          if (prev1) {
            if (!moved && Math.hypot(p.x - startPage.x, p.y - startPage.y) > 8) moved = true;
            if (moved) {
              if (panModeRef.current) eng.panBy(p.x - prev1.x, p.y - prev1.y);
              else eng.orbitBy(p.x - prev1.x, p.y - prev1.y);
            }
          }
          prev1 = p;
        }
      },
      onPanResponderRelease: () => {
        const eng = engineRef.current;
        if (eng && !moved && Date.now() - t0 < 1000) eng.tap(start.x, start.y);
        prev1 = prev2 = null;
      },
    });
  }, []);

  // mouse wheel zoom on the web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = viewRef.current as unknown as HTMLElement | null;
    if (!el || !el.addEventListener) return;
    const on = (ev: WheelEvent) => {
      ev.preventDefault();
      engineRef.current?.zoomBy(Math.exp(-ev.deltaY * 0.0015));
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [ready]);

  // ---- actions ----------------------------------------------------------------------------------------
  const goScene = (name: SceneName) => {
    if (name === scene || busy) return;
    setBusy(name === 'arboretum' ? 'Growing the Grand Banyan…' : name === 'collection' ? 'Setting out the collection…' : 'Preparing the conservatory…');
    setSelected(null);
    setPlacing(null);
    setPicker(false);
    setTimeout(() => {
      const eng = engineRef.current;
      if (!eng) return;
      eng.setScene(name);
      if (name === 'arboretum') eng.setLandscapeState(landscape);
      if (name === 'collection') eng.setCollection(cMode, cSpecies, cStage);
      setScene(name);
      setView('overview');
      setBusy(null);
    }, 60);
  };
  const eng = () => engineRef.current;
  const pickView = (v: 'overview' | 'closeup' | 'landscape') => {
    setView(v);
    eng()?.setView(v);
  };
  const chooseLandscape = (i: number) => {
    setLandscape(i);
    pickView('landscape');
    setSelected(null);
    eng()?.setLandscapeState(i);
  };
  const startPlace = (id: string) => {
    const n = eng()?.startPlacement(id) ?? 0;
    setPlacing(id);
    setPlaceFree(n);
    setPicker(false);
    setSelected(null);
  };
  const cancelPlace = () => {
    eng()?.cancelPlacement();
    setPlacing(null);
  };
  const setCollection = (mode: 'shelf' | 'trees' | 'growth', id: string, stage: number) => {
    setCMode(mode);
    setCSpecies(id);
    setCStage(stage);
    eng()?.setCollection(mode, id, stage);
  };
  const toggleTime = () => {
    const next: TimeOfDay = timeOfDay === 'day' ? 'golden' : timeOfDay === 'golden' ? 'dusk' : 'day';
    setTimeOfDay(next);
    eng()?.setTimeOfDay(next);
  };

  const glass = { backgroundColor: colors.surfaceRaised, borderColor: colors.border };
  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? colors.primary : colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }];
  const speciesName = (id: string) => SPECIES.find((s) => s.id === id)?.name ?? id;

  return (
    <View
      ref={viewRef}
      style={[styles.root, { backgroundColor: '#dde6d0' }]}
      onLayout={(e) => {
        layout.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        const en = engineRef.current;
        if (en && bufferW.current > 0 && layout.current.w > 0) en.uiScale = bufferW.current / layout.current.w;
      }}
    >
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} accessibilityLabel="3D garden view" />

      {scene === 'collection' &&
        labels.map((l) =>
          l.x < -100 ? null : (
            <View key={l.id} pointerEvents="none" style={[styles.label, { left: l.x - (cMode === 'growth' ? 12 : 36), top: l.y, width: cMode === 'growth' ? 24 : 72, backgroundColor: 'rgba(251,241,224,0.92)' }]}>
              <AppText variant="caption" style={{ color: '#3A2412', fontSize: 10, lineHeight: 12 }} numberOfLines={2} align="center">
                {cMode === 'growth' ? l.id.split(':')[1] : l.name}
              </AppText>
            </View>
          ),
        )}

      {/* top bar */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.row}>
          <IconButton icon="chevronLeft" label="Back" variant="filled" size={40} onPress={() => navigation.goBack()} />
          <View style={[styles.ribbon, glass]}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              PROTOTYPE · simulated data · nothing is saved
            </AppText>
          </View>
          <IconButton icon="info" label="Performance" variant={showStats ? 'tinted' : 'filled'} size={40} onPress={() => setShowStats((v) => !v)} />
        </View>
        <View style={[styles.row, { marginTop: space.sm }]}>
          {(['conservatory', 'arboretum', 'collection'] as SceneName[]).map((s) => (
            <Tactile key={s} onPress={() => goScene(s)} accessibilityRole="tab" accessibilityLabel={s} accessibilityState={{ selected: scene === s }} style={chip(scene === s)}>
              <AppText variant="caption" style={{ color: scene === s ? '#fff' : colors.text }}>
                {s === 'conservatory' ? 'Conservatory' : s === 'arboretum' ? 'Northern Arboretum' : 'Collection'}
              </AppText>
            </Tactile>
          ))}
        </View>
        {showStats && stats && (
          <View style={[styles.stats, glass]} pointerEvents="none">
            <AppText variant="caption">
              {stats.fps.toFixed(0)} fps · {stats.frameMs.toFixed(0)} ms/frame (CPU submit) · {stats.drawCalls} draw calls · {(stats.triangles / 1000).toFixed(0)}k triangles
            </AppText>
            <AppText variant="caption" tone="secondary">
              {stats.geometries} geometries · {stats.textures} textures · {stats.size} · env light {stats.env ? 'on' : 'off'} · {Object.entries(stats.extra).map(([k, v]) => `${k} ${v}`).join(' · ')}
            </AppText>
          </View>
        )}
      </View>

      {/* bottom */}
      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + space.sm }]}>
        {selected && selected.kind === 'banyan' && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">The Grand Banyan</AppText>
            <AppText variant="caption" tone="muted">
              Ficus benghalensis · बरगद · permanent landmark
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
              The heart of the Northern Arboretum. It cannot be moved, removed or replaced. Everything you grow is planted around it, and it only ever shelters more.
            </AppText>
            <View style={styles.row}>
              <Button label="Close" size="sm" variant="secondary" onPress={() => setSelected(null)} />
              <Button label="Overview" size="sm" onPress={() => { setSelected(null); pickView('overview'); }} />
            </View>
          </Card>
        )}
        {selected && (selected.kind === 'specimen' || selected.kind === 'collection') && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">
              {selected.name} <AppText variant="bodySmall" tone="muted">{selected.hindi}</AppText>
            </AppText>
            <AppText variant="caption" tone="muted">
              {selected.scientific} · stage {selected.stage} of 7{selected.simDays !== undefined ? ` · simulated day ${selected.simDays}` : ''}{selected.zone ? ` · ${selected.zone}` : ''}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 4 }}>
              {selected.blurb}
            </AppText>
            <View style={styles.row}>
              <Button label="Close" size="sm" variant="secondary" onPress={() => { eng()?.select(null); setSelected(null); }} />
              {selected.kind === 'specimen' && (
                <Button label={selected.stage! < 7 ? 'Grow one stage (simulated)' : 'Fully grown'} size="sm" disabled={selected.stage! >= 7} onPress={() => eng()?.growSelected()} />
              )}
              {selected.kind === 'collection' && <Button label="Show its 7 stages" size="sm" onPress={() => setCollection('growth', selected.speciesId!, cStage)} />}
            </View>
          </Card>
        )}

        {placing && (
          <Card padding="md" style={styles.card}>
            <AppText variant="bodyStrong">Planting {speciesName(placing)}</AppText>
            <AppText variant="caption" tone="secondary">
              {placeFree} free positions are lit. Tap a glowing ring to plant. (Simulated: nothing is saved.)
            </AppText>
            <Button label="Cancel" size="sm" variant="secondary" onPress={cancelPlace} />
          </Card>
        )}

        {picker && !placing && (
          <Card padding="md" style={styles.card}>
            <AppText variant="bodyStrong">Choose what to plant</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
              {[...PLANTS, ...TREES].map((s) => (
                <Tactile key={s.id} onPress={() => startPlace(s.id)} accessibilityRole="button" accessibilityLabel={`Plant ${s.name}`} style={chip(false)}>
                  <AppText variant="caption" style={{ color: colors.text }}>
                    {s.name}
                  </AppText>
                </Tactile>
              ))}
            </ScrollView>
          </Card>
        )}

        {scene === 'arboretum' && (
          <View style={[styles.panel, glass]}>
            <AppText variant="caption" tone="muted">
              {LANDSCAPE_STATES[landscape]!.name}: {LANDSCAPE_STATES[landscape]!.note}
            </AppText>
            <SegmentedControl<string>
              value={String(landscape)}
              onChange={(v) => chooseLandscape(Number(v))}
              accessibilityLabel="Landscape state"
              segments={LANDSCAPE_STATES.map((s) => ({ value: String(s.index), label: s.short }))}
            />
          </View>
        )}

        {scene === 'collection' && (
          <View style={[styles.panel, glass]}>
            {cMode === 'growth' && <AppText variant="caption" tone="muted">Stages 1 to 7 of {speciesName(cSpecies)}, left to right. Each stage is its own shape.</AppText>}
            <SegmentedControl<'shelf' | 'trees' | 'growth'>
              value={cMode}
              onChange={(m) => setCollection(m, cSpecies, cStage)}
              accessibilityLabel="Collection view"
              segments={[
                { value: 'shelf', label: '30 plants' },
                { value: 'trees', label: `${TREES.length} trees` },
                { value: 'growth', label: 'Growth stages' },
              ]}
            />
            {cMode !== 'growth' && (
              <SegmentedControl<string>
                value={String(cStage)}
                onChange={(s) => setCollection(cMode, cSpecies, Number(s))}
                accessibilityLabel="Growth stage of every specimen"
                segments={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n}` }))}
              />
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SPECIES.filter((s) => !s.hidden).map((s) => (
                <Tactile key={s.id} onPress={() => setCollection('growth', s.id, cStage)} accessibilityRole="button" accessibilityLabel={s.name} style={chip(cMode === 'growth' && cSpecies === s.id)}>
                  <AppText variant="caption" style={{ color: cMode === 'growth' && cSpecies === s.id ? '#fff' : colors.text }}>
                    {s.name}
                  </AppText>
                </Tactile>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.controls}>
          <IconButton icon="eye" label="Overview" variant={view === 'overview' ? 'tinted' : 'filled'} size={44} onPress={() => pickView('overview')} />
          {scene === 'arboretum' && <IconButton icon="trees" label="Landscape view" variant={view === 'landscape' ? 'tinted' : 'filled'} size={44} onPress={() => pickView('landscape')} />}
          <IconButton icon="search" label="Close-up" variant={view === 'closeup' ? 'tinted' : 'filled'} size={44} onPress={() => pickView('closeup')} />
          <IconButton icon="plus" label="Zoom in" variant="filled" size={44} onPress={() => eng()?.zoomBy(1.35)} />
          <IconButton icon="reset" label="Zoom out" variant="filled" size={44} onPress={() => eng()?.zoomBy(1 / 1.35)} />
          <IconButton icon="move" label={panMode ? 'One finger pans' : 'One finger orbits'} variant={panMode ? 'tinted' : 'filled'} size={44} onPress={() => setPanMode((v) => !v)} />
          <IconButton icon={timeOfDay === 'dusk' ? 'moon' : 'sun'} label={`Light: ${timeOfDay}`} variant="filled" size={44} onPress={toggleTime} />
          {scene !== 'collection' && <IconButton icon="sprout" label="Plant something" variant={picker || placing ? 'tinted' : 'filled'} size={44} onPress={() => { if (placing) cancelPlace(); else setPicker((v) => !v); }} />}
        </View>
      </View>

      {busy && (
        <View style={[styles.busy, { backgroundColor: 'rgba(221,230,208,0.92)' }]} pointerEvents="auto">
          <AppText variant="heading">{busy}</AppText>
          <AppText variant="caption" tone="secondary">
            Generating the plants and the glasshouse on this device…
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.md },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  ribbon: { flex: 1, paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radii.pill ?? 999, borderWidth: 1, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  stats: { marginTop: space.sm, padding: space.sm, borderRadius: radii.md, borderWidth: 1 },
  card: { gap: 4 },
  panel: { padding: space.sm, borderRadius: radii.md, borderWidth: 1, gap: space.sm },
  controls: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  label: { position: 'absolute', paddingVertical: 2, borderRadius: 8, alignItems: 'center' },
  busy: { ...StyleSheet.absoluteFill as object, alignItems: 'center', justifyContent: 'center', gap: 6 },
});
