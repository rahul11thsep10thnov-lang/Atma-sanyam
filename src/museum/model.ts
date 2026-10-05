// The museum: a ring of sections, each a curved wall with its floor, in
// which every finished jigsaw hangs as a framed, physically mounted
// artwork. Everything placed is a record: where (section, surface,
// position along the wall or floor, height), how (rotation, scale,
// frame, light) and whether it is out or stored. Nothing is ever lost
// for lack of wall space: a full ring simply opens the next section.
import { JigsawTier } from '../collection/model';

export type SurfaceId = 'MUSEUM_WALL' | 'MUSEUM_FLOOR' | 'DISPLAY_PEDESTAL' | 'DISPLAY_CASE' | 'TABLETOP' | 'SHELF';
export type MuseumTheme = 'modern' | 'heritage';

export interface MuseumObject {
  objectId: string;
  /** A store item id, or 'artwork' for a framed jigsaw. */
  itemId: string;
  artId?: string;
  /** 1-based section number. */
  sectionId: number;
  surfaceId: SurfaceId;
  /** Along the section (0 = its left edge, 1 = its right edge). */
  u: number;
  /** Wall: centre height in metres. Floor: distance from the wall in metres. */
  h: number;
  /** Degrees about the vertical, for floor objects. */
  rotation: number;
  scale: number;
  frameId?: string;
  /** Small objects: the pedestal, case, table or shelf they rest on, and the resting height. */
  carrierId?: string;
  y?: number;
  /** Lights: on/off and 0..1 intensity. */
  on?: boolean;
  intensity?: number;
  displayStatus: 'displayed' | 'stored';
  placedAt: number;
}

export interface MuseumState {
  schemaVersion: 1;
  version: number;
  theme: MuseumTheme;
  /** Sections that exist (at least one); more open as walls fill. */
  sections: number;
  objects: MuseumObject[];
  /** Frame styles bought (the teak frame is always owned). */
  ownedFrames?: string[];
}

// ---- geometry (metres) --------------------------------------------------------------
/** The ring: the viewer stands inside, the artworks hang on the outer wall. */
export const RING_RADIUS = 9;
export const WALL_RADIUS = 15;
export const WALL_HEIGHT = 5.2;
export const SECTIONS_PER_RING = 8;
export const SECTION_ARC = (Math.PI * 2) / SECTIONS_PER_RING;
/** Length of a section's outer wall. */
export const WALL_LENGTH = WALL_RADIUS * SECTION_ARC;
/** Floor band between the inner balustrade and the wall. */
export const FLOOR_DEPTH = WALL_RADIUS - RING_RADIUS;
export const WALL_MARGIN = 0.45;
export const WALL_MIN_H = 0.95;
export const WALL_MAX_H = WALL_HEIGHT - 0.6;
export const EYE_HEIGHT = 1.6;

/** Artwork width by jigsaw size; height follows the picture's aspect. */
export const TIER_WIDTH: Record<JigsawTier, number> = { 1: 0.5, 2: 0.62, 3: 0.8, 4: 1.0, 5: 1.28, 6: 1.6, 7: 2.0 };
/** Frame border, as a fraction of the shorter side. */
export const FRAME_BORDER = 0.07;

export const INITIAL_MUSEUM: MuseumState = { schemaVersion: 1, version: 0, theme: 'modern', sections: 1, objects: [] };

const uid = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Footprint along the wall (metres) of an object, including its frame. */
export function wallWidthOf(o: { itemId: string; scale: number; aspect?: number; tier?: JigsawTier; widthM?: number }): number {
  if (o.itemId === 'artwork' && o.tier) return TIER_WIDTH[o.tier] * (1 + FRAME_BORDER * 2) * o.scale;
  return (o.widthM ?? 0.8) * o.scale;
}

export function artworkSize(tier: JigsawTier, aspect: number, scale = 1): { w: number; h: number; fw: number; fh: number } {
  const w = TIER_WIDTH[tier] * scale;
  const h = w / Math.max(0.4, Math.min(2.5, aspect));
  const b = Math.min(w, h) * FRAME_BORDER;
  return { w, h, fw: w + 2 * b, fh: h + 2 * b };
}

export function displayed(m: MuseumState, sectionId?: number): MuseumObject[] {
  return m.objects.filter((o) => o.displayStatus === 'displayed' && (sectionId === undefined || o.sectionId === sectionId));
}

