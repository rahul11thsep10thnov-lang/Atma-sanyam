// Tangram: fit the seven pieces into the outline. Pieces drag on a 0–100
// board; a piece snaps when its position and rotation are close to the
// target. Tap a piece to rotate it 45°.
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, pick } from '../engine';
import { useDrag } from '../shared/drag';
import { Tactile } from '../../ui';
import { rainbow } from '../../theme/palette';
import { Prompt } from '../shared/Board';

// Classic set in a 100 unit square (points relative to each piece's own origin).
const PIECES: { id: string; points: [number, number][]; name: string }[] = [
  { id: 'bigA', name: 'big triangle', points: [[0, 0], [100, 0], [50, 50]] },
  { id: 'bigB', name: 'big triangle', points: [[0, 0], [50, 50], [0, 100]] },
  { id: 'mid', name: 'medium triangle', points: [[0, 0], [50, 0], [0, 50]] },
  { id: 'smallA', name: 'small triangle', points: [[0, 0], [50, 0], [25, 25]] },
  { id: 'smallB', name: 'small triangle', points: [[0, 0], [25, 25], [0, 50]] },
  { id: 'square', name: 'square', points: [[0, 0], [25, 25], [0, 50], [-25, 25]] },
  { id: 'para', name: 'parallelogram', points: [[0, 0], [50, 0], [75, 25], [25, 25]] },
];

// Puzzles: target placement (x, y, rotation) of each piece in board units.
const PUZZLES: { name: string; emoji: string; targets: Record<string, { x: number; y: number; r: number }> }[] = [
  { name: 'square', emoji: '🟧', targets: { bigA: { x: 0, y: 0, r: 0 }, bigB: { x: 0, y: 0, r: 0 }, mid: { x: 100, y: 100, r: 180 }, smallA: { x: 50, y: 50, r: 0 }, smallB: { x: 100, y: 50, r: 90 }, square: { x: 75, y: 25, r: 0 }, para: { x: 50, y: 100, r: -90 } } },
  { name: 'house', emoji: '🏠', targets: { bigA: { x: 0, y: 40, r: 0 }, bigB: { x: 100, y: 40, r: 180 }, mid: { x: 50, y: 40, r: -135 }, smallA: { x: 50, y: 90, r: 0 }, smallB: { x: 50, y: 90, r: 0 }, square: { x: 50, y: 65, r: 0 }, para: { x: 0, y: 140, r: 0 } } },
  { name: 'arrow', emoji: '➡️', targets: { bigA: { x: 50, y: 0, r: 0 }, bigB: { x: 150, y: 0, r: 90 }, mid: { x: 0, y: 50, r: 0 }, smallA: { x: 50, y: 100, r: 0 }, smallB: { x: 50, y: 100, r: 0 }, square: { x: 25, y: 75, r: 0 }, para: { x: 100, y: 100, r: 0 } } },
];

interface Placed { id: string; x: number; y: number; r: number; locked: boolean }
export interface State { puzzle: number; pieces: Placed[]; moves: number }
export type Action = { type: 'move'; id: string; x: number; y: number } | { type: 'rotate'; id: string };

const SNAP = 14;

function rot(p: [number, number], deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
}

const def: GameDefinition<State, Action> = {
  id: 'tangram',
  layout: 'full',
  init(ctx) {
    const random = rng(ctx.seed);
    const puzzle = PUZZLES.indexOf(pick(PUZZLES, random));
    const order = shuffle(PIECES, random);
    return { puzzle, moves: 0, pieces: order.map((p, i) => ({ id: p.id, x: 20 + (i % 4) * 50, y: 160 + Math.floor(i / 4) * 55, r: ctx.difficulty === 'easy' ? PUZZLES[puzzle]!.targets[p.id]!.r : [0, 45, 90, 135, 180, 225, 270, 315][Math.floor(random() * 8)]!, locked: false })) };
  },
  reduce(state, action) {
    const targets = PUZZLES[state.puzzle]!.targets;
    if (action.type === 'rotate') {
      return { ...state, pieces: state.pieces.map((p) => (p.id === action.id && !p.locked ? { ...p, r: (p.r + 45) % 360 } : p)) };
    }
    return {
      ...state,
      moves: state.moves + 1,
      pieces: state.pieces.map((p) => {
        if (p.id !== action.id || p.locked) return p;
        const t = targets[p.id]!;
        const rotOk = ((p.r - t.r) % 360 + 360) % 360 === 0 || (p.id.startsWith('big') || p.id === 'mid' || p.id.startsWith('small') ? false : ((p.r - t.r) % 180 + 180) % 180 === 0);
        const near = Math.hypot(action.x - t.x, action.y - t.y) < SNAP;
        if (near && rotOk) return { ...p, x: t.x, y: t.y, r: t.r, locked: true };
        return { ...p, x: action.x, y: action.y };
      }),
    };
  },
  status(state) {
    const locked = state.pieces.filter((p) => p.locked).length;
    return { phase: locked === 7 ? 'won' : 'playing', score: 70 - Math.max(0, state.moves - 7), stars: state.moves <= 10 ? 3 : state.moves <= 20 ? 2 : 1, progress: locked / 7, hud: `${locked}/7` };
  },
  View: TangramView,
};

