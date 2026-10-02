// The Gallery: the artwork being assembled piece by piece (one piece per
// focused minute), finished works to choose from, and the moment a finished
// jigsaw closes up and becomes a framed picture on the wall.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ARTWORKS, FIRST_ART_MINUTES, PUZZLE_COLS, PUZZLE_PIECES, PUZZLE_ROWS } from '../catalog';
import { BalconyState, hangArtwork, mountCurrent } from '../model';
import { RewardState } from '../rewards';
import { JigsawArt } from '../scene/JigsawArt';
import { Sheet } from './Sheet';
import { AppText } from '../../ui/AppText';
import { Button } from '../../ui/Button';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { useTheme } from '../../theme/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  visible: boolean;
  state: BalconyState;
  rewards: RewardState;
  onClose: () => void;
  onState: (next: BalconyState) => void;
  onToast: (text: string) => void;
}

export function GallerySheet({ visible, state, rewards, onClose, onState, onToast }: Props) {
  const { colors, shadow } = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const art = state.art;
  const current = ARTWORKS.find((a) => a.id === art.currentId) ?? null;
  const boardW = Math.min(width - space.xl * 2, 360);
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
        onState({ ...state, art: { ...art, seen: art.pieces } });
      }
    }, step);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, art.currentId]);

  const complete = !!current && art.pieces >= PUZZLE_PIECES;

  const frameIt = () => {
    if (!complete || framing) return;
    setFraming(true);
    // the seams close, the picture lifts as if taken off the table, then hangs
    Animated.sequence([
      Animated.timing(seams, { toValue: 0, duration: reduced ? 0 : 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(lift, { toValue: 1, duration: reduced ? 0 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      onState(mountCurrent(state));
      onToast(`${current?.title} now hangs on your wall`);
      setFraming(false);
      seams.setValue(1);
      lift.setValue(0);
      onClose();
    });
  };

  const minutesLeft = current ? PUZZLE_PIECES - art.pieces : 0;
  const untilFirst = Math.max(0, FIRST_ART_MINUTES - rewards.lifetimeMinutes);

  return (
    <Sheet visible={visible} title="Gallery" subtitle="Each focused minute adds a piece." onClose={onClose} maxHeight="88%">
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {current ? (
          <>
            <Animated.View
              style={[
                styles.board,
                shadow.level3,
                { width: boardW, height: boardH, transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] },
              ]}
            >
              <JigsawArt artId={current.id} image={current.image} width={boardW} height={boardH} rows={PUZZLE_ROWS} cols={PUZZLE_COLS} revealed={shownPieces} seams={false} board="#DCD3C5" />
              <Animated.View style={[StyleSheet.absoluteFill, { opacity: seams }]} pointerEvents="none">
                <JigsawArt artId={current.id} image={current.image} width={boardW} height={boardH} rows={PUZZLE_ROWS} cols={PUZZLE_COLS} revealed={shownPieces} seams board="transparent" />
              </Animated.View>
            </Animated.View>
            <View style={styles.caption}>
              <AppText variant="subheading">{current.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {complete ? 'Every piece is in place.' : `${art.pieces} of ${PUZZLE_PIECES} pieces · ${minutesLeft} focused minutes to go`}
              </AppText>
            </View>
            {complete && <Button label={framing ? 'Framing…' : 'Frame it and hang it'} icon="image" fullWidth onPress={frameIt} disabled={framing} />}
          </>
        ) : (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <AppText variant="subheading" align="center">
              {art.completed.length ? 'Every artwork is finished' : 'Your first artwork is on its way'}
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              {art.completed.length ? 'Choose which one hangs on your wall.' : `It arrives after ${untilFirst} more focused minutes, as a jigsaw that fills in while you focus.`}
            </AppText>
          </View>
        )}

        {art.completed.length > 0 && (
          <>
            <AppText variant="overline" tone="muted" style={styles.section}>
              FINISHED
            </AppText>
            <View style={styles.grid}>
              {art.completed.map((id) => {
                const a = ARTWORKS.find((x) => x.id === id);
                if (!a) return null;
                const onWall = art.mountedId === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={onWall ? `${a.title}, on your wall` : `Hang ${a.title}`}
                    onPress={() => {
                      if (onWall) return;
                      onState(hangArtwork(state, id));
                      onToast(`${a.title} now hangs on your wall`);
                    }}
                    style={[styles.tile, { borderColor: onWall ? colors.primary : colors.border }]}
                  >
                    <Image source={a.image} style={{ width: '100%', aspectRatio: a.aspect, borderRadius: radii.sm - 4 }} resizeMode="cover" />
                    <AppText variant="caption" tone={onWall ? 'primary' : 'secondary'} numberOfLines={1}>
                      {onWall ? 'On your wall' : a.title}
                    </AppText>
                  </Pressable>
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
  body: { alignItems: 'center', gap: space.lg, paddingBottom: space.lg },
  board: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#DCD3C5' },
  caption: { alignItems: 'center', gap: 2 },
  empty: { alignSelf: 'stretch', borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.lg, padding: space.xl, gap: space.sm },
  section: { alignSelf: 'flex-start' },
  grid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { width: '30%', flexGrow: 0, borderWidth: 1.5, borderRadius: radii.sm, padding: 4, gap: 4 },
});
