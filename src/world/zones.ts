// The greenhouse wings and their botanical zones. Pure data and geometry
// (no three.js), so placement can be tested without a GL context. Zone
// boundaries are rings and sectors in each wing's own floor coordinates
// (metres, origin at the wing's centre); they never change once shipped,
// because a planted specimen remembers the zone and the coordinates it got.

export type WingId =
  | 'central-conservatory'
  | 'northern-arboretum'
  | 'eastern-conservatory'
  | 'western-conservatory'
  | 'southern-conservatory'
  | 'aquatic-pavilion'
  | 'orchid-house'
  | 'desert-pavilion'
  | 'japanese-pavilion'
  | 'rainforest-dome'
  | 'experimental-wing';

export interface ZoneDef {
  id: string;
  name: string;
  blurb: string;
}

export interface WingDef {
  id: WingId;
  name: string;
  /** Built and explorable in this version. Others are planned and shown as such. */
  built: boolean;
  /** Where the wing's centre sits on the world map (metres), for corridors and the map. */
  at: { x: number; z: number };
  zones: ZoneDef[];
  /** How the wing opens: a progression rule over the person's own history. Never payment. */
  unlock: { sessions?: number; minutes?: number; species?: number };
}

const Z = (id: string, name: string, blurb: string): ZoneDef => ({ id, name, blurb });

export const CONSERVATORY_ZONES: ZoneDef[] = [
  Z('central', 'Central Conservatory', 'The plaza under the dome’s crown, round the solar fountain.'),
  Z('rose_terrace', 'Rose & Jasmine Terrace', 'Roses and jasmine along the inner ring.'),
  Z('flower', 'Flower Garden', 'Seasonal beds of lilies, dahlias, tulips and more.'),
  Z('indoor', 'Indoor & Ornamental Garden', 'Shade-lovers and sculptural foliage.'),
  Z('rare', 'Rare Botanical Garden', 'Orchids, anthuriums and other treasures.'),
  Z('experimental', 'Experimental Solarpunk Garden', 'Solar trees, misting and new hybrids.'),
  Z('vertical', 'Vertical Garden', 'Living walls round the inner ring.'),
  Z('tropical', 'Tropical Garden', 'Monstera, palms, ferns and hibiscus.'),
  Z('bamboo', 'Bamboo & Woodland Garden', 'Tall canes and shaded clearings.'),
  Z('zen', 'Japanese Zen Garden', 'Moss, stone and maples.'),
  Z('desert', 'Succulent & Desert Garden', 'Aloe, succulents and dry stone.'),
  Z('herb', 'Medicinal & Herb Garden', 'Tulsi, mint, rosemary and healing herbs.'),
  Z('vegetable', 'Vegetable Garden', 'Raised beds of the kitchen garden.'),
  Z('orchard', 'Fruit Orchard', 'Small fruit trees and berries.'),
  Z('water', 'Water Garden', 'The lotus pond and the stream.'),
];

export const ARBORETUM_ZONES: ZoneDef[] = [
  Z('banyan_grove', 'Banyan Grove', 'The Grand Banyan, its roots, the ring path and the reflecting pond.'),
  Z('japanese_maple', 'Japanese Maple Garden', 'Layered red maples beside the water.'),
  Z('cherry_blossom', 'Cherry Blossom Grove', 'A canopy of pale pink.'),
  Z('flowering', 'Flowering Tree Collection', 'Gulmohar, jacaranda, amaltas and magnolia.'),
  Z('medicinal', 'Medicinal Tree Garden', 'Neem, peepal, ashoka and kadamba.'),
  Z('grand_avenue', 'Grand Tree Avenue', 'The great shade trees along the outer path.'),
  Z('fruit_orchard', 'Fruit Tree Orchard', 'Mango, citrus and apple.'),
  Z('tropical_trees', 'Tropical Tree Collection', 'Coconut and palms.'),
  Z('evergreen', 'Evergreen Forest', 'Pine, cypress, cedar and olive.'),
  Z('rare_trees', 'Rare & Exotic Tree Collection', 'Unusual and precious trees.'),
];

