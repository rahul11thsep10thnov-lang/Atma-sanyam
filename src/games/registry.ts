// What the app knows about each game: the visual identity (emoji, colour,
// category) and the lazily-loaded definition with the rules and the View.
// The server's catalogue decides who may see a game; this file decides how
// it looks and plays. A catalogue game the app cannot load shows as
// "coming soon".
import type { GameDefinition } from './engine';
import { palette } from '../theme/palette';

export interface GameMeta {
  id: string;
  name: string;
  emoji: string;
  color: string;
  categoryId: string;
  brackets: ('A' | 'B' | 'C' | 'D')[];
}

export const GAME_CATEGORIES: { id: string; name: string; emoji: string; color: string }[] = [
  { id: 'matching', name: 'Matching & Memory', emoji: '🧩', color: palette.bubblegum },
  { id: 'puzzles', name: 'Puzzles', emoji: '🔍', color: palette.sunshine },
  { id: 'words', name: 'Words & Letters', emoji: '🔤', color: palette.grape },
  { id: 'numbers', name: 'Numbers & Logic', emoji: '🔢', color: palette.mint },
  { id: 'board', name: 'Board & Strategy', emoji: '♟️', color: palette.tangerine },
  { id: 'arcade', name: 'Arcade', emoji: '🕹️', color: palette.sky },
  { id: 'sports', name: 'Sports', emoji: '🏏', color: palette.lime },
  { id: 'creative', name: 'Creative', emoji: '🎨', color: palette.cherry },
  { id: 'simulation', name: 'Simulation', emoji: '🏡', color: '#A78BFA' },
  { id: 'learning', name: 'Learning & Quizzes', emoji: '💡', color: palette.sunshineDeep },
];

const c = (id: string) => GAME_CATEGORIES.find((x) => x.id === id)!.color;

