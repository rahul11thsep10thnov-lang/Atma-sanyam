import type { CharacterKey } from '../core/characters';

export type SpriteView = 'front' | 'side' | 'back' | 'threeQuarter';
export type SpritePose = 'stand' | 'walk' | 'run' | 'sit' | 'sleep' | 'wave' | 'think' | 'clap' | 'teach' | 'graze';
export type SpriteExpression = 'neutral' | 'happy' | 'laugh' | 'surprised' | 'think' | 'sad' | 'sleepy' | 'proud' | 'oops' | 'listen' | 'talk' | 'wink';
export type Facing = 'ne' | 'nw' | 'se' | 'sw';

export const SPRITE_VIEWS: SpriteView[] = ['front', 'side', 'back', 'threeQuarter'];
export const SPRITE_POSES: SpritePose[] = ['stand', 'walk', 'run', 'sit', 'sleep', 'wave', 'think', 'clap', 'teach', 'graze'];
export const SPRITE_EXPRESSIONS: SpriteExpression[] = ['neutral', 'happy', 'laugh', 'surprised', 'think', 'sad', 'sleepy', 'proud', 'oops', 'listen', 'talk', 'wink'];

/** What every character rig receives. `t` is the animation clock in seconds (0 when static). */
export interface RigProps {
  view: SpriteView;
  pose: SpritePose;
  expression: SpriteExpression;
  t: number;
  /** True while the character is speaking (mouth cycles). */
  talking?: boolean;
}

export interface CharacterSpriteProps {
  characterKey: CharacterKey | string;
  view?: SpriteView;
  pose?: SpritePose;
  expression?: SpriteExpression;
  facing?: Facing;
  /** Rendered height in px. */
  size: number;
  animate?: boolean;
  reducedMotion?: boolean;
  talking?: boolean;
  onPress?: () => void;
  /** Optional accessibility label. */
  label?: string;
}
