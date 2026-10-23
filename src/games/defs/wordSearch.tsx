// Word Search: drag across letters to select a straight line.
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View as RNView } from 'react-native';
import type { GameDefinition, GameViewProps } from '../engine';
import { rng, shuffle, pick } from '../engine';
import { generateWordGrid, lineCells, matchWord, type WordGrid } from '../logic/wordSearch';
import { usePointer } from '../shared/drag';
import { rainbow } from '../../theme/palette';

const THEMES = [
  { name: 'Animals', words: ['CAT', 'DOG', 'LION', 'TIGER', 'ZEBRA', 'MONKEY', 'PANDA', 'HORSE', 'GOAT', 'DEER'] },
  { name: 'Fruits', words: ['MANGO', 'APPLE', 'GRAPE', 'KIWI', 'PEAR', 'LEMON', 'MELON', 'PLUM', 'FIG', 'DATE'] },
  { name: 'Space', words: ['MOON', 'STAR', 'SUN', 'MARS', 'COMET', 'ORBIT', 'ROCKET', 'EARTH', 'VENUS', 'PLUTO'] },
  { name: 'India', words: ['DELHI', 'GANGA', 'TIGER', 'LOTUS', 'KITE', 'RICE', 'SAREE', 'TABLA', 'MANGO', 'YOGA'] },
  { name: 'Colours', words: ['RED', 'BLUE', 'GREEN', 'PINK', 'GOLD', 'BROWN', 'WHITE', 'BLACK', 'TEAL', 'GREY'] },
];
const LEVELS: Record<string, { size: number; words: number; back: boolean }> = { easy: { size: 6, words: 4, back: false }, normal: { size: 8, words: 6, back: false }, hard: { size: 10, words: 8, back: true } };

export interface State { theme: string; grid: WordGrid; found: string[] }
export type Action = { type: 'select'; cells: number[] };

const def: GameDefinition<State, Action> = {
  id: 'word-search',
  init(ctx) {
    const random = rng(ctx.seed);
    const lvl = LEVELS[ctx.difficulty] ?? LEVELS.normal!;
    const theme = pick(THEMES, random);
    const words = shuffle(theme.words.filter((w) => w.length <= lvl.size), random).slice(0, lvl.words);
    return { theme: theme.name, grid: generateWordGrid(words, lvl.size, random, lvl.back), found: [] };
  },
  reduce(state, action) {
    const m = matchWord(state.grid, action.cells);
    if (!m || state.found.includes(m.word)) return state;
    return { ...state, found: [...state.found, m.word] };
  },
  status(state) {
    const total = state.grid.placements.length;
    return { phase: state.found.length === total ? 'won' : 'playing', score: state.found.length * 10, stars: 3, progress: state.found.length / total, hud: `${state.found.length}/${total}` };
  },
  View: WordSearchView,
};

function WordSearchView({ state, dispatch, width, readOnly, sfx, say }: GameViewProps<State, Action>) {
  const { size, letters, placements } = state.grid;
  const cell = Math.min(width, 520) / size;
  const start = useRef<number | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const at = (x: number, y: number) => {
    const c = Math.min(size - 1, Math.max(0, Math.floor(x / cell)));
    const r = Math.min(size - 1, Math.max(0, Math.floor(y / cell)));
    return r * size + c;
  };
  const pointer = usePointer({
    disabled: readOnly,
    onDown: (x, y) => { start.current = at(x, y); setSel([start.current]); },
    onMove: (x, y) => { if (start.current === null) return; setSel(lineCells(size, start.current, at(x, y)) ?? [start.current]); },
    onUp: (x, y) => {
      if (start.current === null) return;
      const cells = lineCells(size, start.current, at(x, y));
      start.current = null;
      setSel([]);
      if (!cells) return;
      const m = matchWord(state.grid, cells);
      sfx(m ? 'good' : 'bad');
      if (m) say(m.word);
      if (m) dispatch({ type: 'select', cells });
    },
  });
  const foundCells = new Map<number, number>();
  placements.forEach((p, i) => { if (state.found.includes(p.word)) p.cells.forEach((c) => foundCells.set(c, i)); });
  return (
    <RNView style={{ alignItems: 'center' }}>
      <RNView style={styles.words}>
        {placements.map((p) => (
          <Text key={p.word} style={[styles.word, state.found.includes(p.word) && styles.wordFound]}>{p.word}</Text>
        ))}
      </RNView>
      <RNView {...pointer} style={[styles.grid, { width: cell * size + 6, height: cell * size + 6 }]}>
        {letters.map((l, i) => (
          <RNView key={i} style={[styles.cell, { width: cell, height: cell, backgroundColor: sel.includes(i) ? '#FFF4CC' : foundCells.has(i) ? rainbow[foundCells.get(i)! % rainbow.length] + '66' : '#fff' }]}>
            <Text style={[styles.letter, { fontSize: cell * 0.5 }]}>{l}</Text>
          </RNView>
        ))}
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 10 },
  word: { fontFamily: 'Fredoka_600SemiBold', fontSize: 16, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, color: '#2E2A4A', overflow: 'hidden' },
  wordFound: { textDecorationLine: 'line-through', backgroundColor: '#E6F8DA', color: '#22A06B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, overflow: 'hidden', borderWidth: 3, borderColor: '#2E2A4A' },
  cell: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#EEE' },
  letter: { fontFamily: 'Fredoka_700Bold', color: '#2E2A4A' },
});

export default def;
