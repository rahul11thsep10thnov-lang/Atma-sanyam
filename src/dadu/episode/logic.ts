// Pure layout rules for the episode stage (no React Native imports, unit tested).
import type { CharacterKey } from '../core/characters';

export type Slot = 'left' | 'centre' | 'right' | 'far';
export interface StageCast { key: CharacterKey; slot?: Slot; expression?: string; pose?: string; talking?: boolean }
export interface Placed { key: CharacterKey; size: number; left: number; bottom: number; talking: boolean }

/** How big each painted character is drawn, relative to the stage height. Dadaji is the largest; the pictures are all drawn full-frame, so sizes are softened. */
export const STAGE_SCALE: Record<CharacterKey, number> = { dadaji: 1, chintu: 0.82, buddy: 0.62, chikki: 0.56, gauri: 0.88, nandu: 0.66, mitthu: 0.52 };
const SLOT_X: Record<Slot, number> = { left: 0.2, centre: 0.5, right: 0.8, far: 0.93 };
const DEFAULT_SLOTS: Slot[] = ['left', 'right', 'centre', 'far'];

/** Assigns slots in order (explicit slots win) and returns pixel positions. Characters stand on a floor line `floor` (default 6%) above the bottom edge; raise it when a subtitle covers the bottom. */
export function placeCast(cast: StageCast[], width: number, height: number, floor = 0.06): Placed[] {
  const used = new Set<Slot>(cast.map((c) => c.slot).filter((s): s is Slot => !!s));
  const free = DEFAULT_SLOTS.filter((s) => !used.has(s));
  return cast.map((c) => {
    const slot = c.slot ?? free.shift() ?? 'centre';
    const size = Math.min(height * (0.8 - floor) * STAGE_SCALE[c.key], width * 0.52);
    return { key: c.key, size, left: width * SLOT_X[slot] - size / 2, bottom: height * floor, talking: !!c.talking };
  });
}

/** The stage is two-thirds of the screen width tall on phones, never more than half of the screen height. */
export function stageHeight(screenW: number, screenH: number): number {
  return Math.round(Math.min(screenW * 0.92, screenH * 0.5));
}

/** How long to show a narrated line before moving on by itself. */
export function autoAdvanceMs(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((520 * words + 1100) / Math.max(0.5, rate));
}