function PieceView({ piece, scale, onMove, onRotate, disabled, color, sfx }: { piece: Placed; scale: number; onMove: (x: number, y: number) => void; onRotate: () => void; disabled?: boolean; color: string; sfx: GameViewProps<State, Action>['sfx'] }) {
  const base = PIECES.find((p) => p.id === piece.id)!;
  const pts = base.points.map((p) => rot(p, piece.r));
  const { pan, panHandlers } = useDrag({ disabled: disabled || piece.locked, onEnd: (dx, dy) => { sfx('tap'); onMove(piece.x + dx / scale, piece.y + dy / scale); } });
  const minX = Math.min(...pts.map((p) => p[0])), minY = Math.min(...pts.map((p) => p[1]));
  const maxX = Math.max(...pts.map((p) => p[0])), maxY = Math.max(...pts.map((p) => p[1]));
  const w = (maxX - minX) * scale + 2, h = (maxY - minY) * scale + 2;
  return (
    <Animated.View {...panHandlers} style={{ position: 'absolute', left: (piece.x + minX) * scale, top: (piece.y + minY) * scale, width: w, height: h, transform: pan.getTranslateTransform(), zIndex: piece.locked ? 1 : 5 }}>
      <Tactile onPress={onRotate} disabled={disabled || piece.locked} haptic={false} accessibilityRole="button" accessibilityLabel={`${base.name}, tap to rotate`}>
        <Svg width={w} height={h} viewBox={`${minX} ${minY} ${maxX - minX + 0.5} ${maxY - minY + 0.5}`}>
          <Polygon points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')} fill={color} stroke={piece.locked ? '#2E2A4A' : '#fff'} strokeWidth="1.5" opacity={piece.locked ? 1 : 0.95} />
        </Svg>
      </Tactile>
    </Animated.View>
  );
}

function TangramView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const boardW = Math.min(width - 16, 520);
  const scale = boardW / 200;
  const boardH = Math.min(height - 70, 280 * scale);
  const puzzle = PUZZLES[state.puzzle]!;
  const outline = useRef(
    PIECES.map((p) => {
      const t = puzzle.targets[p.id]!;
      return p.points.map((pt) => rot(pt, t.r)).map(([x, y]) => `${(x + t.x) * scale},${(y + t.y) * scale}`).join(' ');
    })
  ).current;
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji={puzzle.emoji}>Fill the {puzzle.name}. Tap a piece to turn it.</Prompt>
      <RNView style={[styles.board, { width: boardW, height: boardH }]}>
        <Svg width={boardW} height={boardH} style={StyleSheet.absoluteFill}>
          {outline.map((o, i) => <Polygon key={i} points={o} fill="rgba(46,42,74,0.12)" stroke="rgba(46,42,74,0.35)" strokeWidth="1" strokeDasharray="4 3" />)}
        </Svg>
        {state.pieces.map((p, i) => (
          <PieceView key={p.id} piece={p} scale={scale} color={rainbow[i % rainbow.length]} disabled={readOnly} sfx={sfx} onMove={(x, y) => dispatch({ type: 'move', id: p.id, x, y })} onRotate={() => { sfx('pop'); dispatch({ type: 'rotate', id: p.id }); }} />
        ))}
      </RNView>
      {state.pieces.every((p) => p.locked) && <Text style={{ fontSize: 40 }}>🎉</Text>}
    </RNView>
  );
}

const styles = StyleSheet.create({ board: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: '#F0E4EE' } });

export default def;
