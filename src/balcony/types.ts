// Data model for the Focus Balcony system. Framework-agnostic — no React or
// React Native imports here, so BalconyEngine and its managers stay pure and
// testable, and the same shapes could back a future cloud sync payload.

export type EnvironmentMode = 'MORNING' | 'AFTERNOON' | 'SUNSET' | 'EVENING' | 'NIGHT' | 'RAIN';

export type PlantGrowthLevel = 'SEED' | 'SPROUT' | 'YOUNG' | 'MATURE' | 'FLOWERING' | 'WILTED' | 'REVIVING';

export type ObjectCategory =
  | 'PLANTS'
  | 'TREES'
  | 'FLOWERS'
  | 'POTS'
  | 'FURNITURE'
  | 'LIGHTING'
  | 'WALL_ART'
  | 'DECORATION'
  | 'SPECIAL_OBJECTS';

export type AnimationType = 'NONE' | 'SWAY' | 'GLOW' | 'FLICKER' | 'FLOAT';

export type PuzzleStatus = 'LOCKED' | 'PARTIALLY_REVEALED' | 'NEARLY_COMPLETE' | 'COMPLETE' | 'MOUNTED';

/** Normalized 0..1 position within the scene's working area for a given layer. */
export interface ScenePosition {
  x: number; // 0 = left edge, 1 = right edge
  y: number; // 0 = top of the layer's band, 1 = bottom
}

export interface Plant {
  id: string;
  name: string;
  /** Catalog key selecting which vector art / future asset to draw. */
  type: string;
  position: ScenePosition;
  growthLevel: PlantGrowthLevel;
  /** 0..1 — reduced by broken sessions, restored by successful ones. */
  health: number;
  requiredFocusMinutes: number;
  currentFocusMinutes: number;
  isUnlocked: boolean;
  isPlaced: boolean;
}

export interface BalconyObjectState {
  id: string;
  category: ObjectCategory;
  /** Catalog key selecting the vector art (and later, the real asset). */
  asset: string;
  position: ScenePosition;
  scale: number;
  rotation: number; // degrees
  /** Lifetime focus minutes required for this object to unlock. */
  unlockRequirement: number;
  isUnlocked: boolean;
  isPlaced: boolean;
  animationType: AnimationType;
}

export interface ArtworkState {
  id: string;
  title: string;
  rows: number;
  cols: number;
  /** Focus minutes contributed toward this artwork's puzzle so far. */
  focusMinutes: number;
  /** Focus minutes that reveal exactly one more piece. */
  minutesPerPiece: number;
  status: PuzzleStatus;
  isMounted: boolean;
}

export interface PuzzleState {
  artworkId: string;
  piecesRevealed: number;
  totalPieces: number;
  /** A stable shuffle of cell indices — piece N in this order reveals next. */
  revealOrder: number[];
}

export interface EnvironmentState {
  mode: EnvironmentMode;
  /** The mode to restore when a RAIN/NIGHT quick-toggle is switched back off. */
  previousMode: EnvironmentMode;
  motionEffectsEnabled: boolean;
}

export interface FocusRewardState {
  /** Lifetime successful focus minutes accumulated on this balcony. */
  totalFocusMinutes: number;
  /** Reward-table entries already granted, so each unlocks exactly once. */
  claimedRewardIds: string[];
}

export interface BalconyState {
  schemaVersion: number;
  environment: EnvironmentState;
  reward: FocusRewardState;
  plants: Plant[];
  objects: BalconyObjectState[];
  artwork: ArtworkState;
  puzzle: PuzzleState;
  /** id of the plant currently receiving focus-session growth, if any. */
  activePlantId: string | null;
}

/** One row of the configurable focus -> unlock reward table (section 7). */
export interface RewardRule {
  id: string;
  minutes: number;
  unlockObjectId: string;
}
