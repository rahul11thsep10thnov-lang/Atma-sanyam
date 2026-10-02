// What the store sells and when it unlocks. Item ids match the rendered
// pack (tools/balcony-render/focusbalcony/catalog.py); this file only adds
// the economy. Prices are coins (1 coin per focused minute).
import { ImageSourcePropType } from 'react-native';

export interface StoreEntry {
  price: number;
  /** Lifetime focused minutes before it appears in the store. */
  unlockMinutes: number;
  /** Part of the starting balcony. */
  starter?: boolean;
  /** Never sold: granted by the art system. */
  hidden?: boolean;
  blurb: string;
}

export const STORE: Record<string, StoreEntry> = {
  cane_lounge_chair: { price: 220, unlockMinutes: 0, starter: true, blurb: 'Teak frame, hand-woven cane, linen cushions.' },
  teak_coffee_table: { price: 90, unlockMinutes: 0, starter: true, blurb: 'Round teak table with a cup of chai.' },
  snake_plant: { price: 50, unlockMinutes: 0, starter: true, blurb: 'Hardy, upright, forgiving.' },
  lantern: { price: 35, unlockMinutes: 10, blurb: 'Iron and glass, for evenings.' },
  tulsi: { price: 45, unlockMinutes: 25, blurb: 'Holy basil in a terracotta pot.' },
  dhurrie_rug: { price: 70, unlockMinutes: 45, blurb: 'Flat-woven cotton dhurrie.' },
  pothos_hanging: { price: 60, unlockMinutes: 60, blurb: 'Golden money plant in a hanging bowl.' },
  wind_chime: { price: 40, unlockMinutes: 90, blurb: 'Brass tubes on a teak disc.' },
  areca_palm: { price: 120, unlockMinutes: 120, blurb: 'A tall clump of areca palm.' },
  wall_shelf: { price: 80, unlockMinutes: 180, blurb: 'Teak shelf with books and a brass diya.' },
  daybed: { price: 240, unlockMinutes: 300, blurb: 'Teak daybed with bolsters and a handloom throw.' },
  study_set: { price: 220, unlockMinutes: 300, blurb: 'Writing desk, cane chair and a brass lamp.' },
  art_frame: { price: 0, unlockMinutes: 0, hidden: true, blurb: 'Teak frame for your finished artwork.' },
};

export interface Artwork {
  id: string;
  title: string;
  image: ImageSourcePropType;
  /** Width / height of the source image. */
  aspect: number;
}

export const ARTWORKS: Artwork[] = [
  { id: 'morning-hills', title: 'Morning hills', image: require('../../assets/balcony/artwork/art_morning_hills.webp'), aspect: 0.75 },
  { id: 'lily-study', title: 'Peace lily study', image: require('../../assets/balcony/artwork/art_lily_study.webp'), aspect: 0.75 },
  { id: 'light-on-terracotta', title: 'Light on terracotta', image: require('../../assets/balcony/artwork/art_light_terracotta.webp'), aspect: 0.75 },
];

/** Jigsaw size for every artwork. */
export const PUZZLE_ROWS = 16;
export const PUZZLE_COLS = 16;
export const PUZZLE_PIECES = PUZZLE_ROWS * PUZZLE_COLS;
/** One piece per focused minute. */
export const MINUTES_PER_PIECE = 1;
/** Lifetime minutes before the first artwork arrives. */
export const FIRST_ART_MINUTES = 25;