export function sectionsOf(m: MuseumState): number[] {
  return Array.from({ length: m.sections }, (_, i) => i + 1);
}

/** The occupied intervals (metres along the wall) of a section's wall objects. */
function wallIntervals(m: MuseumState, sectionId: number, widthOf: (o: MuseumObject) => number, except?: string): [number, number][] {
  return displayed(m, sectionId)
    .filter((o) => o.surfaceId === 'MUSEUM_WALL' && o.objectId !== except)
    .map((o) => {
      const w = widthOf(o);
      const c = o.u * WALL_LENGTH;
      return [c - w / 2 - 0.12, c + w / 2 + 0.12] as [number, number];
    })
    .sort((a, b) => a[0] - b[0]);
}

/** Snap a wanted wall position to the nearest legal one in the section:
 * inside the wall's bounds, at a hanging height, and clear of its
 * neighbours; null when the width does not fit anywhere near. */
export function snapToWall(m: MuseumState, sectionId: number, wantedU: number, wantedH: number, width: number, height: number, widthOf: (o: MuseumObject) => number, except?: string): { u: number; h: number } | null {
  const lo = WALL_MARGIN + width / 2;
  const hi = WALL_LENGTH - WALL_MARGIN - width / 2;
  if (lo > hi) return null;
  const h = Math.max(WALL_MIN_H + height / 2, Math.min(WALL_MAX_H - height / 2, wantedH));
  const taken = wallIntervals(m, sectionId, widthOf, except);
  let c = Math.max(lo, Math.min(hi, wantedU * WALL_LENGTH));
  const free = (x: number) => taken.every(([a, b]) => x + width / 2 <= a || x - width / 2 >= b);
  if (free(c)) return { u: c / WALL_LENGTH, h };
  // slide to the nearest free centre on either side
  let best: number | null = null;
  for (const [a, b] of taken) {
    for (const x of [a - width / 2 - 0.01, b + width / 2 + 0.01]) {
      if (x < lo || x > hi || !free(x)) continue;
      if (best === null || Math.abs(x - c) < Math.abs(best - c)) best = x;
    }
  }
  if (best === null) return null;
  c = best;
  return { u: c / WALL_LENGTH, h };
}

/** The first free wall centre in a section for a width, left to right. */
export function firstFreeWall(m: MuseumState, sectionId: number, width: number, widthOf: (o: MuseumObject) => number): number | null {
  const lo = WALL_MARGIN + width / 2;
  const hi = WALL_LENGTH - WALL_MARGIN - width / 2;
  const taken = wallIntervals(m, sectionId, widthOf);
  let x = lo;
  for (const [a, b] of taken) {
    if (x + width / 2 <= a) return x / WALL_LENGTH;
    x = Math.max(x, b + width / 2 + 0.01);
  }
  return x <= hi ? x / WALL_LENGTH : null;
}

export function snapToFloor(wantedU: number, wantedDepth: number, footprint: number): { u: number; h: number } {
  const lo = (WALL_MARGIN + footprint / 2) / WALL_LENGTH;
  const hi = 1 - lo;
  const u = Math.max(lo, Math.min(hi, wantedU));
  const h = Math.max(0.35 + footprint / 2, Math.min(FLOOR_DEPTH - 0.8 - footprint / 2, wantedDepth));
  return { u, h };
}

export function addObject(m: MuseumState, o: Omit<MuseumObject, 'objectId' | 'placedAt'>): { state: MuseumState; object: MuseumObject } {
  const object: MuseumObject = { ...o, objectId: uid(), placedAt: Date.now() };
  return { state: { ...m, objects: [...m.objects, object] }, object };
}

export function updateObject(m: MuseumState, objectId: string, patch: Partial<MuseumObject>): MuseumState {
  return { ...m, objects: m.objects.map((o) => (o.objectId === objectId ? { ...o, ...patch } : o)) };
}

/** Move an object; whatever rests on it moves with it. */
export function moveObject(m: MuseumState, objectId: string, u: number, h: number): MuseumState {
  return { ...m, objects: m.objects.map((o) => (o.objectId === objectId || o.carrierId === objectId ? { ...o, u, h } : o)) };
}

