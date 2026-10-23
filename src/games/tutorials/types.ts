// Data-driven pictorial tutorials. Every game has one, in the same five-step
// shape: meet the game → controls → watch a move → try it → play. Scenes are
// small emoji boards and icon rows drawn by the TutorialOverlay, so a
// tutorial is content, not code, and always describes the real controls.
import type { AgeBracket } from '../../types';

export type GridScene = {
  kind: 'grid';
  /** Rows of emoji (or '' for an empty cell). */
  rows: string[][];
  /** Cells to glow, as [row, col]. */
  highlight?: [number, number][];
  /** An arrow drawn from one cell to another. */
  arrow?: { from: [number, number]; to: [number, number] };
  /** Demo animation: frames replacing `rows` in turn. */
  frames?: string[][][];
  caption?: string;
};
export type IconsScene = { kind: 'icons'; items: { emoji: string; label: string }[]; caption?: string };
export type GestureScene = { kind: 'gesture'; gesture: 'tap' | 'drag' | 'swipe' | 'hold'; emoji: string; caption?: string };
export type Scene = GridScene | IconsScene | GestureScene;

export type TutorialStepKind = 'meet' | 'controls' | 'demo' | 'tryIt' | 'play';

export interface TutorialStep {
  kind: TutorialStepKind;
  text: string;
  textByBracket?: Partial<Record<AgeBracket, string>>;
  scene: Scene;
  /** For tryIt: the child must tap a highlighted cell (grid) or the named icon. */
  target?: { prompt: string; label?: string };
}

export interface TutorialDefinition {
  gameId: string;
  steps: [TutorialStep, TutorialStep, TutorialStep, TutorialStep, TutorialStep];
}
