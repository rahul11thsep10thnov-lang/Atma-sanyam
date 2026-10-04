// Shape of the garden sprite manifest (tools/balcony-render/render_sprites.py).

export interface Sprite {
  file: string;
  /** Pixel size of the image. */
  px: [number, number];
  /** Size of the image in metres, at the object's base. */
  widthM: number;
  heightM: number;
  /** Where the object meets the ground, as a fraction of the image (x right, y down). */
  pivot: [number, number];
  /** Bounding box of the object in metres (x, y, z). */
  boxM: [number, number, number];
  sway?: { amp: number; speed: number };
  /** Easel/frames: the artwork opening as fractions of the image. */
  artQuad?: [number, number][];
}

export interface SpriteStage {
  id: string;
  minutes: number;
  healthy?: Sprite;
  wilted?: Sprite;
}

export interface SpriteItem {
  name: string;
  category: string;
  growable?: boolean;
  lit?: boolean;
  fixed?: boolean;
  art?: boolean;
  flat?: boolean;
  sprite?: Sprite;
  /** Lamps: the same object lit, for night. */
  night?: Sprite;
  stages?: SpriteStage[];
  /** The picture rack with 0..4 pictures leaning on it. */
  stack?: (Sprite | null)[];
}

export interface SpriteManifest {
  version: number;
  elevationDeg: number;
  items: Record<string, SpriteItem>;
  focusTree?: { name: string; stages: SpriteStage[] };
  scenery: Record<string, Sprite>;
}

export interface TileTexture {
  file: string;
  metres: number;
}

export interface TextureManifest {
  grass?: TileTexture;
  paving?: TileTexture;
  marble?: TileTexture;
  plaster?: TileTexture;
  wood?: TileTexture;
  hedge_run?: Sprite;
  hedge_tall_run?: Sprite;
  mansion?: Sprite;
}
