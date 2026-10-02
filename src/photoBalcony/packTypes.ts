// Shape of the rendered asset pack (tools/balcony-render → pack.generated.ts).
// All coordinates are pixels in the plate (the full rendered frame).

export type Rect = [number, number, number, number]; // x, y, w, h
export type Point = [number, number];

export interface Sway {
  amp: number;
  speed: number;
  pivot?: 'top' | 'base';
}

export interface Variant {
  file: string;
  rect: Rect;
  /** Where the object meets the floor (or hangs from its hook). */
  pivot: Point;
  /** Distance from the camera; larger is further away (drawn first). */
  depth: number;
  rotation: number;
  sway?: Sway;
  /** Set by gen_pack.py once the shadow edges are feathered. */
  feathered?: boolean;
}

export interface PackItem {
  name: string;
  category: string;
  flat?: boolean;
  growable?: boolean;
  variants: Record<string, Variant[]>;
}

export interface PackSlot {
  kind: 'floor' | 'hanging' | 'wall';
  group: string;
  label: string;
  anchor: Point;
  depth: number;
}

export interface Layer {
  file: string;
  rect: Rect;
}

export interface FocusStage {
  id: string;
  minutes: number;
  healthy: Variant | null;
  wilted: Variant | null;
}

export interface BalconyPack {
  version: number;
  plate: { width: number; height: number };
  layers: {
    sky: Layer;
    landscape: Layer;
    architecture: string;
    sunMask: Layer;
    clouds: { file: string; width: number; height: number; top: number; rect?: Rect };
    dust: string;
  };
  slots: Record<string, PackSlot>;
  items: Record<string, PackItem>;
  focusPlant: { slot: string; name: string; stages: FocusStage[] };
  /** light: the frame opening's light map; shade: the same as a black veil
   * (alpha = 1 - light) that lights the artwork with ordinary blending. */
  art: { slot: string; quad: Point[]; light: Layer; shade?: Layer; aspect: number };
  /** A still photograph of a furnished balcony (history thumbnails). */
  preview?: string;
  /** Each object photographed in place, for the Collection. */
  thumbs?: Record<string, string>;
}
