// Simple Physics Lab (ages 6–12): place ramps and bumpers so the ball lands
// in the cup. The engine tick animates the ball along the simulated path.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { Tactile, BigButton } from '../../ui';
import { Prompt, Scoreboard } from '../shared/Board';
import { LEVELS, countPieces, emptyGrid, simulate, type Level, type Piece, type Sim } from '../logic/physics';

type Tool = '/' | '\\' | 'o' | 'erase';
export interface State { levels: Level[]; level: number; grid: Piece[][]; tool: Tool; sim: Sim | null; frame: number; attempts: number; totalAttempts: number }
export type Action = { type: 'tap'; r: number; c: number } | { type: 'tool'; tool: Tool } | { type: 'play' } | { type: 'tick' } | { type: 'next' } | { type: 'reset' };

const def: GameDefinition<State, Action> = {
  id: 'physics-lab',
  init(ctx) {
    const levels = LEVELS[ctx.difficulty] ?? LEVELS.normal!;
    return { levels, level: 0, grid: emptyGrid(levels[0]!), tool: '/', sim: null, frame: 0, attempts: 0, totalAttempts: 0 };
  },
  reduce(state, action) {
    const level = state.levels[state.level];
    if (!level) return state;
    switch (action.type) {
      case 'tool': return { ...state, tool: action.tool };
      case 'reset': return { ...state, grid: emptyGrid(level), sim: null, frame: 0 };
      case 'tap': {
        if (state.sim) return state;
        const cur = state.grid[action.r]?.[action.c];
        if (cur === undefined || cur === '#') return state;
        const counts = countPieces(state.grid);
        let next: Piece = '';
        if (state.tool === 'erase' || cur === state.tool) next = '';
        else if (state.tool === 'o') { if (counts.bumpers >= level.bumpers && cur !== 'o') return state; next = 'o'; }
        else { if (counts.ramps >= level.ramps && cur !== '/' && cur !== '\\') return state; next = state.tool; }
        const grid = state.grid.map((row, r) => (r === action.r ? row.map((p, c) => (c === action.c ? next : p)) : row));
        return { ...state, grid };
      }
      case 'play': return state.sim ? state : { ...state, sim: simulate(level, state.grid), frame: 0, attempts: state.attempts + 1, totalAttempts: state.totalAttempts + 1 };
      case 'tick': {
        if (!state.sim) return state;
        if (state.frame < state.sim.path.length) return { ...state, frame: state.frame + 1 };
        // Animation finished: a miss returns to editing.
        return state.sim.outcome === 'cup' ? state : { ...state, sim: null, frame: 0 };
      }
      case 'next': {
        if (!state.sim || state.sim.outcome !== 'cup' || state.frame < state.sim.path.length) return state;
        const next = state.level + 1;
        return next >= state.levels.length ? { ...state, level: next } : { ...state, level: next, grid: emptyGrid(state.levels[next]!), sim: null, frame: 0, attempts: 0 };
      }
    }
  },
  status(state) {
    const done = state.level >= state.levels.length;
    const par = state.levels.reduce((n, l) => n + l.par, 0);
    return { phase: done ? 'won' : 'playing', score: Math.max(0, 300 - state.totalAttempts * 10), stars: done ? (state.totalAttempts <= par ? 3 : state.totalAttempts <= par * 2 ? 2 : 1) : 0, progress: state.level / state.levels.length, hud: `Level ${Math.min(state.level + 1, state.levels.length)} / ${state.levels.length}` };
  },
  tick: { intervalMs: 160, action: { type: 'tick' } },
  View: LabView,
  layout: 'full',
};

const TOOLS: { tool: Tool; emoji: string; label: string }[] = [
  { tool: '/', emoji: '↗️', label: 'Ramp right' },
  { tool: '\\', emoji: '↖️', label: 'Ramp left' },
  { tool: 'o', emoji: '🔘', label: 'Bumper' },
  { tool: 'erase', emoji: '🧽', label: 'Erase' },
];

