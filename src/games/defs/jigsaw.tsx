// Jigsaw: a vector picture cut into a grid; drag pieces from the tray to the
// board. A piece near its home snaps in. Pictures are drawn with SVG so no
// image licensing is involved and the state stays tiny.
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, View as RNView } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, pick } from '../engine';
import { useDrag } from '../shared/drag';
import { Prompt } from '../shared/Board';

const GRID: Record<string, number> = { easy: 2, normal: 3, hard: 4, expert: 6 };

// Each picture is a function of the SVG viewBox 0–100.
const PICTURES: { name: string; emoji: string; draw: () => React.ReactNode }[] = [
  {
    name: 'sunny beach', emoji: '🏖️',
    draw: () => (
      <G>
        <Rect x="0" y="0" width="100" height="60" fill="#8ED3FF" />
        <Rect x="0" y="60" width="100" height="40" fill="#FFE2A8" />
        <Rect x="0" y="52" width="100" height="12" fill="#4FB3FF" />
        <Circle cx="78" cy="18" r="10" fill="#FFC93C" />
        <Polygon points="20,65 24,40 28,65" fill="#8B5A2B" />
        <Ellipse cx="24" cy="38" rx="14" ry="7" fill="#7ED957" />
        <Circle cx="55" cy="80" r="6" fill="#FF6B9D" />
        <Path d="M40 85 q10 -12 20 0" stroke="#fff" strokeWidth="2" fill="none" />
      </G>
    ),
  },
  {
    name: 'rocket in space', emoji: '🚀',
    draw: () => (
      <G>
        <Rect x="0" y="0" width="100" height="100" fill="#1E1B3A" />
        {[[10, 12], [30, 30], [85, 20], [70, 70], [15, 80], [90, 85], [50, 8]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r="1.8" fill="#FFF4CC" />)}
        <Circle cx="80" cy="35" r="9" fill="#FFC93C" />
        <Path d="M50 15 C62 30 62 60 50 70 C38 60 38 30 50 15 Z" fill="#FF5F6D" />
        <Circle cx="50" cy="40" r="6" fill="#8ED3FF" />
        <Polygon points="40,62 30,76 42,70" fill="#4FB3FF" />
        <Polygon points="60,62 70,76 58,70" fill="#4FB3FF" />
        <Polygon points="45,70 55,70 50,88" fill="#FF8A3D" />
      </G>
    ),
  },
  {
    name: 'happy cat', emoji: '🐱',
    draw: () => (
      <G>
        <Rect x="0" y="0" width="100" height="100" fill="#FFE3EC" />
        <Polygon points="25,40 30,10 45,35" fill="#FF8A3D" />
        <Polygon points="75,40 70,10 55,35" fill="#FF8A3D" />
        <Circle cx="50" cy="55" r="30" fill="#FFB366" />
        <Circle cx="38" cy="50" r="5" fill="#2E2A4A" />
        <Circle cx="62" cy="50" r="5" fill="#2E2A4A" />
        <Polygon points="47,60 53,60 50,65" fill="#FF6B9D" />
        <Path d="M40 70 q10 8 20 0" stroke="#2E2A4A" strokeWidth="2" fill="none" />
        <Path d="M20 60 h15 M20 66 h15 M65 60 h15 M65 66 h15" stroke="#2E2A4A" strokeWidth="1.5" />
      </G>
    ),
  },
  {
    name: 'rainbow hills', emoji: '🌈',
    draw: () => (
      <G>
        <Rect x="0" y="0" width="100" height="100" fill="#DDEEFF" />
        {['#FF5F6D', '#FF8A3D', '#FFC93C', '#7ED957', '#4FB3FF', '#9B6BFF'].map((c, i) => <Path key={c} d={`M5 70 A45 45 0 0 1 95 70`} stroke={c} strokeWidth="5" fill="none" transform={`translate(0 ${i * 5}) scale(${1 - i * 0.07}) translate(${(i * 0.07 * 50) / (1 - i * 0.07)} ${(i * 0.07 * 70) / (1 - i * 0.07)})`} />)}
        <Ellipse cx="30" cy="92" rx="40" ry="18" fill="#7ED957" />
        <Ellipse cx="80" cy="95" rx="35" ry="16" fill="#5CBF34" />
        <Circle cx="20" cy="20" r="8" fill="#FFC93C" />
      </G>
    ),
  },
];

