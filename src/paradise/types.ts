// Shape of the paradise sprite pack (tools/balcony-render/render_paradise.py).

export interface Sprite {
  file: string;
  thumb?: string;
  /** Pixel size of the image. */
  px: [number, number];
  /** Size of the image in metres. */
  widthM: number;
  heightM: number;
  /** Where the plant meets the ground, as a fraction of the image (x right, y down). */
  pivot: [number, number];
  /** Bounding box of the plant in metres (x, y, z). */
  boxM: [number, number, number];
  sway?: { amp: number; speed: number };
}

export interface SpeciesSprites {
  segment: string;
  /** Index 0 = the seed; 1..7 = sizes 1..7. Missing stages are null. */
  stages: (Sprite | null)[];
}
