// The museum tab: the ring gallery fills the screen and a few controls
// float over it. Swipe to walk from section to section; tap an artwork
// for its story. The museum arranges itself: finished jigsaws hang in
// the next free frame, at least ten empty frames are always waiting, and
// the only thing a person does to an artwork is keep it or throw it away.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '../../spaces/useSpaces';
import { AdSheet } from '../../spaces/ui/AdSheet';
import { Sheet } from '../../spaces/ui/Sheet';
import { GLASS, GLASS_EDGE, GlassChip, GlassPill, CREAM, INK } from '../../spaces/ui/Glass';
import { useCollection } from '../../collection/repository';
import { ArtworkRecord, TIER_GRIDS, counts, findArtwork, setFrame, setHome } from '../../collection/model';
import { CollectionSheet } from '../../collection/ui/CollectionSheet';
import { RootStackParamList } from '../../navigation/types';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';
import { t, useLanguage } from '../../i18n';
import { MuseumView } from '../scene/MuseumView';
import { MuseumObject, MuseumState, MuseumTheme, artworkSize, ensureBlankSpaces, hangInMuseum, moveObject, ownsFrame, snapToWall, storeObject, takeDownFromMuseum, updateObject } from '../model';
import { useMuseum } from '../repository';
import { MUSEUM_STORE, MUSEUM_STORE_BY_ID, isLightItem, museumWidthOf } from '../store';
import { MuseumStoreSheet, placeBought } from './MuseumStoreSheet';

type SheetId = 'collection' | 'store' | 'settings' | 'ad' | 'inventory' | null;

