import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as THREE from 'three';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/types';
import { BalconyEngine } from '../engine/BalconyEngine';
import { AudioEngine } from '../engine/AudioEngine';
import { profileFor, recommendedQuality } from '../engine/QualityProfile';
import { getEnvironment, STARTER_ENVIRONMENT_ID } from '../environments/EnvironmentRegistry';
import { loadWorld, saveWorld } from '../state/WorldRepository';
import { AudioSettings, UserPlacedObject } from '../state/types';
import { getAsset } from '../catalog/AssetCatalog';
import { saveSnapshot } from '../state/SnapshotStore';
import { initialGrowthFor } from '../state/FocusRewards';
import { loadRewards, saveRewards } from '../state/RewardRepository';
import { StoreSheet } from './StoreSheet';
import { AssetDefinition } from '../state/types';
import { useTabBarInset } from '../../ui/TabBar';
import { Icon, IconName } from '../../ui/Icon';
import { AppText } from '../../ui/AppText';
import { Tactile } from '../../ui/Pressable';
import { useTheme } from '../../theme/ThemeContext';

const DEFAULT_AUDIO: AudioSettings = { enabled: true, master: 0.8 };

/** Step 6 prototype screen: the starter balcony, explorable and editable.
 * One-finger drag orbits, two fingers pan, pinch zooms, double-tap frames
 * an object (or resets), and in Edit mode a one-finger drag on an object
 * moves it across the floor. Everything persists. */
