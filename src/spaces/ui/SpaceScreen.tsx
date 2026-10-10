// A photographed space's tab (the balcony): the photograph fills the
// screen and the controls float lightly over it. Tap the picture to hide
// every control (and the tab bar); tap again to bring them back.
// Customize turns on placement guides, which never appear otherwise.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, GestureResponderEvent, Image, Pressable, StyleSheet, View } from 'react-native';
import { RouteProp, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightState, SpaceId } from '../packTypes';
import { packFor } from '../packs';
import { STORE, PENALTY_REMOVAL_COINS } from '../catalog';
import { binItem, focusVariant, hangArtwork, isFixed, isPenalty, PlacedItem, slotsFor, stageIndexFor, storeItem, turnItem, STAGE_WORDS } from '../model';
import { SpaceScene, SceneGeometry } from '../scene/SpaceScene';
import { ATMOSPHERE_ORDER, nextAtmosphere, resolveState } from '../states';
import { useRackCount, useRewards, useSpace } from '../useSpaces';
import { useCollection } from '../../collection/repository';
import { counts } from '../../collection/model';
import { CollectionSheet } from '../../collection/ui/CollectionSheet';
import { gridForSession } from '../../collection/model';
import { payToClearPenalty } from '../focusEngine';
import { StoreSheet } from './StoreSheet';
import { InventorySheet } from './InventorySheet';
import { EditLayer } from './EditLayer';
import { AdSheet } from './AdSheet';
import { GLASS, GLASS_EDGE, GlassChip, GlassPill, CREAM, INK } from './Glass';
import { RootStackParamList } from '../../navigation/types';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { t, useLanguage } from '../../i18n';
import { useParadise } from '../../paradise/repository';
import { onBalcony, PlantInstance, removePlant, spriteFor } from '../../paradise/model';
import { PARADISE_IMAGES } from '../../paradise/sprites.generated';
import { BALCONY_SPOTS, balconyMetres } from '../../paradise/balcony';
import { plantName, SPECIES_BY_ID } from '../../paradise/catalog';
import { RootTabParamList } from '../../navigation/types';

/** A grown plant drawn on the balcony, in plate pixels. */
interface BalconyPlant {
  plant: PlantInstance;
  depth: number;
  left: number;
  top: number;
  w: number;
  h: number;
  file: string;
  thumb?: string;
  /** a terracotta pot under plants that grow in the ground in the garden */
  pot: { x: number; y: number; w: number; h: number } | null;
}

function balconyPlants(plants: PlantInstance[]): BalconyPlant[] {
  const out: BalconyPlant[] = [];
  for (const p of plants) {
    const spot = BALCONY_SPOTS[p.slot];
    const sp = spriteFor(p.speciesId, p.size);
    if (!spot || !sp) continue;
    const habit = SPECIES_BY_ID[p.speciesId]?.habit;
    const potted = habit === 'pot' || habit === 'water';
    const k = (balconyMetres(sp.sprite.heightM) / sp.sprite.heightM) * spot.ppm * p.scale;
    const h = sp.sprite.heightM * k;
    const w = sp.sprite.widthM * k;
    let baseY = spot.y;
    let pot: BalconyPlant['pot'] = null;
    if (!potted) {
      const pw = Math.min(0.5, Math.max(0.26, sp.sprite.widthM * (balconyMetres(sp.sprite.heightM) / sp.sprite.heightM) * 0.45)) * spot.ppm;
      const ph = pw * 0.78;
      pot = { x: spot.x, y: spot.y, w: pw, h: ph };
      baseY = spot.y - ph * 0.92;
    }
    out.push({ plant: p, depth: spot.depth, left: spot.x - sp.sprite.pivot[0] * w, top: baseY - sp.sprite.pivot[1] * h, w, h, file: sp.sprite.file, thumb: sp.sprite.thumb, pot });
  }
  return out;
}

const DURATIONS = [25, 45, 60, 90];
const STATE_ICON: Record<LightState | 'auto', IconName> = { auto: 'sun', morning: 'sun', afternoon: 'sun', sunset: 'sun', evening: 'moon', night: 'moon', rain: 'rain' };

