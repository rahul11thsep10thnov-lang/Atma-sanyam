// Where grown plants stand on the balcony. The balcony is one photographed
// plate (1080 × 2340); its floor was calibrated from the furniture the
// renderer placed on it: a floor point at plate row y lies
// DEPTH_K / (y − HORIZON) metres from the camera, and one metre there spans
// (y − HORIZON) / CAM_HEIGHT plate pixels. Spots sit along the left wall,
// along the railing and across the far end, leaving the middle to walk.
export const HORIZON = 895;
export const DEPTH_K = 2950;
export const CAM_HEIGHT = 1.6;
/** Plate x of the vanishing point of the floor. */
const CENTRE_X = 400;
const PLATE_W = 1080;

export interface BalconySpot {
  /** Plate pixels: where the pot meets the floor. */
  x: number;
  y: number;
  /** Metres from the camera (the same scale as the balcony's own objects). */
  depth: number;
  /** Plate pixels per metre at this spot. */
  ppm: number;
}

function spot(depth: number, lateral: number): BalconySpot {
  const y = HORIZON + DEPTH_K / depth;
  const ppm = (y - HORIZON) / CAM_HEIGHT;
  // keep the whole pot inside the photograph
  const minX = -(CENTRE_X - 70) / ppm;
  const maxX = (PLATE_W - CENTRE_X - 70) / ppm;
  const X = Math.max(minX, Math.min(maxX, lateral));
  return { x: CENTRE_X + X * ppm, y, depth, ppm };
}

/** Rows from the far end to the near end; laterals in metres from the centre line. */
const ROWS: [number, number[]][] = [
  [9.0, [-1.0, -0.58, -0.16, 0.26, 0.68, 1.1]],
  [8.2, [-0.8, -0.38, 0.04, 0.46, 0.88]],
  [7.4, [-1.0, -0.58, 0.68, 1.1]],
  [6.6, [-1.02, 0.62, 1.1]],
  [5.8, [-1.05, 1.12]],
  [5.0, [-1.05, 1.12]],
  [4.3, [-1.05, 1.12]],
  [3.7, [-1.05, 1.12]],
];

export const BALCONY_SPOTS: BalconySpot[] = ROWS.flatMap(([d, xs]) => xs.map((x) => spot(d, x)));

/** How tall a plant is drawn on the balcony, in metres: everything grows in
 * pots here, so trees stay balcony-sized while the seven sizes keep their order. */
export function balconyMetres(heightM: number): number {
  return Math.min(1.75, 0.3 + 0.55 * Math.sqrt(Math.max(0.01, heightM)));
}
