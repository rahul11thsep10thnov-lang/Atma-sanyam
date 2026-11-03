// The isometric world view. One Svg; one camera transform; floor, walls,
// depth-sorted props and characters, weather and time-of-day overlays.
// Panning is a PanResponder on the container (only after the finger moves,
// so SVG onPress taps still reach objects); zoom uses two buttons so budget
// phones never need a pinch gesture. World state is passed in by the screen;
// nothing here owns state beyond the camera.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';
import type { CharacterKey } from '../../core/characters';
import type { LocationSpec } from '../../core/locations';
import type { CharacterPosition, PlantStage, Season, TimeOfDay, Weather } from '../../core/worldState';
import { AnimationClock, useClock } from '../clock';
import { palette, skyGradient, timeTint } from '../palette';
import { HEIGHT_CHART, RIGS } from '../characters/CharacterSprite';
import type { SpriteExpression, SpritePose } from '../types';
import { centreOffset, clampOffset, depthKey, fitZoom, sceneBounds, screenToTileRounded, tilePolygon, tileToScreen, TILE_H, TILE_W } from './isoMath';
import { roomStyle } from './roomStyles';
import { FOOTPRINTS, spriteFor } from './tiles';

export interface IsoObject {
  id: string;
  tile: { x: number; y: number };
  sprite: string;
  flags?: Partial<Record<'open' | 'on' | 'full' | 'clean' | 'ready' | 'inUse' | 'unlocked', boolean>>;
  stage?: PlantStage;
  /** Footprint override in tiles. */
  size?: { w: number; d: number };
  interactive?: boolean;
  /** Purely visual; never tappable and never blocks the glow. */
  decorative?: boolean;
  label?: string;
}

export interface IsoCharacter extends CharacterPosition {
  pose?: SpritePose;
  expression?: SpriteExpression;
  talking?: boolean;
}

export interface IsoSceneProps {
  location: LocationSpec;
  time: TimeOfDay;
  weather: Weather;
  season: Season;
  objects: IsoObject[];
  characters: IsoCharacter[];
  onTapObject?: (id: string, object: IsoObject) => void;
  onTapTile?: (tile: { x: number; y: number }) => void;
  onTapCharacter?: (key: CharacterKey) => void;
  selectedObject?: string;
  reducedMotion?: boolean;
  animate?: boolean;
  style?: ViewStyle;
  showZoomControls?: boolean;
  /** Dadaji's height in px at zoom 1 (every other character scales from HEIGHT_CHART). */
  characterScale?: number;
  /** Overlay content (React Native views) drawn above the scene. */
  children?: React.ReactNode;
  /** Little mode draws bigger glow rings and hides text labels. */
  little?: boolean;
}

export const DADAJI_PX = TILE_H * 3.4;

export const ACTIVITY_POSE: Record<CharacterPosition['activity'], SpritePose> = {
  idle: 'stand', walk: 'walk', sit: 'sit', sleep: 'sleep', read: 'sit', garden: 'think', cook: 'clap', play: 'run', graze: 'graze', teach: 'teach',
};

function footprint(o: IsoObject): { w: number; d: number } {
  return o.size ?? FOOTPRINTS[o.sprite] ?? { w: 1, d: 1 };
}

/** Tiles covered by an object (used for collision by screens). */
export function objectTiles(o: IsoObject): { x: number; y: number }[] {
  const { w, d } = footprint(o);
  const out: { x: number; y: number }[] = [];
  for (let dx = 0; dx < Math.ceil(w); dx++) for (let dy = 0; dy < Math.ceil(d); dy++) out.push({ x: o.tile.x - Math.floor((w - 1) / 2) + dx, y: o.tile.y - Math.floor((d - 1) / 2) + dy });
  return out;
}

function Floor({ w, d, style, onTapTile, kind }: { w: number; d: number; style: ReturnType<typeof roomStyle>; onTapTile?: (t: { x: number; y: number }) => void; kind: 'interior' | 'exterior' }) {
  const tiles: React.ReactNode[] = [];
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
    const alt = (x + y) % 2 === 0;
    tiles.push(<Polygon key={`${x}-${y}`} points={tilePolygon(x, y)} fill={alt ? style.floor : style.floorAlt} stroke={kind === 'interior' ? style.floorLine : 'none'} strokeWidth={0.5} onPress={onTapTile ? () => onTapTile({ x, y }) : undefined} />);
  }
  return <G>{tiles}</G>;
}

