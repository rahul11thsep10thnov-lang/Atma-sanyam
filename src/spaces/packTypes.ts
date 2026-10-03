// Shape of a rendered space pack (tools/balcony-render/gen_space_pack.py →
// packs/<space>.generated.ts). All coordinates are pixels in the plate.

export type SpaceId = 'balcony' | 'garden' | 'room';
export type LightState = 'morning' | 'afternoon' | 'sunset' | 'evening' | 'night' | 'rain';
export const LIGHT_STATES: LightState[] = ['morning', 'afternoon', 'sunset', 'evening', 'night', 'rain'];

export type Rect = [number, number, number, number]; // x, y, w, h
export type Point = [number, number];

export interface Layer {
  file: string;
  rect: Rect;
}

export interface Sway {
  amp: number;
  speed: number;
  pivot?: 'top' | 'base';
}

/** One photographed placement of an object: per lighting state a layer. */
export interface Variant {
  rotation: number;
  /** Where the object meets the floor (or hangs from its hook). */
  pivot: Point;
  /** Distance from the camera; larger is further away (drawn first). */
  depth: number;
  sway?: Sway | null;
  /** Frames: the corners of the artwork opening, and a light veil per state. */
  artQuad?: Point[];
  artShade?: Partial<Record<LightState, Layer>>;
  files: Partial<Record<LightState, Layer>>;
}

export interface Stage {
  id: string;
  minutes: number;
  healthy: Variant;
  wilted: Variant;
}

export interface PackItem {
  name: string;
  category: string;
  flat?: boolean;
  growable?: boolean;
  lit?: boolean;
  /** Part of the space itself (the dustbin, the rack); never put away. */
  fixed?: boolean;
  /** Renders with 0..4 pictures leaning on it. */
  stack?: boolean;
  /** Holds an artwork. */
  art?: boolean;
  /** Surface slots this piece of furniture carries. */
  carries?: string[];
  variants: Record<string, Variant[]>;
  /** growable: per slot, the growth stages. */
  stages?: Record<string, Stage[]>;
  /** stack: per slot, renders for 0..4 pictures. */
  stackFiles?: Record<string, Variant[]>;
}

export interface PackSlot {
  kind: 'floor' | 'hanging' | 'wall';
  group: string;
  label: string;
  anchor: Point;
  depth: number;
  /** A surface slot that exists only while this slot is occupied. */
  requires?: string;
}

export interface StateLayers {
  sky: Layer;
  landscape: Layer;
  base: Layer;
  sunMask?: Layer;
  openAir?: Rect;
}

export interface SpacePack {
  version: 2;
  space: SpaceId;
  plate: { width: number; height: number };
  states: Partial<Record<LightState, StateLayers>>;
  renderedStates: LightState[];
  slots: Record<string, PackSlot>;
  items: Record<string, PackItem>;
  focusPlant: { slot: string; name: string; stages: Stage[] };
  clouds?: { file: string; width: number; height: number; top: number; rect?: Rect } | null;
  dust?: string | null;
  rain?: { file: string; width: number; height: number } | null;
  preview?: string | null;
  thumbs?: Record<string, string> | null;
}