export function MuseumScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { colors } = useTheme();
  useLanguage();
  const [state, save] = useMuseum();
  const [collection, saveCollection] = useCollection();
  const [rewards, saveRewards] = useRewards(isFocused);

  const [section, setSection] = useState(1);
  const [chrome, setChrome] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [info, setInfo] = useState<ArtworkRecord | null>(null);
  const [confirmBin, setConfirmBin] = useState<string | null>(null);
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
      setSelectedId(null);
      setInfo(null);
    }
  }, [isFocused]);
  useEffect(() => {
    if (state && section > state.sections) setSection(state.sections);
  }, [state, section]);
  // at least ten empty frames are always on the walls, whatever happened before
  useEffect(() => {
    if (!state || !collection) return;
    const next = ensureBlankSpaces(state, (o) => museumWidthOf(o, (id) => findArtwork(collection, id)));
    if (next.sections !== state.sections) save(next);
  }, [state, collection, save]);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const artworkById = useCallback((id: string) => findArtwork(collection, id), [collection]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const onSelect = useCallback(
    (objectId: string | null) => {
      const s = stateRef.current;
      if (editing) {
        setSelectedId(objectId);
        return;
      }
      const o = objectId ? s?.objects.find((x) => x.objectId === objectId) : null;
      if (o?.itemId === 'artwork' && o.artId) {
        const a = findArtwork(collection, o.artId);
        if (a) {
          setInfo(a);
          return;
        }
      }
      if (!objectId) setChrome((c) => !c);
    },
    [editing, collection],
  );
  const onMove = useCallback((objectId: string, u: number, h: number) => {
    const s = stateRef.current;
    if (!s) return;
    save(moveObject(s, objectId, u, h));
  }, [save]);
  const onSwipeSection = useCallback((dir: 1 | -1) => {
    const s = stateRef.current;
    if (!s) return;
    setSection((n) => Math.max(1, Math.min(s.sections, n + dir)));
  }, []);

  if (!state || !rewards || !collection) return <View style={styles.screen} />;

  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + sp.md;
  const sel: MuseumObject | null = selectedId ? state.objects.find((o) => o.objectId === selectedId) ?? null : null;
  const selItem = sel ? MUSEUM_STORE_BY_ID[sel.itemId] : null;
  const selArt = sel?.artId ? findArtwork(collection, sel.artId) : null;
  const selName = selArt ? selArt.title : selItem?.name ?? '';
  const c = counts(collection);

  const rescale = (o: MuseumObject, f: number) => {
    const scale = Math.max(0.6, Math.min(1.6, +(o.scale * f).toFixed(2)));
    let next = updateObject(state, o.objectId, { scale });
    if (o.surfaceId === 'MUSEUM_WALL') {
      const widthOf = (x: MuseumObject) => museumWidthOf(x, artworkById);
      const a = o.artId ? artworkById(o.artId) : null;
      const w = museumWidthOf({ ...o, scale }, artworkById);
      const h = a ? artworkSize(a.tier, a.aspect, scale).fh : (selItem?.size[2] ?? 0.5) * scale;
      const p = snapToWall(next, o.sectionId, o.u, o.h, w, h, widthOf, o.objectId);
      if (!p) {
        say(t('museum.noRoom'));
        return;
      }
      next = moveObject(next, o.objectId, p.u, p.h);
    }
    save(next);
  };

  const cycleFrame = (a: ArtworkRecord) => {
    const frames = MUSEUM_STORE.filter((i) => i.render === 'frame' && ownsFrame(state, i.id));
    const cur = a.frameId === 'teak' ? 'frame_teak' : a.frameId;
    const i = frames.findIndex((f) => f.id === cur);
    const nextFrame = frames[(i + 1) % frames.length];
    if (!nextFrame || nextFrame.id === cur) return;
    saveCollection(setFrame(collection, a.id, nextFrame.id));
    say(t('museum.frameChanged', { frame: nextFrame.name }));
  };

  const putAway = (o: MuseumObject) => {
    if (o.itemId === 'artwork' && o.artId) {
      save(takeDownFromMuseum(state, o.artId));
      saveCollection(setHome(collection, o.artId, 'collection'));
    } else save(storeObject(state, o.objectId));
    say(t('museum.storedToast', { name: selName }));
    setSelectedId(null);
  };

  const widthOf = (o: MuseumObject) => museumWidthOf(o, artworkById);
  /** Throw a finished jigsaw away for good: off the wall, out of the collection. */
  const throwAway = (a: ArtworkRecord) => {
    save(ensureBlankSpaces(takeDownFromMuseum(state, a.id), widthOf));
    saveCollection(setHome(collection, a.id, 'binned'));
    setInfo(null);
    setConfirmBin(null);
    say(t('gallery.thrown', { title: a.title }));
  };

  return (
    <View style={styles.screen}>
      <MuseumView state={state} section={section} mode={editing ? 'edit' : 'view'} artworkById={artworkById} selectedId={selectedId} onSelect={onSelect} onMove={onMove} onSwipeSection={onSwipeSection} style={StyleSheet.absoluteFill} />

      {/* top: the section, coins */}
      <Animated.View style={[styles.top, { top: insets.top + sp.sm, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <View style={styles.sectionNav}>
          <Tactile onPress={() => onSwipeSection(-1)} accessibilityRole="button" accessibilityLabel={t('museum.walk')} style={styles.chipBtn}>
            <GlassChip style={{ paddingHorizontal: 8, opacity: section > 1 ? 1 : 0.4 }}>
              <Icon name="chevronLeft" size="xs" color="#FFFFFF" />
            </GlassChip>
          </Tactile>
          <GlassChip>
            <Icon name="landmark" size="xs" color="#FFFFFF" />
            <AppText variant="caption" style={styles.white}>
              {t('museum.sectionOf', { n: String(section).padStart(2, '0'), total: String(state.sections).padStart(2, '0') })}
            </AppText>
          </GlassChip>
          <Tactile onPress={() => onSwipeSection(1)} accessibilityRole="button" accessibilityLabel={t('museum.walk')} style={styles.chipBtn}>
            <GlassChip style={{ paddingHorizontal: 8, opacity: section < state.sections ? 1 : 0.4 }}>
              <Icon name="chevronRight" size="xs" color="#FFFFFF" />
            </GlassChip>
          </Tactile>
        </View>
        <Tactile onPress={() => setSheet('ad')} accessibilityRole="button" accessibilityLabel={t('space.coinsAndAds')} style={styles.chipBtn}>
          <GlassChip>
            <Icon name="coins" size="xs" color="#FFFFFF" />
            <AppText variant="bodySmallStrong" style={styles.white}>
              {rewards.coins}
            </AppText>
          </GlassChip>
        </Tactile>
      </Animated.View>

      {c.owned === 0 && showChrome && (
        <View style={[styles.emptyWrap, { top: insets.top + 60 }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {t('museum.emptyWall')} {t('home.jigsawSizes')}
            </AppText>
          </GlassChip>
        </View>
      )}

      {/* the dock */}
      <Animated.View style={[styles.dockWrap, { bottom: tabSpace, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <View style={styles.dock}>
          <DockItem icon="images" label={t('museum.collection')} emphasis onPress={() => setSheet('collection')} badge={c.stored > 0} />
        </View>
      </Animated.View>

      {/* an artwork's story */}
      {info && !editing && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setInfo(null)} accessibilityLabel={t('close')} />
          <View style={[styles.infoCard, { bottom: insets.bottom + sp.xl }]}>
            <AppText variant="subheading" style={{ color: INK }}>
              {info.title}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.category', { category: info.category })}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.size', { tier: info.tier, rows: TIER_GRIDS[info.tier].rows, cols: TIER_GRIDS[info.tier].cols })}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.focus', { minutes: info.minutes })} · {new Date(info.unlockedAt).toLocaleDateString()}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.frame', { frame: MUSEUM_STORE_BY_ID[info.frameId === 'teak' ? 'frame_teak' : info.frameId]?.name ?? info.frameId })}
            </AppText>
            {confirmBin === info.id ? (
              <View style={styles.infoActions}>
                <AppText variant="caption" style={[styles.infoLine, { flex: 1 }]}>
                  {t('museum.binConfirm')}
                </AppText>
                <Button label={t('cancel')} variant="secondary" size="sm" onPress={() => setConfirmBin(null)} />
                <Button label={t('museum.bin')} size="sm" onPress={() => throwAway(info)} />
              </View>
            ) : (
              <View style={styles.infoActions}>
                <Button label={t('museum.bin')} variant="secondary" size="sm" onPress={() => setConfirmBin(info.id)} />
                <Button label={t('close')} variant="secondary" size="sm" onPress={() => setInfo(null)} />
              </View>
            )}
          </View>
        </View>
      )}

      {toast && (
        <View style={[styles.toastWrap, { bottom: editing ? insets.bottom + 140 : tabSpace + 76 }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {toast}
            </AppText>
          </GlassChip>
        </View>
      )}

      <CollectionSheet
        visible={sheet === 'collection'}
        here="museum"
        binOnly
        collection={collection}
        onClose={() => setSheet(null)}
        onCollection={saveCollection}
        onHangHere={(a) => {
          const r = hangInMuseum(state, a, widthOf, section);
          save(ensureBlankSpaces(r.state, widthOf));
          setSection(r.sectionId);
          return true;
        }}
        onTakeDown={(a) => save(ensureBlankSpaces(takeDownFromMuseum(state, a.id), widthOf))}
        onToast={say}
      />
      <AdSheet visible={sheet === 'ad'} rewards={rewards} onClose={() => setSheet(null)} onRewards={saveRewards} onToast={say} />
    </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#15110f' },
  white: { color: '#FFFFFF' },
  faint: { color: 'rgba(255,255,255,0.72)' },
  top: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: sp.sm },
  sectionNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipBtn: { borderRadius: radii.pill },
  emptyWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  dockWrap: { position: 'absolute', left: sp.sm, right: sp.sm, alignItems: 'center' },
  dock: { flexDirection: 'row', gap: 2, padding: 5, borderRadius: radii.xl, backgroundColor: GLASS, borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  dockItem: { width: 66, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockEmphasis: { backgroundColor: CREAM },
  badge: { position: 'absolute', top: 8, right: 16, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F2B66D' },
  editTop: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: sp.sm },
  selection: { position: 'absolute', left: sp.lg, right: sp.lg },
  selectionCard: { gap: sp.sm, padding: sp.md, borderRadius: radii.xl, backgroundColor: 'rgba(28,20,14,0.72)', borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  selectionHead: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  toastWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  toast: { height: undefined, paddingVertical: 8, maxWidth: '100%' },
  scrim: { backgroundColor: 'rgba(20,12,8,0.25)' },
  infoCard: { position: 'absolute', left: sp.lg, right: sp.lg, padding: sp.xl, gap: 4, borderRadius: radii.xl, backgroundColor: 'rgba(251,245,236,0.96)' },
  infoLine: { color: 'rgba(43,33,24,0.72)' },
  infoActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: sp.sm, marginTop: sp.sm },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
});
