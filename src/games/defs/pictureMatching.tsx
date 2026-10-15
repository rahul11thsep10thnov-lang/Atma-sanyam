// Picture Matching (ages 3–5): pairs of friendly pictures face up. Tap the
// two that are the same. Spoken help names each animal.
import React from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, starsForMoves } from '../engine';
import { Tactile } from '../../ui';
import { rainbowSoft, rainbow } from '../../theme/palette';

const PICTURES = [
  ['🐥', 'chick'], ['🐶', 'puppy'], ['🐱', 'kitten'], ['🐸', 'frog'], ['🐘', 'elephant'], ['🦁', 'lion'], ['🐼', 'panda'], ['🐨', 'koala'], ['🦋', 'butterfly'], ['🐢', 'tortoise'], ['🍎', 'apple'], ['🍌', 'banana'], ['🚗', 'car'], ['⭐', 'star'], ['🌈', 'rainbow'], ['🎈', 'balloon'],
] as const;

interface Tile {
  id: number;
  pic: number;
  matched: boolean;
}
export interface State {
  tiles: Tile[];
  selected: number | null;
  moves: number;
  pairs: number;
  cols: number;
  lastGood: number | null;
}
export type Action = { type: 'tap'; id: number };

const PAIRS: Record<string, number> = { easy: 3, normal: 6, hard: 8 };

const def: GameDefinition<State, Action> = {
  id: 'picture-matching',
  init(ctx) {
    const random = rng(ctx.seed);
    const pairs = PAIRS[ctx.difficulty] ?? 6;
    const pics = shuffle([...PICTURES.keys()], random).slice(0, pairs);
    const tiles = shuffle(
      pics.flatMap((pic) => [pic, pic]).map((pic, i) => ({ id: i, pic, matched: false })),
      random
    );
    return { tiles, selected: null, moves: 0, pairs, cols: pairs <= 3 ? 3 : 4, lastGood: null };
  },
  reduce(state, action) {
    if (action.type !== 'tap') return state;
    const tile = state.tiles.find((t) => t.id === action.id);
    if (!tile || tile.matched) return state;
    if (state.selected === null) return { ...state, selected: tile.id, lastGood: null };
    if (state.selected === tile.id) return { ...state, selected: null };
    const first = state.tiles.find((t) => t.id === state.selected)!;
    const match = first.pic === tile.pic;
    return {
      ...state,
      moves: state.moves + 1,
      selected: null,
      lastGood: match ? tile.pic : null,
      tiles: match ? state.tiles.map((t) => (t.id === first.id || t.id === tile.id ? { ...t, matched: true } : t)) : state.tiles,
    };
  },
  status(state) {
    const done = state.tiles.every((t) => t.matched);
    return { phase: done ? 'won' : 'playing', score: Math.max(0, state.pairs * 10 - (state.moves - state.pairs) * 2), stars: starsForMoves(state.moves, state.pairs + 1), progress: state.tiles.filter((t) => t.matched).length / state.tiles.length, hud: `Moves ${state.moves}` };
  },
  View: PictureMatchingView,
};

function PictureMatchingView({ state, dispatch, width, readOnly, say, sfx, ctx }: GameViewProps<State, Action>) {
  const cols = state.cols;
  const rows = Math.ceil(state.tiles.length / cols);
  const gap = 10;
  const size = Math.min((width - gap * (cols + 1)) / cols, (width - gap * (rows + 1)) / rows);
  return (
    <RNView style={[styles.grid, { gap, padding: gap }]}>
      {state.tiles.map((t, i) => {
        const selected = state.selected === t.id;
        const [emoji, name] = PICTURES[t.pic]!;
        return (
          <Tactile
            key={t.id}
            disabled={readOnly || t.matched}
            onPress={() => {
              sfx('tap');
              if (ctx.narration) say(name);
              dispatch({ type: 'tap', id: t.id });
            }}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected, disabled: t.matched }}
            style={{ width: size, height: size }}
          >
            <RNView style={[styles.tile, { backgroundColor: t.matched ? rainbowSoft[t.pic % rainbowSoft.length] : selected ? rainbow[i % rainbow.length] : '#fff', borderColor: selected ? '#2E2A4A' : rainbow[t.pic % rainbow.length], opacity: t.matched ? 0.55 : 1, transform: [{ scale: selected ? 1.08 : 1 }] }]}>
              <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
              {t.matched && <Text style={styles.tick}>✓</Text>}
            </RNView>
          </Tactile>
        );
      })}
    </RNView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', flex: 1 },
  tile: { flex: 1, borderRadius: 22, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  tick: { position: 'absolute', top: 6, right: 10, fontSize: 18, color: '#22A06B', fontWeight: 'bold' },
});

export default def;
