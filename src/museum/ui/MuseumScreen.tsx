// The museum tab: a curved white gallery with carved walls, seen one wall
// at a time. Every finished jigsaw hangs framed in the niche of its own
// wall, in the order it was earned; at least ten empty walls always wait
// for the next ones. Swipe left and right to walk round. Tap a picture
// for its card. The museum arranges itself: the only thing a person does
// to a picture is keep it or throw it away.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '../../spaces/useSpaces';
import { AdSheet } from '../../spaces/ui/AdSheet';
import { GLASS, GLASS_EDGE, GlassChip, CREAM, INK } from '../../spaces/ui/Glass';
import { useCollection } from '../../collection/repository';
import { ArtworkRecord, TIER_GRIDS, counts, findArtwork, setHome } from '../../collection/model';
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
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { categoryLabel, t, useLanguage } from '../../i18n';
import { hangInMuseum, takeDownFromMuseum } from '../model';
import { useMuseum } from '../repository';
import { museumWidthOf } from '../store';
import { wallsOf } from '../walls';
import { GalleryWalls } from './GalleryWalls';

export function MuseumScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  useLanguage();
  const [state, save] = useMuseum();
  const [collection, saveCollection] = useCollection();
  const [rewards, saveRewards] = useRewards(isFocused);

  const [wall, setWall] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [sheet, setSheet] = useState<'collection' | 'ad' | null>(null);
  const [info, setInfo] = useState<ArtworkRecord | null>(null);
  const [confirmBin, setConfirmBin] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: chrome ? 1 : 0, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [chrome, fade]);
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: chrome && !sheet ? 'flex' : 'none' } } as never);
  }, [navigation, chrome, sheet]);
  useEffect(() => {
    if (!isFocused) {
      setSheet(null);
      setChrome(true);
      setInfo(null);
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

  if (!state || !rewards || !collection) return <View style={styles.screen} />;

  const artworkById = (id: string) => findArtwork(collection, id);
  const walls = wallsOf(state, artworkById);
  const current = Math.min(wall, walls.length - 1);
  const widthOf = (o: Parameters<typeof museumWidthOf>[0]) => museumWidthOf(o, artworkById);
  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + sp.md;
  const c = counts(collection);

  /** Throw a finished jigsaw away for good: off the wall, out of the collection. */
  const throwAway = (a: ArtworkRecord) => {
    save(takeDownFromMuseum(state, a.id));
    saveCollection(setHome(collection, a.id, 'binned'));
    setInfo(null);
    setConfirmBin(null);
    say(t('gallery.thrown', { title: a.title }));
  };

  return (
    <View style={styles.screen}>
      <GalleryWalls
        walls={walls}
        index={current}
        onIndex={setWall}
        onTapArt={(w) => w.kind === 'art' && setInfo(w.art)}
        onTapEmpty={() => setChrome((x) => !x)}
        width={width}
        height={height}
        reduceMotion={reduced}
      />

      {/* top: which wall, and coins */}
      <Animated.View style={[styles.top, { top: insets.top + sp.sm, opacity: fade }]} pointerEvents={chrome ? 'box-none' : 'none'}>
        <View style={styles.wallNav}>
          <Tactile onPress={() => setWall(Math.max(0, current - 1))} accessibilityRole="button" accessibilityLabel={t('museum.walk')} style={styles.chipBtn}>
            <GlassChip style={{ paddingHorizontal: 8, opacity: current > 0 ? 1 : 0.4 }}>
              <Icon name="chevronLeft" size="xs" color="#FFFFFF" />
            </GlassChip>
          </Tactile>
          <GlassChip>
            <Icon name="landmark" size="xs" color="#FFFFFF" />
            <AppText variant="caption" style={styles.white}>
              {t('museum.wallOf', { n: current + 1, total: walls.length })}
            </AppText>
          </GlassChip>
          <Tactile onPress={() => setWall(Math.min(walls.length - 1, current + 1))} accessibilityRole="button" accessibilityLabel={t('museum.walk')} style={styles.chipBtn}>
            <GlassChip style={{ paddingHorizontal: 8, opacity: current < walls.length - 1 ? 1 : 0.4 }}>
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

      {chrome && current === 0 && (
        <View style={[styles.hintWrap, { top: insets.top + 56 }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {c.owned === 0 ? `${t('museum.emptyWall')} ${t('home.jigsawSizes')}` : t('museum.swipeHint')}
            </AppText>
          </GlassChip>
        </View>
      )}

      {/* the dock */}
      <Animated.View style={[styles.dockWrap, { bottom: tabSpace, opacity: fade }]} pointerEvents={chrome ? 'box-none' : 'none'}>
        <View style={styles.dock}>
          <DockItem icon="images" label={t('museum.collection')} emphasis onPress={() => setSheet('collection')} badge={c.stored > 0} />
        </View>
      </Animated.View>

      {/* a picture's card */}
      {info && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setInfo(null)} accessibilityLabel={t('close')} />
          <View style={[styles.infoCard, { bottom: insets.bottom + sp.xl }]}>
            <AppText variant="subheading" style={{ color: INK }}>
              {info.title}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.category', { category: categoryLabel({ id: info.category, name: info.category }) })}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.size', { tier: info.tier, rows: TIER_GRIDS[info.tier].rows, cols: TIER_GRIDS[info.tier].cols })}
            </AppText>
            <AppText variant="bodySmall" style={styles.infoLine}>
              {t('museum.info.focus', { minutes: info.minutes })} · {new Date(info.unlockedAt).toLocaleDateString()}
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
        <View style={[styles.toastWrap, { bottom: tabSpace + 76 }]} pointerEvents="none">
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
          const r = hangInMuseum(state, a, widthOf);
          save(r.state);
          return true;
        }}
        onTakeDown={(a) => save(takeDownFromMuseum(state, a.id))}
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
  screen: { flex: 1, backgroundColor: '#2a2420' },
  white: { color: '#FFFFFF' },
  top: { position: 'absolute', left: sp.lg, right: sp.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: sp.sm },
  wallNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipBtn: { borderRadius: radii.pill },
  hintWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  dockWrap: { position: 'absolute', left: sp.sm, right: sp.sm, alignItems: 'center' },
  dock: { flexDirection: 'row', gap: 2, padding: 5, borderRadius: radii.xl, backgroundColor: GLASS, borderColor: GLASS_EDGE, borderWidth: StyleSheet.hairlineWidth },
  dockItem: { width: 66, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockEmphasis: { backgroundColor: CREAM },
  badge: { position: 'absolute', top: 8, right: 16, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F2B66D' },
  toastWrap: { position: 'absolute', left: sp.lg, right: sp.lg, alignItems: 'center' },
  toast: { height: undefined, paddingVertical: 8, maxWidth: '100%' },
  scrim: { backgroundColor: 'rgba(20,12,8,0.25)' },
  infoCard: { position: 'absolute', left: sp.lg, right: sp.lg, padding: sp.xl, gap: 4, borderRadius: radii.xl, backgroundColor: 'rgba(251,245,236,0.96)' },
  infoLine: { color: 'rgba(43,33,24,0.72)' },
  infoActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: sp.sm, marginTop: sp.sm },
});
