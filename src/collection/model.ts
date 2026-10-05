// The collection: every jigsaw a completed focus session turned into an
// artwork. Seven sizes only, by the minutes of the completed session; under
// fifteen minutes no jigsaw is earned. Artworks are permanent: they hang in
// a space or the museum, wait in the collection, or were thrown away.
import { ImageSourcePropType } from 'react-native';
import { GridDims } from '../types';
import { gridForDuration } from '../utils/grid';
import { PlantGrowthSize, SIZE_GRIDS, SIZE_LABEL, sizeForMinutes } from '../growth/size';

// Jigsaw sizes are the seven growth sizes (src/growth/size.ts): one table
// decides what a session's minutes earn, for plants and pictures alike.
export type JigsawTier = PlantGrowthSize;

export const tierForMinutes = sizeForMinutes;

export const TIER_GRIDS: Record<JigsawTier, GridDims> = SIZE_GRIDS;

export const TIER_LABEL: Record<JigsawTier, string> = SIZE_LABEL;

export function gridForTier(tier: JigsawTier): GridDims {
  return TIER_GRIDS[tier];
}

/** The reveal grid for a session: the jigsaw's size when one is earned,
 * otherwise the old seconds-based grid for a short reveal. */
export function gridForSession(minutes: number): GridDims {
  const tier = tierForMinutes(minutes);
  return tier ? TIER_GRIDS[tier] : gridForDuration(minutes);
}

export type ArtworkHome = 'collection' | 'balcony' | 'garden' | 'museum' | 'binned';

export type ArtworkSource =
  | { kind: 'builtin'; moduleId: number }
  | { kind: 'remote'; uri: string; imageId: string }
  | { kind: 'custom'; uri: string };

export interface ArtworkRecord {
  id: string;
  title: string;
  /** Collection the picture came from (heritage, nature, …, user_upload). */
  category: string;
  source: ArtworkSource;
  /** Width / height of the picture. */
  aspect: number;
  tier: JigsawTier;
  /** The completed session that earned it. */
  minutes: number;
  unlockedAt: number;
  frameId: string;
  home: ArtworkHome;
  description?: string;
}

export interface CollectionState {
  schemaVersion: 1;
  artworks: ArtworkRecord[];
}

export const INITIAL_COLLECTION: CollectionState = { schemaVersion: 1, artworks: [] };

export const DEFAULT_FRAME = 'teak';

const uid = () => `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function newArtwork(input: { title: string; category: string; source: ArtworkSource; aspect?: number; tier: JigsawTier; minutes: number }): ArtworkRecord {
  return { id: uid(), title: input.title, category: input.category, source: input.source, aspect: input.aspect ?? 0.75, tier: input.tier, minutes: input.minutes, unlockedAt: Date.now(), frameId: DEFAULT_FRAME, home: 'collection' };
}

export function addArtwork(c: CollectionState, a: ArtworkRecord): CollectionState {
  return { ...c, artworks: [...c.artworks, a] };
}

export function setHome(c: CollectionState, id: string, home: ArtworkHome): CollectionState {
  return { ...c, artworks: c.artworks.map((a) => (a.id === id ? { ...a, home } : a)) };
}

export function setFrame(c: CollectionState, id: string, frameId: string): CollectionState {
  return { ...c, artworks: c.artworks.map((a) => (a.id === id ? { ...a, frameId } : a)) };
}

export function findArtwork(c: CollectionState | null, id: string | null | undefined): ArtworkRecord | null {
  if (!c || !id) return null;
  return c.artworks.find((a) => a.id === id) ?? null;
}

export function artworkImage(a: ArtworkRecord): ImageSourcePropType {
  return a.source.kind === 'builtin' ? a.source.moduleId : { uri: a.source.uri };
}

export function owned(c: CollectionState): ArtworkRecord[] {
  return c.artworks.filter((a) => a.home !== 'binned');
}

export function counts(c: CollectionState): { owned: number; displayed: number; stored: number } {
  const o = owned(c);
  const displayed = o.filter((a) => a.home !== 'collection').length;
  return { owned: o.length, displayed, stored: o.length - displayed };
}
