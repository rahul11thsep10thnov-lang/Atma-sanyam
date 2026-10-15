// Bubble Shooter on a hex-ish grid: tap where to shoot; the bubble flies in a
// straight line (with wall bounces) and sticks; groups of 3+ pop; floating
// bubbles fall. Rows push down every few shots.
import React, { useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { usePointer } from '../shared/drag';
import { Prompt } from '../shared/Board';

const COLS = 9;
const ROWS = 12;
const COLORS = ['#FF5F6D', '#FFC93C', '#7ED957', '#4FB3FF', '#9B6BFF', '#FF6B9D'];
const LEVEL: Record<string, { kinds: number; rows: number; pushEvery: number }> = { easy: { kinds: 3, rows: 4, pushEvery: 8 }, normal: { kinds: 4, rows: 5, pushEvery: 6 }, hard: { kinds: 5, rows: 6, pushEvery: 5 } };

export interface State { grid: number[]; current: number; next: number; shots: number; score: number; seed: number; kinds: number; pushEvery: number; lost: boolean; lastPop: number }
export type Action = { type: 'shoot'; angle: number };

const idx = (r: number, c: number) => r * COLS + c;
function neighbours(r: number, c: number): [number, number][] {
  const odd = r % 2 === 1;
  const list: [number, number][] = [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c], odd ? [r - 1, c + 1] : [r - 1, c - 1], odd ? [r + 1, c + 1] : [r + 1, c - 1]];
  return list.filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS);
}

function cluster(grid: number[], r: number, c: number, sameColour: boolean): number[] {
  const kind = grid[idx(r, c)];
  const seen = new Set<number>();
  const stack = [idx(r, c)];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen.has(i)) continue;
    const v = grid[i];
    if (!v || (sameColour && v !== kind)) continue;
    seen.add(i);
    for (const [nr, nc] of neighbours(Math.floor(i / COLS), i % COLS)) stack.push(idx(nr, nc));
  }
  return [...seen];
}

function dropFloating(grid: number[]): { grid: number[]; dropped: number } {
  const attached = new Set<number>();
  for (let c = 0; c < COLS; c++) if (grid[c]) for (const i of cluster(grid, 0, c, false)) attached.add(i);
  const g = grid.slice();
  let dropped = 0;
  for (let i = 0; i < g.length; i++) if (g[i] && !attached.has(i)) {
    g[i] = 0;
    dropped++;
  }
  return { grid: g, dropped };
}

/** Flies a bubble from the bottom centre at `angle` (radians from vertical) and returns the landing cell. */
function land(grid: number[], angle: number, cell: number): { r: number; c: number } | null {
  const W = COLS * cell;
  let x = W / 2, y = ROWS * cell + cell / 2;
  let vx = Math.sin(angle) * 4, vy = -Math.cos(angle) * 4;
  for (let step = 0; step < 2000; step++) {
    x += vx;
    y += vy;
    if (x < cell / 2 || x > W - cell / 2) {
      vx = -vx;
      x = Math.max(cell / 2, Math.min(W - cell / 2, x));
    }
    const r = Math.max(0, Math.round((y - cell / 2) / cell));
    const c = Math.max(0, Math.min(COLS - 1, Math.round((x - (r % 2 ? cell : cell / 2)) / cell)));
    if (r >= ROWS) return null;
    const hit = r === 0 || neighbours(r, c).some(([nr, nc]) => grid[idx(nr, nc)]);
    if (hit) {
      if (!grid[idx(r, c)]) return { r, c };
      // occupied: back off a step
      const br = Math.max(0, Math.round((y - vy - cell / 2) / cell));
      const bc = Math.max(0, Math.min(COLS - 1, Math.round((x - vx - (br % 2 ? cell : cell / 2)) / cell)));
      if (!grid[idx(br, bc)] && br < ROWS) return { r: br, c: bc };
      for (const [nr, nc] of neighbours(r, c)) if (!grid[idx(nr, nc)] && nr > r) return { r: nr, c: nc };
      return null;
    }
  }
  return null;
}