export function SpaceScreen({ space }: { space: SpaceId }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, 'History'>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  useLanguage();
  const pack = packFor(space);
  const [state, save] = useSpace(space);
  const [art, saveArt] = useCollection();
  const [rewards, saveRewards] = useRewards(isFocused);
  const rack = useRackCount();
  const [paradise, saveParadise] = useParadise();
  const grown = useMemo(() => (space === 'balcony' && paradise ? balconyPlants(paradise.plants.filter(onBalcony)) : []), [space, paradise]);
  const [plantSel, setPlantSel] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [glow, setGlow] = useState<string | null>(null);

  const [chrome, setChrome] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<'store' | 'inventory' | 'gallery' | 'focus' | 'ad' | null>(null);
  const [selected, setSelected] = useState<PlacedItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<SceneGeometry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const showChrome = chrome && !editing;
  useEffect(() => {
    Animated.timing(fade, { toValue: showChrome ? 1 : 0, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [showChrome, fade]);

  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: chrome && !editing && !sheet ? 'flex' : 'none' } } as never);
  }, [navigation, chrome, editing, sheet]);

  useEffect(() => {
    if (!isFocused) {
      setEditing(false);
      setSheet(null);
      setChrome(true);
    }
  }, [isFocused]);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // a plant arrived from a session: welcome it
  const arrival = (route.params as { arrival?: string } | undefined)?.arrival;
  useEffect(() => {
    if (!arrival || !paradise) return;
    const p = paradise.plants.find((x) => x.id === arrival);
    if (!p) return;
    setGlow(p.id);
    say(`${plantName(p.speciesId)} · ${t('paradise.size', { size: p.size })}`);
    navigation.setParams({ arrival: undefined } as never);
    const id = setTimeout(() => setGlow(null), 3200);
    return () => clearTimeout(id);
  }, [arrival, paradise, navigation, say]);

  const onScenePress = (e: GestureResponderEvent) => {
    if (geometry && grown.length) {
      // native press events carry locationX; on the web it is the mouse event's offsetX
      const ne = e.nativeEvent as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
      const px = ((ne.locationX ?? ne.offsetX ?? -1) - geometry.ox) / geometry.scale;
      const py = ((ne.locationY ?? ne.offsetY ?? -1) - geometry.oy) / geometry.scale;
      // nearest first: the plant drawn on top wins
      const hit = [...grown].sort((a, b) => a.depth - b.depth).find((g) => {
        const bottom = g.pot ? g.pot.y : g.top + g.h;
        return px >= g.left + g.w * 0.12 && px <= g.left + g.w * 0.88 && py >= g.top + g.h * 0.08 && py <= bottom;
      });
      if (hit) {
        setPlantSel(hit.plant.id);
        setConfirmRemove(false);
        setChrome(true);
        return;
      }
    }
    if (plantSel) {
      setPlantSel(null);
      return;
    }
    setChrome((c) => !c);
  };

  const extras = useMemo(
    () =>
      grown.map((g) => ({
        key: g.plant.id,
        depth: g.depth,
        render: (s: number) => {
          const big = g.h * s > 120;
          const source = PARADISE_IMAGES[big ? g.file : g.thumb ?? g.file] ?? PARADISE_IMAGES[g.file];
          const lit = g.plant.id === plantSel || g.plant.id === glow;
          return (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {g.pot && <Pot x={g.pot.x * s} y={g.pot.y * s} w={g.pot.w * s} h={g.pot.h * s} />}
              {source !== undefined && (
                <Image
                  source={source}
                  resizeMode="contain"
                  style={{ position: 'absolute', left: g.left * s, top: g.top * s, width: g.w * s, height: g.h * s, transform: g.plant.flip ? [{ scaleX: -1 }] : undefined, opacity: lit ? 1 : 0.98 }}
                />
              )}
              {lit && <View style={[styles.plantRing, { left: (g.pot?.x ?? g.left + g.w / 2) * s - 22, top: (g.pot ? g.pot.y : g.top + g.h) * s - 8 }]} />}
            </View>
          );
        },
      })),
    [grown, plantSel, glow],
  );

  const startFocus = (minutes: number) => {
    setSheet(null);
    navigation.navigate('ActiveSession', { config: { durationMinutes: minutes, image: { kind: 'space', space }, grid: gridForSession(minutes) } });
  };

  if (!state || !rewards || !art) return <View style={styles.screen} />;

  const light = resolveState(state.atmosphere);
  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + sp.md;
  const plant = focusVariant(pack, state.focus.minutes, state.focus.health);
  const stages = pack.focusPlant.stages;
  const next = stages[stageIndexFor(stages, state.focus.minutes) + 1];
  const plantLine = plant.wilted
    ? t('space.plantDrooping')
    : next
      ? `${STAGE_WORDS[plant.stage] ?? plant.stage} · ${t('space.toGrow', { time: formatTime(next.minutes - state.focus.minutes) })}`
      : STAGE_WORDS[plant.stage] ?? plant.stage;

  const sel = selected ? state.placed.find((p) => p.uid === selected.uid) ?? null : null;
  const turns = sel ? pack.items[sel.itemId]?.variants?.[sel.slot]?.length ?? 1 : 1;
  const movable = sel ? slotsFor(space, sel.itemId).filter((s) => s !== pack.focusPlant.slot).length > 1 : false;
  const penalties = state.placed.filter((p) => isPenalty(p.itemId)).length;
  const multiState = pack.renderedStates.length > 1;

  const clearPenalty = async (uid: string) => {
    const r = await payToClearPenalty(space, uid);
    if (r.ok) {
      await saveRewards({ ...rewards, coins: r.coins });
      say(t('space.penaltyCleared'));
      setSelected(null);
    } else say(t('space.needCoins', { coins: PENALTY_REMOVAL_COINS }));
  };

  const selPlant = plantSel && paradise ? paradise.plants.find((p) => p.id === plantSel && onBalcony(p)) ?? null : null;

  const onBin = (p: PlacedItem) => {
    const next2 = binItem(state, p.uid);
    if (next2 === state) return;
    save(next2);
    say(t('space.thrownAway', { name: pack.items[p.itemId]?.name ?? '' }));
  };

  return (
    <View style={styles.screen}>
      <SpaceScene space={space} state={state} art={art} light={light} rackCount={rack} mode={isFocused ? 'live' : 'still'} parallax={!editing} hiddenUid={dragging} onGeometry={setGeometry} extras={extras} style={StyleSheet.absoluteFill}>
        {!editing && <Pressable style={StyleSheet.absoluteFill} onPress={onScenePress} accessibilityLabel={chrome ? t('space.hideControls') : t('space.showControls')} />}
        {editing && geometry && (
          <EditLayer space={space} state={state} geometry={geometry} light={light} selected={sel} onSelect={setSelected} onChange={save} onDragging={setDragging} onBin={space === 'garden' ? onBin : undefined} />
        )}
      </SpaceScene>

      {/* ambient status, top */}
      <Animated.View style={[styles.top, { top: insets.top + sp.sm, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <GlassChip style={{ flexShrink: 1 }}>
          <Icon name="sprout" size="xs" color={plant.wilted ? '#F3D9A6' : '#FFFFFF'} />
          <AppText variant="caption" style={styles.white} numberOfLines={1}>
            {pack.focusPlant.name} · {plantLine}
          </AppText>
        </GlassChip>
        <View style={styles.topRight}>
          {multiState && (
            <Tactile onPress={() => save({ ...state, atmosphere: nextAtmosphere(state.atmosphere) })} accessibilityRole="button" accessibilityLabel={t('space.atmosphere')} style={styles.chipBtn}>
              <GlassChip>
                <Icon name={STATE_ICON[state.atmosphere]} size="xs" color="#FFFFFF" />
                <AppText variant="caption" style={styles.white}>
                  {t(`atmosphere.${state.atmosphere}`)}
                </AppText>
              </GlassChip>
            </Tactile>
          )}
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

      {space === 'balcony' && grown.length > 0 && showChrome && penalties === 0 && !selPlant && (
        <View style={[styles.penaltyWrap, { top: insets.top + 52 }]} pointerEvents="none">
          <GlassChip>
            <Icon name="sprout" size="xs" color="#FFFFFF" />
            <AppText variant="caption" style={styles.white}>
              {t('balcony.plantsCount', { count: grown.length, total: BALCONY_SPOTS.length })}
            </AppText>
          </GlassChip>
        </View>
      )}

      {penalties > 0 && showChrome && (
        <View style={[styles.penaltyWrap, { top: insets.top + 52 }]} pointerEvents="box-none">
          <Tactile onPress={() => setSheet('inventory')} accessibilityRole="button" accessibilityLabel={t('space.penaltyNotice', { count: penalties })} style={styles.chipBtn}>
            <GlassChip style={{ backgroundColor: 'rgba(120,40,20,0.55)' }}>
              <Icon name="alert" size="xs" color="#FFD9C0" />
              <AppText variant="caption" style={styles.white}>
                {t('space.penaltyNotice', { count: penalties })}
              </AppText>
            </GlassChip>
          </Tactile>
        </View>
      )}

      {/* the dock */}
      <Animated.View style={[styles.dockWrap, { bottom: tabSpace, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <View style={styles.dock}>
          <DockItem icon="timer" label={t('dock.focus')} emphasis onPress={() => setSheet('focus')} />
          <DockItem icon="move" label={t('dock.customize')} onPress={() => { setEditing(true); setSelected(null); }} />
          <DockItem icon="store" label={t('dock.store')} onPress={() => setSheet('store')} />
          <DockItem icon="armchair" label={t('dock.inventory')} onPress={() => setSheet('inventory')} badge={penalties > 0} />
          <DockItem icon="image" label={t('dock.gallery')} onPress={() => setSheet('gallery')} badge={counts(art).stored > 0} />
        </View>
      </Animated.View>

      {/* customize mode */}
      {editing && (
        <>
          <View style={[styles.editTop, { top: insets.top + sp.sm }]} pointerEvents="box-none">
            <GlassChip style={{ flexShrink: 1 }}>
              <Icon name="move" size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={styles.white} numberOfLines={2}>
                {sel ? (isPenalty(sel.itemId) ? t('edit.penaltyHint', { coins: PENALTY_REMOVAL_COINS }) : movable ? (space === 'garden' ? t('edit.dragOrBin') : t('edit.dragOrTap')) : t('edit.oneHome')) : t('edit.tapSomething')}
              </AppText>
            </GlassChip>
            <GlassPill icon="check" label={t('done')} emphasis compact onPress={() => { setEditing(false); setSelected(null); }} />
          </View>
          {sel && (
            <View style={[styles.selection, { bottom: insets.bottom + sp.xl }]} pointerEvents="box-none">
              <View style={styles.selectionCard}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmallStrong" style={styles.white} numberOfLines={1}>
                    {pack.items[sel.itemId]?.name}
                  </AppText>
                  <AppText variant="caption" style={styles.faint} numberOfLines={1}>
                    {pack.slots[sel.slot]?.label}
                  </AppText>
                </View>
                {isPenalty(sel.itemId) ? (
                  <GlassPill icon="coins" label={t('edit.clearFor', { coins: PENALTY_REMOVAL_COINS })} compact emphasis onPress={() => void clearPenalty(sel.uid)} />
                ) : (
                  <>
                    {turns > 1 && <GlassPill icon="reset" label={t('edit.turn')} compact onPress={() => save(turnItem(state, sel.uid))} />}
                    {!STORE[sel.itemId]?.hidden && !isFixed(space, sel.itemId) && (
                      <GlassPill
                        icon="trash"
                        label={t('edit.putAway')}
                        compact
                        onPress={() => {
                          save(storeItem(state, sel.uid));
                          say(t('edit.putAwayToast', { name: pack.items[sel.itemId]?.name ?? '' }));
                          setSelected(null);
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {selPlant && paradise && !editing && !sheet && (
        <View style={[styles.selection, { bottom: tabSpace + 76 }]} pointerEvents="box-none">
          <View style={[styles.selectionCard, { flexDirection: 'column', alignItems: 'stretch', paddingRight: sp.sm, paddingVertical: sp.sm }]}>
            <View style={{ gap: 2 }}>
              <AppText variant="bodySmallStrong" style={styles.white} numberOfLines={1}>
                {plantName(selPlant.speciesId)} · {t('paradise.size', { size: selPlant.size })}
              </AppText>
              <AppText variant="caption" style={styles.faint} numberOfLines={1}>
                {t('paradise.grownFrom', { minutes: selPlant.focusMinutes })} · {new Date(selPlant.plantedAt).toLocaleDateString()}
              </AppText>
            </View>
            {confirmRemove ? (
              <View style={styles.plantActions}>
                <AppText variant="caption" style={[styles.white, { flex: 1 }]} numberOfLines={2}>
                  {t('balcony.deleteConfirm', { name: plantName(selPlant.speciesId) })}
                </AppText>
                <GlassPill label={t('cancel')} compact onPress={() => setConfirmRemove(false)} />
                <GlassPill
                  icon="trash"
                  label={t('paradise.delete')}
                  compact
                  emphasis
                  onPress={() => {
                    saveParadise(removePlant(paradise, selPlant.id));
                    say(t('paradise.deleted', { name: plantName(selPlant.speciesId) }));
                    setPlantSel(null);
                    setConfirmRemove(false);
                  }}
                />
              </View>
            ) : (
              <View style={[styles.plantActions, { justifyContent: 'flex-end' }]}>
                <GlassPill icon="trash" label={t('paradise.delete')} compact onPress={() => setConfirmRemove(true)} />
                <GlassPill icon="close" compact onPress={() => setPlantSel(null)} accessibilityLabel={t('close')} />
              </View>
            )}
          </View>
        </View>
      )}

      {toast && (
        <View style={[styles.toastWrap, { bottom: editing ? insets.bottom + 96 : tabSpace + 76 }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {toast}
            </AppText>
          </GlassChip>
        </View>
      )}

      {sheet === 'focus' && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setSheet(null)} accessibilityLabel={t('close')} />
          <View style={[styles.focusCard, { bottom: insets.bottom + sp.xl }]}>
            <AppText variant="subheading" style={{ color: INK }}>
              {t(`focusCard.title.${space}`)}
            </AppText>
            <AppText variant="bodySmall" style={{ color: 'rgba(43,33,24,0.7)' }}>
              {t('focusCard.body', { plant: pack.focusPlant.name.toLowerCase() })}
            </AppText>
            <View style={styles.durations}>
              {DURATIONS.map((m) => (
                <Tactile key={m} onPress={() => startFocus(m)} accessibilityRole="button" accessibilityLabel={t('focusCard.forMinutes', { minutes: m })} style={styles.duration}>
                  <AppText variant="heading" style={{ color: INK }}>
                    {m}
                  </AppText>
                  <AppText variant="caption" style={{ color: 'rgba(43,33,24,0.6)' }}>
                    {t('min')}
                  </AppText>
                </Tactile>
              ))}
            </View>
          </View>
        </View>
      )}

      <StoreSheet visible={sheet === 'store'} space={space} state={state} rewards={rewards} onClose={() => setSheet(null)} onState={save} onRewards={saveRewards} onToast={say} />
      <InventorySheet visible={sheet === 'inventory'} space={space} state={state} rewards={rewards} onClose={() => setSheet(null)} onState={save} onClearPenalty={(uid) => void clearPenalty(uid)} onToast={say} />
      <CollectionSheet
        visible={sheet === 'gallery'}
        here="balcony"
        collection={art}
        onClose={() => setSheet(null)}
        onCollection={saveArt}
        onHangHere={(a) => {
          const next = hangArtwork(state, a.id);
          if (next === state) return false;
          save(next);
          return true;
        }}
        onTakeDown={(a) => save({ ...state, placed: state.placed.map((p) => (p.artId === a.id ? { ...p, artId: null } : p)) })}
        onToast={say}
      />
      <AdSheet visible={sheet === 'ad'} rewards={rewards} onClose={() => setSheet(null)} onRewards={saveRewards} onToast={say} />
    </View>
  );
}

function formatTime(minutes: number) {
  const m = Math.ceil(minutes);
  if (m < 60) return `${m} ${t('min')}`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ${t('h')} ${r} ${t('min')}` : `${h} ${t('h')}`;
}

/** A terracotta pot seen from slightly above: a rim ellipse over a tapering body. */
function Pot({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const rimH = Math.max(2, w * 0.22);
  const bottomW = w * 0.72;
  return (
    <>
      <View style={{ position: 'absolute', left: x - w * 0.55, top: y - h * 0.12, width: w * 1.1, height: h * 0.3, borderRadius: w, backgroundColor: 'rgba(30,18,10,0.28)' }} />
      <View style={{ position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h, borderTopWidth: h, borderTopColor: '#a65a35', borderLeftWidth: (w - bottomW) / 2, borderRightWidth: (w - bottomW) / 2, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomLeftRadius: w * 0.08, borderBottomRightRadius: w * 0.08 }} />
      <View style={{ position: 'absolute', left: x - w / 2, top: y - h, width: w * 0.35, height: h, borderTopWidth: h, borderTopColor: 'rgba(255,220,180,0.12)', borderLeftWidth: (w - bottomW) / 2, borderLeftColor: 'transparent' }} />
      <View style={{ position: 'absolute', left: x - w * 0.54, top: y - h - rimH * 0.5, width: w * 1.08, height: rimH, borderRadius: w, backgroundColor: '#b8673f', borderColor: '#8c4a2c', borderWidth: Math.max(1, w * 0.03) }} />
      <View style={{ position: 'absolute', left: x - w * 0.44, top: y - h - rimH * 0.32, width: w * 0.88, height: rimH * 0.64, borderRadius: w, backgroundColor: '#4a3426' }} />
    </>
  );
}

function DockItem({ icon, label, onPress, emphasis, badge }: { icon: IconName; label: string; onPress: () => void; emphasis?: boolean; badge?: boolean }) {
  const ink = emphasis ? INK : '#FFFFFF';
  return (
    <Tactile onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label} style={[styles.dockItem, emphasis && styles.dockEmphasis]}>
      <Icon name={icon} size="sm" color={ink} />
      <AppText variant="caption" style={{ color: ink }} numberOfLines={1}>
        {label}
      </AppText>
      {badge && <View style={styles.badge} />}
    </Tactile>
  );
}

export { ATMOSPHERE_ORDER };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#3a2e26' },
  white: { color: '#FFFFFF' },
  faint: { color: 'rgba(255,255,255,0.72)' },
  top: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: sp.sm },
  topRight: { flexDirection: 'row', gap: 6 },
  chipBtn: { borderRadius: radii.pill },
  penaltyWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'flex-start' },
  dockWrap: { position: 'absolute', left: sp.sm, right: sp.sm, alignItems: 'center' },
  dock: { flexDirection: 'row', gap: 2, padding: 5, borderRadius: radii.xl, backgroundColor: GLASS, borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  dockItem: { width: 66, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockEmphasis: { backgroundColor: CREAM },
  badge: { position: 'absolute', top: 8, right: 16, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F2B66D' },
  editTop: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sp.sm },
  selection: { position: 'absolute', left: sp.lg, right: sp.lg },
  selectionCard: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingLeft: sp.lg, paddingRight: 6, paddingVertical: 6, borderRadius: radii.xl, backgroundColor: 'rgba(28,20,14,0.62)', borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  toastWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  toast: { height: undefined, paddingVertical: 8, maxWidth: '100%' },
  plantActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: sp.sm },
  plantRing: { position: 'absolute', width: 44, height: 16, borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,240,200,0.9)' },
  scrim: { backgroundColor: 'rgba(20,12,8,0.25)' },
  focusCard: { position: 'absolute', left: sp.lg, right: sp.lg, padding: sp.xl, gap: sp.sm, borderRadius: radii.xl, backgroundColor: 'rgba(251,245,236,0.96)' },
  durations: { flexDirection: 'row', gap: sp.sm, marginTop: sp.sm },
  duration: { flex: 1, height: 72, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43,33,24,0.07)' },
});
