// The lesson engine's picture vocabulary. A lesson step names a visual kind
// and props (data from the server); the renderer here draws it. Unknown kinds
// fall back to a labelled card, so a new kind authored in the console never
// breaks the app — it simply shows its labels until the app learns to draw it.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { AppText, Tactile } from '../../ui';
import { palette, rainbow } from '../../theme/palette';
import { playBol, playClick, playNote, guitarStringNote } from '../audio';
import type { Visual } from '../types';

type P = Record<string, unknown>;
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const INK = palette.ink;

export interface VisualProps {
  visual: Visual;
  /** Interactive visuals call this when the child taps something meaningful. */
  onInteract?: (detail: string) => void;
  compact?: boolean;
}

export function LessonVisual({ visual, onInteract, compact }: VisualProps) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 48, compact ? 320 : 480);
  const props = (visual.props ?? {}) as P;
  const common = { w, props, onInteract: onInteract ?? (() => undefined) };
  switch (visual.kind) {
    case 'counters':
      return <Counters {...common} />;
    case 'numberLine':
      return <NumberLine {...common} />;
    case 'shapes':
      return <Shapes {...common} />;
    case 'placeValue':
      return <PlaceValue {...common} />;
    case 'grid':
      return <AreaGrid {...common} />;
    case 'balance':
      return <Balance {...common} />;
    case 'multiplyTrick':
      return <MultiplyTrick {...common} />;
    case 'scene':
      return <Scene {...common} />;
    case 'ballPath':
      return <BallPath {...common} />;
    case 'shadowSun':
      return <ShadowSun {...common} />;
    case 'lever':
      return <Lever {...common} />;
    case 'particles':
      return <Particles {...common} />;
    case 'molecule':
      return <Molecule {...common} />;
    case 'cycle':
    case 'lifeCycle':
      return <Cycle {...common} />;
    case 'flowchart':
      return <Flowchart {...common} />;
    case 'sortCards':
    case 'wasteBins':
    case 'moneyJar':
    case 'plantParts':
    case 'computerParts':
    case 'labelled':
      return <Labelled {...common} />;
    case 'bar':
      return <Bar {...common} />;
    case 'timeline':
      return <Timeline {...common} />;
    case 'sourceCards':
      return <SourceCards {...common} />;
    case 'compass':
      return <Compass {...common} />;
    case 'mazeMini':
      return <MazeMini {...common} />;
    case 'mapSchematic':
      return <MapSchematic {...common} />;
    case 'passwordStrength':
      return <PasswordStrength {...common} />;
    case 'letters':
      return <Letters {...common} />;
    case 'patternRow':
      return <PatternRow {...common} />;
    case 'pianoKeys':
      return <PianoKeys {...common} />;
    case 'fingerNumbers':
      return <FingerNumbers {...common} />;
    case 'staff':
      return <Staff {...common} />;
    case 'rhythmGrid':
      return <RhythmGrid {...common} />;
    case 'tabla':
      return <Tabla {...common} />;
    case 'guitarChord':
      return <GuitarChord {...common} />;
    case 'court':
      return <Court {...common} />;
    case 'figure':
      return <Figure {...common} />;
    default:
      return <Labelled {...common} />;
  }
}

type R = { w: number; props: P; onInteract: (d: string) => void };

// ---- maths ------------------------------------------------------------------

function Counters({ props, onInteract }: R) {
  const groups = arr<{ emoji: string; count: number; label?: string }>(props.groups);
  const [tapped, setTapped] = useState<Set<string>>(new Set());
  return (
    <View style={styles.wrapCol}>
      {groups.map((g, gi) => (
        <View key={gi} style={styles.counterGroup}>
          <View style={styles.counterRow}>
            {Array.from({ length: Math.min(g.count, 20) }, (_, i) => {
              const key = `${gi}-${i}`;
              const on = tapped.has(key);
              return (
                <Tactile key={key} onPress={() => { setTapped((s) => new Set(s).add(key)); onInteract(`count:${i + 1}`); playClick(); }} accessibilityRole="button" accessibilityLabel={`${g.emoji} ${i + 1}`}>
                  <View style={[styles.counter, on && { backgroundColor: palette.sunshine }]}>
                    <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
                    {!!(props.numbered || on) && <Text style={styles.counterNum}>{i + 1}</Text>}
                  </View>
                </Tactile>
              );
            })}
          </View>
          {g.label && <AppText variant="caption" tone="secondary" align="center">{g.label}</AppText>}
        </View>
      ))}
    </View>
  );
}

