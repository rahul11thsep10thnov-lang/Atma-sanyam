// The Gallery: the artwork being assembled piece by piece (one piece per
// focused minute), finished works waiting in the rack or hanging in a
// space, and the moment a finished jigsaw closes up and becomes a framed
// picture. Finished pictures can be hung here, in this space, or thrown
// into the garden's dustbin for good.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SpaceId } from '../packTypes';
import { ARTWORKS, FIRST_ART_MINUTES, PUZZLE_COLS, PUZZLE_PIECES, PUZZLE_ROWS } from '../catalog';
import { ArtState, SpaceState, binArtwork, completeCurrent, hangArtwork, hungArtworks } from '../model';
import { RewardState } from '../rewards';
import { JigsawArt } from '../scene/JigsawArt';
import { Sheet } from './Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { radii } from '../../theme/radii';
import { space as sp } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { t } from '../../i18n';

interface Props {
  visible: boolean;
  space: SpaceId;
  state: SpaceState;
  art: ArtState;
  rewards: RewardState;
  /** Artworks hung in the other spaces (they can still be moved here). */
  hungElsewhere: Record<string, SpaceId>;
  onClose: () => void;
  onState: (next: SpaceState) => void;
  onArt: (next: ArtState) => void;
  onToast: (text: string) => void;
}

export function GallerySheet({ visible, space, state, art, rewards, hungElsewhere, onClose, onState, onArt, onToast }: Props) {
  const { colors, shadow } = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const current = ARTWORKS.find((a) => a.id === art.currentId) ?? null;
  const boardW = Math.min(width - sp.xl * 2, 360);
  const boardH = current ? boardW / current.aspect : 0;

  // Pieces earned since the Gallery was last opened fly in one by one.
  const [shownPieces, setShownPieces] = useState(art.pieces);
  const seams = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [framing, setFraming] = useState(false);

  useEffect(() => {
    if (!visible || !current) return;
    const from = Math.min(art.seen ?? 0, art.pieces);
    if (reduced || from >= art.pieces) {
      setShownPieces(art.pieces);
      return;
    }
    setShownPieces(from);
    const total = art.pieces - from;
    const step = Math.max(16, Math.min(90, 2400 / total));
    let n = from;
    const id = setInterval(() => {
      n = Math.min(art.pieces, n + Math.max(1, Math.round(total / (2400 / step))));
      setShownPieces(n);
      if (n >= art.pieces) {
        clearInterval(id);
        onArt({ ...art, seen: art.pieces });
      }
    }, step);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, art.currentId]);

  const complete = !!current && art.pieces >= PUZZLE_PIECES;

  const frameIt = () => {
    if (!complete || framing) return;
    setFraming(true);
    Animated.sequence([
      Animated.timing(seams, { toValue: 0, duration: reduced ? 0 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 1, duration: reduced ? 0 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      const finishedId = art.currentId!;
      onArt(completeCurrent(art));
      const hung = hangArtwork(state, finishedId);
      if (hung !== state) {
        onState(hung);
        onToast(t('gallery.nowHangs', { title: current?.title ?? '' }));
      } else {
        onToast(t('gallery.inRack', { title: current?.title ?? '' }));
      }
      setFraming(false);
      seams.setValue(1);
      lift.setValue(0);
      onClose();
    });
  };

  const minutesLeft = current ? PUZZLE_PIECES - art.pieces : 0;
  const untilFirst = Math.max(0, FIRST_ART_MINUTES - rewards.lifetimeMinutes);
  const here = new Set(hungArtworks(state));

  return (
    <Sheet visible={visible} title={t('gallery.title')} subtitle={t('gallery.subtitle')} onClose={onClose} maxHeight="88%">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {current ? (
          <>
            <Animated.View style={[styles.board, shadow.level3, { width: boardW, height: boardH, transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}>
              <JigsawArt artId={current.id} image={current.image} width={boardW} height={boardH} rows={PUZZLE_ROWS} cols={PUZZLE_COLS} revealed={shownPieces} seams={false} board="#DCD3C5" />
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: seams }]} pointerEvents="none">
                <JigsawArt artId={current.id} image={current.image} width={boardW} height={boardH} rows={PUZZLE_ROWS} cols={PUZZLE_COLS} revealed={shownPieces} seams board="transparent" />
              </Animated.View>
            </Animated.View>
            <View style={styles.caption}>
              <AppText variant="subheading">{current.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {complete ? t('gallery.complete') : t('gallery.progress', { pieces: art.pieces, total: PUZZLE_PIECES, minutes: minutesLeft })}
              </AppText>
            </View>
            {complete && <Button label={framing ? t('gallery.framing') : t('gallery.frameIt')} icon="image" fullWidth onPress={frameIt} disabled={framing} />}
          </>
        ) : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <AppText variant="subheading" align="center">
              {art.completed.length || art.binned.length ? t('gallery.allDone') : t('gallery.firstOnWay')}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              {art.completed.length || art.binned.length ? t('gallery.chooseWall') : t('gallery.arrivesAfter', { minutes: untilFirst })}
            </AppText>
          </View>
        )}

        {art.completed.length > 0 && (
          <>
            <AppText variant="overline" tone="muted" style={styles.section}>
              {t('gallery.finished').toUpperCase()}
            </AppText>
            <View style={styles.grid}>
              {art.completed.map((id) => {
                const a = ARTWORKS.find((x) => x.id === id);
                if (!a) return null;
                const onWall = here.has(id);
                const elsewhere = !onWall ? hungElsewhere[id] : undefined;
                return (
                  <View key={id} style={[styles.tile, { borderColor: onWall ? colors.primary : colors.border }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={onWall ? `${a.title}, ${t('gallery.hungHere')}` : t('gallery.hangHere', { title: a.title })}
                      onPress={() => {
                        if (onWall) return;
                        const next = hangArtwork(state, id);
                        if (next === state) {
                          onToast(t('gallery.noFrameSpot'));
                          return;
                        }
                        onState(next);
                        onToast(t('gallery.nowHangs', { title: a.title }));
                      }}
                    >
                      <Image source={a.image} style={{ width: '100%', aspectRatio: a.aspect, borderRadius: radii.sm - 4 }} resizeMode="cover" />
                      <AppText variant="caption" tone={onWall ? 'primary' : 'secondary'} numberOfLines={1}>
                        {onWall ? t('gallery.hungHere') : elsewhere ? t('gallery.hungIn', { space: t(`space.${elsewhere}`) }) : t('gallery.inTheRack')}
                      </AppText>
                    </Pressable>
                    {!onWall && !elsewhere && (
                      <Button
                        label=""
                        icon="trash"
                        size="sm"
                        variant="tertiary"
                        accessibilityLabel={t('gallery.throwAway', { title: a.title })}
                        onPress={() => {
                          onArt(binArtwork(art, id));
                          onToast(t('gallery.thrown', { title: a.title }));
                        }}
                        style={styles.binBtn}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: sp.lg, paddingBottom: sp.lg },
  board: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#DCD3C5' },
  caption: { alignItems: 'center', gap: 2 },
  empty: { alignSelf: 'stretch', borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.lg, padding: sp.xl, gap: sp.sm },
  section: { alignSelf: 'flex-start' },
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: sp.md },
  tile: { width: '30%', flexGrow: 0, borderWidth: 1.5, borderRadius: radii.sm, padding: 4, gap: 4 },
  binBtn: { alignSelf: 'center', height: 32 },
});
