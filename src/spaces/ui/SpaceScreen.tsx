// A photographed space's tab (the balcony): the photograph fills the
// screen and the controls float lightly over it. Tap the picture to hide
// every control (and the tab bar); tap again to bring them back.
// Customize turns on placement guides, which never appear otherwise.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
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

const DURATIONS = [25, 45, 60, 90];
const STATE_ICON: Record<LightState | 'auto', IconName> = { auto: 'sun', morning: 'sun', afternoon: 'sun', sunset: 'sun', evening: 'moon', night: 'moon', rain: 'rain' };

export function SpaceScreen({ space }: { space: SpaceId }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  useLanguage();
  const pack = packFor(space);
  const [state, save] = useSpace(space);
  const [art, saveArt] = useCollection();
  const [rewards, saveRewards] = useRewards(isFocused);
  const rack = useRackCount();

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

  const onBin = (p: PlacedItem) => {
    const next2 = binItem(state, p.uid);
    if (next2 === state) return;
    save(next2);
    say(t('space.thrownAway', { name: pack.items[p.itemId]?.name ?? '' }));
  };

  return (
    <View style={styles.screen}>
      <SpaceScene space={space} state={state} art={art} light={light} rackCount={rack} mode={isFocused ? 'live' : 'still'} parallax={!editing} hiddenUid={dragging} onGeometry={setGeometry} style={StyleSheet.absoluteFill}>
        {!editing && <Pressable style={StyleSheet.absoluteFill} onPress={() => setChrome((c) => !c)} accessibilityLabel={chrome ? t('space.hideControls') : t('space.showControls')} />}
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
  scrim: { backgroundColor: 'rgba(20,12,8,0.25)' },
  focusCard: { position: 'absolute', left: sp.lg, right: sp.lg, padding: sp.xl, gap: sp.sm, borderRadius: radii.xl, backgroundColor: 'rgba(251,245,236,0.96)' },
  durations: { flexDirection: 'row', gap: sp.sm, marginTop: sp.sm },
  duration: { flex: 1, height: 72, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43,33,24,0.07)' },
});