export const GAME_REGISTRY_META: GameMeta[] = [
  { id: 'picture-matching', name: 'Picture Matching', emoji: '🐥', color: c('matching'), categoryId: 'matching', brackets: ['A', 'B'] },
  { id: 'memory-cards', name: 'Memory Cards', emoji: '🃏', color: palette.grape, categoryId: 'matching', brackets: ['A', 'B', 'C', 'D'] },
  { id: 'jigsaw', name: 'Jigsaw Puzzle', emoji: '🧩', color: palette.sunshine, categoryId: 'puzzles', brackets: ['A', 'B', 'C', 'D'] },
  { id: 'shape-sorting', name: 'Shape Sorting', emoji: '🔷', color: palette.sky, categoryId: 'matching', brackets: ['A'] },
  { id: 'colour-matching', name: 'Colour Matching', emoji: '🌈', color: palette.bubblegum, categoryId: 'matching', brackets: ['A'] },
  { id: 'spot-the-difference', name: 'Spot the Difference', emoji: '👀', color: palette.tangerine, categoryId: 'puzzles', brackets: ['B', 'C', 'D'] },
  { id: 'hidden-object', name: 'Hidden Objects', emoji: '🔎', color: palette.mint, categoryId: 'puzzles', brackets: ['B', 'C'] },
  { id: 'maze-runner', name: 'Maze Runner', emoji: '🏃', color: palette.lime, categoryId: 'puzzles', brackets: ['A', 'B', 'C', 'D'] },
  { id: 'sliding-puzzle', name: 'Sliding Puzzle', emoji: '🔢', color: palette.grape, categoryId: 'puzzles', brackets: ['B', 'C', 'D'] },
  { id: 'sudoku', name: 'Sudoku', emoji: '9️⃣', color: palette.mint, categoryId: 'numbers', brackets: ['B', 'C', 'D'] },
  { id: 'word-search', name: 'Word Search', emoji: '🔠', color: palette.grape, categoryId: 'words', brackets: ['B', 'C', 'D'] },
  { id: 'anagram-builder', name: 'Anagram Builder', emoji: '🔡', color: palette.bubblegum, categoryId: 'words', brackets: ['B', 'C', 'D'] },
  { id: 'tangram', name: 'Tangram', emoji: '📐', color: palette.tangerine, categoryId: 'puzzles', brackets: ['B', 'C', 'D'] },
  { id: 'connect-four', name: 'Connect Four', emoji: '🔴', color: palette.cherry, categoryId: 'board', brackets: ['B', 'C', 'D'] },
  { id: 'checkers', name: 'Checkers', emoji: '⚫', color: palette.tangerine, categoryId: 'board', brackets: ['B', 'C', 'D'] },
  { id: 'chess', name: 'Chess', emoji: '♟️', color: '#6B7280', categoryId: 'board', brackets: ['B', 'C', 'D'] },
  { id: 'ludo', name: 'Ludo', emoji: '🎲', color: palette.lime, categoryId: 'board', brackets: ['B', 'C', 'D'] },
  { id: 'snakes-and-ladders', name: 'Snakes and Ladders', emoji: '🐍', color: palette.sunshine, categoryId: 'board', brackets: ['B', 'C'] },
  { id: 'bubble-shooter', name: 'Bubble Shooter', emoji: '🫧', color: palette.sky, categoryId: 'arcade', brackets: ['C', 'D'] },
  { id: 'match-3', name: 'Match-3', emoji: '🍬', color: palette.bubblegum, categoryId: 'arcade', brackets: ['C', 'D'] },
  { id: 'block-puzzle', name: 'Block Puzzle', emoji: '🟦', color: palette.grape, categoryId: 'arcade', brackets: ['C', 'D'] },
  { id: 'connect-the-dots', name: 'Connect the Dots', emoji: '✏️', color: palette.mint, categoryId: 'creative', brackets: ['A', 'B'] },
  { id: 'colouring-book', name: 'Colouring Book', emoji: '🖍️', color: palette.cherry, categoryId: 'creative', brackets: ['A', 'B', 'C'] },
  { id: 'drawing-canvas', name: 'Drawing Canvas', emoji: '🎨', color: palette.bubblegum, categoryId: 'creative', brackets: ['A', 'B', 'C', 'D'] },
  { id: 'origami-studio', name: 'Origami Studio', emoji: '🦢', color: palette.sunshine, categoryId: 'creative', brackets: ['A', 'B', 'C', 'D'] },
  { id: 'paper-airplane', name: 'Paper Airplane', emoji: '✈️', color: palette.sky, categoryId: 'creative', brackets: ['B', 'C', 'D'] },
  { id: 'virtual-garden', name: 'Virtual Garden', emoji: '🌻', color: palette.lime, categoryId: 'simulation', brackets: ['A', 'B'] },
  { id: 'physics-lab', name: 'Physics Lab', emoji: '⚗️', color: palette.mint, categoryId: 'learning', brackets: ['B', 'C', 'D'] },
  { id: 'coding-sequence', name: 'Coding Robot', emoji: '🤖', color: palette.grape, categoryId: 'learning', brackets: ['B', 'C', 'D'] },
  { id: 'science-quiz', name: 'Science Quiz', emoji: '🔬', color: palette.sunshineDeep, categoryId: 'learning', brackets: ['B', 'C', 'D'] },
  { id: 'geography-quiz', name: 'Geography Quiz', emoji: '🌍', color: palette.sky, categoryId: 'learning', brackets: ['B', 'C', 'D'] },
  { id: 'animal-sounds', name: 'Animal Sounds', emoji: '🐄', color: palette.tangerine, categoryId: 'learning', brackets: ['A', 'B'] },
  { id: 'cricket', name: 'Cricket Batting', emoji: '🏏', color: palette.lime, categoryId: 'sports', brackets: ['B', 'C', 'D'] },
  { id: 'football-penalty', name: 'Football Penalty', emoji: '⚽', color: palette.mint, categoryId: 'sports', brackets: ['B', 'C', 'D'] },
  { id: 'bowling', name: 'Bowling', emoji: '🎳', color: palette.cherry, categoryId: 'sports', brackets: ['B', 'C', 'D'] },
  { id: 'virtual-cooking', name: 'Virtual Cooking', emoji: '🍳', color: palette.tangerine, categoryId: 'simulation', brackets: ['A', 'B'] },
  { id: 'farm-manager', name: 'Farm Manager', emoji: '🚜', color: palette.lime, categoryId: 'simulation', brackets: ['B', 'C', 'D'] },
  { id: 'traffic-logic', name: 'Traffic Logic', emoji: '🚗', color: palette.cherry, categoryId: 'numbers', brackets: ['C', 'D'] },
  { id: 'chess-tactics', name: 'Chess Tactics', emoji: '♞', color: '#6B7280', categoryId: 'board', brackets: ['C', 'D'] },
  { id: 'detective-mystery', name: 'Detective Mystery', emoji: '🕵️', color: palette.grape, categoryId: 'learning', brackets: ['C', 'D'] },
];