function Walls({ w, d, style, locationId }: { w: number; d: number; style: ReturnType<typeof roomStyle>; locationId: string }) {
  if (style.kind !== 'interior' || !style.wall) return null;
  const h = style.wallHeight ?? 150;
  const nw0 = tileToScreen(-0.5, -0.5), nw1 = tileToScreen(w - 0.5, -0.5);
  const ne1 = tileToScreen(-0.5, d - 0.5);
  const leftWall = `${nw0.sx},${nw0.sy} ${ne1.sx},${ne1.sy} ${ne1.sx},${ne1.sy - h} ${nw0.sx},${nw0.sy - h}`;
  const rightWall = `${nw0.sx},${nw0.sy} ${nw1.sx},${nw1.sy} ${nw1.sx},${nw1.sy - h} ${nw0.sx},${nw0.sy - h}`;
  const windows = (style.windows ?? []).map((f, i) => {
    const a = tileToScreen(-0.5 + (w) * f - 0.6, -0.5), b = tileToScreen(-0.5 + (w) * f + 0.6, -0.5);
    const top = h - 40, bottom = h - 100;
    return <G key={i}><Polygon points={`${a.sx},${a.sy - bottom} ${b.sx},${b.sy - bottom} ${b.sx},${b.sy - top} ${a.sx},${a.sy - top}`} fill={palette.sky} stroke={style.trim} strokeWidth={2} /><Path d={`M ${(a.sx + b.sx) / 2} ${(a.sy + b.sy) / 2 - bottom} L ${(a.sx + b.sx) / 2} ${(a.sy + b.sy) / 2 - top}`} stroke={style.trim} strokeWidth={1.5} /></G>;
  });
  const isVeranda = locationId === 'villa.veranda';
  return (
    <G>
      <Polygon points={leftWall} fill={style.wallDark ?? style.wall} stroke={style.trim} strokeWidth={1} opacity={isVeranda ? 0.6 : 1} />
      <Polygon points={rightWall} fill={style.wall} stroke={style.trim} strokeWidth={1} opacity={isVeranda ? 0.6 : 1} />
      {windows}
      <Path d={`M ${nw0.sx} ${nw0.sy - h} L ${nw0.sx} ${nw0.sy}`} stroke={style.trim} strokeWidth={2} />
      {/* skirting */}
      <Path d={`M ${ne1.sx} ${ne1.sy} L ${nw0.sx} ${nw0.sy} L ${nw1.sx} ${nw1.sy}`} stroke={style.trim} strokeWidth={3} fill="none" opacity={0.6} />
    </G>
  );
}

function ExteriorBackdrop({ time, width, height, tx, ty, zoom }: { time: TimeOfDay; width: number; height: number; tx: number; ty: number; zoom: number }) {
  const [a, b] = skyGradient[time];
  const horizon = ty - 60 * zoom;
  return (
    <G>
      <Defs>
        <LinearGradient id="dadu-sky" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} /></LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={Math.max(0, horizon)} fill="url(#dadu-sky)" />
      {time === 'night' && [0.1, 0.3, 0.55, 0.8, 0.92].map((f, i) => <Ellipse key={i} cx={width * f} cy={horizon * (0.2 + (i % 3) * 0.2)} rx={1.5} ry={1.5} fill="#FFFFFF" />)}
      {time === 'night' ? <Ellipse cx={width * 0.8} cy={Math.max(20, horizon * 0.25)} rx={16} ry={16} fill="#FFE08A" /> : <Ellipse cx={width * (time === 'morning' ? 0.2 : time === 'evening' ? 0.85 : 0.6)} cy={Math.max(20, horizon * (time === 'afternoon' ? 0.15 : 0.35))} rx={20} ry={20} fill={time === 'evening' ? '#F4A523' : '#FFC94D'} />}
      <Path d={`M 0 ${horizon} Q ${width * 0.2} ${horizon - 40 * zoom} ${width * 0.4} ${horizon} T ${width * 0.8} ${horizon} T ${width * 1.2} ${horizon} V ${height} H 0 Z`} fill="#8FA6C9" opacity={0.6} />
      <Rect x={0} y={horizon} width={width} height={Math.max(0, height - horizon)} fill="#9CCB6B" />
      <G transform={`translate(${tx} 0)`} />
    </G>
  );
}