export const WINGS: WingDef[] = [
  { id: 'central-conservatory', name: 'Central Conservatory', built: true, at: { x: 0, z: 0 }, zones: CONSERVATORY_ZONES, unlock: {} },
  { id: 'northern-arboretum', name: 'Northern Arboretum', built: true, at: { x: 0, z: -44 }, zones: ARBORETUM_ZONES, unlock: {} },
  { id: 'eastern-conservatory', name: 'Eastern Conservatory', built: false, at: { x: 34, z: 0 }, zones: [], unlock: { sessions: 40 } },
  { id: 'western-conservatory', name: 'Western Conservatory', built: false, at: { x: -34, z: 0 }, zones: [], unlock: { sessions: 80 } },
  { id: 'southern-conservatory', name: 'Southern Conservatory', built: false, at: { x: 0, z: 34 }, zones: [], unlock: { minutes: 6000 } },
  { id: 'aquatic-pavilion', name: 'Aquatic Pavilion', built: false, at: { x: 30, z: -30 }, zones: [], unlock: { species: 20 } },
  { id: 'orchid-house', name: 'Orchid House', built: false, at: { x: -30, z: -30 }, zones: [], unlock: { species: 30 } },
  { id: 'desert-pavilion', name: 'Desert Pavilion', built: false, at: { x: 30, z: 30 }, zones: [], unlock: { minutes: 12000 } },
  { id: 'japanese-pavilion', name: 'Japanese Pavilion', built: false, at: { x: -30, z: 30 }, zones: [], unlock: { sessions: 150 } },
  { id: 'rainforest-dome', name: 'Rainforest Dome', built: false, at: { x: 0, z: -88 }, zones: [], unlock: { minutes: 24000 } },
  { id: 'experimental-wing', name: 'Experimental Solarpunk Wing', built: false, at: { x: 60, z: 0 }, zones: [], unlock: { sessions: 300 } },
];

export const WING_BY_ID = Object.fromEntries(WINGS.map((w) => [w.id, w])) as Record<WingId, WingDef>;

const DEG = Math.PI / 180;
function sector(x: number, z: number, count: number, offsetDeg = 0): number {
  let a = Math.atan2(z, x) / DEG - offsetDeg;
  a = ((a % 360) + 360) % 360;
  return Math.floor(a / (360 / count)) % count;
}

/** The conservatory's floor: the plaza, an inner ring of six beds and an outer ring of seven. */
export const CONSERVATORY_RING = 7.2;
export function conservatoryZoneAt(x: number, z: number, water: boolean): string {
  if (water) return 'water';
  const r = Math.hypot(x, z);
  if (r < 4.4) return 'central';
  if (r < CONSERVATORY_RING) return ['rose_terrace', 'flower', 'indoor', 'rare', 'experimental', 'vertical'][sector(x, z, 6, -30)]!;
  return ['tropical', 'bamboo', 'zen', 'desert', 'herb', 'vegetable', 'orchard'][sector(x, z, 7, -20)]!;
}

/** The arboretum's floor: the banyan grove inside, four collections in the middle ring, five outside the ring path. */
export const ARBORETUM_RING = 16.4;
export function arboretumZoneAt(x: number, z: number, water: boolean): string {
  const r = Math.hypot(x, z);
  if (water || r < 12.4) return 'banyan_grove';
  if (r < ARBORETUM_RING) return ['japanese_maple', 'cherry_blossom', 'flowering', 'medicinal'][sector(x, z, 4, 20)]!;
  return ['grand_avenue', 'fruit_orchard', 'tropical_trees', 'evergreen', 'rare_trees'][sector(x, z, 5, 10)]!;
}

// ---- where each kind of specimen belongs ----------------------------------------------------------