export const META_BY_ID = new Map(GAME_REGISTRY_META.map((m) => [m.id, m]));
export const metaFor = (id: string): GameMeta => META_BY_ID.get(id) ?? { id, name: id, emoji: '🎮', color: palette.sky, categoryId: 'arcade', brackets: ['A', 'B', 'C', 'D'] };

// Lazy loaders keep the first screen light; a game's code loads when opened.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loader = () => Promise<{ default: GameDefinition<any, any> }>;

export const GAME_LOADERS: Record<string, Loader> = {
  'picture-matching': () => import('./defs/pictureMatching'),
  'memory-cards': () => import('./defs/memoryCards'),
  'shape-sorting': () => import('./defs/shapeSorting'),
  'colour-matching': () => import('./defs/colourMatching'),
  'animal-sounds': () => import('./defs/animalSounds'),
  'connect-the-dots': () => import('./defs/connectTheDots'),
  'colouring-book': () => import('./defs/colouringBook'),
  'drawing-canvas': () => import('./defs/drawingCanvas'),
  jigsaw: () => import('./defs/jigsaw'),
  'spot-the-difference': () => import('./defs/spotTheDifference'),
  'hidden-object': () => import('./defs/hiddenObject'),
  'maze-runner': () => import('./defs/mazeRunner'),
  'sliding-puzzle': () => import('./defs/slidingPuzzle'),
  tangram: () => import('./defs/tangram'),
  sudoku: () => import('./defs/sudoku'),
  'word-search': () => import('./defs/wordSearch'),
  'anagram-builder': () => import('./defs/anagramBuilder'),
  'traffic-logic': () => import('./defs/trafficLogic'),
  'coding-sequence': () => import('./defs/codingSequence'),
  'connect-four': () => import('./defs/connectFour'),
  checkers: () => import('./defs/checkers'),
  chess: () => import('./defs/chess'),
  'chess-tactics': () => import('./defs/chessTactics'),
  ludo: () => import('./defs/ludo'),
  'snakes-and-ladders': () => import('./defs/snakesAndLadders'),
  'bubble-shooter': () => import('./defs/bubbleShooter'),
  'match-3': () => import('./defs/match3'),
  'block-puzzle': () => import('./defs/blockPuzzle'),
  cricket: () => import('./defs/cricket'),
  'football-penalty': () => import('./defs/footballPenalty'),
  bowling: () => import('./defs/bowling'),
  'science-quiz': () => import('./defs/scienceQuiz'),
  'geography-quiz': () => import('./defs/geographyQuiz'),
  'virtual-garden': () => import('./defs/virtualGarden'),
  'virtual-cooking': () => import('./defs/virtualCooking'),
  'farm-manager': () => import('./defs/farmManager'),
  'physics-lab': () => import('./defs/physicsLab'),
  'detective-mystery': () => import('./defs/detectiveMystery'),
  'origami-studio': () => import('./defs/origamiStudio'),
  'paper-airplane': () => import('./defs/paperAirplane'),
};

export const isImplemented = (id: string) => id in GAME_LOADERS;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, Promise<GameDefinition<any, any>>>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGame(id: string): Promise<GameDefinition<any, any>> {
  const loader = GAME_LOADERS[id];
  if (!loader) return Promise.reject(new Error(`Unknown game ${id}`));
  let p = cache.get(id);
  if (!p) {
    p = loader().then((m) => m.default);
    cache.set(id, p);
  }
  return p;
}
