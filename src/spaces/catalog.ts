// The store: one hundred things for the balcony, the garden and the room,
// what they cost in coins and what they are worth in rupees, and when
// they unlock. Item ids match the rendered packs. Prices are coins (one
// coin per focused minute); the rupee value is shown in the inventory.
import { ImageSourcePropType } from 'react-native';
import { SpaceId } from './packTypes';

export const SPACES: SpaceId[] = ['balcony', 'garden', 'room'];

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
const R: SpaceId[] = ['room'];
const BG: SpaceId[] = ['balcony', 'garden'];
const BR: SpaceId[] = ['balcony', 'room'];
const GR: SpaceId[] = ['garden', 'room'];

export const STORE: Record<string, StoreEntry> = {
  // ---- balcony (12) ----
  cane_lounge_chair: { spaces: B, coins: 220, unlockMinutes: 0, starter: B, blurb: 'Teak frame, hand-woven cane, linen cushions.' },
  teak_coffee_table: { spaces: B, coins: 90, unlockMinutes: 0, starter: B, blurb: 'Round teak table with a cup of chai.' },
  snake_plant: { spaces: BR, coins: 50, unlockMinutes: 0, starter: B, blurb: 'Hardy, upright, forgiving.' },
  lantern: { spaces: BR, coins: 35, unlockMinutes: 10, blurb: 'Iron and glass, for evenings.' },
  tulsi: { spaces: BG, coins: 45, unlockMinutes: 25, blurb: 'Holy basil in a terracotta pot.' },
  dhurrie_rug: { spaces: BR, coins: 70, unlockMinutes: 45, blurb: 'Flat-woven cotton dhurrie.' },
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

  // ---- room furniture (12) ----
  bedside_table: { spaces: R, coins: 120, unlockMinutes: 0, starter: R, blurb: 'A teak bedside table with a drawer.' },
  table_lamp: { spaces: R, coins: 60, unlockMinutes: 0, starter: R, blurb: 'A ceramic lamp with a linen shade. Lit at night.' },
  side_chair: { spaces: R, coins: 110, unlockMinutes: 0, starter: R, blurb: 'A cane-backed chair.' },
  small_table: { spaces: R, coins: 70, unlockMinutes: 0, starter: R, blurb: 'A small round teak table.' },
  study_desk: { spaces: R, coins: 220, unlockMinutes: 240, blurb: 'A teak writing desk.' },
  bookshelf: { spaces: R, coins: 260, unlockMinutes: 360, blurb: 'Open teak shelving, with books.' },
  lounge_chair: { spaces: R, coins: 230, unlockMinutes: 300, blurb: 'A cane lounge chair with linen cushions.' },
  floor_cushions: { spaces: R, coins: 70, unlockMinutes: 60, blurb: 'Three block-printed floor cushions.' },
  cabinet: { spaces: R, coins: 240, unlockMinutes: 420, blurb: 'A low teak cabinet.' },
  floor_lamp: { spaces: R, coins: 130, unlockMinutes: 180, blurb: 'A brass floor lamp. Lit at night.' },
  pouf: { spaces: R, coins: 60, unlockMinutes: 45, blurb: 'A handloom pouf.' },
  pendant_light: { spaces: R, coins: 110, unlockMinutes: 200, blurb: 'A rattan pendant. Lit at night.' },

  // ---- room plants and flowers (10) ----
  monstera: { spaces: R, coins: 90, unlockMinutes: 30, blurb: 'A monstera in a charcoal pot.' },
  bonsai: { spaces: R, coins: 150, unlockMinutes: 240, blurb: 'A ficus bonsai in a stone tray.' },
  fiddle_fig: { spaces: R, coins: 130, unlockMinutes: 180, blurb: 'A fiddle-leaf fig.' },
  rubber_plant: { spaces: R, coins: 80, unlockMinutes: 90, blurb: 'A glossy rubber plant.' },
  pothos_table: { spaces: R, coins: 55, unlockMinutes: 60, blurb: 'A money plant hanging from the ceiling.' },
  succulent: { spaces: R, coins: 25, unlockMinutes: 0, blurb: 'An echeveria in a small pot.' },
  aloe: { spaces: R, coins: 30, unlockMinutes: 10, blurb: 'Aloe vera on the sill.' },
  dried_branches: { spaces: R, coins: 60, unlockMinutes: 120, blurb: 'Bare branches in a tall vase.' },
  pampas: { spaces: R, coins: 55, unlockMinutes: 90, blurb: 'Pampas plumes in a ceramic vase.' },
  orchid: { spaces: R, coins: 70, unlockMinutes: 150, blurb: 'A phalaenopsis orchid.' },
  fresh_flowers: { spaces: R, coins: 40, unlockMinutes: 20, blurb: 'Fresh flowers in a glass vase.' },

  // ---- room objects (28) ----
  ceramic_vase: { spaces: R, coins: 35, unlockMinutes: 15, blurb: 'A matte ceramic vase.' },
  brass_vase: { spaces: R, coins: 45, unlockMinutes: 30, blurb: 'A slender brass vase.' },
  terracotta_vase: { spaces: R, coins: 60, unlockMinutes: 60, blurb: 'A terracotta floor vase.' },
  glass_vase: { spaces: R, coins: 40, unlockMinutes: 30, blurb: 'A glass vase with eucalyptus.' },
  ceramic_bowl: { spaces: R, coins: 30, unlockMinutes: 15, blurb: 'A glazed ceramic bowl.' },
  marble_bowl: { spaces: R, coins: 75, unlockMinutes: 120, blurb: 'A marble bowl of oranges.' },
  brass_tray: { spaces: R, coins: 50, unlockMinutes: 45, blurb: 'A brass tray with two cups.' },
  fruit_bowl: { spaces: R, coins: 40, unlockMinutes: 30, blurb: 'A rattan bowl of fruit.' },
  rattan_basket: { spaces: R, coins: 50, unlockMinutes: 40, blurb: 'A rattan basket with a rolled throw.' },
  pillar_candles: { spaces: R, coins: 30, unlockMinutes: 10, blurb: 'Three pillar candles. Lit in the evening.' },
  scented_candle: { spaces: R, coins: 35, unlockMinutes: 20, blurb: 'A candle in an amber jar. Lit in the evening.' },
  hurricane_lantern: { spaces: R, coins: 55, unlockMinutes: 75, blurb: 'A glass hurricane lantern. Lit in the evening.' },
  ceramic_lamp: { spaces: R, coins: 70, unlockMinutes: 90, blurb: 'A cream ceramic lamp. Lit at night.' },
  brass_lamp: { spaces: R, coins: 90, unlockMinutes: 150, blurb: 'A brass lamp with a dark shade. Lit at night.' },
  wall_sconce: { spaces: R, coins: 75, unlockMinutes: 180, blurb: 'A brass wall sconce. Lit at night.' },
  book_stack: { spaces: R, coins: 30, unlockMinutes: 10, blurb: 'A stack of hardcovers.' },
  bookends: { spaces: R, coins: 45, unlockMinutes: 45, blurb: 'A row of books between stone bookends.' },
  globe: { spaces: R, coins: 60, unlockMinutes: 90, blurb: 'A miniature globe on a brass stand.' },
  mantel_clock: { spaces: R, coins: 70, unlockMinutes: 120, blurb: 'A teak mantel clock.' },
  vintage_camera: { spaces: R, coins: 65, unlockMinutes: 100, blurb: 'A rangefinder camera from another time.' },
  gramophone: { spaces: R, coins: 140, unlockMinutes: 300, blurb: 'A gramophone with a brass horn.' },
  vintage_telephone: { spaces: R, coins: 75, unlockMinutes: 150, blurb: 'A bakelite rotary telephone.' },
  brass_diya: { spaces: R, coins: 25, unlockMinutes: 0, blurb: 'A brass diya. Lit in the evening.' },
  kalash: { spaces: R, coins: 50, unlockMinutes: 60, blurb: 'A brass kalash with mango leaves and a coconut.' },
  wooden_elephant: { spaces: R, coins: 60, unlockMinutes: 75, blurb: 'A carved teak elephant.' },
  jharokha: { spaces: R, coins: 110, unlockMinutes: 240, blurb: 'A carved jharokha for the wall.' },
  marble_sculpture: { spaces: R, coins: 120, unlockMinutes: 240, blurb: 'An abstract marble loop on a plinth.' },
  round_mirror: { spaces: R, coins: 90, unlockMinutes: 150, blurb: 'A round mirror in a brass rim.' },
  arched_mirror: { spaces: R, coins: 160, unlockMinutes: 300, blurb: 'A tall arched mirror, leaning.' },
  knitted_blanket: { spaces: R, coins: 45, unlockMinutes: 45, blurb: 'A folded knitted blanket.' },
  old_map: { spaces: R, coins: 85, unlockMinutes: 200, blurb: 'A framed antique map.' },

  // ---- granted, never sold ----
  art_frame: { spaces: ['balcony', 'room'], coins: 0, unlockMinutes: 0, hidden: true, blurb: 'Teak frame for a finished artwork.' },
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

/** Jigsaw size for every artwork. */
export const PUZZLE_ROWS = 16;
export const PUZZLE_COLS = 16;
export const PUZZLE_PIECES = PUZZLE_ROWS * PUZZLE_COLS;
/** One piece per focused minute. */
export const MINUTES_PER_PIECE = 1;
/** Lifetime minutes before the first artwork arrives. */
export const FIRST_ART_MINUTES = 25;