function WeatherOverlay({ weather, width, height, t }: { weather: Weather; width: number; height: number; t: number }) {
  if (weather === 'sunny') return null;
  if (weather === 'foggy') return <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" opacity={0.38} />;
  const cloudy = <G opacity={0.85}>{[0.15, 0.5, 0.82].map((f, i) => <G key={i} transform={`translate(${width * f + (t ? (t * 4 + i * 30) % 60 : 0) - 30} ${28 + i * 14})`}><Ellipse cx={0} cy={0} rx={34} ry={12} fill="#FFFFFF" /><Ellipse cx={-14} cy={-6} rx={18} ry={12} fill="#FFFFFF" /><Ellipse cx={16} cy={-4} rx={16} ry={10} fill="#FFFFFF" /></G>)}</G>;
  if (weather === 'cloudy') return <G><Rect x={0} y={0} width={width} height={height} fill="#6F7580" opacity={0.08} />{cloudy}</G>;
  const drops: React.ReactNode[] = [];
  const shift = t ? (t * 220) % 40 : 0;
  for (let i = 0; i < 40; i++) {
    const x = ((i * 97) % width) + (i % 3) * 7;
    const y = ((i * 53 + shift * 6) % (height + 40)) - 20;
    drops.push(<Path key={i} d={`M ${x} ${y} l -4 12`} stroke="#8CCBE0" strokeWidth={1.4} opacity={0.7} strokeLinecap="round" />);
  }
  const flash = weather === 'stormy' && t > 0 && (t % 7) < 0.12;
  return (
    <G>
      <Rect x={0} y={0} width={width} height={height} fill="#2F3C7E" opacity={weather === 'stormy' ? 0.22 : 0.12} />
      {cloudy}
      {drops}
      {flash && <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" opacity={0.5} />}
    </G>
  );
}

function CharacterInScene({ c, scale, selected, onPress }: { c: IsoCharacter; scale: number; selected?: boolean; onPress?: () => void }) {
  const t = useClock();
  const { Rig, box } = RIGS[c.key];
  const px = scale * HEIGHT_CHART[c.key];
  const sc = px / box.h;
  const view = c.facing === 'ne' || c.facing === 'nw' ? 'back' : 'front';
  const mirror = c.facing === 'nw' || c.facing === 'sw';
  const { sx, sy } = tileToScreen(c.x, c.y);
  const w = box.w * sc;
  return (
    <G transform={`translate(${sx - w / 2} ${sy + 4 - px})`} onPress={onPress}>
      {selected && <Ellipse cx={w / 2} cy={px - 4} rx={w * 0.5} ry={w * 0.22} fill={palette.saffron} opacity={0.35} />}
      <G transform={mirror ? `translate(${w} 0) scale(${-sc} ${sc})` : `scale(${sc})`}>
        <Rig view={view} pose={c.pose ?? ACTIVITY_POSE[c.activity]} expression={c.expression ?? (c.activity === 'sleep' ? 'sleepy' : 'neutral')} t={t} talking={c.talking} />
      </G>
    </G>
  );
}

function Glow({ x, y, big, strong, t }: { x: number; y: number; big: boolean; strong: boolean; t: number }) {
  const pulse = t > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2)) : 0.8;
  const { sx, sy } = tileToScreen(x, y);
  const r = big ? 1.35 : 1;
  return (
    <G opacity={strong ? 1 : pulse}>
      <Ellipse cx={sx} cy={sy} rx={TILE_W * 0.42 * r} ry={TILE_H * 0.42 * r} fill={palette.saffron} opacity={0.28} />
      <Ellipse cx={sx} cy={sy} rx={TILE_W * 0.42 * r} ry={TILE_H * 0.42 * r} fill="none" stroke={strong ? palette.clay : palette.saffron} strokeWidth={strong ? 3 : 2.5} />
      <Ellipse cx={sx} cy={sy} rx={big ? 6 : 4} ry={big ? 3.5 : 2.5} fill="#FFFFFF" stroke={palette.saffron} strokeWidth={1.5} />
    </G>
  );
}

