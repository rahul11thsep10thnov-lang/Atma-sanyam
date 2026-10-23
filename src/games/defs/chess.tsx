// Chess against the computer or pass-and-play with a friend, with legal-move
// highlights, a check indicator, captured pieces, promotion, and Undo in the
// practice levels (Learn the moves / Beginner). The tutorial level explains
// each piece as it is selected.
import React, { useEffect } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng } from '../engine';
import { computerMove, fromFen, inCheck, legalMoves, makeMove, outcome, PIECE_GLYPH, START_FEN, type Move, type Position } from '../logic/chess';
import { Tactile } from '../../ui';
import { Prompt } from '../shared/Board';
import { ModeChooser } from '../shared/boardFx';

const DEPTH: Record<string, number> = { tutorial: 1, easy: 1, normal: 2, hard: 3 };
const PIECE_TIPS: Record<string, string> = { p: 'Pawns move forward one square (two from the start) and capture diagonally.', n: 'Knights jump in an L shape and can hop over pieces.', b: 'Bishops slide diagonally.', r: 'Rooks slide along rows and columns.', q: 'The queen slides in any direction.', k: 'The king moves one square in any direction. Keep it safe!' };
const PRACTICE = new Set(['tutorial', 'easy']);

export interface State { pos: Position; selected: number | null; depth: number; seed: number; moves: number; last: Move | null; promo: Move[] | null; mode: 'computer' | 'friends' | null; history: Position[]; captured: string[] }
export type Action = { type: 'select'; index: number } | { type: 'promote'; piece: string } | { type: 'ai' } | { type: 'mode'; mode: 'computer' | 'friends' } | { type: 'undo' };

function apply(state: State, m: Move): State {
  const taken = state.pos.board[m.to]!;
  const epTaken = m.ep ? (state.pos.turn === 'w' ? 'p' : 'P') : '';
  return { ...state, pos: makeMove(state.pos, m), moves: state.moves + 1, last: m, selected: null, promo: null, history: [...state.history.slice(-40), state.pos], captured: taken || epTaken ? [...state.captured, taken || epTaken] : state.captured };
}

const def: GameDefinition<State, Action> = {
  id: 'chess',
  init: (ctx) => ({ pos: fromFen(START_FEN), selected: null, depth: DEPTH[ctx.difficulty] ?? 2, seed: ctx.seed, moves: 0, last: null, promo: null, mode: null, history: [], captured: [] }),
  reduce(state, action, ctx) {
    if (action.type === 'mode') return { ...state, mode: action.mode };
    if (state.mode === null) return state;
    if (action.type === 'undo') {
      // Practice only: step back to the last position where it was the human's turn.
      if (!PRACTICE.has(ctx.difficulty) || state.history.length === 0) return state;
      const humanTurn = (p: Position) => state.mode === 'friends' || p.turn === 'w';
      let hist = state.history.slice();
      let pos = hist.pop()!;
      while (!humanTurn(pos) && hist.length) pos = hist.pop()!;
      const removed = state.history.length - hist.length;
      return { ...state, pos, history: hist, selected: null, promo: null, last: null, moves: Math.max(0, state.moves - removed), captured: state.captured.slice(0, Math.max(0, state.captured.length - removed)) };
    }
    if (outcome(state.pos)) return state;
    const humanToMove = state.mode === 'friends' || state.pos.turn === 'w';
    if (action.type === 'ai') {
      if (humanToMove) return state;
      const m = computerMove(state.pos, state.depth, rng(state.seed + state.moves));
      return m ? apply(state, m) : state;
    }
    if (!humanToMove) return state;
    if (action.type === 'promote') {
      const m = state.promo?.find((x) => x.promo === action.piece);
      return m ? apply(state, m) : state;
    }
    const moves = legalMoves(state.pos);
    if (state.selected !== null) {
      const candidates = moves.filter((m) => m.from === state.selected && m.to === action.index);
      if (candidates.length === 1) return apply(state, candidates[0]!);
      if (candidates.length > 1) return { ...state, promo: candidates };
    }
    const p = state.pos.board[action.index]!;
    const own = p && (state.pos.turn === 'w' ? p === p.toUpperCase() : p === p.toLowerCase());
    if (own && moves.some((m) => m.from === action.index)) return { ...state, selected: action.index };
    return { ...state, selected: null };
  },
  status(state) {
    const o = outcome(state.pos);
    const friends = state.mode === 'friends';
    if (o === 'checkmate') {
      const whiteWon = state.pos.turn === 'b';
      if (friends) return { phase: 'won', score: 50, stars: 1, hud: whiteWon ? 'Checkmate! White wins' : 'Checkmate! Black wins' };
      return whiteWon ? { phase: 'won', score: Math.max(10, 200 - state.moves), stars: state.depth >= 3 ? 3 : state.depth >= 2 ? 2 : 1, hud: 'Checkmate! You win' } : { phase: 'lost', score: 0, hud: 'Checkmate' };
    }
    if (o) return { phase: 'won', score: 30, stars: 1, hud: o === 'stalemate' ? 'Stalemate — draw' : 'Draw' };
    if (state.mode === null) return { phase: 'playing', hud: 'Choose who plays' };
    const turnLabel = friends ? (state.pos.turn === 'w' ? 'White to move' : 'Black to move') : state.pos.turn === 'w' ? 'Your move' : 'Robot thinking…';
    return { phase: 'playing', hud: `${turnLabel}${inCheck(state.pos) ? ' · CHECK!' : ''}` };
  },
  View: ChessView,
};

