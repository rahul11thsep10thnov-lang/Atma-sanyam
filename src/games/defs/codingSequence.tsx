// Coding Sequence Puzzle: build a program of arrows (and a repeat block) to
// walk the robot to the star. Programs run step by step so the child sees
// each command execute.
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, pick } from '../engine';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';

type Cmd = 'F' | 'L' | 'R' | 'REP2' | 'REP3';
interface Level { grid: string[]; start: [number, number]; dir: number; star: [number, number]; max: number }
// . floor, # wall. dir: 0 up,1 right,2 down,3 left
const LEVELS: Record<string, Level[]> = {
  easy: [
    { grid: ['.....', '.....', '.....'], start: [0, 1], dir: 1, star: [3, 1], max: 4 },
    { grid: ['.....', '..#..', '.....'], start: [0, 2], dir: 1, star: [4, 2], max: 5 },
  ],
  normal: [
    { grid: ['.....', '.###.', '.....', '.....'], start: [0, 0], dir: 1, star: [4, 2], max: 8 },
    { grid: ['..#..', '..#..', '.....', '..#..'], start: [0, 2], dir: 1, star: [4, 0], max: 8 },
  ],
  hard: [
    { grid: ['......', '.####.', '......', '.####.', '......'], start: [0, 0], dir: 1, star: [5, 4], max: 9 },
    { grid: ['......', '......', '......'], start: [0, 0], dir: 1, star: [5, 2], max: 6 },
  ],
};
const MAX_STEPS = 60;

export interface State { level: Level; program: Cmd[]; running: boolean; pc: number; x: number; y: number; dir: number; crashed: boolean; attempts: number; trace: Cmd[]; tracePos: number }
export type Action = { type: 'add'; cmd: Cmd } | { type: 'remove' } | { type: 'clear' } | { type: 'run' } | { type: 'step' } | { type: 'reset' };

function expand(program: Cmd[]): Cmd[] {
  const out: Cmd[] = [];
  for (let i = 0; i < program.length; i++) {
    const c = program[i]!;
    if (c === 'REP2' || c === 'REP3') {
      const n = c === 'REP2' ? 2 : 3;
      const next = program[i + 1];
      if (next && next !== 'REP2' && next !== 'REP3') {
        for (let k = 0; k < n; k++) out.push(next);
        i++;
      }
    } else out.push(c);
  }
  return out.slice(0, MAX_STEPS);
}

const def: GameDefinition<State, Action> = {
  id: 'coding-sequence',
  layout: 'full',
  init(ctx) {
    const level = pick(LEVELS[ctx.difficulty] ?? LEVELS.normal!, rng(ctx.seed));
    return { level, program: [], running: false, pc: 0, x: level.start[0], y: level.start[1], dir: level.dir, crashed: false, attempts: 0, trace: [], tracePos: 0 };
  },
  reduce(state, action) {
    const l = state.level;
    switch (action.type) {
      case 'add':
        return state.running || state.program.length >= l.max ? state : { ...state, program: [...state.program, action.cmd] };
      case 'remove':
        return state.running ? state : { ...state, program: state.program.slice(0, -1) };
      case 'clear':
        return { ...state, program: [], running: false, x: l.start[0], y: l.start[1], dir: l.dir, crashed: false, trace: [], tracePos: 0 };
      case 'reset':
        return { ...state, running: false, x: l.start[0], y: l.start[1], dir: l.dir, crashed: false, trace: [], tracePos: 0 };
      case 'run':
        return state.running ? state : { ...state, running: true, x: l.start[0], y: l.start[1], dir: l.dir, crashed: false, trace: expand(state.program), tracePos: 0, attempts: state.attempts + 1 };
      case 'step': {
        if (!state.running) return state;
        const cmd = state.trace[state.tracePos];
        if (!cmd) return { ...state, running: false };
        let { x, y, dir } = state;
        if (cmd === 'L') dir = (dir + 3) % 4;
        else if (cmd === 'R') dir = (dir + 1) % 4;
        else if (cmd === 'F') {
          const nx = x + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
          const ny = y + (dir === 2 ? 1 : dir === 0 ? -1 : 0);
          const row = l.grid[ny];
          if (!row || row[nx] === undefined || row[nx] === '#') return { ...state, running: false, crashed: true };
          x = nx;
          y = ny;
        }
        const won = x === l.star[0] && y === l.star[1];
        return { ...state, x, y, dir, tracePos: state.tracePos + 1, running: !won };
      }
    }
  },
  status(state) {
    const won = state.x === state.level.star[0] && state.y === state.level.star[1];
    return { phase: won ? 'won' : 'playing', score: Math.max(10, 50 - (state.attempts - 1) * 10), stars: state.attempts <= 1 ? 3 : state.attempts <= 3 ? 2 : 1, hud: `${state.program.length}/${state.level.max} blocks` };
  },
  View: CodingView,
};

