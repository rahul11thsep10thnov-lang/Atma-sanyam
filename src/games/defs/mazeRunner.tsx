// Maze Runner: swipe or use arrows to reach the flag.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, starsForMoves } from '../engine';
import { canMove, generateMaze, shortestPath, step, type Maze, N, E, S, W } from '../logic/maze';
import { RoundButton } from '../../ui';
import { usePointer } from '../shared/drag';
import { palette } from '../../theme/palette';

const SIZES: Record<string, [number, number]> = { easy: [5, 5], normal: [8, 8], hard: [11, 11], expert: [15, 15] };
export interface State { maze: Maze; x: number; y: number; moves: number; par: number; trail: number[] }
export type Action = { type: 'move'; dir: 'up' | 'down' | 'left' | 'right' };

const def: GameDefinition<State, Action> = {
  id: 'maze-runner',
  init(ctx) {
    const [c, r] = SIZES[ctx.difficulty] ?? [8, 8];
    const maze = generateMaze(c, r, rng(ctx.seed));
    return { maze, x: 0, y: 0, moves: 0, par: shortestPath(maze, 0, 0, c - 1, r - 1), trail: [0] };
  },
  reduce(state, action) {
    if (!canMove(state.maze, state.x, state.y, action.dir)) return state;
    const [x, y] = step(state.x, state.y, action.dir);
    return { ...state, x, y, moves: state.moves + 1, trail: [...state.trail, y * state.maze.cols + x].slice(-400) };
  },
  status(state) {
    const done = state.x === state.maze.cols - 1 && state.y === state.maze.rows - 1;
    return { phase: done ? 'won' : 'playing', score: Math.max(10, state.par * 10 - (state.moves - state.par) * 2), stars: starsForMoves(state.moves, state.par), hud: `Moves ${state.moves}` };
  },
  View: MazeView,
};

function MazeView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const { maze } = state;
  const boardH = height - 120;
  const cell = Math.floor(Math.min(width / maze.cols, boardH / maze.rows));
  const w = cell * maze.cols;
  const h = cell * maze.rows;
  const move = (dir: Action['dir']) => {
    if (readOnly) return;
    sfx(canMove(maze, state.x, state.y, dir) ? 'tap' : 'bad');
    dispatch({ type: 'move', dir });
  };
  const pointer = usePointer({ disabled: readOnly, onUp: (_x, _y, dx, dy) => { if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return; move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'); } });
  const lines: React.ReactNode[] = [];
  for (let y = 0; y < maze.rows; y++) for (let x = 0; x < maze.cols; x++) {
    const wl = maze.walls[y * maze.cols + x]!;
    const X = x * cell, Y = y * cell;
    if (wl & N) lines.push(<Line key={`n${x}-${y}`} x1={X} y1={Y} x2={X + cell} y2={Y} />);
    if (wl & W) lines.push(<Line key={`w${x}-${y}`} x1={X} y1={Y} x2={X} y2={Y + cell} />);
    if (wl & S) lines.push(<Line key={`s${x}-${y}`} x1={X} y1={Y + cell} x2={X + cell} y2={Y + cell} />);
    if (wl & E) lines.push(<Line key={`e${x}-${y}`} x1={X + cell} y1={Y} x2={X + cell} y2={Y + cell} />);
  }
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }} {...pointer}>
      <RNView style={[styles.board, { width: w, height: h }]}>
        <Svg width={w} height={h}>
          {state.trail.map((c, i) => <Rect key={i} x={(c % maze.cols) * cell + cell * 0.3} y={Math.floor(c / maze.cols) * cell + cell * 0.3} width={cell * 0.4} height={cell * 0.4} rx={cell * 0.2} fill="#FFE3EC" />)}
          <Rect x={(maze.cols - 1) * cell + 2} y={(maze.rows - 1) * cell + 2} width={cell - 4} height={cell - 4} fill="#E6F8DA" rx={6} />
          {React.Children.map(lines, (l) => React.cloneElement(l as React.ReactElement<{ stroke: string }>, { stroke: '#2E2A4A', strokeWidth: 3, strokeLinecap: 'round' } as never))}
        </Svg>
        <Text style={[styles.sprite, { left: (maze.cols - 1) * cell, top: (maze.rows - 1) * cell, width: cell, height: cell, fontSize: cell * 0.6, lineHeight: cell }]}>🚩</Text>
        <Text style={[styles.sprite, { left: state.x * cell, top: state.y * cell, width: cell, height: cell, fontSize: cell * 0.62, lineHeight: cell }]}>🏃</Text>
      </RNView>
      {!readOnly && (
        <RNView style={styles.pad}>
          <RoundButton icon="arrowUp" label="Up" onPress={() => move('up')} color={palette.sky} size={52} />
          <RNView style={{ flexDirection: 'row', gap: 44 }}>
            <RoundButton icon="arrowLeft" label="Left" onPress={() => move('left')} color={palette.sky} size={52} />
            <RoundButton icon="arrowRight" label="Right" onPress={() => move('right')} color={palette.sky} size={52} />
          </RNView>
          <RoundButton icon="arrowDown" label="Down" onPress={() => move('down')} color={palette.sky} size={52} />
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  sprite: { position: 'absolute', textAlign: 'center' },
  pad: { alignItems: 'center', gap: 2, marginTop: 6 },
});

export default def;
