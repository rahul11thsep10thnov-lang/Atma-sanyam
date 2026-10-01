import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { AudioSettings, EnvironmentPresetId, UserPlacedObject } from '../state/types';
import { getAsset } from '../catalog/AssetCatalog';
import { ENVIRONMENT_PRESETS, FOCUS_COMPLETE_SECONDS, FOCUS_INTERRUPTED_SECONDS, LightingFrame } from '../engine/FocusEnvironmentEngine';
import { consumePendingOutcome, focusEnvironment } from '../engine/focusEnvironmentBridge';
import { PlantLibrarySheet } from '../../plants/PlantLibrarySheet';

const DEFAULT_AUDIO: AudioSettings = { enabled: true, master: 0.8 };

const PRESET_LABELS: Record<EnvironmentPresetId, string> = {
  AUTO: 'Auto',
  MORNING: 'Morning',
  GOLDEN_HOUR: 'Golden hour',
  NIGHT: 'Night',
  RAIN: 'Rain',
  FOREST: 'Forest',
  MONSOON: 'Monsoon',
  WINTER: 'Winter',
};

/** Step 6 prototype screen: the starter balcony, explorable and editable.
 * One-finger drag orbits, two fingers pan, pinch zooms, double-tap frames
 * an object (or resets), and in Edit mode a one-finger drag on an object
 * moves it across the floor. Everything persists. */
