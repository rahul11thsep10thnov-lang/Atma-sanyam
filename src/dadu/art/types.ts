// Shapes of the generated art manifest (see tools/dadu/art_import.py).
export interface ArtImage { src: number; w: number; h: number }
/** A prop picture for the isometric scenes. `scale`, `dx`, `dy` come from an optional <name>.json next to the picture. */
export interface ArtProp extends ArtImage {
  scale?: number;
  dx?: number;
  dy?: number;
  /** Alternative pictures: on, open, full, clean, ready, or a plant stage. */
  variants?: Partial<Record<string, number>>;
}
export interface ArtManifest {
  props: Record<string, ArtProp>;
  /** Side-view backgrounds by file name (living, kitchen, pond, ...). */
  rooms: Record<string, ArtImage>;
  /** Story page pictures by art_file_name from docs/dadu/art-brief/story-pages.csv. */
  story: Record<string, ArtImage>;
  /** Character pictures: characters/<key>/<pose or expression>.png */
  characters: Record<string, Record<string, ArtImage>>;
  ui: Record<string, ArtImage>;
}