function ObjectInScene({ o, time, season, t, selected, little, onPress }: { o: IsoObject; time: TimeOfDay; season: Season; t: number; selected: boolean; little: boolean; onPress?: () => void }) {
  const fp = footprint(o);
  const { sx, sy } = tileToScreen(o.tile.x, o.tile.y);
  const Sprite = spriteFor(o.sprite);
  return (
    <G>
      <G transform={`translate(${sx} ${sy})`} onPress={onPress} testID={o.interactive && !o.decorative ? `obj-${o.id}` : undefined} accessibilityLabel={o.interactive && !o.decorative ? (o.label && !o.label.includes('.') ? o.label : o.id) : undefined}>
        <Sprite t={t} flags={o.flags} stage={o.stage} season={season} time={time} w={fp.w} d={fp.d} />
      </G>
      {o.interactive && !o.decorative && <G onPress={onPress}><Glow x={o.tile.x} y={o.tile.y} big={little} strong={selected} t={t} /></G>}
      {o.interactive && !little && o.label && !o.label.includes('.') && <SvgText x={sx} y={sy + TILE_H * 0.9} fontSize={10} fontWeight="700" fill={palette.indigo} textAnchor="middle">{o.label}</SvgText>}
    </G>
  );
}

/** The scene content inside the camera transform: floor, walls, sorted entities. Pure SVG; exported for previews and tests. */
export function IsoSceneContent({ location, time, season, objects, characters, selectedObject, little = false, onTapObject, onTapTile, onTapCharacter, characterScale = DADAJI_PX }: Pick<IsoSceneProps, 'location' | 'time' | 'season' | 'objects' | 'characters' | 'selectedObject' | 'little' | 'onTapObject' | 'onTapTile' | 'onTapCharacter' | 'characterScale'>) {
  const t = useClock();
  const style = roomStyle(location.id);
  const { w, d } = location.size;
  const entities = useMemo(() => {
    const list: { key: number; node: React.ReactNode }[] = [];
    for (const o of objects) {
      const fp = footprint(o);
      const flat = o.sprite === 'rug' || o.sprite === 'activity_mat' || o.sprite === 'rangoli' || o.sprite === 'reading_carpet' || o.sprite === 'yoga_mat' || o.sprite === 'path_stone' || o.sprite === 'lawn_patch' || o.sprite === 'river' || o.sprite === 'pond' || o.sprite === 'compound_wall' || o.sprite === 'fence';
      // sort by the far edge of the footprint so a 2×1 bed draws before the character in front of it
      const anchorX = o.tile.x + (fp.w - 1) / 2, anchorY = o.tile.y + (fp.d - 1) / 2;
      list.push({ key: depthKey(anchorX, anchorY, flat ? -5 : 1), node: <ObjectInScene key={o.id} o={o} time={time} season={season} t={t} selected={selectedObject === o.id} little={little} onPress={o.interactive && !o.decorative && onTapObject ? () => onTapObject(o.id, o) : undefined} /> });
    }
    for (const c of characters) {
      if (c.location !== location.id) continue;
      list.push({ key: depthKey(c.x, c.y, 3), node: <CharacterInScene key={c.key} c={c} scale={characterScale} onPress={onTapCharacter ? () => onTapCharacter(c.key) : undefined} /> });
    }
    return list.sort((a, b) => a.key - b.key).map((e) => e.node);
  }, [objects, characters, location.id, time, season, t, selectedObject, little, onTapObject, onTapCharacter, characterScale]);
  return (
    <G>
      <Walls w={w} d={d} style={style} locationId={location.id} />
      <Floor w={w} d={d} style={style} onTapTile={onTapTile} kind={style.kind} />
      {entities}
    </G>
  );
}