function LabView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const level = state.levels[Math.min(state.level, state.levels.length - 1)]!;
  const cell = Math.min(52, Math.floor((width - 24) / level.cols));
  const counts = countPieces(state.grid);
  const ballAt = state.sim ? state.sim.path[Math.min(state.frame, state.sim.path.length - 1)] : null;
  const finished = !!state.sim && state.frame >= state.sim.path.length;
  const landed = finished && state.sim!.outcome === 'cup';
  const message = finished ? (landed ? 'In the cup! 🎉' : state.sim!.outcome === 'stuck' ? 'Stuck on a wall. Try again!' : 'Missed the cup. Try again!') : state.sim ? 'Rolling…' : `Place pieces, then press Play.`;
  React.useEffect(() => {
    if (!finished || readOnly) return;
    sfx(landed ? 'win' : 'bad');
    say(landed ? 'In the cup!' : 'Try again');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji="⚗️">{message}</Prompt>
      <Scoreboard items={[{ label: 'Ramps', value: `${level.ramps - counts.ramps} left` }, { label: 'Bumpers', value: `${level.bumpers - counts.bumpers} left` }, { label: 'Tries', value: state.attempts }]} />
      <RNView style={[styles.board, { width: cell * level.cols + 14 }]}>
        <RNView style={{ flexDirection: 'row' }}>
          {Array.from({ length: level.cols }, (_, c) => <RNView key={c} style={{ width: cell, height: 28, alignItems: 'center' }}>{c === level.start && !state.sim && <Text style={{ fontSize: 22 }}>⚪</Text>}</RNView>)}
        </RNView>
        {state.grid.map((row, r) => (
          <RNView key={r} style={{ flexDirection: 'row' }}>
            {row.map((p, c) => {
              const isBall = ballAt && ballAt[0] === r && ballAt[1] === c;
              return (
                <Tactile key={c} disabled={readOnly || !!state.sim || p === '#'} accessibilityRole="button" accessibilityLabel={`Cell row ${r + 1} column ${c + 1}: ${p === '#' ? 'wall' : p === '/' ? 'ramp right' : p === '\\' ? 'ramp left' : p === 'o' ? 'bumper' : 'empty'}`} onPress={() => { sfx('tap'); dispatch({ type: 'tap', r, c }); }} haptic={false}>
                  <RNView style={[styles.cell, { width: cell, height: cell, backgroundColor: p === '#' ? '#6B7280' : (r + c) % 2 ? '#EAF6FF' : '#F7FBFF' }]}>
                    {p === '/' && <RNView style={[styles.ramp, { width: cell * 0.9, transform: [{ rotate: '-35deg' }] }]} />}
                    {p === '\\' && <RNView style={[styles.ramp, { width: cell * 0.9, transform: [{ rotate: '35deg' }] }]} />}
                    {p === 'o' && <RNView style={[styles.bumper, { width: cell * 0.6, height: cell * 0.6, borderRadius: cell * 0.3 }]} />}
                    {isBall && <Text style={{ position: 'absolute', fontSize: cell * 0.6 }}>⚪</Text>}
                  </RNView>
                </Tactile>
              );
            })}
          </RNView>
        ))}
        <RNView style={{ flexDirection: 'row' }}>
          {Array.from({ length: level.cols }, (_, c) => (
            <RNView key={c} style={{ width: cell, height: 36, alignItems: 'center', justifyContent: 'flex-end' }}>
              {c === level.cup && <Text style={{ fontSize: 26 }}>{landed ? '🏆' : '🥤'}</Text>}
              {ballAt && ballAt[0] >= level.rows && ballAt[1] === c && !landed && <Text style={{ position: 'absolute', fontSize: 22 }}>⚪</Text>}
            </RNView>
          ))}
        </RNView>
      </RNView>
      <RNView style={styles.tools}>
        {TOOLS.map((t) => (
          <Tactile key={t.tool} disabled={readOnly || !!state.sim} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: state.tool === t.tool }} onPress={() => dispatch({ type: 'tool', tool: t.tool })}>
            <RNView style={[styles.toolBtn, state.tool === t.tool && styles.toolOn]}>
              <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
              <Text style={styles.toolLabel}>{t.label}</Text>
            </RNView>
          </Tactile>
        ))}
      </RNView>
      {!readOnly && (
        <RNView style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          {landed ? (
            <BigButton label={state.level + 1 >= state.levels.length ? 'Finish' : 'Next level'} emoji="➡️" color="#7ED957" onPress={() => dispatch({ type: 'next' })} />
          ) : (
            <>
              <BigButton label="Play" emoji="▶️" color="#4FB3FF" disabled={!!state.sim} onPress={() => { sfx('pop'); dispatch({ type: 'play' }); }} />
              <BigButton label="Clear" emoji="🧹" size="md" color="#FFB347" disabled={!!state.sim} onPress={() => dispatch({ type: 'reset' })} />
            </>
          )}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 16, padding: 4, borderWidth: 3, borderColor: '#BFE3FF' },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#DCEBF7' },
  ramp: { height: 8, backgroundColor: '#FF7A59', borderRadius: 4 },
  bumper: { backgroundColor: '#9B6BFF', borderWidth: 3, borderColor: '#6B46C1' },
  tools: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  toolBtn: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 3, borderColor: '#E9E2F5', minWidth: 76 },
  toolOn: { borderColor: '#2E2A4A', backgroundColor: '#FFF4CC' },
  toolLabel: { fontFamily: 'Fredoka_600SemiBold', fontSize: 11, color: '#2E2A4A' },
});

export default def;