const def: GameDefinition<State, Action> = {
  id: 'bubble-shooter',
  init(ctx) {
    const lvl = LEVEL[ctx.difficulty] ?? LEVEL.normal!;
    const random = rng(ctx.seed);
    const grid = new Array(ROWS * COLS).fill(0);
    for (let r = 0; r < lvl.rows; r++) for (let c = 0; c < COLS - (r % 2); c++) grid[idx(r, c)] = 1 + Math.floor(random() * lvl.kinds);
    return { grid, current: 1 + Math.floor(random() * lvl.kinds), next: 1 + Math.floor(random() * lvl.kinds), shots: 0, score: 0, seed: ctx.seed, kinds: lvl.kinds, pushEvery: lvl.pushEvery, lost: false, lastPop: 0 };
  },
  reduce(state, action) {
    if (state.lost) return state;
    const random = rng(state.seed + state.shots + 1);
    const spot = land(state.grid, action.angle, 30);
    let grid = state.grid.slice();
    let gained = 0;
    let lastPop = 0;
    if (spot) {
      grid[idx(spot.r, spot.c)] = state.current;
      const group = cluster(grid, spot.r, spot.c, true);
      if (group.length >= 3) {
        for (const i of group) grid[i] = 0;
        const d = dropFloating(grid);
        grid = d.grid;
        lastPop = group.length + d.dropped;
        gained = group.length * 10 + d.dropped * 20;
      }
    }
    const shots = state.shots + 1;
    if (shots % state.pushEvery === 0) {
      const pushed = new Array(ROWS * COLS).fill(0);
      for (let r = ROWS - 1; r >= 1; r--) for (let c = 0; c < COLS; c++) pushed[idx(r, c)] = grid[idx(r - 1, c)]!;
      for (let c = 0; c < COLS - 1; c++) pushed[c] = 1 + Math.floor(random() * state.kinds);
      grid = pushed;
    }
    const lost = [...Array(COLS).keys()].some((c) => grid[idx(ROWS - 1, c)]);
    return { ...state, grid, shots, score: state.score + gained, current: state.next, next: 1 + Math.floor(random() * state.kinds), lost, lastPop };
  },
  status(state) {
    const left = state.grid.filter(Boolean).length;
    return { phase: state.lost ? 'lost' : left === 0 ? 'won' : 'playing', score: state.score, stars: state.shots <= 25 ? 3 : state.shots <= 40 ? 2 : 1, hud: `${left} bubbles` };
  },
  View: BubbleView,
};

function BubbleView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const cell = Math.min(width / COLS, (height - 110) / (ROWS + 1.5));
  const W = cell * COLS, H = cell * (ROWS + 1.5);
  const [aim, setAim] = useState<number | null>(null);
  const angleFor = (x: number, y: number) => Math.max(-1.25, Math.min(1.25, Math.atan2(x - W / 2, Math.max(1, ROWS * cell + cell / 2 - y))));
  const pointer = usePointer({ disabled: readOnly || state.lost, onDown: (x, y) => setAim(angleFor(x, y)), onMove: (x, y) => setAim(angleFor(x, y)), onUp: (x, y) => { setAim(null); sfx('pop'); dispatch({ type: 'shoot', angle: angleFor(x, y) }); } });
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji="🫧">Tap or drag to aim, release to shoot. Match 3!</Prompt>
      <RNView {...pointer} style={[styles.board, { width: W, height: H }]}>
        {state.grid.map((v, i) => {
          if (!v) return null;
          const r = Math.floor(i / COLS), c = i % COLS;
          return <RNView key={i} style={{ position: 'absolute', left: c * cell + (r % 2 ? cell / 2 : 0), top: r * cell, width: cell - 2, height: cell - 2, borderRadius: cell / 2, backgroundColor: COLORS[v - 1], borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }} />;
        })}
        {aim !== null && <RNView style={{ position: 'absolute', left: W / 2 - 1, bottom: cell, width: 2, height: H * 0.6, backgroundColor: 'rgba(46,42,74,0.35)', transform: [{ translateY: H * 0.3 }, { rotate: `${-aim}rad` }, { translateY: -H * 0.3 }] }} />}
        <RNView style={{ position: 'absolute', left: W / 2 - cell / 2, bottom: cell * 0.5, width: cell, height: cell, borderRadius: cell / 2, backgroundColor: COLORS[state.current - 1], borderWidth: 3, borderColor: '#2E2A4A' }} />
        <RNView style={{ position: 'absolute', right: 8, bottom: cell * 0.6, width: cell * 0.6, height: cell * 0.6, borderRadius: cell, backgroundColor: COLORS[state.next - 1], opacity: 0.8 }} />
        <RNView style={{ position: 'absolute', left: 0, right: 0, top: ROWS * cell - 2, height: 2, backgroundColor: '#E5484D', opacity: 0.5 }} />
      </RNView>
      {state.lastPop > 0 && <Text style={styles.pop}>+{state.lastPop} popped! 🎉</Text>}
    </RNView>
  );
}

const styles = StyleSheet.create({ board: { backgroundColor: '#1E1B3A', borderRadius: 16, overflow: 'hidden' }, pop: { marginTop: 6, fontFamily: 'Fredoka_600SemiBold', color: '#2E2A4A' } });

export default def;