export function BalconyWorldScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const engineRef = useRef<BalconyEngine | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const viewportRef = useRef({ width: 1, height: 1 });
  const dragRef = useRef<{ id: string; lastValid: THREE.Vector3 } | null>(null);
  const audioSettingsRef = useRef<AudioSettings>(DEFAULT_AUDIO);
  const editModeRef = useRef(false);
  const presetRef = useRef<EnvironmentPresetId>('AUTO');
  const frameRef = useRef<LightingFrame | null>(null);

  const [ready, setReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(__DEV__);
  const [stats, setStats] = useState('');
  const [preset, setPreset] = useState<EnvironmentPresetId>('AUTO');
  const [plantsOpen, setPlantsOpen] = useState(false);

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
      environmentPreset: presetRef.current,
    });
  }, [definition.id]);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      engineRef.current?.dispose();
      audioRef.current?.dispose();
      setFailure(null);

      const saved = await loadWorld(definition.id);
      const savedPreset = saved?.environmentPreset ?? 'AUTO';
      presetRef.current = savedPreset;
      setPreset(savedPreset);
      focusEnvironment.setPreset(savedPreset);
      let engine: BalconyEngine;
      try {
        engine = new BalconyEngine(gl, definition, profile, viewportRef.current, focusEnvironment);
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
        }));
      engine.loadObjects(records);
      if (saved?.camera) engine.controller.setState(saved.camera);

      let cameraSaveTimer: ReturnType<typeof setTimeout> | null = null;
      engine.onCameraChanged = () => {
        if (cameraSaveTimer) clearTimeout(cameraSaveTimer);
        cameraSaveTimer = setTimeout(persist, 800);
      };

      engine.start();
      setReady(true);

      const audioSettings = saved?.audio ?? DEFAULT_AUDIO;
      audioSettingsRef.current = audioSettings;
      setSoundOn(audioSettings.enabled);
      const audio = new AudioEngine();
      audioRef.current = audio;
      // the environment engine drives the mix: birds by day, crickets at night, hush in deep focus
      engine.onLightingFrame = (frame, dt) => {
        frameRef.current = frame;
        audio.applyMix(frame.audio, dt);
      };
      try {
        await audio.start(definition.audio, audioSettings);
      } catch (error) {
        // A silent balcony is still a balcony; the scene must never depend on audio.
        if (__DEV__) console.warn('Balcony ambient audio failed to start', error);
      }
      if (!saved) persist();
    },
    [definition, profile, persist],
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

  // Reduced motion (brief §19): no drifting light, particles or push-in.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => focusEnvironment.setReducedMotion(enabled))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => focusEnvironment.setReducedMotion(enabled));
    return () => sub?.remove?.();
  }, []);

  // A session finished while the balcony was off screen: play its outcome
  // now — the sunlight reward for a completed one, a gentle fade otherwise.
  useEffect(() => {
    if (!isFocused || !ready) return;
    let cancelled = false;
    consumePendingOutcome().then((outcome) => {
      if (!outcome || cancelled) return;
      const now = performance.now() / 1000;
      if (outcome.outcome === 'completed') {
        focusEnvironment.dispatch({ type: 'FOCUS_COMPLETE', minutes: outcome.minutes, plantGrew: outcome.minutes >= 10 }, now);
        setHint('Your focus brought the sunlight.');
        setTimeout(() => setHint((h) => (h === 'Your focus brought the sunlight.' ? null : h)), FOCUS_COMPLETE_SECONDS * 1000 + 1500);
      } else {
        focusEnvironment.dispatch({ type: 'FOCUS_INTERRUPTED' }, now);
        setHint("It's okay. Try again next time.");
        setTimeout(() => setHint((h) => (h === "It's okay. Try again next time." ? null : h)), FOCUS_INTERRUPTED_SECONDS * 1000 + 1500);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isFocused, ready]);

  useEffect(() => {
    editModeRef.current = editMode;
    setHint(editMode ? 'Drag an object to move it' : null);
    if (!editMode) dragRef.current = null;
  }, [editMode]);

  // Stats line (tap the title to toggle, on in dev builds): the numbers the
  // performance step needs from a real device.
  useEffect(() => {
    if (!showStats || !ready) return;
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const f = frameRef.current;
      const env = f ? ` · ${f.timeOfDay.toLowerCase().replace('_', ' ')} ${f.hour.toFixed(1)}h · ${f.weather.toLowerCase()} · ${f.focus.toLowerCase()}` : '';
      setStats(`${Math.round(engine.fps)} fps · ${engine.objects.list().length} objects · ${profile.level.toLowerCase()}${env} · placeholder art`);
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
          if (editModeRef.current && e.numberOfPointers === 1) {
            const picked = engine.placement.pick(engine.ndcFrom(e.x, e.y, viewportRef.current), engine.camera, engine.objects);
            if (picked) dragRef.current = { id: picked.record.id, lastValid: picked.group.position.clone() };
          }
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

  const cycleEnvironment = () => {
    const idx = ENVIRONMENT_PRESETS.indexOf(presetRef.current);
    const next = ENVIRONMENT_PRESETS[(idx + 1) % ENVIRONMENT_PRESETS.length] ?? 'AUTO';
    presetRef.current = next;
    setPreset(next);
    focusEnvironment.setPreset(next);
    engineRef.current?.setDirty();
    persist();
  };

  /** Dev only: replay the sunlight reward without sitting through a session. */
  const previewReward = () => {
    focusEnvironment.dispatch({ type: 'FOCUS_COMPLETE', minutes: 25, plantGrew: true }, performance.now() / 1000);
    setHint('Your focus brought the sunlight.');
    setTimeout(() => setHint((h) => (h === 'Your focus brought the sunlight.' ? null : h)), FOCUS_COMPLETE_SECONDS * 1000 + 1500);
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
      </View>

      {failure && (
        <View style={styles.failureWrap} pointerEvents="none">
          <Text style={styles.failureTitle}>Couldn't start the 3D balcony</Text>
          <Text style={styles.failureText}>{failure}</Text>
        </View>
      )}

      {hint && (
        <View style={styles.hintWrap} pointerEvents="none">
          <Text style={styles.hint}>{hint}</Text>
        </View>
      )}

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <ActionButton label="Focus" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
        <ActionButton label={editMode ? 'Done' : 'Edit'} active={editMode} onPress={() => setEditMode((v) => !v)} />
        <ActionButton label="Plants" onPress={() => setPlantsOpen(true)} />
        <ActionButton label={soundOn ? 'Sound on' : 'Sound off'} onPress={toggleSound} />
        <ActionButton label={PRESET_LABELS[preset]} onPress={cycleEnvironment} />
        <ActionButton label="Reset view" onPress={resetView} />
        {showStats && __DEV__ && <ActionButton label="Sunlight" onPress={previewReward} />}
      </View>

      <PlantLibrarySheet visible={plantsOpen} onClose={() => setPlantsOpen(false)} />
    </View>
  );
}

function ActionButton({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, active && styles.actionBtnActive]} accessibilityRole="button">
      <Text style={[styles.actionBtnText, active && styles.actionBtnTextActive]}>{label}</Text>
    </Pressable>
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
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 9 },
  actionBtnActive: { backgroundColor: colors.primary },
  actionBtnText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  actionBtnTextActive: { color: colors.white },
});