/** Zones by 3D model id (src/prototype/solarpunk/catalog.ts), best first. */
const BY_MODEL: Record<string, string[]> = {
  rose: ['rose_terrace', 'flower'], jasmine: ['rose_terrace', 'flower'],
  marigold: ['flower', 'herb'], dahlia: ['flower'], chrysanthemum: ['flower'], tulip: ['flower'], petunia: ['flower', 'vertical'], gerbera: ['flower'],
  carnation: ['flower', 'rose_terrace'], peony: ['flower', 'rose_terrace'], hydrangea: ['flower', 'zen'], lily: ['flower', 'water'], sunflower: ['flower', 'vegetable'],
  lavender: ['flower', 'herb'], bougainvillea: ['vertical', 'flower'],
  hibiscus: ['tropical', 'flower'], monstera: ['tropical', 'indoor'], fern: ['bamboo', 'tropical', 'zen'], areca_palm: ['tropical', 'indoor'], calathea: ['indoor', 'tropical'],
  anthurium: ['rare', 'indoor'], orchid: ['rare', 'tropical'], peace_lily: ['indoor'], snake_plant: ['indoor', 'desert'], croton: ['indoor', 'experimental'],
  tulsi: ['herb', 'central'], mint: ['herb', 'vegetable'], rosemary: ['herb', 'desert'], aloe_vera: ['desert', 'herb'], lotus: ['water'],
  // trees
  banyan: ['grand_avenue', 'medicinal'], peepal: ['medicinal', 'grand_avenue'], neem: ['medicinal', 'grand_avenue'], ashoka: ['medicinal', 'grand_avenue'],
  kadamba: ['medicinal', 'flowering'], mango: ['fruit_orchard'], lemon: ['fruit_orchard', 'orchard'], orange: ['fruit_orchard', 'orchard'], apple: ['fruit_orchard', 'orchard'],
  coconut: ['tropical_trees', 'tropical'], gulmohar: ['flowering'], jacaranda: ['flowering'], amaltas: ['flowering'], magnolia: ['flowering', 'rare_trees'],
  cherry_blossom: ['cherry_blossom', 'zen'], japanese_maple: ['japanese_maple', 'zen'], olive: ['evergreen', 'fruit_orchard'], cypress: ['evergreen'], pine: ['evergreen'],
};

/** Zones for a specimen: by the app's own species where the model is a stand-in (vegetables, bamboo, bonsai…), else by its model. */
const BY_APP: Record<string, string[]> = {
  bamboo: ['bamboo'], bonsai: ['zen'], strawberry: ['vegetable', 'orchard'], watermelon: ['vegetable'], tomato: ['vegetable'], chilli: ['vegetable'], brinjal: ['vegetable'],
  carrot: ['vegetable'], radish: ['vegetable'], pumpkin: ['vegetable'], cucumber: ['vegetable'], peas: ['vegetable'], coriander: ['herb', 'vegetable'], thyme: ['herb'],
  lemongrass: ['herb'], ashwagandha: ['herb'], brahmi: ['herb', 'water'], giloy: ['herb', 'vertical'], chamomile: ['herb', 'flower'], sage: ['herb'], turmeric: ['herb'], ginger: ['herb'],
  zz_plant: ['indoor'], spider_plant: ['indoor', 'vertical'], rubber_plant: ['indoor'], fiddle_leaf_fig: ['indoor'], philodendron: ['tropical', 'indoor'],
  palm: ['tropical_trees'], papaya: ['tropical_trees', 'fruit_orchard'], banana: ['tropical', 'tropical_trees'], guava: ['fruit_orchard'], pomegranate: ['fruit_orchard'],
  cedar: ['evergreen'], arjuna: ['medicinal'], plumeria: ['flowering'], maple: ['japanese_maple'],
};

export function zonesFor(appSpeciesId: string, modelId: string, kind: 'plant' | 'tree'): string[] {
  const z = BY_APP[appSpeciesId] ?? BY_MODEL[modelId] ?? [];
  return z.length ? z : kind === 'tree' ? ['rare_trees'] : ['flower'];
}