const ICON: Record<Cmd, string> = { F: '⬆️', L: '↩️', R: '↪️', REP2: '🔁2', REP3: '🔁3' };
const DIR_EMOJI = ['⬆️', '➡️', '⬇️', '⬅️'];

function CodingView({ state, dispatch, width, readOnly, sfx, ctx }: GameViewProps<State, Action>) {
  const l = state.level;
  const cols = l.grid[0]!.length, rows = l.grid.length;
  const cell = Math.min((width - 24) / cols, 70);
  useEffect(() => {
    if (!state.running || readOnly) return;
    const id = setTimeout(() => dispatch({ type: 'step' }), 450);
    return () => clearTimeout(id);
  }, [state.running, state.tracePos, dispatch, readOnly]);
  useEffect(() => {
    if (state.crashed) sfx('bad');
  }, [state.crashed, sfx]);
  const allowLoops = ctx.difficulty === 'hard';
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="🤖">Program the robot to reach the ⭐</Prompt>
      <RNView style={[styles.grid, { width: cell * cols + 6, height: cell * rows + 6 }]}>
        {l.grid.map((row, y) => row.split('').map((ch, x) => (
          <RNView key={`${x}-${y}`} style={[styles.cell, { width: cell, height: cell, backgroundColor: ch === '#' ? '#2E2A4A' : (x + y) % 2 ? '#F3EEF9' : '#fff' }]}>
            {l.star[0] === x && l.star[1] === y && <Text style={{ fontSize: cell * 0.5 }}>⭐</Text>}
          </RNView>
        )))}
        <RNView style={{ position: 'absolute', left: state.x * cell, top: state.y * cell, width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: cell * 0.6 }}>{state.crashed ? '💥' : '🤖'}</Text>
          <Text style={{ position: 'absolute', bottom: 2, right: 2, fontSize: cell * 0.22 }}>{DIR_EMOJI[state.dir]}</Text>
        </RNView>
      </RNView>
      <RNView style={styles.program}>
        {state.program.length === 0 ? <Text style={styles.hint}>Your program is empty. Add blocks below.</Text> : state.program.map((c, i) => (
          <Text key={i} style={[styles.block, i === state.tracePos && state.running && styles.blockActive]}>{ICON[c]}</Text>
        ))}
      </RNView>
      {!readOnly && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
            {(['F', 'L', 'R', ...(allowLoops ? ['REP2', 'REP3'] : [])] as Cmd[]).map((c) => (
              <Tactile key={c} onPress={() => { sfx('tap'); dispatch({ type: 'add', cmd: c }); }} accessibilityRole="button" accessibilityLabel={c === 'F' ? 'Forward' : c === 'L' ? 'Turn left' : c === 'R' ? 'Turn right' : `Repeat ${c.slice(3)}`}>
                <RNView style={styles.key}><Text style={{ fontSize: 24 }}>{ICON[c]}</Text><Text style={styles.keyLabel}>{c === 'F' ? 'Forward' : c === 'L' ? 'Left' : c === 'R' ? 'Right' : `Repeat ×${c.slice(3)}`}</Text></RNView>
              </Tactile>
            ))}
          </ScrollView>
          <RNView style={styles.actions}>
            <Tactile onPress={() => dispatch({ type: 'remove' })} accessibilityRole="button" accessibilityLabel="Remove last"><Text style={styles.action}>⌫</Text></Tactile>
            <Tactile onPress={() => dispatch({ type: 'clear' })} accessibilityRole="button" accessibilityLabel="Clear"><Text style={styles.action}>🧽</Text></Tactile>
            <Tactile onPress={() => { sfx('pop'); dispatch(state.crashed ? { type: 'reset' } : { type: 'run' }); }} disabled={state.running || state.program.length === 0} accessibilityRole="button" accessibilityLabel="Run program"><Text style={[styles.action, { backgroundColor: '#7ED957', paddingHorizontal: 28 }]}>{state.crashed ? '🔄 Reset' : '▶️ Run'}</Text></Tactile>
          </RNView>
        </>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: '#2E2A4A' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  program: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 52, backgroundColor: '#fff', borderRadius: 16, padding: 8, marginTop: 10, width: '96%', borderWidth: 2, borderColor: '#F0E4EE', alignItems: 'center' },
  hint: { fontFamily: 'Nunito_600SemiBold', color: '#9A96B8' },
  block: { fontSize: 22, backgroundColor: '#DDEEFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  blockActive: { backgroundColor: '#FFC93C' },
  palette: { gap: 8, padding: 8 },
  key: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', borderWidth: 2, borderColor: '#4FB3FF' },
  keyLabel: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#2E2A4A' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  action: { fontFamily: 'Fredoka_600SemiBold', fontSize: 20, backgroundColor: '#FFC93C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, color: '#2E2A4A', overflow: 'hidden' },
});

export default def;
