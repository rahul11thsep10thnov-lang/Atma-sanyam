// The store: things for the balcony and the garden,
// what they cost in coins and what they are worth in rupees, and when
// they unlock. Item ids match the rendered packs. Prices are coins (one
// coin per focused minute); the rupee value is shown in the inventory.
import { ImageSourcePropType } from 'react-native';
import { SpaceId } from './packTypes';

/** The photographed spaces (the Garden tab is the Paradise Garden, src/paradise). */
export const SPACES: SpaceId[] = ['balcony'];

export interface StoreEntry {
  /** Which spaces this item can be placed in. */
  spaces: SpaceId[];
  coins: number;
  /** Lifetime focused minutes before it appears in the store. */
  unlockMinutes: number;
  /** Part of a space's starting set. */
  starter?: SpaceId[];
  /** Never sold: granted by the app (frames, penalties, fixtures). */
  hidden?: boolean;
  blurb: string;
}

export function rupeesFor(coins: number): number {
  // a coin is worth about a quarter rupee; small things never read as free
  return Math.max(5, Math.round((coins * 0.25) / 5) * 5);
}

const B: SpaceId[] = ['balcony'];
const G: SpaceId[] = ['garden'];
const BG: SpaceId[] = ['balcony', 'garden'];

export const STORE: Record<string, StoreEntry> = {
  // ---- balcony (12) ----
  cane_lounge_chair: { spaces: B, coins: 220, unlockMinutes: 0, starter: B, blurb: 'Teak frame, hand-woven cane, linen cushions.' },
  teak_coffee_table: { spaces: B, coins: 90, unlockMinutes: 0, starter: B, blurb: 'Round teak table with a cup of chai.' },
  snake_plant: { spaces: B, coins: 50, unlockMinutes: 0, starter: B, blurb: 'Hardy, upright, forgiving.' },
  lantern: { spaces: B, coins: 35, unlockMinutes: 10, blurb: 'Iron and glass, for evenings.' },
  tulsi: { spaces: BG, coins: 45, unlockMinutes: 25, blurb: 'Holy basil in a terracotta pot.' },
  dhurrie_rug: { spaces: B, coins: 70, unlockMinutes: 45, blurb: 'Flat-woven cotton dhurrie.' },
  pothos_hanging: { spaces: B, coins: 60, unlockMinutes: 60, blurb: 'Golden money plant in a hanging bowl.' },
  wind_chime: { spaces: BG, coins: 40, unlockMinutes: 90, blurb: 'Brass tubes on a teak disc.' },
  areca_palm: { spaces: BG, coins: 120, unlockMinutes: 120, blurb: 'A tall clump of areca palm.' },
  wall_shelf: { spaces: B, coins: 80, unlockMinutes: 180, blurb: 'Teak shelf with books and a brass diya.' },
  daybed: { spaces: B, coins: 240, unlockMinutes: 300, blurb: 'Teak daybed with bolsters and a handloom throw.' },
  study_set: { spaces: B, coins: 220, unlockMinutes: 300, blurb: 'Writing desk, cane chair and a brass lamp.' },

  // ---- garden plants and trees (18) ----
  marigold: { spaces: G, coins: 30, unlockMinutes: 0, starter: G, blurb: 'Genda in a terracotta pot. Grows with your focus.' },
  hibiscus: { spaces: G, coins: 45, unlockMinutes: 20, blurb: 'Red hibiscus. Grows with your focus.' },
  rose_bush: { spaces: G, coins: 55, unlockMinutes: 40, blurb: 'A rose bush that flowers as you focus.' },
  jasmine: { spaces: G, coins: 50, unlockMinutes: 60, blurb: 'Mogra: white, fragrant. Grows with your focus.' },
  bougainvillea: { spaces: G, coins: 65, unlockMinutes: 90, blurb: 'Magenta bracts over a sprawling shrub. Grows with your focus.' },
  croton: { spaces: G, coins: 40, unlockMinutes: 30, blurb: 'Fiery variegated leaves.' },
  banana_plant: { spaces: G, coins: 70, unlockMinutes: 120, blurb: 'A dwarf banana with great paddle leaves.' },
  lemon_tree: { spaces: G, coins: 110, unlockMinutes: 200, blurb: 'A small lemon tree in fruit.' },
  ornamental_grass: { spaces: G, coins: 35, unlockMinutes: 30, blurb: 'Fountain grass that moves in the breeze.' },
  frangipani_small: { spaces: G, coins: 140, unlockMinutes: 240, blurb: 'Champa: cream flowers, heady scent.' },
  mango_sapling: { spaces: G, coins: 120, unlockMinutes: 300, blurb: 'A young mango tree.' },
  ashoka_tree: { spaces: G, coins: 130, unlockMinutes: 360, blurb: 'A tall, narrow ashoka.' },
  hanging_basket: { spaces: G, coins: 45, unlockMinutes: 75, blurb: 'Coir basket of trailing petunias.' },
  terracotta_trio: { spaces: G, coins: 60, unlockMinutes: 50, blurb: 'Three terracotta pots of flowers.' },
  stone_urn: { spaces: G, coins: 95, unlockMinutes: 150, blurb: 'A classical urn, planted.' },
  trellis_climber: { spaces: G, coins: 85, unlockMinutes: 180, blurb: 'A timber trellis with a money plant climbing it.' },
  pergola: { spaces: G, coins: 320, unlockMinutes: 600, blurb: 'A timber pergola under a flowering climber.' },
  flower_arch: { spaces: G, coins: 180, unlockMinutes: 420, blurb: 'An iron arch over the path, covered in roses.' },

  // ---- garden furniture and decor (20) ----
  garden_bench: { spaces: G, coins: 150, unlockMinutes: 0, starter: G, blurb: 'A teak slat bench.' },
  wooden_swing: { spaces: G, coins: 280, unlockMinutes: 480, blurb: 'A jhoola on a teak frame.' },
  cafe_set: { spaces: G, coins: 160, unlockMinutes: 300, blurb: 'A bistro table and two folding chairs.' },
  wooden_cart: { spaces: G, coins: 190, unlockMinutes: 360, blurb: 'A timber flower cart.' },
  garden_table: { spaces: G, coins: 80, unlockMinutes: 90, blurb: 'A small square teak table.' },
  brass_lantern: { spaces: G, coins: 55, unlockMinutes: 0, starter: G, blurb: 'A brass lantern with amber glass. Lit at night.' },
  stone_lantern: { spaces: G, coins: 90, unlockMinutes: 150, blurb: 'A carved stone lantern. Lit at night.' },
  fountain: { spaces: G, coins: 300, unlockMinutes: 540, blurb: 'A two-tier sandstone fountain.' },
  birdbath: { spaces: G, coins: 85, unlockMinutes: 120, blurb: 'A stone birdbath.' },
  birdhouse_post: { spaces: G, coins: 60, unlockMinutes: 100, blurb: 'A birdhouse on a post.' },
  bird_feeder: { spaces: G, coins: 40, unlockMinutes: 60, blurb: 'A hanging feeder for the sparrows.' },
  decorative_rocks: { spaces: G, coins: 50, unlockMinutes: 40, blurb: 'Weathered granite boulders.' },
  string_lights: { spaces: G, coins: 90, unlockMinutes: 200, blurb: 'Warm bulbs on a line between two posts.' },
  urli_bowl: { spaces: BG, coins: 70, unlockMinutes: 120, blurb: 'A brass urli with floating marigolds.' },
  diya_stand: { spaces: G, coins: 65, unlockMinutes: 90, blurb: 'A brass stand of five clay diyas. Lit at night.' },
  matka_cluster: { spaces: G, coins: 55, unlockMinutes: 60, blurb: 'Traditional clay matkas, one with tulsi.' },

  // ---- granted, never sold ----
  art_frame: { spaces: B, coins: 0, unlockMinutes: 0, hidden: true, blurb: 'Teak frame for a finished artwork.' },
  easel: { spaces: G, coins: 0, unlockMinutes: 0, hidden: true, blurb: 'A field easel for a finished artwork.' },
  dustbin: { spaces: G, coins: 0, unlockMinutes: 0, hidden: true, starter: G, blurb: 'Anything dropped in is gone for good.' },
  image_rack: { spaces: G, coins: 0, unlockMinutes: 0, hidden: true, starter: G, blurb: 'Finished pictures wait here until they are hung.' },
  dead_sapling: { spaces: SPACES, coins: 0, unlockMinutes: 0, hidden: true, blurb: 'A sapling that gave up when a session was abandoned.' },
  broken_frame: { spaces: SPACES, coins: 0, unlockMinutes: 0, hidden: true, blurb: 'A picture that broke when a session was abandoned.' },
};

/** Coins to clear one penalty object (the only way to remove them). */
export const PENALTY_REMOVAL_COINS = 40;
/** Seconds after a session starts during which leaving costs nothing. */
export const GRACE_SECONDS = 10;

export function storeIdsFor(space: SpaceId): string[] {
  return Object.keys(STORE).filter((id) => STORE[id].spaces.includes(space));
}

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

