// The garden tab: a real-time 3D garden that fills the screen, with the
// controls floating over it. One finger slides across the lawn, two
// fingers turn and tilt like a map, pinch zooms. Customize lets a finger
// carry any object about like a cursor, onto a planter stand or into
// the dustbin.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightState } from '../../spaces/packTypes';
import { PENALTY_REMOVAL_COINS, STORE } from '../../spaces/catalog';
import { STAGE_WORDS, stageIndexFor, WILT_BELOW } from '../../spaces/model';
import { nextAtmosphere, resolveState } from '../../spaces/states';
import { useRewards } from '../../spaces/useSpaces';
import { AdSheet } from '../../spaces/ui/AdSheet';
import { GLASS, GLASS_EDGE, GlassChip, GlassPill, CREAM, INK } from '../../spaces/ui/Glass';
import { useCollection } from '../../collection/repository';
import { counts, findArtwork } from '../../collection/model';
import { CollectionSheet } from '../../collection/ui/CollectionSheet';
import { RootStackParamList } from '../../navigation/types';
import { gridForSession } from '../../collection/model';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { t, useLanguage } from '../../i18n';
import { GardenView } from '../scene/GardenView';
import { GardenItem, binItem, clearPenalty, hangArtwork, isFixed, isPenalty, moveItem, penaltyCount, putOnStand, storeItem, STAND_ITEM } from '../model';
import { useGarden } from '../repository';
import { SPRITES } from '../sprites.generated';
import { GardenStoreSheet } from './GardenStoreSheet';
import { GardenInventorySheet } from './GardenInventorySheet';

const DURATIONS = [25, 45, 60, 90];
const STATE_ICON: Record<LightState | 'auto', IconName> = { auto: 'sun', morning: 'sun', afternoon: 'sun', sunset: 'sun', evening: 'moon', night: 'moon', rain: 'rain' };