export function removeObject(m: MuseumState, objectId: string): MuseumState {
  return { ...m, objects: m.objects.filter((o) => o.objectId !== objectId && o.carrierId !== objectId) };
}

export function storeObject(m: MuseumState, objectId: string): MuseumState {
  return { ...m, objects: m.objects.map((o) => (o.objectId === objectId || o.carrierId === objectId ? { ...o, displayStatus: 'stored', carrierId: undefined } : o)) };
}

export function carriedBy(m: MuseumState, carrierId: string): MuseumObject[] {
  return m.objects.filter((o) => o.displayStatus === 'displayed' && o.carrierId === carrierId);
}

export function openSection(m: MuseumState): MuseumState {
  return { ...m, sections: m.sections + 1 };
}

export function artworkObject(m: MuseumState, artId: string): MuseumObject | undefined {
  return m.objects.find((o) => o.itemId === 'artwork' && o.artId === artId);
}

/** Hang an artwork: the first section with room, else a new one. */
export function hangInMuseum(m: MuseumState, art: { id: string; tier: JigsawTier; aspect: number }, widthOf: (o: MuseumObject) => number, preferSection?: number): { state: MuseumState; sectionId: number; opened: boolean } {
  let state: MuseumState = { ...m, objects: m.objects.filter((o) => !(o.itemId === 'artwork' && o.artId === art.id)) };
  const size = artworkSize(art.tier, art.aspect);
  const order = [...(preferSection ? [preferSection] : []), ...sectionsOf(state).filter((s) => s !== preferSection)];
  for (const sectionId of order) {
    const u = firstFreeWall(state, sectionId, size.fw, widthOf);
    if (u === null) continue;
    const h = Math.max(WALL_MIN_H + size.fh / 2, Math.min(WALL_MAX_H - size.fh / 2, EYE_HEIGHT));
    const r = addObject(state, { itemId: 'artwork', artId: art.id, sectionId, surfaceId: 'MUSEUM_WALL', u, h, rotation: 0, scale: 1, displayStatus: 'displayed' });
    return { state: r.state, sectionId, opened: false };
  }
  state = openSection(state);
  const sectionId = state.sections;
  const u = firstFreeWall(state, sectionId, size.fw, widthOf) ?? 0.5;
  const h = Math.max(WALL_MIN_H + size.fh / 2, Math.min(WALL_MAX_H - size.fh / 2, EYE_HEIGHT));
  const r = addObject(state, { itemId: 'artwork', artId: art.id, sectionId, surfaceId: 'MUSEUM_WALL', u, h, rotation: 0, scale: 1, displayStatus: 'displayed' });
  return { state: r.state, sectionId, opened: true };
}

export function takeDownFromMuseum(m: MuseumState, artId: string): MuseumState {
  return { ...m, objects: m.objects.filter((o) => !(o.itemId === 'artwork' && o.artId === artId)) };
}

export function ownsItem(m: MuseumState, itemId: string): number {
  return m.objects.filter((o) => o.itemId === itemId).length;
}

export function ownsFrame(m: MuseumState, frameId: string): boolean {
  return frameId === 'frame_teak' || frameId === 'teak' || (m.ownedFrames ?? []).includes(frameId);
}

export function addFrame(m: MuseumState, frameId: string): MuseumState {
  return { ...m, ownedFrames: [...new Set([...(m.ownedFrames ?? []), frameId])] };
}

/** A free spot on a section's floor for a footprint, away from other floor objects. */
export function freeFloorSpot(m: MuseumState, sectionId: number, footprint: number, depthOf: (o: MuseumObject) => number): { u: number; h: number } | null {
  const others = displayed(m, sectionId).filter((o) => o.surfaceId === 'MUSEUM_FLOOR');
  const rows = [1.6, 2.6, 0.9];
  for (const depth of rows) {
    for (let k = 0; k < 9; k++) {
      // centre first, then outward
      const u = 0.5 + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 0.11;
      if (u < 0.08 || u > 0.92) continue;
      const x = u * WALL_LENGTH;
      const clear = others.every((o) => Math.hypot(o.u * WALL_LENGTH - x, o.h - depth) > footprint / 2 + depthOf(o) / 2 + 0.3);
      if (clear) return snapToFloor(u, depth, footprint);
    }
  }
  return null;
}