export function IsoScene(props: IsoSceneProps) {
  const { location, time, weather, season, reducedMotion = false, animate = true, style, showZoomControls = true, children } = props;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const bounds = useMemo(() => sceneBounds(location.size.w, location.size.d, roomStyle(location.id).wallHeight ?? 90), [location]);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ tx: 0, ty: 0 });
  const start = useRef({ tx: 0, ty: 0 });
  const enabled = animate && !reducedMotion;

  const fit = useCallback((w: number, h: number) => {
    const z = fitZoom(bounds, w, h, 12);
    setZoom(z);
    setOffset(centreOffset(bounds, w, h, z));
  }, [bounds]);

  useEffect(() => { if (size.width && size.height) fit(size.width, size.height); }, [fit, size.width, size.height]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 8,
    onPanResponderGrant: () => { start.current = offset; },
    onPanResponderMove: (_e, g) => {
      setOffset(clampOffset(start.current.tx + g.dx, start.current.ty + g.dy, bounds, size.width, size.height, zoom));
    },
  }), [offset, bounds, size.width, size.height, zoom]);

  const zoomBy = (f: number) => {
    const z = Math.max(0.45, Math.min(2.2, zoom * f));
    const cx = size.width / 2, cy = size.height / 2;
    setOffset(clampOffset(cx - ((cx - offset.tx) * z) / zoom, cy - ((cy - offset.ty) * z) / zoom, bounds, size.width, size.height, z));
    setZoom(z);
  };

  const exterior = roomStyle(location.id).kind === 'exterior';
  const tint = timeTint[time];
  const onTapTile = props.onTapTile;
  const tapBackground = useCallback((e: { nativeEvent: { locationX?: number; locationY?: number } }) => {
    if (!onTapTile) return;
    const lx = e.nativeEvent.locationX ?? 0, ly = e.nativeEvent.locationY ?? 0;
    onTapTile(screenToTileRounded((lx - offset.tx) / zoom, (ly - offset.ty) / zoom));
  }, [onTapTile, offset.tx, offset.ty, zoom]);

  return (
    <View style={[styles.container, style]} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })} {...pan.panHandlers}>
      <AnimationClock enabled={enabled} fps={10}>
        {size.width > 0 && (
          <Svg width={size.width} height={size.height} onPress={tapBackground}>
            {exterior ? <ExteriorBackdrop time={time} width={size.width} height={size.height} tx={offset.tx} ty={offset.ty} zoom={zoom} /> : <Rect x={0} y={0} width={size.width} height={size.height} fill={palette.paper} />}
            <G transform={`translate(${offset.tx} ${offset.ty}) scale(${zoom})`}>
              <IsoSceneContent {...props} />
            </G>
            <WeatherOverlayClocked weather={weather} width={size.width} height={size.height} exterior={exterior} />
            {tint.opacity > 0 && <Rect x={0} y={0} width={size.width} height={size.height} fill={tint.colour} opacity={exterior ? tint.opacity : tint.opacity * 0.5} />}
          </Svg>
        )}
        {showZoomControls && (
          <View style={styles.zoom} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => zoomBy(1.25)} style={styles.zoomBtn}><Text style={styles.zoomTxt}>+</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => zoomBy(0.8)} style={styles.zoomBtn}><Text style={styles.zoomTxt}>−</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Fit scene" onPress={() => fit(size.width, size.height)} style={styles.zoomBtn}><Text style={styles.zoomTxt}>⌂</Text></Pressable>
          </View>
        )}
        {children}
      </AnimationClock>
    </View>
  );
}

function WeatherOverlayClocked(p: { weather: Weather; width: number; height: number; exterior: boolean }) {
  const t = useClock();
  if (!p.exterior) return null;
  return <WeatherOverlay weather={p.weather} width={p.width} height={p.height} t={t} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: palette.paper, minHeight: 200 },
  zoom: { position: 'absolute', right: 10, bottom: 10, gap: 6 },
  zoomBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  zoomTxt: { fontSize: 20, fontWeight: '700', color: palette.indigo, lineHeight: 24 },
});