export function GardenScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  useLanguage();
  const [state, save] = useGarden();
  const [collection, saveCollection] = useCollection();
  const [rewards, saveRewards] = useRewards(isFocused);

  const [chrome, setChrome] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<'store' | 'inventory' | 'gallery' | 'focus' | 'ad' | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [overBin, setOverBin] = useState(false);
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
      setSelectedUid(null);
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
    navigation.navigate('ActiveSession', { config: { durationMinutes: minutes, image: { kind: 'space', space: 'garden' }, grid: gridForSession(minutes) } });
  };

  const artworkById = useCallback((id: string) => findArtwork(collection, id), [collection]);

  // ---- customize callbacks (stable: the GL view keeps them in a ref) ----
  const stateRef = useRef(state);
  stateRef.current = state;
  const onMove = useCallback((uid: string, x: number, z: number) => {
    const s = stateRef.current;
    if (!s) return;
    save(moveItem(s, uid, x, z));
  }, [save]);
  const onDropOnBin = useCallback((uid: string) => {
    const s = stateRef.current;
    if (!s) return;
    const it = s.items.find((i) => i.uid === uid);
    const next = binItem(s, uid);
    if (next === s) return;
    save(next);
    setSelectedUid(null);
    say(t('space.thrownAway', { name: it ? SPRITES.items[it.itemId]?.name ?? '' : '' }));
  }, [save, say]);
  const onDropOnStand = useCallback((uid: string, standUid: string) => {
    const s = stateRef.current;
    if (!s) return;
    const next = putOnStand(s, uid, standUid);
    if (!next) {
      say(t('garden.standFull'));
      return;
    }
    save(next);
    say(t('garden.onStand'));
  }, [save, say]);
  const onDragging = useCallback((_uid: string | null, bin: boolean) => setOverBin(bin), []);
  const onSelect = useCallback((uid: string | null) => {
    if (editing) setSelectedUid(uid);
    else if (!uid) setChrome((c) => !c);
  }, [editing]);

  if (!state || !rewards || !collection) return <View style={styles.screen} />;

  const light = resolveState(state.atmosphere);
  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + sp.md;
  const tree = SPRITES.focusTree;
  const stageIdx = tree ? stageIndexFor(tree.stages as never, state.focus.minutes) : 0;
  const stage = tree?.stages[stageIdx];
  const nextStage = tree?.stages[stageIdx + 1];
  const wilted = state.focus.health < WILT_BELOW;
  const plantLine = wilted
    ? t('space.plantDrooping')
    : nextStage
      ? `${STAGE_WORDS[stage?.id ?? ''] ?? stage?.id ?? ''} · ${t('space.toGrow', { time: formatTime(nextStage.minutes - state.focus.minutes) })}`
      : STAGE_WORDS[stage?.id ?? ''] ?? stage?.id ?? '';

  const sel: GardenItem | null = selectedUid ? state.items.find((p) => p.uid === selectedUid) ?? null : null;
  const penalties = penaltyCount(state);
  const stored = counts(collection).stored;

  const clearPen = async (uid: string) => {
    if (rewards.coins < PENALTY_REMOVAL_COINS) {
      say(t('space.needCoins', { coins: PENALTY_REMOVAL_COINS }));
      return;
    }
    const next = clearPenalty(state, uid);
    if (next === state) return;
    await saveRewards({ ...rewards, coins: rewards.coins - PENALTY_REMOVAL_COINS });
    save(next);
    say(t('space.penaltyCleared'));
    setSelectedUid(null);
  };

  return (
    <View style={styles.screen}>
      <GardenView
        state={state}
        light={light}
        mode={editing ? 'edit' : 'live'}
        rackCount={stored}
        artworkById={artworkById}
        selectedUid={selectedUid}
        onSelect={onSelect}
        onMove={onMove}
        onDropOnBin={onDropOnBin}
        onDropOnStand={onDropOnStand}
        onDragging={onDragging}
        style={StyleSheet.absoluteFill}
      />

      {/* ambient status, top */}
      <Animated.View style={[styles.top, { top: insets.top + sp.sm, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <GlassChip style={{ flexShrink: 1 }}>
          <Icon name="sprout" size="xs" color={wilted ? '#F3D9A6' : '#FFFFFF'} />
          <AppText variant="caption" style={styles.white} numberOfLines={1}>
            {tree?.name ?? t('space.garden')} · {plantLine}
          </AppText>
        </GlassChip>
        <View style={styles.topRight}>
          <Tactile onPress={() => save({ ...state, atmosphere: nextAtmosphere(state.atmosphere) })} accessibilityRole="button" accessibilityLabel={t('space.atmosphere')} style={styles.chipBtn}>
            <GlassChip>
              <Icon name={STATE_ICON[state.atmosphere]} size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={styles.white}>
                {t(`atmosphere.${state.atmosphere}`)}
              </AppText>
            </GlassChip>
          </Tactile>
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
          <DockItem icon="move" label={t('dock.customize')} onPress={() => { setEditing(true); setSelectedUid(null); }} />
          <DockItem icon="store" label={t('dock.store')} onPress={() => setSheet('store')} />
          <DockItem icon="armchair" label={t('dock.inventory')} onPress={() => setSheet('inventory')} badge={penalties > 0} />
          <DockItem icon="image" label={t('dock.gallery')} onPress={() => setSheet('gallery')} badge={stored > 0} />
        </View>
      </Animated.View>

      {/* customize mode */}
      {editing && (
        <>
          <View style={[styles.editTop, { top: insets.top + sp.sm }]} pointerEvents="box-none">
            <GlassChip style={[{ flexShrink: 1 }, overBin && { backgroundColor: 'rgba(120,40,20,0.6)' }]}>
              <Icon name={overBin ? 'trash' : 'move'} size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={styles.white} numberOfLines={2}>
                {overBin ? t('edit.dropToBin') : sel ? (isPenalty(sel.itemId) ? t('edit.penaltyHint', { coins: PENALTY_REMOVAL_COINS }) : t('garden.editHint')) : t('edit.tapSomething')}
              </AppText>
            </GlassChip>
            <GlassPill icon="check" label={t('done')} emphasis compact onPress={() => { setEditing(false); setSelectedUid(null); }} />
          </View>
          {sel && (
            <View style={[styles.selection, { bottom: insets.bottom + sp.xl }]} pointerEvents="box-none">
              <View style={styles.selectionCard}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmallStrong" style={styles.white} numberOfLines={1}>
                    {SPRITES.items[sel.itemId]?.name ?? sel.itemId}
                  </AppText>
                  <AppText variant="caption" style={styles.faint} numberOfLines={1}>
                    {sel.standUid ? t('garden.onStand') : sel.itemId === STAND_ITEM ? t('garden.capacity', { used: state.items.filter((i) => i.standUid === sel.uid).length, total: 6 }) : `${Math.round(sel.x)} m, ${Math.round(sel.z)} m`}
                  </AppText>
                </View>
                {isPenalty(sel.itemId) ? (
                  <GlassPill icon="coins" label={t('edit.clearFor', { coins: PENALTY_REMOVAL_COINS })} compact emphasis onPress={() => void clearPen(sel.uid)} />
                ) : (
                  !STORE[sel.itemId]?.hidden &&
                  !isFixed(sel.itemId) && (
                    <GlassPill
                      icon="trash"
                      label={t('edit.putAway')}
                      compact
                      onPress={() => {
                        save(storeItem(state, sel.uid));
                        say(t('edit.putAwayToast', { name: SPRITES.items[sel.itemId]?.name ?? '' }));
                        setSelectedUid(null);
                      }}
                    />
                  )
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
              {t('focusCard.title.garden')}
            </AppText>
            <AppText variant="bodySmall" style={{ color: 'rgba(43,33,24,0.7)' }}>
              {t('focusCard.body', { plant: (tree?.name ?? 'tree').toLowerCase() })}
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

      <GardenStoreSheet visible={sheet === 'store'} state={state} rewards={rewards} onClose={() => setSheet(null)} onState={save} onRewards={saveRewards} onToast={say} />
      <GardenInventorySheet visible={sheet === 'inventory'} state={state} rewards={rewards} onClose={() => setSheet(null)} onState={save} onClearPenalty={(uid) => void clearPen(uid)} onToast={say} />
      <CollectionSheet
        visible={sheet === 'gallery'}
        here="garden"
        collection={collection}
        onClose={() => setSheet(null)}
        onCollection={saveCollection}
        onHangHere={(a) => {
          const next = hangArtwork(state, a.id);
          if (next === state) return false;
          save(next);
          return true;
        }}
        onTakeDown={(a) => save({ ...state, items: state.items.map((i) => (i.artId === a.id ? { ...i, artId: null } : i)) })}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2f3a26' },
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
