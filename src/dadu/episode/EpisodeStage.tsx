// The episode stage: a painted backdrop that slowly pans and zooms (like a cartoon shot), painted chibi characters
// that breathe, bob and swap to their "talk" picture while speaking, and a subtitle panel over the picture.
// With no painted backdrop it falls back to the older vector side-view scene, so nothing ever shows blank.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ART } from '../art';
import { pickCharacterImage } from '../art/logic';
import { CHARACTERS } from '../core/characters';
import { SideScene } from '../render';
import { StageVideo } from './StageVideo';
import type { SideBackgroundKey, SideCharacter } from '../render';
import { P, FONT } from '../ui/palette';
import { placeCast, stageHeight } from './logic';
import type { Placed, StageCast } from './logic';

export type StageMotion = 'push' | 'panLeft' | 'panRight' | 'still';

export interface EpisodeStageProps {
  /** A painted room (rooms/<key>) or story page (story/<key>). */
  room?: string;
  page?: string;
  /** Play the clip for this story page (ART.video) over the painted picture, when one exists. */
  playVideo?: boolean;
  /** Used only when no painted picture exists. */
  fallbackBackground?: SideBackgroundKey;
  cast: StageCast[];
  motion?: StageMotion;
  height?: number;
  reducedMotion?: boolean;
  caption?: string;
  speaker?: string;
  night?: boolean;
  /** Where the characters' feet stand, as a fraction of the stage height from the bottom. */
  floor?: number;
  children?: React.ReactNode;
  testID?: string;
}

function useTick(active: boolean, ms = 220) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((x) => x + ms / 1000), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return t;
}

function Member({ p, c, reduced }: { p: Placed; c: StageCast; reduced?: boolean }) {
  const images = ART.characters[p.key];
  const t = useTick(p.talking && !reduced);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: p.talking ? 380 : 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: p.talking ? 380 : 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bob, p.talking, reduced]);
  if (!images) return null;
  const name = pickCharacterImage(Object.keys(images), 'front', c.pose ?? 'idle', c.expression ?? 'idle', p.talking, t);
  if (!name) return null;
  const lift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, p.talking ? -9 : -3] });
  return (
    <Animated.Image
      source={images[name].src}
      accessibilityLabel={CHARACTERS[p.key].name.en}
      style={{ position: 'absolute', left: p.left, bottom: p.bottom, width: p.size, height: p.size, resizeMode: 'contain', transform: [{ translateY: lift }, { scale: p.talking ? 1.05 : 1 }] }}
    />
  );
}

export function EpisodeStage({ room, page, playVideo, fallbackBackground = 'living', cast, motion = 'push', height, reducedMotion, caption, speaker, night, floor, children, testID }: EpisodeStageProps) {
  const { width, height: screenH } = useWindowDimensions();
  const H = height ?? stageHeight(width, screenH);
  const art = (page ? ART.story[page] : undefined) ?? (room ? ART.rooms[room] : undefined);
  const move = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion || motion === 'still') return;
    move.setValue(0);
    const a = Animated.timing(move, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [move, motion, reducedMotion, room, page]);
  const placed = useMemo(() => placeCast(cast, width, H, floor ?? (caption ? 0.27 : 0.06)), [cast, width, H, caption, floor]);
  const scale = motion === 'still' ? 1.04 : move.interpolate({ inputRange: [0, 1], outputRange: motion === 'push' ? [1.04, 1.16] : [1.12, 1.12] });
  const shift = motion === 'panLeft' ? move.interpolate({ inputRange: [0, 1], outputRange: [width * 0.04, -width * 0.04] }) : motion === 'panRight' ? move.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.04, width * 0.04] }) : 0;
  const sideChars: SideCharacter[] = cast.map((c, i) => ({ key: c.key, x: 70 + i * 110, expression: (c.expression as SideCharacter['expression']) ?? 'happy', talking: c.talking, facing: i === 0 ? 'right' : 'left' }));
  return (
    <View style={[s.stage, { height: H, backgroundColor: night ? P.night : P.cream }]} testID={testID ?? 'episode-stage'}>
      {art ? (
        <Animated.Image source={art.src} accessibilityIgnoresInvertColors style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', resizeMode: 'cover', transform: [{ translateX: shift as never }, { scale: scale as never }] }} />
      ) : (
        <SideScene background={fallbackBackground} time={night ? 'night' : 'morning'} characters={sideChars} reducedMotion={reducedMotion} style={{ height: H }} />
      )}
      {page && playVideo && ART.video[page] ? <StageVideo key={page} source={ART.video[page].src} /> : null}
      {art ? cast.map((c, i) => <Member key={`${c.key}-${i}`} p={placed[i]} c={c} reduced={reducedMotion} />) : null}
      {night ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,24,60,0.38)' }]} /> : null}
      {caption ? (
        <View style={s.captionWrap} pointerEvents="none">
          <View style={s.caption}>
            {speaker ? <Text style={s.speaker}>{speaker}</Text> : null}
            <Text style={s.captionText} testID="episode-caption">{caption}</Text>
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  stage: { width: '100%', overflow: 'hidden' },
  captionWrap: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  caption: { backgroundColor: 'rgba(255,246,229,0.94)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: P.line },
  speaker: { fontFamily: FONT.displayHeavy, fontSize: 11, color: P.clay, letterSpacing: 0.8, textTransform: 'uppercase' },
  captionText: { fontFamily: FONT.display, fontSize: 18, lineHeight: 24, color: P.ink },
});
