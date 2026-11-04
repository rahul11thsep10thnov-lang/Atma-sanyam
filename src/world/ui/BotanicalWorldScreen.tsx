// The 3D Botanical World, showing the person's REAL garden.
//
// Every specimen here is one of their own completed focus sessions, read from
// the existing garden's records (src/paradise). This screen never writes those
// records: it only reads them and keeps its own placement file
// (src/world/repository.ts, key focus.world.v1). Nothing here is simulated:
// no fake plants are added, and the only things not grown by the person are
// the glasshouse itself and the permanent Grand Banyan.
//
// Reachable only while EXPO_PUBLIC_SOLARPUNK_PROTOTYPE=1, alongside the
// existing Garden tab, until the person has seen it on their device.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';
import { AppText } from '../../ui/AppText';
import { Button, IconButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Tactile } from '../../ui/Pressable';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { RootStackParamList } from '../../navigation/types';
import { ParadiseState } from '../../paradise/model';
import { loadParadise, subscribeParadise } from '../../paradise/repository';
import { SPECIES_BY_ID as APP_SPECIES, plantName } from '../../paradise/catalog';
import { Engine, PickInfo, TimeOfDay } from '../../prototype/solarpunk/engine';
import { SPECIES_BY_ID as MODELS, modelFor } from '../../prototype/solarpunk/catalog';
import type { ProtoScene, SceneName } from '../../prototype/solarpunk/scenes';
import { SlotDef, WorldPenalty, WorldPlant, WorldState, progressOf, reconcile, zoneAt, meetsUnlock } from '../model';
import { loadWorld, saveWorld } from '../repository';
import { ARBORETUM_ZONES, CONSERVATORY_ZONES, WINGS, WingId } from '../zones';

type BuiltWing = 'central-conservatory' | 'northern-arboretum';
const SCENE_OF: Record<BuiltWing, SceneName> = { 'central-conservatory': 'world-conservatory', 'northern-arboretum': 'world-arboretum' };
const ZONE_NAME = Object.fromEntries([...CONSERVATORY_ZONES, ...ARBORETUM_ZONES].map((z) => [z.id, z])) as Record<string, { name: string; blurb: string }>;

/** The person's garden plants as the world sees them (balcony plants stay on the balcony). */
function worldInputs(s: ParadiseState): { plants: WorldPlant[]; penalties: WorldPenalty[] } {
  const plants: WorldPlant[] = [];
  for (const p of s.plants) {
    if (p.place === 'balcony') continue;
    const m = modelFor(p.speciesId);
    if (!m) continue;
    const model = MODELS[m.id]!;
    plants.push({ id: p.id, speciesId: p.speciesId, modelId: m.id, kind: model.kind, water: !!model.water, size: p.size, plantedAt: p.plantedAt });
  }
  return { plants, penalties: s.penalties.map((p) => ({ id: p.id, segment: p.segment, placedAt: p.placedAt })) };
}

function slotDefs(scene: ProtoScene, wing: BuiltWing): SlotDef[] {
  return (scene.garden?.slots ?? []).map((s) => ({ id: `${wing}:${s.id}`, wing, x: s.x, z: s.z, water: s.water, zone: zoneAt(wing, s.x, s.z, s.water), maxH: s.maxH }));
}

interface Selected {
  kind: 'plant' | 'penalty' | 'banyan' | 'zone' | 'corridor';
  plantId?: string;
  zone?: string;
}

