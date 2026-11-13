// Pure rules for showing bitmap art. No React Native imports, so they are unit tested.

const FLAG_ORDER = ['on', 'open', 'full', 'clean', 'ready'] as const;

/** Which picture of a prop to draw: a plant-stage picture first, then the first switched-on state, else the base picture. */
export function pickVariant<T>(variants: Partial<Record<string, T>> | undefined, flags: Partial<Record<string, boolean>> | undefined, stage?: string): T | undefined {
  if (!variants) return undefined;
  if (stage && variants[stage] !== undefined) return variants[stage];
  for (const f of FLAG_ORDER) if (flags?.[f] && variants[f] !== undefined) return variants[f];
  return undefined;
}

export interface BitmapGeometry { x: number; y: number; width: number; height: number }

/**
 * Where to draw a prop picture. The origin is the centre of the prop's anchor tile.
 * A one-tile prop is one tile wide; a 2 x 1 prop is 1.5 tiles wide, and so on. The picture's bottom edge
 * rests on the floor, a little below the tile centre. `scale`, `dx`, `dy` fine-tune a single picture.
 */
export function bitmapGeometry(art: { w: number; h: number; scale?: number; dx?: number; dy?: number }, fp: { w: number; d: number }, tileW = 64, tileH = 32): BitmapGeometry {
  const width = ((fp.w + fp.d) / 2) * tileW * (art.scale ?? 1);
  const height = (width * art.h) / art.w;
  const floor = tileH * 0.25 * ((fp.w + fp.d) / 2) + (art.dy ?? 0);
  return { x: -width / 2 + (art.dx ?? 0), y: floor - height, width, height };
}

/**
 * Which character picture to show. Files are named after what they show:
 *   idle, talk, happy, think, sad, surprised, sleepy ... (expressions) or walk, run, sit, sleep, wave, clap, teach (poses),
 *   optionally combined (walk_happy) or prefixed with the view (side_idle, back_idle).
 * While talking, the picture alternates between `talk` and the normal one about five times a second.
 */
export function pickCharacterImage(names: Iterable<string>, view: string, pose: string, expression: string, talking: boolean, t: number): string | null {
  const have = new Set(names);
  const vp = view && view !== 'front' ? `${view}_` : '';
  if (talking && Math.floor(t * 5) % 2 === 0) {
    for (const c of [`${vp}talk`, 'talk']) if (have.has(c)) return c;
  }
  const candidates = [`${vp}${pose}_${expression}`, `${pose}_${expression}`, `${vp}${expression}`, expression, `${vp}${pose}`, pose, `${vp}idle`, 'idle', 'stand'];
  for (const c of candidates) if (have.has(c)) return c;
  return null;
}