interface Piece { id: number; home: number; placed: boolean; tray: number }
export interface State { picture: number; n: number; pieces: Piece[]; moves: number }
export type Action = { type: 'place'; id: number; slot: number } | { type: 'miss' };

const def: GameDefinition<State, Action> = {
  id: 'jigsaw',
  layout: 'full',
  init(ctx) {
    const random = rng(ctx.seed);
    const n = GRID[ctx.difficulty] ?? 3;
    const order = shuffle([...Array(n * n).keys()], random);
    return { picture: PICTURES.indexOf(pick(PICTURES, random)), n, pieces: order.map((home, tray) => ({ id: home, home, placed: false, tray })), moves: 0 };
  },
  reduce(state, action) {
    if (action.type === 'miss') return { ...state, moves: state.moves + 1 };
    const piece = state.pieces.find((p) => p.id === action.id);
    if (!piece || piece.placed || action.slot !== piece.home) return { ...state, moves: state.moves + 1 };
    return { ...state, moves: state.moves + 1, pieces: state.pieces.map((p) => (p.id === action.id ? { ...p, placed: true } : p)) };
  },
  status(state) {
    const placed = state.pieces.filter((p) => p.placed).length;
    const total = state.pieces.length;
    const done = placed === total;
    const misses = state.moves - placed;
    return { phase: done ? 'won' : 'playing', score: total * 10 - misses * 2, stars: misses <= 1 ? 3 : misses <= total ? 2 : 1, progress: placed / total, hud: `${placed}/${total}` };
  },
  View: JigsawView,
};

function PieceSvg({ picture, n, home, size }: { picture: number; n: number; home: number; size: number }) {
  const col = home % n;
  const row = Math.floor(home / n);
  const cell = 100 / n;
  return (
    <Svg width={size} height={size} viewBox={`${col * cell} ${row * cell} ${cell} ${cell}`}>
      {PICTURES[picture]!.draw()}
    </Svg>
  );
}

function DraggablePiece({ piece, size, boardOrigin, cell, n, onDrop, disabled, sfx }: { piece: Piece; size: number; boardOrigin: React.MutableRefObject<{ x: number; y: number }>; cell: number; n: number; onDrop: (id: number, slot: number | null) => void; disabled?: boolean; sfx: GameViewProps<State, Action>['sfx'] }) {
  const origin = useRef({ x: 0, y: 0 });
  const { pan, panHandlers } = useDrag({
    disabled,
    onEnd: (dx, dy) => {
      const cx = origin.current.x + size / 2 + dx - boardOrigin.current.x;
      const cy = origin.current.y + size / 2 + dy - boardOrigin.current.y;
      const col = Math.floor(cx / cell);
      const row = Math.floor(cy / cell);
      const inside = col >= 0 && col < n && row >= 0 && row < n;
      const slot = inside ? row * n + col : null;
      sfx(slot === piece.home ? 'good' : 'bad');
      onDrop(piece.id, slot);
    },
  });
  return (
    <Animated.View {...panHandlers} onLayout={(e) => (origin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.piece, { width: size, height: size, transform: pan.getTranslateTransform() }]} accessibilityLabel={`Puzzle piece ${piece.home + 1}`}>
      <PieceSvg picture={0} n={n} home={piece.home} size={size} />
    </Animated.View>
  );
}

