// The museum as a run of walls round a curved, carved white gallery: one
// framed jigsaw per wall, in the order they were hung, then empty walls
// waiting for the next ones (never fewer than MIN_EMPTY_WALLS).
import { ArtworkRecord, JigsawTier } from '../collection/model';
import { MuseumState } from './model';

export const MIN_EMPTY_WALLS = 10;

/** The rendered wall plates (tools/balcony-render/render_museum.py). */
export const WALL_PLATE = { width: 1080, height: 2340 };
/** The niche the picture hangs in, in plate pixels: left, top, right, bottom. */
export const NICHE = { left: 285.5, top: 1203.9, right: 794.5, bottom: 1705.7 };

export const WALL_IMAGES = [
  require('../../assets/museum/wall_a.webp'),
  require('../../assets/museum/wall_b.webp'),
  require('../../assets/museum/wall_c.webp'),
];

export type Wall = { kind: 'art'; art: ArtworkRecord } | { kind: 'empty'; n: number };

export function wallsOf(m: MuseumState, artwork: (id: string) => ArtworkRecord | null): Wall[] {
  const hung = m.objects
    .filter((o) => o.itemId === 'artwork' && o.artId && o.displayStatus !== 'stored')
    .sort((a, b) => a.placedAt - b.placedAt)
    .map((o) => artwork(o.artId!))
    .filter((a): a is ArtworkRecord => !!a && a.home !== 'binned');
  const seen = new Set<string>();
  const walls: Wall[] = [];
  for (const a of hung) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    walls.push({ kind: 'art', art: a });
  }
  for (let i = 0; i < MIN_EMPTY_WALLS; i++) walls.push({ kind: 'empty', n: walls.length + 1 });
  return walls;
}

/** How much of the niche a framed jigsaw fills, by its size (1..7). */
export const TIER_FILL: Record<JigsawTier, number> = { 1: 0.42, 2: 0.5, 3: 0.58, 4: 0.66, 5: 0.75, 6: 0.85, 7: 0.95 };

/** The framed picture's outer box inside a niche of w × h, for its size and aspect. */
export function frameBox(tier: JigsawTier, aspect: number, w: number, h: number): { w: number; h: number } {
  const f = TIER_FILL[tier] ?? 0.6;
  let fw = w * f;
  let fh = fw / Math.max(0.3, aspect);
  if (fh > h * f) {
    fh = h * f;
    fw = fh * aspect;
  }
  return { w: fw, h: fh };
}
