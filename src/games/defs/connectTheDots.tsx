// Connect the Dots: tap the numbers in order; the picture appears.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, pick } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

// Outlines in a 0–100 square. Dots are sampled along them.
const PICTURES: { name: string; emoji: string; path: [number, number][] }[] = [
  { name: 'star', emoji: '⭐', path: [[50, 5], [61, 38], [95, 38], [68, 59], [79, 92], [50, 72], [21, 92], [32, 59], [5, 38], [39, 38]] },
  { name: 'house', emoji: '🏠', path: [[50, 8], [92, 42], [80, 42], [80, 92], [20, 92], [20, 42], [8, 42]] },
  { name: 'fish', emoji: '🐟', path: [[10, 50], [35, 25], [65, 25], [85, 45], [95, 30], [95, 70], [85, 55], [65, 75], [35, 75]] },
  { name: 'heart', emoji: '❤️', path: [[50, 90], [12, 50], [12, 28], [28, 14], [50, 30], [72, 14], [88, 28], [88, 50]] },
  { name: 'boat', emoji: '⛵', path: [[50, 8], [50, 60], [85, 60], [75, 85], [25, 85], [15, 60], [50, 60], [20, 55]] },
  { name: 'rocket', emoji: '🚀', path: [[50, 5], [68, 30], [68, 70], [85, 90], [60, 80], [40, 80], [15, 90], [32, 70], [32, 30]] },
];
const DOTS: Record<string, number> = { easy: 10, normal: 20, hard: 30 };

export interface State { picture: number; dots: [number, number][]; next: number; wrong: number }
export type Action = { type: 'tap'; index: number };

function resample(path: [number, number][], n: number): [number, number][] {
  const closed = [...path, path[0]!];
  const segs = closed.slice(1).map((p, i) => Math.hypot(p[0] - closed[i]![0], p[1] - closed[i]![1]));
  const total = segs.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / n;
    let i = 0;
    while (i < segs.length && d > segs[i]!) {
      d -= segs[i]!;
      i++;
    }
    const a = closed[i]!;
    const b = closed[Math.min(i + 1, closed.length - 1)]!;
    const f = segs[i] ? d / segs[i]! : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

const def: GameDefinition<State, Action> = {
  id: 'connect-the-dots',
  init(ctx) {
    const random = rng(ctx.seed);
    const picture = PICTURES.indexOf(pick(PICTURES, random));
    return { picture, dots: resample(PICTURES[picture]!.path, DOTS[ctx.difficulty] ?? 20), next: 0, wrong: 0 };
  },
  reduce(state, action) {
    if (action.type !== 'tap') return state;
    if (action.index === state.next) return { ...state, next: state.next + 1 };
    return { ...state, wrong: state.wrong + 1 };
  },
  status(state) {
    const done = state.next >= state.dots.length;
    return { phase: done ? 'won' : 'playing', score: state.dots.length * 5 - state.wrong, stars: state.wrong === 0 ? 3 : state.wrong < 4 ? 2 : 1, progress: state.next / state.dots.length, hud: `Next: ${Math.min(state.next + 1, state.dots.length)}` };
  },
  View: DotsView,
};

function DotsView({ state, dispatch, width, readOnly, say, sfx }: GameViewProps<State, Action>) {
  const size = Math.min(width, 520);
  const pic = PICTURES[state.picture]!;
  const done = state.next >= state.dots.length;
  const drawn = state.dots.slice(0, state.next);
  const points = (done ? [...state.dots, state.dots[0]!] : drawn).map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="✏️">{done ? `It's a ${pic.name}! ${pic.emoji}` : `Tap dot number ${state.next + 1}`}</Prompt>
      <RNView style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Polyline points={points} fill={done ? '#FFE3EC' : 'none'} stroke="#FF6B9D" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          {state.dots.map(([x, y], i) => {
            const isNext = i === state.next;
            return (
              <React.Fragment key={i}>
                <Circle cx={x} cy={y} r={isNext ? 4.6 : 3.4} fill={i < state.next ? '#7ED957' : isNext ? '#FFC93C' : '#fff'} stroke="#2E2A4A" strokeWidth="0.8" />
                <SvgText x={x} y={y + 1.6} fontSize="4" textAnchor="middle" fill="#2E2A4A" fontWeight="bold">{String(i + 1)}</SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
        {!readOnly && state.dots.map(([x, y], i) => (
          <Tactile key={i} onPress={() => { const ok = i === state.next; sfx(ok ? 'pop' : 'bad'); if (ok) say(String(i + 1)); dispatch({ type: 'tap', index: i }); }} accessibilityRole="button" accessibilityLabel={`Dot ${i + 1}`} haptic={false} style={[styles.hit, { left: (x / 100) * size - 20, top: (y / 100) * size - 20 }]} />
        ))}
      </RNView>
      {done && <Text style={styles.big}>{pic.emoji}</Text>}
    </RNView>
  );
}

const styles = StyleSheet.create({ hit: { position: 'absolute', width: 40, height: 40, borderRadius: 20 }, big: { fontSize: 56, marginTop: 8 } });

export default def;