export function BalconyWorldScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const isFocused = useIsFocused();

  const engineRef = useRef<BalconyEngine | null>(null);
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const viewportRef = useRef({ width: 1, height: 1 });
  const dragRef = useRef<{ id: string; lastValid: THREE.Vector3 } | null>(null);
  const tapCandidateRef = useRef<{ id: string; name: string; refund: number } | null>(null);
  const audioSettingsRef = useRef<AudioSettings>(DEFAULT_AUDIO);
  const editModeRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(__DEV__);
  const [stats, setStats] = useState('');
  const [coins, setCoins] = useState<number | null>(null);
  const [lifetimeMinutes, setLifetimeMinutes] = useState(0);
  const [storeOpen, setStoreOpen] = useState(false);
  const [objectCount, setObjectCount] = useState(0);
  const [selected, setSelected] = useState<{ id: string; name: string; refund: number } | null>(null);
  const loadedVersionRef = useRef<number | undefined>(undefined);

  const definition = useMemo(() => getEnvironment(STARTER_ENVIRONMENT_ID), []);
  const profile = useMemo(() => profileFor(recommendedQuality()), []);

  const persist = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    saveWorld({
      schemaVersion: 1,
      environmentId: definition.id,
      placedObjects: engine.objects.records(),
      camera: engine.controller.getState(),
      audio: audioSettingsRef.current,
    });
  }, [definition.id]);

  // A picture of the balcony for the Home hero: after the first frames and
  // whenever editing ends. Best effort; Home falls back to the bundled render.
  const captureSnapshot = useCallback(async () => {
    const gl = glRef.current;
    const engine = engineRef.current;
    if (!gl || !engine) return;
    try {
      engine.setDirty();
      const shot = await GLView.takeSnapshotAsync(gl.contextId, { format: 'jpeg', compress: 0.8, flip: SNAPSHOT_FLIP });
      // Native returns a file uri; web may hand back a Blob, which Home can't show.
      if (shot && typeof shot.uri === 'string') await saveSnapshot({ uri: shot.uri, width: shot.width, height: shot.height, takenAt: Date.now() });
    } catch (error) {
      if (__DEV__) console.warn('Balcony snapshot failed', error);
    }
  }, []);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      engineRef.current?.dispose();
      audioRef.current?.dispose();
      glRef.current = gl;
      setFailure(null);

      const saved = await loadWorld(definition.id);
      loadedVersionRef.current = saved?.version;
      let engine: BalconyEngine;
      try {
        engine = new BalconyEngine(gl, definition, profile, viewportRef.current);
      } catch (error) {
        // Surface GL/driver problems as text the person can report, never a
        // blank view — this is what the device-run step is for.
        setFailure(error instanceof Error ? error.message : String(error));
        return;
      }
      engineRef.current = engine;

      const now = Date.now();
      const records: UserPlacedObject[] =
        saved?.placedObjects ??
        definition.defaultObjects.map((d, i) => ({
          id: `default-${d.assetId}-${i}`,
          assetId: d.assetId,
          position: d.position,
          rotation: [0, d.rotationY ?? 0, 0],
          scale: 1,
          placementSurface: getAsset(d.assetId)?.placementType ?? 'floor',
          zoneId: 'floor-main',
          createdAt: now,
          updatedAt: now,
          growth: initialGrowthFor(d.assetId, true),
        }));
      engine.loadObjects(records);
      setObjectCount(records.length);
      if (saved?.camera) engine.controller.setState(saved.camera);

      let cameraSaveTimer: ReturnType<typeof setTimeout> | null = null;
      engine.onCameraChanged = () => {
        if (cameraSaveTimer) clearTimeout(cameraSaveTimer);
        cameraSaveTimer = setTimeout(persist, 800);
      };

      engine.start();
      setReady(true);
      setTimeout(() => void captureSnapshot(), 1500);

      const audioSettings = saved?.audio ?? DEFAULT_AUDIO;
      audioSettingsRef.current = audioSettings;
      setSoundOn(audioSettings.enabled);
      const audio = new AudioEngine();
      audioRef.current = audio;
      try {
        await audio.start(definition.audio, audioSettings);
      } catch (error) {
        // A silent balcony is still a balcony; the scene must never depend on audio.
        if (__DEV__) console.warn('Balcony ambient audio failed to start', error);
      }
      if (!saved) persist();
    },
    [definition, profile, persist, captureSnapshot],
  );

  // Pause rendering and sound when the tab isn't visible or the app is in
  // the background — the balcony must never cost anything while a focus
  // session runs on another screen.
  useEffect(() => {
    const engine = engineRef.current;
    const audio = audioRef.current;
    if (isFocused) {
      engine?.start();
      audio?.resume();
    } else {
      engine?.stop();
      audio?.suspend();
    }
  }, [isFocused, ready]);

  // Coming back to the tab: pick up growth the focus session wrote and the
  // current coin balance.
  useEffect(() => {
    if (!isFocused) return;
    let alive = true;
    loadRewards().then((r) => {
      if (!alive) return;
      setCoins(r.coins);
      setLifetimeMinutes(r.lifetimeMinutes);
    });
    if (!ready) return;
    loadWorld(definition.id).then((saved) => {
      if (!alive || !saved || saved.version === loadedVersionRef.current) return;
      loadedVersionRef.current = saved.version;
      const engine = engineRef.current;
      if (!engine) return;
      engine.objects.replaceAll(saved.placedObjects);
      engine.setDirty();
      setTimeout(() => void captureSnapshot(), 1200);
    });
    return () => {
      alive = false;
    };
  }, [isFocused, ready, definition.id, captureSnapshot]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isFocused) {
        engineRef.current?.start();
        audioRef.current?.resume();
      } else {
        engineRef.current?.stop();
        audioRef.current?.suspend();
      }
    });
    return () => sub.remove();
  }, [isFocused]);

  useEffect(
    () => () => {
      engineRef.current?.dispose();
      audioRef.current?.dispose();
    },
    [],
  );

  useEffect(() => {
    editModeRef.current = editMode;
    setHint(editMode ? 'Drag an object to move it' : null);
    if (!editMode) {
      dragRef.current = null;
      setSelected(null);
      if (ready) setTimeout(() => void captureSnapshot(), 400);
    }
  }, [editMode, ready, captureSnapshot]);

  // Stats line (tap the title to toggle, on in dev builds): the numbers the
  // performance step needs from a real device.
  useEffect(() => {
    if (!showStats || !ready) return;
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      setStats(`${Math.round(engine.fps)} fps · ${engine.objects.list().length} objects · ${profile.level.toLowerCase()} · placeholder art`);
    }, 500);
    return () => clearInterval(id);
  }, [showStats, ready, profile.level]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) viewportRef.current = { width, height };
  };

  // --- gestures -------------------------------------------------------------

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(2)
        .runOnJS(true)
        .onBegin((e) => {
          const engine = engineRef.current;
          if (!engine) return;
          engine.controller.stopInertia();
          dragRef.current = null;
          tapCandidateRef.current = null;
          if (editModeRef.current && e.numberOfPointers === 1) {
            const picked = engine.placement.pick(engine.ndcFrom(e.x, e.y, viewportRef.current), engine.camera, engine.objects);
            if (picked) dragRef.current = { id: picked.record.id, lastValid: picked.group.position.clone() };
            tapCandidateRef.current = picked ? { id: picked.record.id, name: picked.def.name, refund: Math.round(picked.def.price.coins / 2) } : null;
          }
        })
        // A touch that ends without ever activating the pan is a tap: in
        // edit mode it selects the object under the finger (or clears).
        .onFinalize((_e, success) => {
          if (!editModeRef.current) return;
          if (!success) setSelected(tapCandidateRef.current);
        })
        .onChange((e) => {
          const engine = engineRef.current;
          if (!engine) return;
          const viewport = viewportRef.current;
          if (dragRef.current && e.numberOfPointers === 1) {
            const obj = engine.objects.get(dragRef.current.id);
            const zone = engine.definition.zones.find((z) => z.id === 'floor-main');
            if (!obj || !zone) return;
            const point = engine.placement.pointOnFloor(engine.ndcFrom(e.x, e.y, viewport), engine.camera, zone, obj.def.footprint, obj.record.scale, obj.record.rotation[1]);
            if (!point) return;
            if (!engine.placement.overlaps(obj, point, engine.objects.list())) {
              engine.objects.moveTo(obj.record.id, point);
              dragRef.current.lastValid = point.clone();
            }
            engine.setDirty();
            return;
          }
          if (e.numberOfPointers >= 2) engine.controller.panBy(e.changeX, e.changeY, viewport.width);
          else engine.controller.orbitBy(e.changeX, e.changeY, viewport.width);
          engine.setDirty();
        })
        .onEnd(() => {
          const engine = engineRef.current;
          if (!engine) return;
          if (dragRef.current) {
            dragRef.current = null;
            persist();
          }
          engine.controller.release();
        }),
    [persist],
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onChange((e) => {
          const engine = engineRef.current;
          if (!engine || dragRef.current) return;
          engine.controller.zoomBy(e.scaleChange);
          engine.setDirty();
        }),
    [],
  );

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .runOnJS(true)
        .onEnd((e) => {
          const engine = engineRef.current;
          if (!engine) return;
          const now = performance.now();
          const picked = engine.placement.pick(engine.ndcFrom(e.x, e.y, viewportRef.current), engine.camera, engine.objects);
          if (picked) {
            engine.focusOnObject(picked.record.id, now);
            setHint(`${picked.def.name}${picked.def.placeholder ? ' · placeholder' : ''}`);
          } else {
            engine.resetCamera(now);
          }
        }),
    [],
  );

  // Race, not Exclusive: a drag activates the pan (cancelling the tap) the
  // moment it moves, so orbiting never waits out the double-tap window.
  const gesture = useMemo(() => Gesture.Race(doubleTap, Gesture.Simultaneous(pan, pinch)), [doubleTap, pan, pinch]);

  // --- actions --------------------------------------------------------------

  const toggleSound = () => {
    const next = { ...audioSettingsRef.current, enabled: !audioSettingsRef.current.enabled };
    audioSettingsRef.current = next;
    setSoundOn(next.enabled);
    audioRef.current?.setSettings(next);
    persist();
  };

  const resetView = () => {
    engineRef.current?.resetCamera(performance.now());
  };

  const refreshCount = () => setObjectCount(engineRef.current?.objects.list().length ?? 0);

  const buy = async (asset: AssetDefinition) => {
    const engine = engineRef.current;
    if (!engine || coins === null || coins < asset.price.coins) return;
    const zone = engine.definition.zones.find((z) => z.id === 'floor-main');
    if (!zone) return;
    const spot = engine.placement.findFreeSpot(zone, asset.footprint, 1, 0, engine.objects.list());
    if (!spot) {
      setHint('No room left — move or remove something first');
      return;
    }
    const now = Date.now();
    const record: UserPlacedObject = {
      id: `obj-${now}-${Math.random().toString(36).slice(2, 7)}`,
      assetId: asset.id,
      position: [spot.x, 0, spot.z],
      rotation: [0, 0, 0],
      scale: 1,
      placementSurface: asset.placementType,
      zoneId: zone.id,
      createdAt: now,
      updatedAt: now,
      growth: initialGrowthFor(asset.id, false),
    };
    engine.objects.add(record);
    engine.setDirty();
    engine.focusOnObject(record.id, performance.now());
    const rewards = await loadRewards();
    const next = { ...rewards, coins: Math.max(0, rewards.coins - asset.price.coins) };
    await saveRewards(next);
    setCoins(next.coins);
    refreshCount();
    persist();
    setStoreOpen(false);
    setHint(`${asset.name} placed${asset.growable ? ' — it grows with your focus' : ''}`);
    setTimeout(() => void captureSnapshot(), 800);
  };

  const removeSelected = async () => {
    const engine = engineRef.current;
    if (!engine || !selected) return;
    engine.objects.remove(selected.id);
    engine.setDirty();
    const rewards = await loadRewards();
    const next = { ...rewards, coins: rewards.coins + selected.refund };
    await saveRewards(next);
    setCoins(next.coins);
    setSelected(null);
    refreshCount();
    persist();
    setHint(`Returned for ${selected.refund} coins`);
  };

  return (
    <View style={styles.screen}>
      <GestureDetector gesture={gesture}>
        <View style={styles.viewport} onLayout={onLayout}>
          <GLView style={StyleSheet.absoluteFill} msaaSamples={profile.antialias ? 4 : 0} onContextCreate={onContextCreate} />
        </View>
      </GestureDetector>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <Pressable onPress={() => setShowStats((v) => !v)} accessibilityRole="button" accessibilityLabel="Toggle performance stats">
          <Text style={styles.title}>My Balcony</Text>
        </Pressable>
        {showStats && !!stats && (
          <View style={styles.devChip}>
            <Text style={styles.devChipText}>{stats}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {coins !== null && (
          <View style={styles.coinPill} accessibilityLabel={`${coins} coins`}>
            <Icon name="coins" size="xs" color="#FFFFFF" />
            <AppText variant="bodySmallStrong" style={{ color: '#FFFFFF' }}>{coins}</AppText>
          </View>
        )}
      </View>

      {failure && (
        <View style={styles.failureWrap} pointerEvents="none">
          <Text style={styles.failureTitle}>Couldn't start the 3D balcony</Text>
          <Text style={styles.failureText}>{failure}</Text>
        </View>
      )}

      {hint && (
        <View style={[styles.hintWrap, { bottom: tabInset + 64 }]} pointerEvents="none">
          <Text style={styles.hint}>{hint}</Text>
        </View>
      )}

      {editMode && selected && (
        <View style={[styles.selectionWrap, { bottom: tabInset + 112 }]} pointerEvents="box-none">
          <View style={styles.selection}>
            <AppText variant="bodySmallStrong" style={{ color: '#FFFFFF', flex: 1 }} numberOfLines={1}>{selected.name}</AppText>
            <Tactile onPress={() => void removeSelected()} accessibilityRole="button" accessibilityLabel={`Remove ${selected.name}`} style={styles.removeBtn}>
              <Icon name="trash" size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={{ color: '#FFFFFF' }}>Remove · +{selected.refund}</AppText>
            </Tactile>
          </View>
        </View>
      )}

      <View style={[styles.actionBar, { paddingBottom: tabInset }]} pointerEvents="box-none">
        <ActionButton icon="timer" label="Focus" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
        <ActionButton icon="store" label="Store" onPress={() => setStoreOpen(true)} />
        <ActionButton icon={editMode ? 'check' : 'move'} label={editMode ? 'Done' : 'Edit'} active={editMode} onPress={() => setEditMode((v) => !v)} />
        <ActionButton icon={soundOn ? 'volume' : 'volumeOff'} label={soundOn ? 'Sound' : 'Muted'} onPress={toggleSound} />
        <ActionButton icon="reset" label="Reset" onPress={resetView} />
      </View>

      <StoreSheet
        visible={storeOpen}
        coins={coins ?? 0}
        lifetimeMinutes={lifetimeMinutes}
        objectCount={objectCount}
        maxObjects={definition.limits.maxObjects}
        onClose={() => setStoreOpen(false)}
        onBuy={(asset) => void buy(asset)}
      />
    </View>
  );
}

// Set to true if a device shows the Home preview upside down: GL reads the
// framebuffer bottom-up and expo-gl's native snapshot path may not undo it.
const SNAPSHOT_FLIP = false;

function ActionButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const { colors } = useTheme();
  return (
    <Tactile
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.actionBtn, { backgroundColor: active ? colors.primary : 'rgba(255,252,248,0.92)' }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
    >
      <Icon name={icon} size="sm" color={active ? colors.textOnAccent : colors.text} />
      <AppText variant="caption" style={{ color: active ? colors.textOnAccent : colors.text }}>
        {label}
      </AppText>
    </Tactile>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3d9bd' },
  viewport: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { ...typography.heading, color: colors.white, textShadowColor: 'rgba(40,20,10,0.35)', textShadowRadius: 6 },
  devChip: { backgroundColor: 'rgba(40,20,10,0.35)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(40,20,10,0.38)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  devChipText: { ...typography.caption, color: colors.white },
  failureWrap: {
    position: 'absolute',
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    top: '40%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.card,
    padding: 16,
  },
  failureTitle: { ...typography.title, color: colors.text, marginBottom: 6 },
  failureText: { ...typography.body, color: colors.textSecondary },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center' },
  hint: {
    ...typography.caption,
    color: colors.white,
    backgroundColor: 'rgba(40,20,10,0.45)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.screenPadding,
  },
  actionBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', gap: 2, minWidth: 60 },
  selectionWrap: { position: 'absolute', left: spacing.screenPadding, right: spacing.screenPadding, alignItems: 'center' },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(40,20,10,0.6)', borderRadius: 999, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, maxWidth: '100%' },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200,80,62,0.9)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
