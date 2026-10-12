// The Garden tab: the paradise, whole or one segment at a time, with the
// least UI that still lets a person choose what to grow next, inspect a
// plant they grew, reshuffle a bed, and find their way around.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PENALTY_REMOVAL_COINS } from '../../spaces/catalog';
import { useRewards } from '../../spaces/useSpaces';
import { AdSheet } from '../../spaces/ui/AdSheet';
import { GLASS, GLASS_EDGE, GlassChip, GlassPill, INK } from '../../spaces/ui/Glass';
import { RootStackParamList } from '../../navigation/types';
import { gridForSession } from '../../collection/model';
import { useSettings } from '../../context/SettingsContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { t, useLanguage } from '../../i18n';
import { SEGMENTS, SPECIES_BY_ID, SegmentId, Species, plantName, plantText } from '../catalog';
import { SEGMENT_RANGE } from '../layout';
import { PlantInstance, PlantPlace, Penalty, clearPenalty, counts, grownIn, removePlant, shuffleSegment } from '../model';
import { useParadise } from '../repository';
import { Ambience } from '../scene/Ambience';
import { MotionLevel, ParadiseScene, SceneView } from '../scene/ParadiseScene';
import { PlantCatalogSheet, speciesThumb } from './PlantCatalogSheet';
import { PlantPreviewSheet } from './PlantPreviewSheet';

const THUMB = require('../../../assets/paradise/plate_thumb.webp');

type Sheet = 'catalog' | 'preview' | 'ad' | null;