function NumberLine({ w, props }: R) {
  const from = num(props.from, 0);
  const to = num(props.to, 10);
  const highlight = new Set(arr<number>(props.highlight));
  const n = to - from;
  const step = (w - 40) / Math.max(1, n);
  return (
    <Svg width={w} height={70}>
      <Line x1={20} y1={30} x2={w - 20} y2={30} stroke={INK} strokeWidth={3} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const x = 20 + i * step;
        const v = from + i;
        return (
          <React.Fragment key={i}>
            <Line x1={x} y1={22} x2={x} y2={38} stroke={INK} strokeWidth={2} />
            {highlight.has(v) && <Circle cx={x} cy={30} r={10} fill={palette.sunshine} opacity={0.9} />}
            <SvgText x={x} y={60} fontSize={14} fontWeight="bold" fill={INK} textAnchor="middle">{String(v)}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function ShapeGlyph({ shape, color, size }: { shape: string; color: string; size: number }) {
  const s = size;
  switch (shape) {
    case 'circle':
      return <Svg width={s} height={s}><Circle cx={s / 2} cy={s / 2} r={s / 2 - 3} fill={color} stroke={INK} strokeWidth={3} /></Svg>;
    case 'triangle':
      return <Svg width={s} height={s}><Polygon points={`${s / 2},4 ${s - 4},${s - 4} 4,${s - 4}`} fill={color} stroke={INK} strokeWidth={3} strokeLinejoin="round" /></Svg>;
    case 'rectangle':
      return <Svg width={s} height={s}><Rect x={4} y={s * 0.25} width={s - 8} height={s * 0.5} rx={6} fill={color} stroke={INK} strokeWidth={3} /></Svg>;
    case 'star':
      return <Svg width={s} height={s}><Polygon points={starPoints(s / 2, s / 2, s / 2 - 4, s / 5)} fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" /></Svg>;
    case 'hexagon':
      return <Svg width={s} height={s}><Polygon points={polyPoints(6, s / 2, s / 2, s / 2 - 4)} fill={color} stroke={INK} strokeWidth={3} /></Svg>;
    default:
      return <Svg width={s} height={s}><Rect x={4} y={4} width={s - 8} height={s - 8} rx={6} fill={color} stroke={INK} strokeWidth={3} /></Svg>;
  }
}
function polyPoints(n: number, cx: number, cy: number, r: number) {
  return Array.from({ length: n }, (_, i) => `${cx + r * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2)},${cy + r * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)}`).join(' ');
}
function starPoints(cx: number, cy: number, r: number, r2: number) {
  return Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? r2 : r; const a = (i / 10) * 2 * Math.PI - Math.PI / 2; return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`; }).join(' ');
}

function Shapes({ props, onInteract }: R) {
  const items = arr<{ shape: string; label: string; color: string }>(props.items);
  const [sel, setSel] = useState<number | null>(null);
  return (
    <View style={styles.row}>
      {items.map((it, i) => (
        <Tactile key={i} onPress={() => { setSel(i); onInteract(`shape:${it.shape}`); }} accessibilityRole="button" accessibilityLabel={it.label}>
          <View style={[styles.shapeCard, sel === i && { backgroundColor: '#FFF4CC' }]}>
            <ShapeGlyph shape={it.shape} color={it.color} size={72} />
            <AppText variant="caption" align="center">{it.label}</AppText>
          </View>
        </Tactile>
      ))}
    </View>
  );
}

function PlaceValue({ props }: R) {
  const n = num(props.number, 23);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (
    <View style={styles.wrapCol}>
      <View style={styles.row}>
        <View style={styles.pvBox}>
          <AppText variant="caption" tone="secondary">Tens</AppText>
          <View style={styles.row}>{Array.from({ length: tens }, (_, i) => <View key={i} style={styles.bundle}>{Array.from({ length: 10 }, (_, j) => <View key={j} style={styles.stick} />)}</View>)}</View>
          <AppText variant="heading">{tens} × 10 = {tens * 10}</AppText>
        </View>
        <View style={styles.pvBox}>
          <AppText variant="caption" tone="secondary">Ones</AppText>
          <View style={[styles.row, { maxWidth: 90 }]}>{Array.from({ length: ones }, (_, i) => <View key={i} style={[styles.stick, { backgroundColor: palette.tangerine }]} />)}</View>
          <AppText variant="heading">{ones}</AppText>
        </View>
      </View>
      <AppText variant="display" align="center">{n} = {tens * 10} + {ones}</AppText>
    </View>
  );
}

function AreaGrid({ w, props }: R) {
  const cols = num(props.cols, 5);
  const rows = num(props.rows, 3);
  const cell = Math.min(44, (w - 60) / cols);
  const unit = str(props.unit, 'cm');
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={cols * cell + 60} height={rows * cell + 50}>
        {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => <Rect key={`${r}-${c}`} x={30 + c * cell} y={10 + r * cell} width={cell} height={cell} fill={props.showArea ? rainbow[(r + c) % rainbow.length] : '#FFF8EC'} opacity={props.showArea ? 0.8 : 1} stroke={INK} strokeWidth={1.5} />))}
        {!!props.showPerimeter && <Rect x={30} y={10} width={cols * cell} height={rows * cell} fill="none" stroke={palette.cherry} strokeWidth={5} />}
        <SvgText x={30 + (cols * cell) / 2} y={rows * cell + 38} fontSize={16} fontWeight="bold" fill={INK} textAnchor="middle">{cols} {unit}</SvgText>
        <SvgText x={14} y={10 + (rows * cell) / 2} fontSize={16} fontWeight="bold" fill={INK} textAnchor="middle">{rows}</SvgText>
      </Svg>
      <AppText variant="caption" tone="secondary">{props.showArea ? `Area = ${cols} × ${rows} = ${cols * rows} ${unit}²` : ''}{props.showPerimeter ? `  Perimeter = 2 × (${cols} + ${rows}) = ${2 * (cols + rows)} ${unit}` : ''}</AppText>
    </View>
  );
}

function Balance({ w, props }: R) {
  const left = arr<string>(props.left);
  const right = arr<string>(props.right);
  const pan = (items: string[], x: number) => (
    <>
      <Line x1={x - 50} y1={60} x2={x + 50} y2={60} stroke={INK} strokeWidth={3} />
      {items.map((it, i) => <React.Fragment key={i}><Rect x={x - 46 + i * 46} y={24} width={40} height={32} rx={8} fill={i === 0 ? palette.sky : palette.sunshine} stroke={INK} strokeWidth={2} /><SvgText x={x - 26 + i * 46} y={46} fontSize={16} fontWeight="bold" fill={INK} textAnchor="middle">{it}</SvgText></React.Fragment>)}
    </>
  );
  return (
    <Svg width={w} height={120}>
      <Polygon points={`${w / 2},110 ${w / 2 - 30},118 ${w / 2 + 30},118`} fill={INK} />
      <Line x1={w / 2} y1={70} x2={w / 2} y2={110} stroke={INK} strokeWidth={4} />
      <Line x1={w * 0.2} y1={70} x2={w * 0.8} y2={70} stroke={INK} strokeWidth={4} />
      {pan(left, w * 0.25)}
      {pan(right, w * 0.75)}
      <SvgText x={w / 2} y={92} fontSize={22} fontWeight="bold" fill={palette.grape} textAnchor="middle">=</SvgText>
    </Svg>
  );
}

function MultiplyTrick({ props }: R) {
  const a = num(props.a, 23);
  const b = num(props.b, 11);
  const base = num(props.base, 0);
  if (base) {
    const p = base - a;
    const q = base - b;
    return (
      <View style={styles.trick}>
        <AppText variant="display" align="center">{a} × {b}</AppText>
        <AppText variant="body" align="center">{a} is {p} below {base} · {b} is {q} below {base}</AppText>
        <AppText variant="heading" align="center">{a} − {q} = {a - q}   |   {p} × {q} = {p * q}</AppText>
        <AppText variant="display" align="center" style={{ color: palette.grapeDeep }}>{a * b}</AppText>
      </View>
    );
  }
  const d = String(a).split('').map(Number);
  const mid = (d[0] ?? 0) + (d[1] ?? 0);
  return (
    <View style={styles.trick}>
      <AppText variant="display" align="center">{a} × 11</AppText>
      <View style={styles.row}>
        <View style={styles.digit}><Text style={styles.digitText}>{d[0]}</Text></View>
        <View style={[styles.digit, { backgroundColor: palette.sunshine }]}><Text style={styles.digitText}>{d[0]}+{d[1]}={mid}</Text></View>
        <View style={styles.digit}><Text style={styles.digitText}>{d[1]}</Text></View>
      </View>
      <AppText variant="display" align="center" style={{ color: palette.grapeDeep }}>{a * 11}</AppText>
    </View>
  );
}

// ---- science scenes --------------------------------------------------------

function Scene({ w, props, onInteract }: R) {
  const items = arr<{ emoji: string; x: number; y: number; label?: string; arrow?: string; state?: string }>(props.items);
  const [off, setOff] = useState<Set<number>>(new Set());
  const h = 200;
  return (
    <View style={{ width: w, height: h, backgroundColor: '#E8F6FF', borderRadius: 20, borderWidth: 3, borderColor: INK, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 40, backgroundColor: '#C8EDB4' }} />
      {items.map((it, i) => (
        <Tactile key={i} disabled={!props.tappable} onPress={() => { setOff((s) => new Set(s).add(i)); onInteract(`scene:${it.label ?? it.emoji}`); }} accessibilityRole="button" accessibilityLabel={it.label ?? it.emoji} style={{ position: 'absolute', left: `${it.x}%`, top: `${it.y}%`, transform: [{ translateX: -24 }, { translateY: -24 }], alignItems: 'center' }}>
          <Text style={{ fontSize: 40, opacity: it.state === 'on' && off.has(i) ? 0.4 : 1 }}>{it.emoji}</Text>
          {it.arrow && <Text style={{ fontSize: 22, color: palette.cherry, fontWeight: 'bold' }}>{it.arrow === 'right' ? '➡️' : it.arrow === 'left' ? '⬅️' : it.arrow === 'up' ? '⬆️' : '⬇️'}</Text>}
          {it.label && <Text style={styles.sceneLabel}>{off.has(i) && it.state === 'on' ? '✅' : it.label}</Text>}
        </Tactile>
      ))}
    </View>
  );
}

function BallPath({ w, props }: R) {
  const arc = str(props.arc, 'mid');
  const peak = arc === 'high' ? 10 : arc === 'low' ? 70 : 40;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={120}>
        <Line x1={10} y1={100} x2={w - 10} y2={100} stroke={INK} strokeWidth={3} />
        <Path d={`M 30 95 Q ${w / 2} ${peak} ${w - 30} 95`} stroke={palette.cherry} strokeWidth={4} fill="none" strokeDasharray="8 6" />
        <Circle cx={30} cy={90} r={10} fill={palette.sunshine} stroke={INK} strokeWidth={2} />
        <Circle cx={w - 30} cy={90} r={10} fill={palette.sunshine} stroke={INK} strokeWidth={2} opacity={0.5} />
        {!!props.bounce && <Circle cx={w / 2} cy={95} r={5} fill={palette.cherry} />}
        <SvgText x={20} y={118} fontSize={12} fill={INK}>{str(props.from, 'start')}</SvgText>
        <SvgText x={w - 20} y={118} fontSize={12} fill={INK} textAnchor="end">{str(props.to, 'end')}</SvgText>
      </Svg>
      {!!props.label && <AppText variant="caption" tone="secondary">{str(props.label)}</AppText>}
    </View>
  );
}

function ShadowSun({ w, props, onInteract }: R) {
  const positions = ['morning', 'noon', 'evening'];
  const [pos, setPos] = useState(Math.max(0, positions.indexOf(str(props.sunPosition, 'noon'))));
  const sunX = [w * 0.15, w * 0.5, w * 0.85][pos]!;
  const shadowLen = [w * 0.32, w * 0.06, w * 0.32][pos]!;
  const dir = pos === 0 ? 1 : pos === 2 ? -1 : 0;
  const treeX = w / 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={170}>
        <Rect x={0} y={130} width={w} height={40} fill="#C8EDB4" />
        <Circle cx={sunX} cy={40} r={22} fill={palette.sunshine} stroke={palette.tangerine} strokeWidth={3} />
        <Rect x={treeX - Math.max(8, dir >= 0 ? 0 : shadowLen)} y={124} width={shadowLen + 16} height={10} rx={5} fill="rgba(46,42,74,0.45)" transform={dir > 0 ? `translate(${8},0)` : dir < 0 ? `translate(${-8},0)` : ''} />
        <Rect x={treeX - 6} y={90} width={12} height={40} fill="#8B5A2B" />
        <Circle cx={treeX} cy={80} r={26} fill={palette.lime} stroke={palette.limeDeep} strokeWidth={3} />
      </Svg>
      {!!props.interactive && (
        <View style={styles.row}>
          {positions.map((p, i) => (
            <Tactile key={p} onPress={() => { setPos(i); onInteract(`sun:${p}`); }} accessibilityRole="button" accessibilityLabel={p}>
              <View style={[styles.pill, pos === i && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{p === 'morning' ? '🌅 Morning' : p === 'noon' ? '☀️ Noon' : '🌇 Evening'}</AppText></View>
            </Tactile>
          ))}
        </View>
      )}
    </View>
  );
}

function Lever({ w, props, onInteract }: R) {
  const [pivot, setPivot] = useState(num(props.pivot, 50));
  const h = 140;
  const px = 20 + ((w - 40) * pivot) / 100;
  const tilt = (50 - pivot) / 6;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={h}>
        <Polygon points={`${px},${h - 50} ${px - 22},${h - 10} ${px + 22},${h - 10}`} fill={INK} />
        <Line x1={20} y1={h - 50} x2={w - 20} y2={h - 50} stroke="#8B5A2B" strokeWidth={10} strokeLinecap="round" transform={`rotate(${tilt} ${px} ${h - 50})`} />
        <SvgText x={28} y={h - 62} fontSize={30} transform={`rotate(${tilt} ${px} ${h - 50})`}>🪨</SvgText>
        <SvgText x={w - 60} y={h - 62} fontSize={30} transform={`rotate(${tilt} ${px} ${h - 50})`}>🧒</SvgText>
        <SvgText x={px} y={h - 72} fontSize={12} fill={INK} textAnchor="middle">pivot</SvgText>
        {!!props.loadLabel && <SvgText x={40} y={16} fontSize={12} fill={INK}>{str(props.loadLabel)}</SvgText>}
        {!!props.effortLabel && <SvgText x={w - 40} y={16} fontSize={12} fill={INK} textAnchor="end">{str(props.effortLabel)}</SvgText>}
      </Svg>
      {!!props.interactive && (
        <View style={styles.row}>
          {[25, 50, 70].map((p) => (
            <Tactile key={p} onPress={() => { setPivot(p); onInteract(`pivot:${p}`); }} accessibilityRole="button" accessibilityLabel={`pivot ${p}`}>
              <View style={[styles.pill, pivot === p && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{p < 50 ? 'Pivot near the rock' : p === 50 ? 'Middle' : 'Pivot near you'}</AppText></View>
            </Tactile>
          ))}
        </View>
      )}
      <AppText variant="caption" tone="secondary" align="center">{pivot < 50 ? 'Long effort arm: the rock lifts with a small push.' : pivot > 50 ? 'Short effort arm: you must push hard.' : 'Balanced arms.'}</AppText>
    </View>
  );
}

function Particles({ w, props, onInteract }: R) {
  const states = ['solid', 'liquid', 'gas'] as const;
  const [state, setState] = useState<(typeof states)[number]>((str(props.state, 'solid') as typeof states[number]) ?? 'solid');
  const labels = arr<string>(props.labels);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(anim, { toValue: 1, duration: state === 'gas' ? 500 : state === 'liquid' ? 1200 : 2500, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: state === 'gas' ? 500 : state === 'liquid' ? 1200 : 2500, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [state, anim]);
  const jitter = state === 'solid' ? 2 : state === 'liquid' ? 8 : 26;
  const positions = state === 'solid' ? Array.from({ length: 16 }, (_, i) => [20 + (i % 4) * 28, 20 + Math.floor(i / 4) * 28]) : state === 'liquid' ? Array.from({ length: 16 }, (_, i) => [16 + (i % 5) * 26 + (Math.floor(i / 5) % 2) * 10, 70 + Math.floor(i / 5) * 24]) : Array.from({ length: 16 }, (_, i) => [12 + ((i * 37) % 120), 12 + ((i * 53) % 130)]);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 160, height: 170, borderWidth: 3, borderColor: INK, borderRadius: 16, backgroundColor: state === 'gas' ? '#F4F1FF' : state === 'liquid' ? '#DDEEFF' : '#E6F8DA', overflow: 'hidden' }}>
        {positions.map(([x, y], i) => (
          <Animated.View key={i} style={{ position: 'absolute', left: x, top: y, width: 18, height: 18, borderRadius: 9, backgroundColor: rainbow[i % rainbow.length], borderWidth: 2, borderColor: INK, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 2 ? 1 : -1) * jitter] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, (i % 3 ? -1 : 1) * jitter] }) }] }} />
        ))}
      </View>
      <View style={styles.row}>
        {states.map((s, i) => (
          <Tactile key={s} onPress={() => { setState(s); onInteract(`state:${s}`); }} disabled={!props.interactive && s !== state} accessibilityRole="button" accessibilityLabel={s}>
            <View style={[styles.pill, state === s && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{labels[i] ?? s}</AppText></View>
          </Tactile>
        ))}
      </View>
    </View>
  );
}

function Molecule({ props, onInteract }: R) {
  const formula = str(props.formula, 'H2O');
  const atoms: { sym: string; color: string }[] = [];
  for (const m of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) for (let i = 0; i < Number(m[2] || 1); i++) atoms.push({ sym: m[1]!, color: m[1] === 'O' ? palette.cherry : m[1] === 'H' ? palette.sky : m[1] === 'C' ? '#6B7280' : m[1] === 'N' ? palette.grape : palette.lime });
  const [built, setBuilt] = useState(props.interactive ? 0 : atoms.length);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.row}>
        {atoms.map((a, i) => (
          <Tactile key={i} disabled={!props.interactive || i >= built + 1} onPress={() => { if (i === built) { setBuilt(built + 1); onInteract(`atom:${a.sym}`); } }} accessibilityRole="button" accessibilityLabel={a.sym}>
            <View style={{ width: a.sym === 'H' ? 44 : 64, height: a.sym === 'H' ? 44 : 64, borderRadius: 32, backgroundColor: i < built ? a.color : '#E5E7EB', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: 20, color: '#fff' }}>{a.sym}</Text></View>
          </Tactile>
        ))}
      </View>
      <AppText variant="display" align="center">{formula.replace(/(\d+)/g, (d) => '₀₁₂₃₄₅₆₇₈₉'.split('')[Number(d)] ?? d)}</AppText>
      <AppText variant="caption" tone="secondary">{atoms.length} atoms · {built < atoms.length ? 'tap the next atom' : 'complete'}</AppText>
    </View>
  );
}

function Cycle({ w, props, onInteract }: R) {
  const nodes = arr<{ emoji: string; label: string }>(props.nodes ?? props.stages);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!props.interactive) {
      const id = setInterval(() => setActive((a) => (a + 1) % Math.max(1, nodes.length)), 1800);
      return () => clearInterval(id);
    }
  }, [props.interactive, nodes.length]);
  const linear = !!props.linear;
  const r = Math.min(w, 320) / 2 - 40;
  const cx = Math.min(w, 320) / 2;
  const cy = r + 30;
  return (
    <View style={{ alignItems: 'center' }}>
      {linear ? (
        <View style={styles.wrapCol}>
          {nodes.map((n, i) => (
            <Tactile key={i} onPress={() => { setActive(i); onInteract(`node:${n.label}`); }} accessibilityRole="button" accessibilityLabel={n.label}>
              <View style={[styles.flowStep, active === i && { backgroundColor: '#FFF4CC', borderColor: palette.sunshineDeep }]}><Text style={{ fontSize: 24 }}>{n.emoji}</Text><AppText variant="bodyStrong" style={{ flex: 1 }}>{n.label}</AppText>{i < nodes.length - 1 && <Text>⬇️</Text>}</View>
            </Tactile>
          ))}
        </View>
      ) : (
        <View style={{ width: Math.min(w, 320), height: cy + r + 30 }}>
          <Svg width={Math.min(w, 320)} height={cy + r + 30} style={{ position: 'absolute' }}>
            <Circle cx={cx} cy={cy} r={r} stroke={palette.sky} strokeWidth={6} fill="none" strokeDasharray="12 10" />
          </Svg>
          {nodes.map((n, i) => {
            const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
            return (
              <Tactile key={i} onPress={() => { setActive(i); onInteract(`node:${n.label}`); }} accessibilityRole="button" accessibilityLabel={n.label} style={{ position: 'absolute', left: cx + r * Math.cos(a) - 44, top: cy + r * Math.sin(a) - 30, width: 88, alignItems: 'center' }}>
                <View style={[styles.node, active === i && { backgroundColor: palette.sunshine, transform: [{ scale: 1.1 }] }]}><Text style={{ fontSize: 28 }}>{n.emoji}</Text></View>
                <Text style={styles.nodeLabel} numberOfLines={2}>{n.label}</Text>
              </Tactile>
            );
          })}
        </View>
      )}
      {nodes[active] && <AppText variant="bodyStrong" align="center">{nodes[active]!.emoji} {nodes[active]!.label}</AppText>}
    </View>
  );
}

function Flowchart({ props, onInteract }: R) {
  const steps = arr<string>(props.steps);
  const [active, setActive] = useState<number | null>(null);
  return (
    <View style={styles.wrapCol}>
      {steps.map((s, i) => (
        <Tactile key={i} onPress={() => { setActive(i); onInteract(`step:${s}`); }} accessibilityRole="button" accessibilityLabel={s}>
          <View style={[styles.flowStep, active === i && { backgroundColor: '#FFF4CC', borderColor: palette.sunshineDeep }]}>
            <View style={styles.flowNum}><Text style={{ color: '#fff', fontFamily: 'Fredoka_700Bold' }}>{i + 1}</Text></View>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>{s}</AppText>
          </View>
        </Tactile>
      ))}
      {!!props.loop && <AppText variant="caption" tone="secondary" align="center">🔁 …and round again</AppText>}
    </View>
  );
}

function Labelled({ props, onInteract }: R) {
  const items = arr<{ emoji?: string; label: string; hint?: string; group?: string }>(props.items ?? (props.needs ? [...arr<string>(props.needs).map((x) => ({ emoji: '✅', label: `Need: ${x}` })), ...arr<string>(props.wants).map((x) => ({ emoji: '🎁', label: `Want: ${x}` }))] : []));
  const [sel, setSel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const center = str(props.emoji);
  return (
    <View style={{ alignItems: 'center' }}>
      {center && items.length > 0 && !props.items && <Text style={{ fontSize: 64 }}>{center}</Text>}
      {center && props.items ? <Text style={{ fontSize: 56 }}>{center}</Text> : null}
      <View style={styles.row}>
        {items.map((it, i) => (
          <Tactile key={i} onPress={() => { setSel(i); setRevealed((r) => new Set(r).add(i)); onInteract(`label:${it.label}`); }} accessibilityRole="button" accessibilityLabel={it.label}>
            <View style={[styles.labelCard, sel === i && { backgroundColor: '#FFF4CC', borderColor: palette.sunshineDeep }]}>
              {it.emoji && <Text style={{ fontSize: 30 }}>{it.emoji}</Text>}
              <AppText variant="bodySmallStrong" align="center">{it.label}</AppText>
              {(it.hint || it.group) && revealed.has(i) && <AppText variant="caption" tone="secondary" align="center">{it.hint ?? it.group}</AppText>}
            </View>
          </Tactile>
        ))}
      </View>
      {props.saved !== undefined && <AppText variant="caption" tone="secondary" align="center">Save ₹{num(props.saved)} · needs ₹{num(props.needs as number)} · wants ₹{num(props.wants as number)} · after {num(props.months)} months: ₹{num(props.saved) * num(props.months)} saved</AppText>}
    </View>
  );
}

function Bar({ w, props }: R) {
  const segs = arr<{ label: string; value: number; color: string }>(props.segments);
  const total = segs.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <View style={{ width: w }}>
      <View style={{ flexDirection: 'row', height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 3, borderColor: INK }}>
        {segs.map((s, i) => <View key={i} style={{ flex: s.value / total, backgroundColor: s.color }} />)}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>{segs.map((s, i) => <View key={i} style={styles.legend}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: s.color }} /><AppText variant="caption">{s.label} {Math.round((s.value / total) * 100)}%</AppText></View>)}</View>
    </View>
  );
}

function Timeline({ w, props, onInteract }: R) {
  const events = arr<{ label: string; year?: string; emoji?: string }>(props.events);
  const [active, setActive] = useState<number | null>(null);
  return (
    <View style={{ width: w }}>
      <View style={{ height: 6, backgroundColor: INK, borderRadius: 3, marginTop: 30, marginHorizontal: 10 }} />
      <View style={[styles.row, { justifyContent: 'space-between', marginTop: -36 }]}>
        {events.map((e, i) => (
          <Tactile key={i} onPress={() => { setActive(i); onInteract(`event:${e.label}`); }} accessibilityRole="button" accessibilityLabel={e.label} style={{ width: w / events.length - 6, alignItems: 'center' }}>
            <View style={[styles.node, { width: 44, height: 44 }, active === i && { backgroundColor: palette.sunshine }]}><Text style={{ fontSize: 22 }}>{e.emoji ?? '📍'}</Text></View>
            {e.year && <AppText variant="caption" tone="secondary" align="center">{e.year}</AppText>}
            <Text style={styles.nodeLabel} numberOfLines={3}>{e.label}</Text>
          </Tactile>
        ))}
      </View>
    </View>
  );
}

const SOURCE_COLORS: Record<string, string> = { evidence: palette.lime, primary: palette.lime, interpretation: palette.sunshine, secondary: palette.sky, legend: palette.bubblegum, warning: palette.cherry, ok: palette.lime };
function SourceCards({ props, onInteract }: R) {
  const cards = arr<{ kind: string; text: string }>(props.cards);
  const [revealed, setRevealed] = useState<Set<number>>(new Set(props.interactive ? [] : cards.map((_, i) => i)));
  return (
    <View style={styles.row}>
      {cards.map((c, i) => (
        <Tactile key={i} onPress={() => { setRevealed((r) => new Set(r).add(i)); onInteract(`card:${c.kind}`); }} accessibilityRole="button" accessibilityLabel={c.text}>
          <View style={[styles.sourceCard, { borderColor: revealed.has(i) ? SOURCE_COLORS[c.kind] ?? INK : INK }]}>
            <AppText variant="bodySmallStrong" align="center">{c.text}</AppText>
            <View style={[styles.pill, { backgroundColor: revealed.has(i) ? SOURCE_COLORS[c.kind] ?? '#eee' : '#eee' }]}><AppText variant="caption">{revealed.has(i) ? c.kind.toUpperCase() : 'tap to sort'}</AppText></View>
          </View>
        </Tactile>
      ))}
    </View>
  );
}

function Compass({ props }: R) {
  const s = 200;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={s} height={s}>
        <Circle cx={s / 2} cy={s / 2} r={s / 2 - 6} fill="#FFF8EC" stroke={INK} strokeWidth={4} />
        <Polygon points={`${s / 2},${30} ${s / 2 - 14},${s / 2} ${s / 2 + 14},${s / 2}`} fill={palette.cherry} />
        <Polygon points={`${s / 2},${s - 30} ${s / 2 - 14},${s / 2} ${s / 2 + 14},${s / 2}`} fill={INK} />
        <SvgText x={s / 2} y={22} fontSize={18} fontWeight="bold" fill={INK} textAnchor="middle">N</SvgText>
        <SvgText x={s / 2} y={s - 8} fontSize={18} fontWeight="bold" fill={INK} textAnchor="middle">S</SvgText>
        <SvgText x={s - 14} y={s / 2 + 6} fontSize={18} fontWeight="bold" fill={INK} textAnchor="middle">E</SvgText>
        <SvgText x={14} y={s / 2 + 6} fontSize={18} fontWeight="bold" fill={INK} textAnchor="middle">W</SvgText>
        {!!props.showSun && <SvgText x={s - 36} y={s / 2 - 20} fontSize={26}>☀️</SvgText>}
      </Svg>
      {!props.simple && <AppText variant="caption" tone="secondary">Never Eat Soggy Wheat: N, E, S, W</AppText>}
    </View>
  );
}

function MazeMini({ props, onInteract }: R) {
  const grid = num(props.grid, 3);
  const start = arr<number>(props.start);
  const goal = arr<number>(props.goal);
  const [pos, setPos] = useState<[number, number]>([start[0] ?? 0, start[1] ?? 0]);
  const done = pos[0] === goal[0] && pos[1] === goal[1];
  const move = (dx: number, dy: number, label: string) => {
    const nx = Math.max(0, Math.min(grid - 1, pos[0] + dx));
    const ny = Math.max(0, Math.min(grid - 1, pos[1] + dy));
    setPos([nx, ny]);
    onInteract(`move:${label}`);
    playClick();
  };
  const cell = 64;
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: grid * cell, height: grid * cell, borderWidth: 3, borderColor: INK, borderRadius: 12, backgroundColor: '#E6F8DA' }}>
        {Array.from({ length: grid * grid }, (_, i) => <View key={i} style={{ position: 'absolute', left: (i % grid) * cell, top: Math.floor(i / grid) * cell, width: cell, height: cell, borderWidth: 0.5, borderColor: '#ccc' }} />)}
        <Text style={{ position: 'absolute', left: (goal[0] ?? 0) * cell + 14, top: (goal[1] ?? 0) * cell + 10, fontSize: 36 }}>🥕</Text>
        <Text style={{ position: 'absolute', left: pos[0] * cell + 14, top: pos[1] * cell + 10, fontSize: 36 }}>{done ? '🎉' : '🐰'}</Text>
      </View>
      <View style={styles.row}>
        <Tactile onPress={() => move(-1, 0, 'left')} accessibilityRole="button" accessibilityLabel="left"><View style={styles.arrowBtn}><Text style={styles.arrowText}>⬅️</Text></View></Tactile>
        <Tactile onPress={() => move(0, -1, 'up')} accessibilityRole="button" accessibilityLabel="up"><View style={styles.arrowBtn}><Text style={styles.arrowText}>⬆️</Text></View></Tactile>
        <Tactile onPress={() => move(0, 1, 'down')} accessibilityRole="button" accessibilityLabel="down"><View style={styles.arrowBtn}><Text style={styles.arrowText}>⬇️</Text></View></Tactile>
        <Tactile onPress={() => move(1, 0, 'right')} accessibilityRole="button" accessibilityLabel="right"><View style={styles.arrowBtn}><Text style={styles.arrowText}>➡️</Text></View></Tactile>
      </View>
      {done && <AppText variant="bodyStrong" align="center">The rabbit found the carrot! 🥕</AppText>}
    </View>
  );
}

// Schematic, not-to-scale maps: coloured blocks with names. Never a precise location.
const WORLD: { name: string; x: number; y: number; w: number; h: number; color: string; kind: 'land' | 'ocean' }[] = [
  { name: 'North America', x: 4, y: 12, w: 24, h: 30, color: palette.tangerine, kind: 'land' },
  { name: 'South America', x: 16, y: 48, w: 16, h: 32, color: palette.lime, kind: 'land' },
  { name: 'Europe', x: 44, y: 12, w: 14, h: 18, color: palette.grape, kind: 'land' },
  { name: 'Africa', x: 42, y: 34, w: 18, h: 36, color: palette.sunshine, kind: 'land' },
  { name: 'Asia', x: 60, y: 10, w: 34, h: 40, color: palette.bubblegum, kind: 'land' },
  { name: 'Australia', x: 74, y: 58, w: 18, h: 18, color: palette.cherry, kind: 'land' },
  { name: 'Antarctica', x: 10, y: 86, w: 80, h: 10, color: '#DDEEFF', kind: 'land' },
  { name: 'Pacific Ocean', x: 0, y: 48, w: 14, h: 30, color: palette.sky, kind: 'ocean' },
  { name: 'Atlantic Ocean', x: 30, y: 44, w: 10, h: 36, color: palette.sky, kind: 'ocean' },
  { name: 'Indian Ocean', x: 60, y: 54, w: 12, h: 24, color: palette.sky, kind: 'ocean' },
  { name: 'Arctic Ocean', x: 20, y: 1, w: 60, h: 8, color: palette.sky, kind: 'ocean' },
  { name: 'Southern Ocean', x: 34, y: 80, w: 36, h: 5, color: palette.sky, kind: 'ocean' },
];
const INDIA_RIVERS: { name: string; d: string; color: string }[] = [
  { name: 'Ganga', d: 'M 38 22 C 50 30, 62 36, 82 40', color: palette.sky },
  { name: 'Yamuna', d: 'M 36 24 C 40 34, 50 40, 60 38', color: palette.mint },
  { name: 'Brahmaputra', d: 'M 95 18 C 90 26, 86 36, 84 40', color: palette.grape },
  { name: 'Narmada', d: 'M 50 50 C 40 52, 30 54, 18 56', color: palette.tangerine },
  { name: 'Godavari', d: 'M 30 60 C 45 64, 60 66, 74 68', color: palette.lime },
  { name: 'Krishna', d: 'M 28 70 C 45 74, 58 76, 72 78', color: palette.cherry },
];
function MapSchematic({ w, props, onInteract }: R) {
  const kind = str(props.kind, 'world');
  const highlight = new Set(arr<string>(props.highlight));
  const [active, setActive] = useState<string | null>(null);
  const h = kind === 'world' ? w * 0.55 : w * 0.9;
  if (kind === 'india') {
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: w, height: h, backgroundColor: '#DDEEFF', borderRadius: 20, borderWidth: 3, borderColor: INK, overflow: 'hidden' }}>
          <Svg width={w} height={h} viewBox="0 0 100 100">
            <Path d="M 30 8 L 70 6 L 98 16 L 90 40 L 78 58 L 60 92 L 50 98 L 40 90 L 22 60 L 12 52 L 18 40 L 28 28 Z" fill="#E6F8DA" stroke={INK} strokeWidth={1.2} />
            <SvgText x="52" y="14" fontSize="5" fill={INK} textAnchor="middle">Himalayas (schematic)</SvgText>
            {INDIA_RIVERS.map((r) => <Path key={r.name} d={r.d} stroke={active === r.name ? INK : r.color} strokeWidth={active === r.name ? 3 : 2} fill="none" strokeLinecap="round" />)}
            <SvgText x="10" y="60" fontSize="4" fill={palette.skyDeep}>Arabian Sea</SvgText>
            <SvgText x="76" y="52" fontSize="4" fill={palette.skyDeep}>Bay of Bengal</SvgText>
          </Svg>
        </View>
        <View style={styles.row}>
          {INDIA_RIVERS.map((r) => (
            <Tactile key={r.name} onPress={() => { setActive(r.name); onInteract(`river:${r.name}`); }} accessibilityRole="button" accessibilityLabel={r.name}>
              <View style={[styles.pill, { borderColor: r.color, borderWidth: 2 }, active === r.name && { backgroundColor: r.color }]}><AppText variant="caption">{r.name}</AppText></View>
            </Tactile>
          ))}
        </View>
        <AppText variant="caption" tone="muted" align="center">Schematic drawing, not to scale and not a precise map.</AppText>
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: w, height: h, backgroundColor: '#CFE8FF', borderRadius: 20, borderWidth: 3, borderColor: INK, overflow: 'hidden' }}>
        {WORLD.map((b) => (
          <Tactile key={b.name} disabled={!props.interactive} onPress={() => { setActive(b.name); onInteract(`map:${b.name}`); }} accessibilityRole="button" accessibilityLabel={b.name} style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}>
            <View style={{ flex: 1, backgroundColor: b.kind === 'ocean' ? 'transparent' : b.color, borderRadius: 14, borderWidth: b.kind === 'ocean' ? 0 : 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', opacity: highlight.size && !highlight.has(b.name) && !active ? 0.45 : 1, transform: [{ scale: active === b.name || highlight.has(b.name) ? 1.06 : 1 }] }}>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: b.kind === 'ocean' ? 10 : 11, color: b.kind === 'ocean' ? palette.skyDeep : INK, textAlign: 'center' }}>{b.name}</Text>
            </View>
          </Tactile>
        ))}
      </View>
      {active && <AppText variant="bodyStrong" align="center">{active}</AppText>}
      <AppText variant="caption" tone="muted" align="center">Simplified map: shapes and sizes are not to scale.</AppText>
    </View>
  );
}

function PasswordStrength({ props, onInteract }: R) {
  const samples = arr<string>(props.samples);
  const [picked, setPicked] = useState<string | null>(null);
  const strength = (p: string) => (p.length < 8 ? 1 : /^[a-z0-9]+$/i.test(p) && p.length < 12 ? 2 : p.length >= 16 ? 4 : 3);
  const words = ['', 'guessed in seconds', 'guessed in hours', 'years to guess', 'centuries to guess'];
  return (
    <View style={styles.wrapCol}>
      {samples.map((s) => {
        const st = strength(s);
        return (
          <Tactile key={s} onPress={() => { setPicked(s); onInteract(`password:${st}`); }} accessibilityRole="button" accessibilityLabel={s}>
            <View style={[styles.flowStep, picked === s && { backgroundColor: '#FFF4CC' }]}>
              <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: 16, flex: 1 }}>{s}</Text>
              <View style={{ flexDirection: 'row', gap: 3 }}>{[1, 2, 3, 4].map((i) => <View key={i} style={{ width: 16, height: 10, borderRadius: 3, backgroundColor: i <= st ? [palette.cherry, palette.tangerine, palette.sunshine, palette.lime][st - 1] : '#E5E7EB' }} />)}</View>
              {picked === s && <AppText variant="caption">{words[st]}</AppText>}
            </View>
          </Tactile>
        );
      })}
    </View>
  );
}

function Letters({ props, onInteract }: R) {
  const items = arr<{ letter: string; sound: string; emoji: string; word: string }>(props.items);
  const highlight = str(props.highlight);
  const [active, setActive] = useState<string | null>(highlight || null);
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <Tactile key={it.letter} onPress={() => { setActive(it.letter); onInteract(`letter:${it.letter}`); }} accessibilityRole="button" accessibilityLabel={`${it.letter} ${it.word}`}>
          <View style={[styles.letterCard, active === it.letter && { backgroundColor: palette.sunshine }]}>
            <Text style={styles.letter}>{it.letter}</Text>
            <Text style={{ fontSize: 30 }}>{it.emoji}</Text>
            <AppText variant="caption" align="center">{it.word}</AppText>
          </View>
        </Tactile>
      ))}
    </View>
  );
}

function PatternRow({ props, onInteract }: R) {
  const items = arr<string>(props.items);
  const [revealed, setRevealed] = useState(!props.interactive);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.row}>
        {items.map((it, i) => (
          <View key={i} style={[styles.patternCell, it === '?' && { backgroundColor: palette.sunshine }]}><Text style={{ fontSize: 24, fontFamily: 'Fredoka_700Bold', color: INK }}>{it}</Text></View>
        ))}
      </View>
      {!!props.rule && (
        <Tactile onPress={() => { setRevealed(true); onInteract('rule'); }} accessibilityRole="button" accessibilityLabel="rule">
          <View style={styles.pill}><AppText variant="caption">{revealed ? `Rule: ${str(props.rule)}` : 'Tap to see the rule'}</AppText></View>
        </Tactile>
      )}
    </View>
  );
}

// ---- music -------------------------------------------------------------------

const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_AFTER = new Set(['C', 'D', 'F', 'G', 'A']);
export function PianoKeys({ w, props, onInteract }: R) {
  const octaves = Math.max(1, Math.min(2, num(props.octaves, 1)));
  const startOctave = octaves === 2 ? 3 : 4;
  const highlight = new Set(arr<string>(props.highlight));
  const labels = new Set(arr<string>(props.labels));
  const chord = arr<string>(props.chord);
  const fingers = (props.fingers ?? {}) as Record<string, number>;
  const demo = arr<string>(props.demo);
  const [lit, setLit] = useState<string | null>(null);
  const [playing, setPlaying] = useState<ReturnType<typeof setTimeout>[] | null>(null);
  const keys = Array.from({ length: octaves * 7 + 1 }, (_, i) => `${WHITE[i % 7]}${startOctave + Math.floor(i / 7)}`);
  const kw = Math.min(56, (w - 8) / keys.length);
  const kh = kw * 3.2;
  const play = (note: string) => {
    playNote(note, 'piano');
    setLit(note);
    setTimeout(() => setLit((n) => (n === note ? null : n)), 350);
  };
  const runDemo = (bpm: number) => {
    playing?.forEach(clearTimeout);
    const beat = 60_000 / bpm;
    const timers = demo.map((n, i) => setTimeout(() => play(n), i * beat));
    setPlaying(timers);
    onInteract(`demo:${bpm}`);
  };
  const zones = arr<{ from: string; to: string; label: string }>(props.zones);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', position: 'relative', height: kh + 8 }}>
        {keys.map((k, i) => {
          const name = k.slice(0, -1);
          const isLit = lit === k || highlight.has(k) || chord.includes(k);
          return (
            <Tactile key={k} onPress={() => { play(k); onInteract(`key:${k}`); }} accessibilityRole="button" accessibilityLabel={k}>
              <View style={{ width: kw, height: kh, backgroundColor: isLit ? palette.sunshine : '#fff', borderWidth: 2, borderColor: INK, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 }}>
                {fingers[k] ? <View style={styles.fingerDot}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{fingers[k]}</Text></View> : null}
                {(labels.has(k) || props.labels === true || name === 'C') && <Text style={{ fontSize: 11, fontFamily: 'Nunito_700Bold', color: INK }}>{labels.has(k) || props.labels === true ? name : k}</Text>}
              </View>
              {BLACK_AFTER.has(name) && i < keys.length - 1 && <View pointerEvents="none" style={{ position: 'absolute', left: kw * 0.68, top: 0, width: kw * 0.62, height: kh * 0.6, backgroundColor: INK, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, zIndex: 2 }} />}
            </Tactile>
          );
        })}
      </View>
      {zones.length > 0 && <View style={[styles.row, { width: kw * keys.length, justifyContent: 'space-around' }]}>{zones.map((z) => <AppText key={z.label} variant="caption">{z.label}</AppText>)}</View>}
      {props.arrow === 'rightIsHigher' && <AppText variant="caption" tone="secondary">low ⟵ ⟶ high</AppText>}
      {demo.length > 0 && (
        <View style={styles.row}>
          <Tactile onPress={() => runDemo(Math.max(40, num(props.bpm, 80) * 0.6))} accessibilityRole="button" accessibilityLabel="Play slowly"><View style={styles.pill}><AppText variant="caption">🐢 Slow demo</AppText></View></Tactile>
          <Tactile onPress={() => runDemo(num(props.bpm, 80))} accessibilityRole="button" accessibilityLabel="Play"><View style={[styles.pill, { backgroundColor: palette.lime }]}><AppText variant="caption">▶️ Play demo</AppText></View></Tactile>
          <Tactile onPress={() => runDemo(num(props.bpm, 80))} accessibilityRole="button" accessibilityLabel="Replay"><View style={styles.pill}><AppText variant="caption">🔁 Replay</AppText></View></Tactile>
        </View>
      )}
      {!!props.hint && <AppText variant="caption" tone="secondary">{str(props.hint)}</AppText>}
    </View>
  );
}

function FingerNumbers({ props }: R) {
  const hand = str(props.hand, 'right');
  const names = ['thumb', 'index', 'middle', 'ring', 'little'];
  const order = hand === 'right' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 72 }}>{hand === 'right' ? '🖐️' : '🤚'}</Text>
      <View style={styles.row}>{order.map((n) => <View key={n} style={[styles.fingerCard, { backgroundColor: rainbow[n] }]}><Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: 24, color: '#fff' }}>{n}</Text><Text style={{ fontSize: 11, color: '#fff' }}>{names[n - 1]}</Text></View>)}</View>
      <AppText variant="caption" tone="secondary">{hand === 'right' ? 'Right hand' : 'Left hand'}: thumb is 1, little finger is 5</AppText>
    </View>
  );
}

const STAFF_POS: Record<string, number> = { C4: 10, D4: 9, E4: 8, F4: 7, G4: 6, A4: 5, B4: 4, C5: 3, D5: 2, E5: 1, F5: 0 };
function Staff({ w, props, onInteract }: R) {
  const notes = arr<string>(props.notes);
  const line = 12;
  const top = 20;
  const x0 = 30;
  const dx = Math.min(44, (w - 60) / Math.max(1, notes.length));
  const [lit, setLit] = useState<number | null>(null);
  const playAll = () => {
    const bpm = num(props.bpm, 70);
    notes.forEach((n, i) => setTimeout(() => { playNote(n); setLit(i); }, i * (60_000 / bpm)));
    setTimeout(() => setLit(null), notes.length * (60_000 / bpm));
    onInteract('demo');
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={w} height={top + line * 11}>
        {[0, 2, 4, 6, 8].map((i) => <Line key={i} x1={10} y1={top + i * line} x2={w - 10} y2={top + i * line} stroke={INK} strokeWidth={1.5} />)}
        {notes.map((n, i) => {
          const pos = STAFF_POS[n] ?? 10;
          const y = top + pos * line;
          return (
            <React.Fragment key={i}>
              {pos >= 10 && <Line x1={x0 + i * dx - 12} y1={y} x2={x0 + i * dx + 12} y2={y} stroke={INK} strokeWidth={1.5} />}
              <Circle cx={x0 + i * dx} cy={y} r={7} fill={lit === i ? palette.cherry : INK} />
              <Line x1={x0 + i * dx + 7} y1={y} x2={x0 + i * dx + 7} y2={y - 34} stroke={INK} strokeWidth={2} />
              {!!props.labels && <SvgText x={x0 + i * dx} y={top + line * 11 - 2} fontSize={11} fontWeight="bold" fill={INK} textAnchor="middle">{n.slice(0, -1)}</SvgText>}
            </React.Fragment>
          );
        })}
      </Svg>
      {!!(props.demo || notes.length > 0) && <Tactile onPress={playAll} accessibilityRole="button" accessibilityLabel="Play"><View style={[styles.pill, { backgroundColor: palette.lime }]}><AppText variant="caption">▶️ Play</AppText></View></Tactile>}
    </View>
  );
}

export function RhythmGrid({ w, props, onInteract }: R) {
  const beats = num(props.beats, 4);
  const pattern = arr<number>(props.pattern);
  const labels = arr<string>(props.labels);
  const groups = num(props.groups, 1);
  const accent = num(props.accent, -1);
  const khali = num(props.khali, -1);
  const claps = new Set(arr<number>(props.claps));
  const instrument = str(props.instrument, 'click');
  const [active, setActive] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const cell = Math.min(56, (w - 16) / Math.min(beats, 8));
  const hit = (i: number) => {
    if (!pattern[i]) return;
    const label = labels[i];
    if (instrument === 'tabla' && label && label !== '↓' && label !== '↑') playBol(label);
    else if (instrument === 'guitar') ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'].forEach((n, j) => setTimeout(() => playNote(n, 'guitar', 400), j * 15));
    else playClick(i === accent || claps.has(i));
  };
  const run = (bpm: number) => {
    timers.current.forEach(clearTimeout);
    setRunning(true);
    const beat = 60_000 / bpm;
    timers.current = Array.from({ length: beats }, (_, i) => setTimeout(() => { setActive(i); hit(i); }, i * beat));
    timers.current.push(setTimeout(() => { setActive(null); setRunning(false); }, beats * beat));
    onInteract(`demo:${bpm}`);
  };
  const rows = Math.ceil(beats / 8);
  return (
    <View style={{ alignItems: 'center' }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
          {Array.from({ length: Math.min(8, beats - r * 8) }, (_, c) => {
            const i = r * 8 + c;
            const groupStart = groups > 1 && i % (beats / groups) === 0;
            return (
              <Tactile key={i} onPress={() => { setActive(i); hit(i); onInteract(`beat:${i}`); }} accessibilityRole="button" accessibilityLabel={labels[i] ?? `beat ${i + 1}`}>
                <View style={{ width: cell, height: cell, borderRadius: 12, marginLeft: groupStart && c > 0 ? 8 : 0, backgroundColor: active === i ? palette.sunshine : pattern[i] ? (i === khali ? '#F4F1FF' : rainbow[Math.floor(i / Math.max(1, beats / groups)) % rainbow.length]) : '#eee', borderWidth: 2, borderColor: i === accent ? palette.cherry : INK, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: 'Fredoka_700Bold', fontSize: labels[i] && labels[i]!.length > 3 ? 11 : 14, color: INK }}>{labels[i] ?? i + 1}</Text>
                  {(i === accent || claps.has(i)) && <Text style={{ fontSize: 10 }}>👏</Text>}
                  {i === khali && <Text style={{ fontSize: 10 }}>〰️</Text>}
                </View>
              </Tactile>
            );
          })}
        </View>
      ))}
      {!!(props.demo || props.interactive) && (
        <View style={styles.row}>
          <Tactile onPress={() => run(Math.max(30, num(props.bpm, 80) * 0.6))} disabled={running} accessibilityRole="button" accessibilityLabel="Slow"><View style={styles.pill}><AppText variant="caption">🐢 Slow</AppText></View></Tactile>
          <Tactile onPress={() => run(num(props.bpm, 80))} disabled={running} accessibilityRole="button" accessibilityLabel="Play"><View style={[styles.pill, { backgroundColor: palette.lime }]}><AppText variant="caption">▶️ {num(props.bpm, 80)} bpm</AppText></View></Tactile>
        </View>
      )}
    </View>
  );
}

export function Tabla({ props, onInteract }: R) {
  const [hit, setHit] = useState<'dayan' | 'bayan' | null>(null);
  const strike = (drum: 'dayan' | 'bayan') => {
    playBol(drum === 'dayan' ? 'Na' : 'Ge');
    setHit(drum);
    setTimeout(() => setHit(null), 200);
    onInteract(`drum:${drum}`);
  };
  const ann = (props.annotations ?? {}) as { dayan?: string[]; bayan?: string[] };
  const Drum = ({ drum, size, color }: { drum: 'dayan' | 'bayan'; size: number; color: string }) => (
    <Tactile onPress={() => strike(drum)} accessibilityRole="button" accessibilityLabel={drum}>
      <View style={{ alignItems: 'center' }}>
        <Svg width={size} height={size * 0.9}>
          <Rect x={size * 0.12} y={size * 0.3} width={size * 0.76} height={size * 0.55} rx={size * 0.2} fill={color} stroke={INK} strokeWidth={3} />
          <Circle cx={size / 2} cy={size * 0.32} r={size * 0.4} fill={hit === drum ? '#FFE9A8' : '#F5E6C8'} stroke={INK} strokeWidth={3} />
          <Circle cx={size / 2} cy={size * 0.32} r={size * 0.14} fill={INK} />
        </Svg>
        {<AppText variant="caption">{drum === 'dayan' ? 'Dayan (right, wood)' : 'Bayan (left, metal)'}</AppText>}
        {(ann[drum] ?? []).map((a) => <AppText key={a} variant="caption" tone="secondary">{a}</AppText>)}
      </View>
    </Tactile>
  );
  return (
    <View style={[styles.row, { alignItems: 'flex-end' }]}>
      <Drum drum="bayan" size={150} color="#A3A3A3" />
      <Drum drum="dayan" size={120} color="#8B5A2B" />
    </View>
  );
}

export function GuitarChord({ props, onInteract }: R) {
  const frets = arr<number | null>(props.frets);
  const fingers = arr<number | null>(props.fingers);
  const [lit, setLit] = useState<number | null>(null);
  const w = 200;
  const h = 220;
  const fretH = 40;
  const sx = (i: number) => 30 + i * 28;
  const pluck = (i: number) => {
    const n = guitarStringNote(i, frets[i] ?? 0);
    if (n) playNote(n, 'guitar', 700);
    setLit(i);
    setTimeout(() => setLit(null), 300);
    onInteract(`string:${i}`);
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <AppText variant="heading">{str(props.name)}</AppText>
      <Svg width={w} height={h}>
        <Rect x={sx(0) - 4} y={20} width={sx(5) - sx(0) + 8} height={6} fill={INK} />
        {[1, 2, 3, 4].map((f) => <Line key={f} x1={sx(0)} y1={26 + f * fretH} x2={sx(5)} y2={26 + f * fretH} stroke={INK} strokeWidth={2} />)}
        {Array.from({ length: 6 }, (_, i) => <Line key={i} x1={sx(i)} y1={26} x2={sx(i)} y2={26 + 4 * fretH} stroke={lit === i ? palette.cherry : INK} strokeWidth={1 + (5 - i) * 0.5} />)}
        {frets.map((f, i) => f ? <React.Fragment key={i}><Circle cx={sx(i)} cy={26 + (f - 0.5) * fretH} r={13} fill={palette.cherry} stroke={INK} strokeWidth={2} />{fingers[i] ? <SvgText x={sx(i)} y={26 + (f - 0.5) * fretH + 5} fontSize={13} fontWeight="bold" fill="#fff" textAnchor="middle">{String(fingers[i])}</SvgText> : null}</React.Fragment> : f === 0 ? <SvgText key={i} x={sx(i)} y={14} fontSize={14} fill={INK} textAnchor="middle">○</SvgText> : null)}
        {!!props.labels && ['E', 'A', 'D', 'G', 'B', 'e'].map((n, i) => <SvgText key={n} x={sx(i)} y={h - 6} fontSize={12} fontWeight="bold" fill={INK} textAnchor="middle">{n}</SvgText>)}
      </Svg>
      <View style={styles.row}>
        {Array.from({ length: 6 }, (_, i) => (
          <Tactile key={i} onPress={() => pluck(i)} accessibilityRole="button" accessibilityLabel={`string ${i + 1}`}><View style={[styles.pill, lit === i && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{['E', 'A', 'D', 'G', 'B', 'e'][i]}</AppText></View></Tactile>
        ))}
        <Tactile onPress={() => { Array.from({ length: 6 }, (_, i) => setTimeout(() => pluck(i), i * 60)); onInteract('strum'); }} accessibilityRole="button" accessibilityLabel="Strum"><View style={[styles.pill, { backgroundColor: palette.lime }]}><AppText variant="caption">🎸 Strum</AppText></View></Tactile>
      </View>
    </View>
  );
}

// ---- sports -----------------------------------------------------------------

function Court({ w, props, onInteract }: R) {
  const sport = str(props.sport, 'football');
  const markers = arr<{ x: number; y: number; emoji?: string; label?: string }>(props.markers);
  const lines = arr<string>(props.lines);
  const [active, setActive] = useState<string | null>(null);
  const h = sport === 'cricket' ? w * 0.8 : sport === 'pool' ? w * 0.6 : w * 0.62;
  const ground = sport === 'cricket' || sport === 'football' ? '#7ED957' : sport === 'pool' ? '#4FB3FF' : sport === 'squash' ? '#F5E6C8' : sport === 'table-tennis' ? '#2A94E8' : sport === 'basketball' ? '#E8B27D' : '#4FD1C5';
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: w, height: h, backgroundColor: ground, borderRadius: sport === 'cricket' ? w / 2 : 16, borderWidth: 3, borderColor: INK, overflow: 'hidden' }}>
        <Svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none">
          {sport === 'cricket' && <><Rect x="44" y="30" width="12" height="40" fill="#D4A574" /><Line x1="44" y1="35" x2="56" y2="35" stroke="#fff" strokeWidth="0.8" /><Line x1="44" y1="65" x2="56" y2="65" stroke="#fff" strokeWidth="0.8" /><Circle cx="50" cy="50" r="30" stroke="#fff" strokeWidth="0.6" fill="none" strokeDasharray="2 2" /></>}
          {sport === 'football' && <><Rect x="3" y="3" width="94" height="94" stroke="#fff" strokeWidth="1" fill="none" /><Line x1="50" y1="3" x2="50" y2="97" stroke="#fff" strokeWidth="1" /><Circle cx="50" cy="50" r="12" stroke="#fff" strokeWidth="1" fill="none" /><Rect x="3" y="30" width="16" height="40" stroke="#fff" strokeWidth="1" fill="none" /><Rect x="81" y="30" width="16" height="40" stroke="#fff" strokeWidth="1" fill="none" /></>}
          {sport === 'badminton' && <><Rect x="5" y="5" width="90" height="90" stroke="#fff" strokeWidth="1" fill="none" /><Line x1="50" y1="5" x2="50" y2="95" stroke={INK} strokeWidth="1.5" /><Line x1="35" y1="5" x2="35" y2="95" stroke="#fff" strokeWidth="0.8" /><Line x1="65" y1="5" x2="65" y2="95" stroke="#fff" strokeWidth="0.8" /><Line x1="5" y1="50" x2="35" y2="50" stroke="#fff" strokeWidth="0.8" /><Line x1="65" y1="50" x2="95" y2="50" stroke="#fff" strokeWidth="0.8" /><Line x1="12" y1="5" x2="12" y2="95" stroke="#fff" strokeWidth="0.6" /><Line x1="88" y1="5" x2="88" y2="95" stroke="#fff" strokeWidth="0.6" /></>}
          {sport === 'squash' && <><Rect x="10" y="4" width="80" height="20" fill="#E5E7EB" stroke={INK} strokeWidth="0.8" /><Line x1="10" y1="20" x2="90" y2="20" stroke={palette.cherry} strokeWidth="1.2" /><Line x1="10" y1="12" x2="90" y2="12" stroke={INK} strokeWidth="0.6" /><Line x1="10" y1="60" x2="90" y2="60" stroke={INK} strokeWidth="0.8" /><Line x1="50" y1="60" x2="50" y2="96" stroke={INK} strokeWidth="0.8" /><Rect x="10" y="60" width="16" height="16" stroke={INK} strokeWidth="0.8" fill="none" /><Rect x="74" y="60" width="16" height="16" stroke={INK} strokeWidth="0.8" fill="none" /></>}
          {sport === 'basketball' && <><Rect x="3" y="3" width="94" height="94" stroke="#fff" strokeWidth="1" fill="none" /><Line x1="50" y1="3" x2="50" y2="97" stroke="#fff" strokeWidth="1" /><Circle cx="50" cy="50" r="10" stroke="#fff" strokeWidth="1" fill="none" /><Rect x="3" y="34" width="20" height="32" stroke="#fff" strokeWidth="1" fill="none" /><Rect x="77" y="34" width="20" height="32" stroke="#fff" strokeWidth="1" fill="none" /></>}
          {sport === 'volleyball' && <><Rect x="5" y="5" width="90" height="90" stroke="#fff" strokeWidth="1" fill="none" /><Line x1="50" y1="5" x2="50" y2="95" stroke={INK} strokeWidth="1.5" /><Line x1="35" y1="5" x2="35" y2="95" stroke="#fff" strokeWidth="0.8" strokeDasharray="3 2" /><Line x1="65" y1="5" x2="65" y2="95" stroke="#fff" strokeWidth="0.8" strokeDasharray="3 2" /></>}
          {sport === 'table-tennis' && <><Rect x="6" y="20" width="88" height="60" fill="#1F6FB8" stroke="#fff" strokeWidth="1" /><Line x1="50" y1="16" x2="50" y2="84" stroke="#fff" strokeWidth="1.5" /><Line x1="6" y1="50" x2="94" y2="50" stroke="#fff" strokeWidth="0.6" /></>}
          {sport === 'pool' && <>{[20, 40, 60, 80].map((y) => <Line key={y} x1="2" y1={String(y)} x2="98" y2={String(y)} stroke="#fff" strokeWidth="0.8" strokeDasharray="4 3" />)}<SvgText x="6" y="96" fontSize="5" fill="#fff">shallow 0.9 m</SvgText><SvgText x="70" y="96" fontSize="5" fill="#fff">deep 1.8 m</SvgText></>}
        </Svg>
        {markers.map((m, i) => (
          <Tactile key={i} disabled={!props.interactive} onPress={() => { setActive(m.label ?? null); onInteract(`marker:${m.label}`); }} accessibilityRole="button" accessibilityLabel={m.label ?? m.emoji ?? 'marker'} style={{ position: 'absolute', left: `${m.x}%`, top: `${m.y}%`, transform: [{ translateX: -20 }, { translateY: -20 }], alignItems: 'center' }}>
            <Text style={{ fontSize: 30 }}>{m.emoji ?? '📍'}</Text>
            {m.label && (!props.interactive || active === m.label) && <Text style={styles.sceneLabel}>{m.label}</Text>}
          </Tactile>
        ))}
      </View>
      {lines.length > 0 && (
        <View style={styles.row}>
          {lines.map((l) => (
            <Tactile key={l} onPress={() => { setActive(l); onInteract(`line:${l}`); }} accessibilityRole="button" accessibilityLabel={l}>
              <View style={[styles.pill, active === l && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{l}</AppText></View>
            </Tactile>
          ))}
        </View>
      )}
    </View>
  );
}

function Figure({ props, onInteract }: R) {
  const pose = str(props.pose, 'ready');
  const labels = arr<string>(props.labels);
  const [active, setActive] = useState<number | null>(null);
  // Stick figure: a few poses from (x,y) joints in a 100×140 box.
  const poses: Record<string, { head: [number, number]; body: [[number, number], [number, number]]; arms: [number, number][][]; legs: [number, number][][]; prop?: string }> = {
    ready: { head: [50, 18], body: [[50, 30], [50, 80]], arms: [[[50, 42], [28, 62]], [[50, 42], [72, 62]]], legs: [[[50, 80], [32, 125]], [[50, 80], [68, 125]]] },
    'batting-stance': { head: [46, 18], body: [[46, 30], [48, 80]], arms: [[[46, 42], [70, 60]], [[46, 42], [72, 66]]], legs: [[[48, 80], [30, 125]], [[48, 80], [66, 125]]], prop: '🏏' },
    'batting-grip': { head: [50, 18], body: [[50, 30], [50, 80]], arms: [[[50, 42], [60, 70]], [[50, 42], [62, 74]]], legs: [[[50, 80], [36, 125]], [[50, 80], [64, 125]]], prop: '🏏' },
    'football-pass': { head: [48, 18], body: [[48, 30], [50, 78]], arms: [[[48, 42], [26, 58]], [[48, 42], [70, 50]]], legs: [[[50, 78], [34, 124]], [[50, 78], [82, 104]]], prop: '⚽' },
    'football-foot': { head: [48, 18], body: [[48, 30], [50, 78]], arms: [[[48, 42], [26, 58]], [[48, 42], [70, 50]]], legs: [[[50, 78], [34, 124]], [[50, 78], [82, 104]]], prop: '⚽' },
    dribble: { head: [50, 18], body: [[50, 30], [50, 76]], arms: [[[50, 42], [78, 88]], [[50, 42], [24, 60]]], legs: [[[50, 76], [34, 122]], [[50, 76], [66, 122]]], prop: '🏀' },
    'volleyball-pass': { head: [50, 18], body: [[50, 30], [50, 78]], arms: [[[50, 44], [70, 66]], [[50, 44], [72, 64]]], legs: [[[50, 78], [30, 122]], [[50, 78], [70, 122]]], prop: '🏐' },
    'tt-grip': { head: [50, 18], body: [[50, 30], [50, 78]], arms: [[[50, 42], [78, 56]], [[50, 42], [28, 64]]], legs: [[[50, 78], [32, 124]], [[50, 78], [68, 124]]], prop: '🏓' },
    float: { head: [14, 60], body: [[26, 60], [76, 60]], arms: [[[36, 60], [36, 40]], [[36, 60], [36, 80]]], legs: [[[76, 60], [96, 54]], [[76, 60], [96, 66]]], prop: '💧' },
  };
  const p = poses[pose] ?? poses.ready!;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={200} height={280} viewBox="0 0 100 140">
        <Circle cx={p.head[0]} cy={p.head[1]} r={10} fill="#F5D0A9" stroke={INK} strokeWidth={2} />
        <Line x1={p.body[0][0]} y1={p.body[0][1]} x2={p.body[1][0]} y2={p.body[1][1]} stroke={palette.sky} strokeWidth={8} strokeLinecap="round" />
        {p.arms.map((a, i) => <Line key={`a${i}`} x1={a[0]![0]} y1={a[0]![1]} x2={a[1]![0]} y2={a[1]![1]} stroke="#F5D0A9" strokeWidth={5} strokeLinecap="round" />)}
        {p.legs.map((l, i) => <Line key={`l${i}`} x1={l[0]![0]} y1={l[0]![1]} x2={l[1]![0]} y2={l[1]![1]} stroke={INK} strokeWidth={6} strokeLinecap="round" />)}
        {p.prop && <SvgText x={p.arms[0]![1]![0] + 2} y={p.arms[0]![1]![1] + 8} fontSize={16}>{p.prop}</SvgText>}
      </Svg>
      <View style={styles.row}>
        {labels.map((l, i) => (
          <Tactile key={l} onPress={() => { setActive(i); onInteract(`label:${l}`); }} accessibilityRole="button" accessibilityLabel={l}>
            <View style={[styles.pill, active === i && { backgroundColor: palette.sunshine }]}><AppText variant="caption">{l}</AppText></View>
          </Tactile>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  wrapCol: { gap: 8, width: '100%' },
  counterGroup: { alignItems: 'center', gap: 4 },
  counterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  counter: { width: 52, height: 60, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  counterNum: { fontFamily: 'Fredoka_700Bold', fontSize: 14, color: INK },
  shapeCard: { alignItems: 'center', padding: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, width: 100 },
  pvBox: { alignItems: 'center', gap: 6, padding: 8 },
  bundle: { flexDirection: 'row', gap: 1, padding: 3, backgroundColor: '#FFF4CC', borderRadius: 6, borderWidth: 1, borderColor: INK, marginRight: 4 },
  stick: { width: 4, height: 36, backgroundColor: palette.sky, borderRadius: 2 },
  trick: { alignItems: 'center', gap: 6 },
  digit: { minWidth: 56, height: 56, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontFamily: 'Fredoka_700Bold', fontSize: 22, color: INK },
  sceneLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: INK, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 6, borderRadius: 8, textAlign: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 2, borderColor: INK },
  flowStep: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK },
  flowNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.grape, alignItems: 'center', justifyContent: 'center' },
  node: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  nodeLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: INK, textAlign: 'center', marginTop: 2 },
  labelCard: { width: 104, minHeight: 90, padding: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center', gap: 4 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceCard: { width: 140, padding: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 3, alignItems: 'center', gap: 6 },
  arrowBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 26 },
  letterCard: { width: 80, padding: 8, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', gap: 2 },
  letter: { fontFamily: 'Fredoka_700Bold', fontSize: 34, color: INK },
  patternCell: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  fingerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.cherry, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  fingerCard: { width: 52, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: INK },
});