function JigsawView({ state, dispatch, width, height, readOnly, sfx }: GameViewProps<State, Action>) {
  const { n } = state;
  const boardSize = Math.min(width - 24, height * 0.55);
  const cell = boardSize / n;
  const traySize = Math.min(cell * 0.8, 96);
  const boardOrigin = useRef({ x: 0, y: 0 });
  const trayRef = useRef({ x: 0, y: 0 });
  const pic = PICTURES[state.picture]!;
  return (
    <RNView style={{ flex: 1, alignItems: 'center' }}>
      <Prompt emoji={pic.emoji}>Build the {pic.name}</Prompt>
      <RNView onLayout={(e) => (boardOrigin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.board, { width: boardSize + 6, height: boardSize + 6 }]}>
        <RNView style={{ opacity: 0.18, position: 'absolute' }}>
          <Svg width={boardSize} height={boardSize} viewBox="0 0 100 100">{pic.draw()}</Svg>
        </RNView>
        {state.pieces.filter((p) => p.placed).map((p) => (
          <RNView key={p.id} style={{ position: 'absolute', left: (p.home % n) * cell, top: Math.floor(p.home / n) * cell }}>
            <Svg width={cell} height={cell} viewBox={`${(p.home % n) * (100 / n)} ${Math.floor(p.home / n) * (100 / n)} ${100 / n} ${100 / n}`}>{pic.draw()}</Svg>
          </RNView>
        ))}
        {Array.from({ length: n * n }, (_, i) => <RNView key={i} pointerEvents="none" style={{ position: 'absolute', left: (i % n) * cell, top: Math.floor(i / n) * cell, width: cell, height: cell, borderWidth: 1, borderColor: 'rgba(46,42,74,0.25)' }} />)}
      </RNView>
      <RNView onLayout={(e) => (trayRef.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.tray, { width: boardSize }]}>
        {state.pieces.filter((p) => !p.placed).sort((a, b) => a.tray - b.tray).map((p) => (
          <TrayPiece key={p.id} piece={p} size={traySize} picture={state.picture} n={n} cell={cell} boardOrigin={boardOrigin} trayOrigin={trayRef} disabled={readOnly} sfx={sfx} onDrop={(id, slot) => (slot === null ? dispatch({ type: 'miss' }) : dispatch({ type: 'place', id, slot }))} />
        ))}
        {state.pieces.every((p) => p.placed) && <Text style={{ fontSize: 40 }}>{pic.emoji} 🎉</Text>}
      </RNView>
    </RNView>
  );
}

function TrayPiece({ piece, size, picture, n, cell, boardOrigin, trayOrigin, onDrop, disabled, sfx }: { piece: Piece; size: number; picture: number; n: number; cell: number; boardOrigin: React.MutableRefObject<{ x: number; y: number }>; trayOrigin: React.MutableRefObject<{ x: number; y: number }>; onDrop: (id: number, slot: number | null) => void; disabled?: boolean; sfx: GameViewProps<State, Action>['sfx'] }) {
  const origin = useRef({ x: 0, y: 0 });
  const { pan, panHandlers } = useDrag({
    disabled,
    onEnd: (dx, dy) => {
      const cx = trayOrigin.current.x + origin.current.x + size / 2 + dx - boardOrigin.current.x;
      const cy = trayOrigin.current.y + origin.current.y + size / 2 + dy - boardOrigin.current.y;
      const col = Math.floor(cx / cell);
      const row = Math.floor(cy / cell);
      const inside = col >= 0 && col < n && row >= 0 && row < n;
      const slot = inside ? row * n + col : null;
      sfx(slot === piece.home ? 'good' : 'bad');
      onDrop(piece.id, slot);
    },
  });
  return (
    <Animated.View {...panHandlers} onLayout={(e) => (origin.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })} style={[styles.piece, { width: size, height: size, transform: pan.getTranslateTransform() }]} accessibilityLabel={`Puzzle piece ${piece.home + 1}`}>
      <PieceSvg picture={picture} n={n} home={piece.home} size={size - 6} />
    </Animated.View>
  );
}

void DraggablePiece;

const styles = StyleSheet.create({
  board: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: '#2E2A4A' },
  tray: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 20, minHeight: 100, justifyContent: 'center' },
  piece: { backgroundColor: '#fff', borderRadius: 8, padding: 3, borderWidth: 2, borderColor: '#2E2A4A', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
});

export default def;
