// The side-view activity scene: a background, optional parallax layers,
// characters standing on the ground line, custom props and a React Native
// overlay for activity controls. Same rigs and the same world state as the
// isometric view; only the camera differs.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { G, Rect, Svg } from 'react-native-svg';
import type { CharacterKey } from '../../core/characters';
import { canonicalCharacter } from '../../core/characters';
import type { Season, TimeOfDay, Weather } from '../../core/worldState';
import { AnimationClock, useClock } from '../clock';
import { palette, timeTint } from '../palette';
import { HEIGHT_CHART, RIGS } from '../characters/CharacterSprite';
import type { SpriteExpression, SpritePose } from '../types';
import { BACKGROUNDS, GROUND_Y, SIDE_H, SIDE_W, WeatherLayer } from './backgrounds';
import type { SideBackgroundKey } from './backgrounds';

export interface SideCharacter {
  key: CharacterKey | string;
  /** Horizontal position in scene units (0..360). */
  x: number;
  /** Ground offset in scene units (positive = further back / smaller). */
  depth?: number;
  pose?: SpritePose;
  expression?: SpriteExpression;
  facing?: 'left' | 'right';
  talking?: boolean;
  /** Dadaji's height in scene units; others follow HEIGHT_CHART. Default 150. */
  dadajiHeight?: number;
}

export interface SideProp {
  key: string;
  x: number;
  /** Baseline y in scene units (default GROUND_Y). */
  y?: number;
  node: React.ReactNode;
  /** Draw behind characters (default: in front, sorted by y). */
  behind?: boolean;
}

export interface SideSceneProps {
  background: SideBackgroundKey;
  time: TimeOfDay;
  weather?: Weather;
  season?: Season;
  characters: SideCharacter[];
  props?: SideProp[];
  /** Extra SVG layers between background and ground, each shifted by its parallax factor. */
  layers?: { node: React.ReactNode; parallax: number }[];
  /** Camera x offset in scene units (used with parallax layers). */
  cameraX?: number;
  animate?: boolean;
  reducedMotion?: boolean;
  onTapCharacter?: (key: CharacterKey) => void;
  style?: ViewStyle;
  /** React Native overlay (activity controls). */
  children?: React.ReactNode;
}

function Character({ c, onPress }: { c: SideCharacter; onPress?: () => void }) {
  const t = useClock();
  const key = canonicalCharacter(c.key) ?? 'chintu';
  const { Rig, box } = RIGS[key];
  const depth = c.depth ?? 0;
  const px = (c.dadajiHeight ?? 150) * HEIGHT_CHART[key] * (1 - depth / 400);
  const sc = px / box.h;
  const w = box.w * sc;
  const faceLeft = c.facing === 'left';
  const y = GROUND_Y - depth;
  return (
    <G transform={`translate(${c.x - w / 2} ${y - px})`} onPress={onPress}>
      <G transform={faceLeft ? `translate(${w} 0) scale(${-sc} ${sc})` : `scale(${sc})`}>
        <Rig view="side" pose={c.pose ?? 'stand'} expression={c.expression ?? 'neutral'} t={t} talking={c.talking} />
      </G>
    </G>
  );
}

function Background({ bg, time, weather, season, id }: { bg: SideBackgroundKey; time: TimeOfDay; weather?: Weather; season?: Season; id: string }) {
  const t = useClock();
  const Bg = BACKGROUNDS[bg];
  return <G><Bg time={time} weather={weather} season={season} t={t} id={id} /></G>;
}

function Weather({ weather }: { weather?: Weather }) {
  const t = useClock();
  return <WeatherLayer weather={weather} t={t} />;
}

let sceneCounter = 0;

export function SideScene({ background, time, weather, season, characters, props = [], layers = [], cameraX = 0, animate = true, reducedMotion = false, onTapCharacter, style, children }: SideSceneProps) {
  const [id] = useState(() => `side${++sceneCounter}`);
  const enabled = animate && !reducedMotion;
  const exterior = !['living', 'kitchen', 'dining', 'study', 'activity_art', 'activity_music', 'activity_lab', 'bedroom', 'bathroom', 'library', 'museum'].includes(background);
  const tint = timeTint[time];
  const entities = [
    ...props.filter((p) => !p.behind).map((p) => ({ y: p.y ?? GROUND_Y, node: <G key={p.key} transform={`translate(${p.x} ${p.y ?? GROUND_Y})`}>{p.node}</G> })),
    ...characters.map((c) => ({ y: GROUND_Y - (c.depth ?? 0) + 0.5, node: <Character key={String(c.key)} c={c} onPress={onTapCharacter ? () => onTapCharacter(canonicalCharacter(c.key) ?? 'chintu') : undefined} /> })),
  ].sort((a, b) => a.y - b.y).map((e) => e.node);
  return (
    <View style={[styles.container, style]}>
      <AnimationClock enabled={enabled} fps={10}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SIDE_W} ${SIDE_H}`} preserveAspectRatio="xMidYMax slice">
          <Background bg={background} time={time} weather={weather} season={season} id={id} />
          {layers.map((l, i) => <G key={i} transform={`translate(${-cameraX * l.parallax} 0)`}>{l.node}</G>)}
          {props.filter((p) => p.behind).map((p) => <G key={p.key} transform={`translate(${p.x} ${p.y ?? GROUND_Y})`}>{p.node}</G>)}
          {entities}
          {exterior && <Weather weather={weather} />}
          {tint.opacity > 0 && <Rect x={0} y={0} width={SIDE_W} height={SIDE_H} fill={tint.colour} opacity={exterior ? tint.opacity : tint.opacity * 0.4} />}
        </Svg>
        {children}
      </AnimationClock>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', aspectRatio: SIDE_W / SIDE_H, overflow: 'hidden', backgroundColor: palette.paper, borderRadius: 0 },
});

export { GROUND_Y, SIDE_H, SIDE_W };