export function BotanicalWorldScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const engineRef = useRef<Engine | null>(null);
  const rafRef = useRef<number | null>(null);
  const alive = useRef(true);
  const layout = useRef({ w: 0, h: 0 });
  const bufferW = useRef(0);
  const scenesRef = useRef<Partial<Record<BuiltWing, ProtoScene>>>({});
  const slotsRef = useRef<SlotDef[]>([]);
  const worldRef = useRef<WorldState | null>(null);
  const paradiseRef = useRef<ParadiseState | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const [busy, setBusy] = useState<string | null>('Opening the glasshouse…');
  const [wing, setWing] = useState<BuiltWing>('central-conservatory');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [counts, setCounts] = useState({ placed: 0, pending: 0, saplings: 0, positions: 0 });
  const [, setTick] = useState(0);
  const wingRef = useRef(wing);
  wingRef.current = wing;

  useEffect(() => {
    if (engineRef.current) engineRef.current.motion = reduced ? 0 : 1;
  }, [reduced]);

  // ---- bringing the scenes up to date with the person's garden ---------------------------------------
  const sync = useCallback(async (paradise: ParadiseState, opts: { welcome: boolean }) => {
    const eng = engineRef.current;
    const prev = worldRef.current ?? (await loadWorld());
    if (!eng || !alive.current) return;
    const { plants, penalties } = worldInputs(paradise);
    const res = reconcile(prev, plants, penalties, slotsRef.current, progressOf(paradise.plants), Date.now());
    let world = res.world;

    // draw what is placed; remove what the person has removed in the garden
    const byId = new Map(paradise.plants.map((p) => [p.id, p]));
    for (const w of Object.keys(SCENE_OF) as BuiltWing[]) {
      const g = scenesRef.current[w]?.garden;
      if (!g) continue;
      for (const id of [...g.specimens.keys()]) if (!world.placements[id] || world.placements[id]!.wing !== w) g.remove(id);
    }
    for (const pl of Object.values(world.placements)) {
      if (pl.wing !== 'central-conservatory' && pl.wing !== 'northern-arboretum') continue;
      const g = scenesRef.current[pl.wing]?.garden;
      if (!g || g.specimens.has(pl.refId)) continue;
      const slot = Number(pl.slotId.split(':')[1]);
      if (pl.kind === 'penalty') {
        g.add('wilted_sapling', 2, slot, { force: true, id: pl.refId, at: { x: pl.x, z: pl.z } });
        continue;
      }
      const p = byId.get(pl.refId);
      const m = p && modelFor(p.speciesId);
      if (!p || !m) continue;
      g.add(m.id, p.size, slot, { force: true, id: pl.refId, at: { x: pl.x, z: pl.z }, animate: opts.welcome && res.placed.includes(pl.refId) && !reduced, days: Math.round((Date.now() - p.plantedAt) / 86400000) });
    }

    // welcome the newest plant: fly to it once
    const newest = [...plants].sort((a, b) => b.plantedAt - a.plantedAt)[0];
    if (opts.welcome && newest && world.lastWelcomed !== newest.id && world.placements[newest.id]) {
      const pl = world.placements[newest.id]!;
      world = { ...world, lastWelcomed: newest.id };
      const target = pl.wing as BuiltWing;
      if (target !== wingRef.current) {
        eng.setScene(SCENE_OF[target]);
        setWing(target);
      }
      const spec = scenesRef.current[target]?.garden?.specimens.get(newest.id);
      if (spec) {
        eng.select(newest.id);
        eng.focusOn(new THREE.Vector3(pl.x, spec.mesh.position.y + 0.5, pl.z), 3 + newest.size * 0.5);
      }
      setWelcome(newest.id);
      setSelected({ kind: 'plant', plantId: newest.id });
    }
    worldRef.current = world;
    if (world !== prev) await saveWorld(world);
    const placed = Object.values(world.placements);
    setCounts({ placed: placed.filter((p) => p.kind === 'specimen').length, pending: world.pending.length, saplings: placed.filter((p) => p.kind === 'penalty').length, positions: slotsRef.current.length });
  }, [reduced]);

  // ---- renderer -------------------------------------------------------------------------------------
  const onSelect = useCallback((p: PickInfo | null) => {
    if (!p) return setSelected(null);
    if (p.kind === 'banyan') return setSelected({ kind: 'banyan' });
    if (p.kind === 'corridor') return setSelected({ kind: 'corridor' });
    if (p.kind === 'ground' && p.at) return setSelected({ kind: 'zone', zone: zoneAt(wingRef.current, p.at.x, p.at.z, false) });
    if (p.kind === 'specimen' && p.id) {
      const pen = paradiseRef.current?.penalties.some((x) => x.id === p.id);
      return setSelected({ kind: pen ? 'penalty' : 'plant', plantId: p.id, zone: worldRef.current?.placements[p.id]?.zone });
    }
    setSelected(null);
  }, []);

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const renderer = new THREE.WebGLRenderer({ context: gl as unknown as WebGLRenderingContext, antialias: Platform.OS === 'web', alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      // a large drawing buffer on a phone: use the lighter shadow and lighting settings
      const quality = Platform.OS !== 'web' && w * h > 2_600_000 ? 'safe' : 'high';
      const engine = new Engine(renderer, w, h, { quality, onSelect, groundTaps: true });
      bufferW.current = w;
      // touches arrive in layout units; the drawing buffer is in pixels (layout may not be measured yet)
      engine.uiScale = layout.current.w > 0 ? w / layout.current.w : 1;
      engine.motion = reduced ? 0 : 1;
      engineRef.current = engine;
      if (__DEV__ || process.env.EXPO_PUBLIC_SOLARPUNK_PROTOTYPE === '1') (globalThis as unknown as { __world?: unknown }).__world = { engine, THREE, world: () => worldRef.current };
      setTimeout(async () => {
        if (!alive.current) return;
        // both built wings are needed to know every planting position; only the visible one is drawn
        for (const wg of Object.keys(SCENE_OF) as BuiltWing[]) scenesRef.current[wg] = engine.ensureScene(SCENE_OF[wg]);
        slotsRef.current = (Object.keys(SCENE_OF) as BuiltWing[]).flatMap((wg) => slotDefs(scenesRef.current[wg]!, wg));
        engine.setScene(SCENE_OF['central-conservatory']);
        const paradise = await loadParadise();
        paradiseRef.current = paradise;
        await sync(paradise, { welcome: true });
        if (!alive.current) return;
        setBusy(null);
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
    },
    [onSelect, sync, reduced],
  );

  // the garden changes (a session completes, a plant is removed, a sapling is cleared): follow it
  useEffect(() => {
    const unsub = subscribeParadise((s) => {
      paradiseRef.current = s;
      void sync(s, { welcome: true });
      setTick((t) => t + 1);
    });
    return unsub;
  }, [sync]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      engineRef.current?.dispose();
      engineRef.current = null;
      (globalThis as unknown as { __world?: unknown }).__world = undefined;
    };
  }, []);

  // ---- gestures: one finger orbits, two fingers pan, pinch and twist, a tap inspects ------------------
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
            if (moved) eng.orbitBy(p.x - prev1.x, p.y - prev1.y);
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.querySelector('[aria-label="3D botanical world"]') as HTMLElement | null;
    if (!el) return;
    const on = (ev: WheelEvent) => {
      ev.preventDefault();
      engineRef.current?.zoomBy(Math.exp(-ev.deltaY * 0.0015));
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [busy]);

  // ---- actions ----------------------------------------------------------------------------------------
  const eng = () => engineRef.current;
  const goWing = (target: BuiltWing, then?: () => void) => {
    const e = eng();
    if (!e) return;
    setSelected(null);
    setShowMap(false);
    if (target === wingRef.current) return then?.();
    const swap = () => {
      e.setScene(SCENE_OF[target]);
      setWing(target);
      then?.();
    };
    if (reduced) return swap();
    // walk through the corridor: the view dims, the next wing opens
    Animated.timing(fade, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      swap();
      Animated.timing(fade, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
    });
  };
  const toBanyan = () =>
    goWing('northern-arboretum', () => {
      eng()?.setView('closeup');
      setSelected({ kind: 'banyan' });
    });
  const toggleTime = () => {
    const next: TimeOfDay = timeOfDay === 'day' ? 'golden' : timeOfDay === 'golden' ? 'dusk' : 'day';
    setTimeOfDay(next);
    eng()?.setTimeOfDay(next);
  };

  const paradise = paradiseRef.current;
  const plant = selected?.plantId ? paradise?.plants.find((p) => p.id === selected.plantId) : undefined;
  const plantModel = plant ? modelFor(plant.speciesId) : null;
  const progress = paradise ? progressOf(paradise.plants) : { sessions: 0, minutes: 0, species: 0 };
  const glass = { backgroundColor: colors.surfaceRaised, borderColor: colors.border };
  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? colors.primary : colors.surfaceRaised, borderColor: on ? colors.primary : colors.border }];
  const date = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View
      style={[styles.root, { backgroundColor: '#dde6d0' }]}
      onLayout={(e) => {
        layout.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        const en = engineRef.current;
        if (en && bufferW.current > 0 && layout.current.w > 0) en.uiScale = bufferW.current / layout.current.w;
      }}
    >
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} accessibilityLabel="3D botanical world" />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#f3efe2', opacity: fade }]} />

      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.row}>
          <IconButton icon="chevronLeft" label="Back" variant="filled" size={40} onPress={() => navigation.goBack()} />
          <View style={[styles.ribbon, glass]}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              PREVIEW · your real garden · your existing Garden is unchanged
            </AppText>
          </View>
          <IconButton icon="landmark" label="Greenhouse map" variant={showMap ? 'tinted' : 'filled'} size={40} onPress={() => setShowMap((v) => !v)} />
        </View>
        <View style={[styles.row, { marginTop: space.sm }]}>
          {(Object.keys(SCENE_OF) as BuiltWing[]).map((wg) => (
            <Tactile key={wg} onPress={() => goWing(wg)} accessibilityRole="tab" accessibilityLabel={WINGS.find((x) => x.id === wg)!.name} accessibilityState={{ selected: wing === wg }} style={chip(wing === wg)}>
              <AppText variant="caption" style={{ color: wing === wg ? '#fff' : colors.text }}>
                {WINGS.find((x) => x.id === wg)!.name}
              </AppText>
            </Tactile>
          ))}
        </View>
        <View style={[styles.counts, glass]} pointerEvents="none">
          <AppText variant="caption" tone="secondary">
            {counts.placed} planted · {counts.pending ? `${counts.pending} waiting for room · ` : ''}
            {counts.saplings ? `${counts.saplings} wilted · ` : ''}
            {counts.positions} positions
          </AppText>
        </View>
      </View>

      <View pointerEvents="box-none" style={[styles.bottom, { paddingBottom: insets.bottom + space.sm }]}>
        {showMap && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">The greenhouse</AppText>
            <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 6 }}>
              {WINGS.map((wd) => {
                const open = wd.built && !!worldRef.current?.wings[wd.id];
                const earned = meetsUnlock(wd.unlock, progress);
                const rule = [wd.unlock.sessions ? `${wd.unlock.sessions} sessions` : '', wd.unlock.minutes ? `${Math.round(wd.unlock.minutes / 60)} focused hours` : '', wd.unlock.species ? `${wd.unlock.species} species` : ''].filter(Boolean).join(' · ');
                return (
                  <Tactile key={wd.id} disabled={!open} onPress={() => open && goWing(wd.id as BuiltWing)} accessibilityRole="button" accessibilityLabel={wd.name} style={[styles.mapRow, glass]}>
                    <AppText variant="bodyStrong">{wd.name}</AppText>
                    <AppText variant="caption" tone="muted">
                      {open ? 'Open · tap to visit' : wd.built ? `Opens at ${rule}` : earned ? 'Earned · being built in a later update' : `Planned · opens at ${rule}`}
                    </AppText>
                  </Tactile>
                );
              })}
            </ScrollView>
            <Button label="Close" size="sm" variant="secondary" onPress={() => setShowMap(false)} />
          </Card>
        )}

        {selected?.kind === 'banyan' && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">The Grand Banyan</AppText>
            <AppText variant="caption" tone="muted">Ficus benghalensis · बरगद · permanent landmark</AppText>
            <AppText variant="bodySmall" tone="secondary">
              The heart of the Northern Arboretum. It is part of the glasshouse: it can never be moved, removed or replaced, and it takes none of your planting positions. Banyans you grow yourself are planted around it.
            </AppText>
            <Button label="Close" size="sm" variant="secondary" onPress={() => setSelected(null)} />
          </Card>
        )}

        {selected?.kind === 'plant' && plant && (
          <Card padding="md" style={styles.card}>
            {welcome === plant.id && (
              <AppText variant="caption" style={{ color: colors.primary }}>
                Newly planted
              </AppText>
            )}
            <AppText variant="heading">{plantName(plant.speciesId)}</AppText>
            <AppText variant="caption" tone="muted">
              {APP_SPECIES[plant.speciesId]?.scientificName} · size {plant.size} of 7 · {plant.focusMinutes} focused minutes
            </AppText>
            <AppText variant="caption" tone="muted">
              Planted {date(plant.plantedAt)}
              {selected.zone ? ` · ${ZONE_NAME[selected.zone]?.name ?? selected.zone}` : ''}
            </AppText>
            {plantModel && !plantModel.exact && (
              <AppText variant="caption" tone="secondary">
                Shown with the {MODELS[plantModel.id]!.name} model until its own 3D model is made.
              </AppText>
            )}
            <Button label="Close" size="sm" variant="secondary" onPress={() => { eng()?.select(null); setSelected(null); setWelcome(null); }} />
          </Card>
        )}

        {selected?.kind === 'penalty' && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">Wilted sapling</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Left by a session that was stopped early. You can clear it with coins in the Garden tab, as before.
            </AppText>
            <Button label="Close" size="sm" variant="secondary" onPress={() => setSelected(null)} />
          </Card>
        )}

        {selected?.kind === 'zone' && selected.zone && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">{ZONE_NAME[selected.zone]?.name ?? selected.zone}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {ZONE_NAME[selected.zone]?.blurb}
            </AppText>
            <Button label="Close" size="sm" variant="secondary" onPress={() => setSelected(null)} />
          </Card>
        )}

        {selected?.kind === 'corridor' && (
          <Card padding="md" style={styles.card}>
            <AppText variant="heading">Glass corridor</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {wing === 'central-conservatory' ? 'Walk north to the Northern Arboretum and the Grand Banyan.' : 'Walk south to the Central Conservatory.'}
            </AppText>
            <View style={styles.row}>
              <Button label="Close" size="sm" variant="secondary" onPress={() => setSelected(null)} />
              <Button label="Walk through" size="sm" onPress={() => goWing(wing === 'central-conservatory' ? 'northern-arboretum' : 'central-conservatory')} />
            </View>
          </Card>
        )}

        {!busy && counts.placed === 0 && !selected && !showMap && (
          <Card padding="md" style={styles.card}>
            <AppText variant="bodyStrong">Your glasshouse is ready</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Every focus session of 15 minutes or more grows a plant here. Pick a plant or tree and start a session.
            </AppText>
            <Button label="Grow a plant" size="sm" onPress={() => navigation.navigate('Tabs', { screen: 'Home', params: { mode: 'plants', arrival: String(Date.now()) } })} />
          </Card>
        )}

        <View style={styles.controls}>
          <IconButton icon="eye" label="Overview" variant="filled" size={44} onPress={() => { setSelected(null); eng()?.setView('overview'); }} />
          <IconButton icon="search" label="Close-up" variant="filled" size={44} onPress={() => eng()?.setView('closeup')} />
          <IconButton icon="plus" label="Zoom in" variant="filled" size={44} onPress={() => eng()?.zoomBy(1.35)} />
          <IconButton icon="reset" label="Zoom out" variant="filled" size={44} onPress={() => eng()?.zoomBy(1 / 1.35)} />
          <IconButton icon="trees" label="Visit the Grand Banyan" variant="filled" size={44} onPress={toBanyan} />
          <IconButton icon={timeOfDay === 'dusk' ? 'moon' : 'sun'} label={`Light: ${timeOfDay}`} variant="filled" size={44} onPress={toggleTime} />
          <IconButton icon="sprout" label="Grow a plant" variant="filled" size={44} onPress={() => navigation.navigate('Tabs', { screen: 'Home', params: { mode: 'plants', arrival: String(Date.now()) } })} />
        </View>
      </View>

      {busy && (
        <View style={[styles.busy, { backgroundColor: 'rgba(221,230,208,0.94)' }]} pointerEvents="auto">
          <AppText variant="heading">{busy}</AppText>
          <AppText variant="caption" tone="secondary">
            Growing your plants and the Grand Banyan on this device…
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
  counts: { marginTop: space.sm, alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radii.md, borderWidth: 1 },
  card: { gap: 4 },
  mapRow: { padding: space.sm, borderRadius: radii.md, borderWidth: 1 },
  controls: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  busy: { ...(StyleSheet.absoluteFill as object), alignItems: 'center', justifyContent: 'center', gap: 6 },
});