function ChessView({ state, dispatch, width, readOnly, sfx, say, ctx }: GameViewProps<State, Action>) {
  const friends = state.mode === 'friends';
  useEffect(() => {
    if (readOnly || state.mode !== 'computer' || state.pos.turn !== 'b' || outcome(state.pos)) return;
    const id = setTimeout(() => dispatch({ type: 'ai' }), 500);
    return () => clearTimeout(id);
  }, [state.pos, dispatch, readOnly, state.mode]);
  const check = inCheck(state.pos);
  useEffect(() => {
    if (check && !outcome(state.pos)) {
      sfx('bad');
      say('Check!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moves]);
  const cell = Math.min(width, 520) / 8;
  const humanToMove = friends || state.pos.turn === 'w';
  const moves = humanToMove ? legalMoves(state.pos) : [];
  const targets = new Set(moves.filter((m) => m.from === state.selected).map((m) => m.to));
  const kingSq = state.pos.board.indexOf(state.pos.turn === 'w' ? 'K' : 'k');
  const selectedPiece = state.selected !== null ? state.pos.board[state.selected]! : '';
  const o = outcome(state.pos);
  const prompt = o === 'checkmate' ? `Checkmate! ${state.pos.turn === 'b' ? 'White' : 'Black'} wins ♛` : o ? 'Draw' : ctx.difficulty === 'tutorial' && selectedPiece ? PIECE_TIPS[selectedPiece.toLowerCase()] : humanToMove ? (check ? `Check! ${friends ? (state.pos.turn === 'w' ? 'White' : 'Black') : 'You'} must protect the king.` : friends ? `${state.pos.turn === 'w' ? 'White' : 'Black'} to move` : 'Your move (white)') : 'Robot is thinking…';
  const whiteTaken = state.captured.filter((p) => p === p.toLowerCase()); // black pieces taken by white
  const blackTaken = state.captured.filter((p) => p === p.toUpperCase());
  const canUndo = PRACTICE.has(ctx.difficulty) && state.history.length > 0 && !readOnly && state.mode !== null;
  return (
    <RNView style={{ alignItems: 'center' }}>
      <Prompt emoji={check ? '⚠️' : '♟️'}>{prompt}</Prompt>
      <RNView style={styles.capturedRow}><Text style={styles.capturedText}>{blackTaken.map((p) => PIECE_GLYPH[p]).join(' ')}</Text><Text style={[styles.capturedText, { textAlign: 'right' }]}>{whiteTaken.map((p) => PIECE_GLYPH[p]).join(' ')}</Text></RNView>
      <RNView style={[styles.board, { width: cell * 8 + 8, height: cell * 8 + 8 }]}>
        {state.pos.board.map((p, i) => {
          const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
          const isLast = state.last && (state.last.from === i || state.last.to === i);
          const isKingInCheck = check && i === kingSq;
          return (
            <Tactile key={i} haptic={false} disabled={readOnly || state.mode === null} onPress={() => { sfx('tap'); if (ctx.difficulty === 'tutorial' && p && p === p.toUpperCase()) say(PIECE_TIPS[p.toLowerCase()] ?? ''); dispatch({ type: 'select', index: i }); }} accessibilityRole="button" accessibilityLabel={`${String.fromCharCode(97 + (i % 8))}${8 - Math.floor(i / 8)}${p ? ` ${p}` : ''}`} style={{ width: cell, height: cell }}>
              <RNView style={[styles.cell, { backgroundColor: state.selected === i ? '#FFC93C' : isKingInCheck ? '#FF5F6D' : isLast ? (dark ? '#9AC2E6' : '#C7E0F5') : dark ? '#7C5CFF' : '#ECE3FF' }]}>
                {i % 8 === 0 && <Text style={[styles.coord, { left: 2, top: 1, color: dark ? '#ECE3FF' : '#7C5CFF' }]}>{8 - Math.floor(i / 8)}</Text>}
                {i >= 56 && <Text style={[styles.coord, { right: 2, bottom: 0, color: dark ? '#ECE3FF' : '#7C5CFF' }]}>{String.fromCharCode(97 + (i % 8))}</Text>}
                {targets.has(i) && <RNView style={[styles.dot, { width: cell * (p ? 0.9 : 0.28), height: cell * (p ? 0.9 : 0.28), backgroundColor: p ? 'transparent' : 'rgba(46,42,74,0.35)', borderWidth: p ? 4 : 0, borderColor: 'rgba(229,72,77,0.8)' }]} />}
                {!!p && <Text style={{ fontSize: cell * 0.72, color: p === p.toUpperCase() ? '#fff' : '#1E1B3A', textShadowColor: p === p.toUpperCase() ? '#1E1B3A' : '#fff', textShadowRadius: 2 }}>{PIECE_GLYPH[p]}</Text>}
              </RNView>
            </Tactile>
          );
        })}
        {state.mode === null && !readOnly && (
          <RNView style={styles.modeWrap}><ModeChooser emoji="♟️" onPick={(m) => { sfx('tap'); dispatch({ type: 'mode', mode: m }); say(m === 'friends' ? 'White moves first. Pass the device after each move.' : 'You are white. Tap a piece to see where it can go.'); }} /></RNView>
        )}
      </RNView>
      <RNView style={styles.toolbar}>
        {canUndo && (
          <Tactile onPress={() => { sfx('tap'); dispatch({ type: 'undo' }); }} accessibilityRole="button" accessibilityLabel="Undo move"><RNView style={styles.toolBtn}><Text style={styles.toolText}>↩️ Undo</Text></RNView></Tactile>
        )}
        {state.mode !== null && <Text style={styles.moveCount}>Move {Math.floor(state.moves / 2) + 1}{PRACTICE.has(ctx.difficulty) ? ' · practice' : ''}</Text>}
      </RNView>
      {state.promo && (
        <RNView style={styles.promo}>
          <Text style={styles.promoLabel}>Promote to:</Text>
          {['Q', 'R', 'B', 'N'].map((p) => (
            <Tactile key={p} onPress={() => dispatch({ type: 'promote', piece: p })} accessibilityRole="button" accessibilityLabel={p}><Text style={{ fontSize: 36 }}>{PIECE_GLYPH[state.pos.turn === 'w' ? p : p.toLowerCase()]}</Text></Tactile>
          ))}
        </RNView>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  // Explicit sizes include the border: width is border-box, so a cell*8 board with a 4px border would wrap its last column.
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, overflow: 'hidden', borderWidth: 4, borderColor: '#2E2A4A' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', borderRadius: 999 },
  coord: { position: 'absolute', fontSize: 9, fontFamily: 'Nunito_700Bold' },
  capturedRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 520, paddingHorizontal: 6, minHeight: 22 },
  capturedText: { fontSize: 16, color: '#2E2A4A', flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, minHeight: 36 },
  toolBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 2, borderColor: '#2E2A4A' },
  toolText: { fontFamily: 'Nunito_700Bold', color: '#2E2A4A' },
  moveCount: { fontFamily: 'Nunito_700Bold', color: '#5D5880' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 10, marginTop: 10 },
  promoLabel: { fontFamily: 'Nunito_700Bold' },
  modeWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,42,74,0.35)' },
});

export default def;