export function ParadiseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<{ key: string; name: string; params?: { arrival?: string } }>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const { settings } = useSettings();
  const reduced = useReducedMotion();
  useLanguage();
  const [state, save] = useParadise();
  const [rewards, saveRewards] = useRewards(isFocused);

  const [view, setView] = useState<SceneView>({ mode: 'full' });
  const [chrome, setChrome] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [catalogSegment, setCatalogSegment] = useState<SegmentId>('flowers');
  const [preview, setPreview] = useState<Species | null>(null);
  const [selected, setSelected] = useState<PlantInstance | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [penalty, setPenalty] = useState<Penalty | null>(null);
  const [arrival, setArrival] = useState<string | null>(null);
  const [centre, setCentre] = useState(0.5);
  const [centreRequest, setCentreRequest] = useState<{ fraction: number; nonce: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const motion: MotionLevel = reduced ? 'off' : (settings.gardenMotion ?? 'full');
  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + sp.md;
  const minimapTop = insets.top + sp.sm;
  const minimapH = Math.round((width - sp.lg * 2) * (295 / 1152));
  const plateTop = minimapTop + minimapH + sp.md + 40;
  const bottomClear = tabSpace + 84;

  useEffect(() => {
    Animated.timing(fade, { toValue: chrome ? 1 : 0, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [chrome, fade]);
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: chrome && !sheet && view.mode === 'full' ? 'flex' : 'none' } } as never);
  }, [navigation, chrome, sheet, view.mode]);

  // a plant arrived from a session: go to its segment and welcome it
  useEffect(() => {
    const id = route.params?.arrival;
    if (!id || !state) return;
    const plant = state.plants.find((p) => p.id === id);
    if (!plant) return;
    setView({ mode: 'segment', segment: plant.segment });
    setArrival(id);
    setSelected(null);
    // the welcome label waits for the camera; clearing the route param must not cancel it
    if (arrivalTimer.current) clearTimeout(arrivalTimer.current);
    arrivalTimer.current = setTimeout(() => {
      say(t('paradise.arrived', { name: plantName(plant.speciesId), size: plant.size }));
    }, 1100);
    navigation.setParams({ arrival: undefined } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.arrival, state?.plants.length]);

  useEffect(() => {
    if (!isFocused) {
      setSheet(null);
      setSelected(null);
      setPenalty(null);
    }
  }, [isFocused]);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (arrivalTimer.current) clearTimeout(arrivalTimer.current);
  }, []);

  const startFocus = (species: Species, minutes: number, place: PlantPlace) => {
    setSheet(null);
    setPreview(null);
    navigation.navigate('ActiveSession', { config: { durationMinutes: minutes, image: { kind: 'plant', speciesId: species.id, place }, grid: gridForSession(minutes) } });
  };

  const openCatalog = (segment: SegmentId) => {
    setCatalogSegment(segment);
    setSelected(null);
    setPenalty(null);
    setSheet('catalog');
  };

  const onTapPlant = useCallback((p: PlantInstance) => {
    setPenalty(null);
    setSelected((cur) => (cur?.id === p.id ? null : p));
  }, []);
  const onTapPenalty = useCallback((p: Penalty) => {
    setSelected(null);
    setPenalty((cur) => (cur?.id === p.id ? null : p));
  }, []);
  const onTapEmpty = useCallback(() => {
    setSelected(null);
    setPenalty(null);
    setChrome((c) => (view.mode === 'full' ? !c : true));
  }, [view.mode]);
  const onTapSegment = useCallback((segment: SegmentId) => {
    setSelected(null);
    setPenalty(null);
    setChrome(true);
    setView({ mode: 'segment', segment });
  }, []);
  const segmentLabel = useCallback((s: SegmentId) => t(`paradise.segment.${s}` as never), []);

  const clearPen = async (pen: Penalty) => {
    if (!state || !rewards) return;
    if (rewards.coins < PENALTY_REMOVAL_COINS) {
      say(t('space.needCoins', { coins: PENALTY_REMOVAL_COINS }));
      return;
    }
    await saveRewards({ ...rewards, coins: rewards.coins - PENALTY_REMOVAL_COINS });
    save(clearPenalty(state, pen.id));
    setPenalty(null);
    say(t('space.penaltyCleared'));
  };

  const total = useMemo(() => (state ? state.plants.filter((p) => p.place !== 'balcony').length : 0), [state]);
  const perSegment = useMemo(() => (state ? counts(state) : null), [state]);

  if (!state || !rewards) return <View style={styles.screen} />;

  const segment = view.mode === 'segment' ? view.segment : null;
  const sel = selected ? state.plants.find((p) => p.id === selected.id) ?? null : null;
  const selSpecies = sel ? SPECIES_BY_ID[sel.speciesId] : null;
  const viewportW = (width - sp.lg * 2) * Math.min(1, width / (3840 * Math.max(0.2, (height - plateTop - bottomClear) / 983)));

  return (
    <View style={styles.screen}>
      <ParadiseScene
        state={state}
        view={view}
        width={width}
        height={height}
        plateTop={plateTop}
        bottomClear={bottomClear}
        motion={motion}
        selectedId={sel?.id ?? penalty?.id ?? null}
        arrivalId={arrival}
        onTapPlant={onTapPlant}
        onTapPenalty={onTapPenalty}
        onTapSegment={onTapSegment}
        onTapEmpty={onTapEmpty}
        onCentre={setCentre}
        centreRequest={centreRequest}
        segmentLabel={segmentLabel}
      />
      <Ambience width={width} height={height} motion={motion} skyBottom={view.mode === 'full' ? plateTop + 40 : height * 0.3} />

      {/* the whole garden at a glance: the minimap */}
      {view.mode === 'full' && (
        <Animated.View style={[styles.minimapWrap, { top: minimapTop, opacity: fade }]} pointerEvents={chrome ? 'box-none' : 'none'}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={t('paradise.minimap')}
            onPress={(e) => setCentreRequest({ fraction: Math.max(0, Math.min(1, e.nativeEvent.locationX / (width - sp.lg * 2))), nonce: Date.now() })}
            style={[styles.minimap, { width: width - sp.lg * 2, height: minimapH }]}
          >
            <Image source={THUMB} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
            <View pointerEvents="none" style={[styles.viewport, { left: Math.max(0, Math.min(1 - viewportW / (width - sp.lg * 2), centre - viewportW / (2 * (width - sp.lg * 2)))) * (width - sp.lg * 2), width: viewportW, height: minimapH }]} />
            {SEGMENTS.map((s) => (
              <View key={s} pointerEvents="none" style={[styles.tick, { left: ((SEGMENT_RANGE[s][0] + SEGMENT_RANGE[s][1]) / 2) * (width - sp.lg * 2) - 8 }]}>
                <AppText variant="caption" style={styles.tickText}>
                  {perSegment?.[s] ?? 0}
                </AppText>
              </View>
            ))}
          </Pressable>
          <View style={styles.titleRow}>
            <GlassChip>
              <Icon name="flower" size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={styles.white} numberOfLines={1}>
                {t('paradise.title')} · {t('paradise.plantCount', { count: total })}
              </AppText>
            </GlassChip>
            <Tactile onPress={() => setSheet('ad')} accessibilityRole="button" accessibilityLabel={t('space.coinsAndAds')} style={styles.chipBtn}>
              <GlassChip>
                <Icon name="coins" size="xs" color="#FFFFFF" />
                <AppText variant="bodySmallStrong" style={styles.white}>
                  {rewards.coins}
                </AppText>
              </GlassChip>
            </Tactile>
          </View>
        </Animated.View>
      )}

      {/* segment view: back, title, shuffle */}
      {segment && (
        <View style={[styles.segTop, { top: insets.top + sp.sm }]} pointerEvents="box-none">
          <GlassPill icon="chevronLeft" label={t('paradise.wholeGarden')} compact onPress={() => { setView({ mode: 'full' }); setSelected(null); setPenalty(null); }} />
          <GlassChip style={{ flexShrink: 1 }}>
            <AppText variant="caption" style={styles.white} numberOfLines={1}>
              {segmentLabel(segment)} · {t('paradise.plantCount', { count: perSegment?.[segment] ?? 0 })}
            </AppText>
          </GlassChip>
          <GlassPill icon="reset" compact onPress={() => { save(shuffleSegment(state, segment)); say(t('paradise.shuffled')); }} accessibilityLabel={t('paradise.shuffle')} />
        </View>
      )}

      {/* the dock */}
      {!sel && !penalty && (
        <Animated.View style={[styles.dockWrap, { bottom: segment ? insets.bottom + sp.lg : tabSpace, opacity: segment ? 1 : fade }]} pointerEvents={chrome || segment ? 'box-none' : 'none'}>
          <Button label={segment ? t('paradise.growHere', { segment: segmentLabel(segment) }) : t('paradise.growPlant')} icon="sprout" size="lg" onPress={() => openCatalog(segment ?? state.lastSegment ?? 'flowers')} style={styles.grow} />
          {!segment && (
            <AppText variant="caption" style={styles.hint} numberOfLines={1}>
              {t('paradise.hint')}
            </AppText>
          )}
        </Animated.View>
      )}

      {/* a grown plant's card */}
      {sel && selSpecies && (
        <View style={[styles.card, { bottom: segment ? insets.bottom + sp.lg : tabSpace }]} pointerEvents="box-none">
          <View style={styles.cardInner}>
            <View style={styles.cardThumb}>{speciesThumb(sel.speciesId, sel.size) && <Image source={speciesThumb(sel.speciesId, sel.size)!} style={{ width: '90%', height: '90%' }} resizeMode="contain" />}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" style={styles.white} numberOfLines={1}>
                {plantName(sel.speciesId)} · {t('paradise.size', { size: sel.size })}
              </AppText>
              <AppText variant="caption" style={styles.faint} numberOfLines={1}>
                {selSpecies.scientificName}
              </AppText>
              <AppText variant="caption" style={styles.faint} numberOfLines={2}>
                {t('paradise.grownFrom', { minutes: sel.focusMinutes })} · {new Date(sel.plantedAt).toLocaleDateString()}
              </AppText>
              <AppText variant="caption" style={styles.faint} numberOfLines={3}>
                {plantText(sel.speciesId).description}
              </AppText>
            </View>
          </View>
          {confirmDelete === sel.id ? (
            <View style={styles.cardActions}>
              <AppText variant="caption" style={[styles.white, { flex: 1 }]} numberOfLines={2}>
                {t('paradise.deleteConfirm', { name: plantName(sel.speciesId) })}
              </AppText>
              <GlassPill label={t('cancel')} compact onPress={() => setConfirmDelete(null)} />
              <GlassPill icon="trash" label={t('paradise.delete')} compact emphasis onPress={() => {
                save(removePlant(state, sel.id));
                setSelected(null);
                setConfirmDelete(null);
                say(t('paradise.deleted', { name: plantName(sel.speciesId) }));
              }} />
            </View>
          ) : (
            <View style={styles.cardActions}>
              <GlassPill icon="trash" compact onPress={() => setConfirmDelete(sel.id)} accessibilityLabel={t('paradise.delete')} />
              <GlassPill icon="sprout" label={t('paradise.growAnother')} compact emphasis onPress={() => { setPreview(selSpecies); setSelected(null); setSheet('preview'); }} />
              <GlassPill icon="close" compact onPress={() => setSelected(null)} accessibilityLabel={t('close')} />
            </View>
          )}
        </View>
      )}
      {penalty && (
        <View style={[styles.card, { bottom: segment ? insets.bottom + sp.lg : tabSpace }]} pointerEvents="box-none">
          <View style={styles.cardInner}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyStrong" style={styles.white}>
                {t('paradise.wilted')}
              </AppText>
              <AppText variant="caption" style={styles.faint}>
                {t('paradise.wiltedBody', { coins: PENALTY_REMOVAL_COINS })}
              </AppText>
            </View>
          </View>
          <View style={styles.cardActions}>
            <GlassPill icon="coins" label={t('edit.clearFor', { coins: PENALTY_REMOVAL_COINS })} compact emphasis onPress={() => void clearPen(penalty)} />
            <GlassPill icon="close" compact onPress={() => setPenalty(null)} accessibilityLabel={t('close')} />
          </View>
        </View>
      )}

      {toast && (
        <View style={[styles.toastWrap, { bottom: (segment ? insets.bottom + sp.lg : tabSpace) + 96 }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {toast}
            </AppText>
          </GlassChip>
        </View>
      )}

      <PlantCatalogSheet visible={sheet === 'catalog'} segment={catalogSegment} grownInSegment={grownIn(state, catalogSegment)} onClose={() => setSheet(null)} onPick={(s) => { setPreview(s); setSheet('preview'); }} />
      <PlantPreviewSheet visible={sheet === 'preview'} species={preview} onClose={() => setSheet(preview ? 'catalog' : null)} onStart={startFocus} />
      <AdSheet visible={sheet === 'ad'} rewards={rewards} onClose={() => setSheet(null)} onRewards={saveRewards} onToast={say} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E9C9C6' },
  white: { color: '#FFFFFF' },
  faint: { color: 'rgba(255,255,255,0.78)' },
  minimapWrap: { position: 'absolute', left: sp.lg, right: sp.lg, gap: sp.sm },
  minimap: { borderRadius: radii.md, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,248,238,0.6)' },
  viewport: { position: 'absolute', top: 0, borderWidth: 2, borderColor: '#FFF4D6', borderRadius: 6, backgroundColor: 'rgba(255,244,214,0.12)' },
  tick: { position: 'absolute', bottom: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(28,20,14,0.6)', alignItems: 'center', justifyContent: 'center' },
  tickText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: sp.sm },
  chipBtn: { borderRadius: radii.pill },
  segTop: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sp.sm },
  dockWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center', gap: 6 },
  grow: { alignSelf: 'stretch' },
  hint: { color: 'rgba(255,255,255,0.85)', textShadowColor: 'rgba(20,12,8,0.5)', textShadowRadius: 6 },
  card: { position: 'absolute', left: sp.lg, right: sp.lg, gap: sp.sm, padding: sp.md, borderRadius: radii.xl, backgroundColor: 'rgba(28,20,14,0.72)', borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  cardInner: { flexDirection: 'row', gap: sp.md, alignItems: 'center' },
  cardThumb: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  toastWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  toast: { height: undefined, paddingVertical: 8, maxWidth: '100%', backgroundColor: GLASS },
});

export { INK };
