// The 3D collection: 30 plants and 19 trees with the information the
// selection screen shows, and one function that turns (species, stage) into a
// merged geometry. Geometries are cached; two specimens of one species at one
// stage share it (a production build would instance them).
import * as THREE from 'three';
import { GeoBuilder } from './geo';
import { PLANT_BUILDERS } from './plants';
import { TREE_BUILDERS } from './trees';
import { PLANT_BUILDERS_2 } from './plants2';
import { TREE_BUILDERS_2 } from './trees2';
import { hashStr, rng } from './rng';

export type SpeciesKind = 'plant' | 'tree';

export interface Species {
  id: string;
  name: string;
  hindi: string;
  scientific: string;
  kind: SpeciesKind;
  /** Grows on water (placed on a pond slot). */
  water?: boolean;
  blurb: string;
  /** Botanical zones it belongs in, best first (ids from world/wings.ts). */
  zones?: string[];
  /** Not a collectable species (the wilted sapling). */
  hidden?: boolean;
}

export const SPECIES: Species[] = [
  { id: 'rose', name: 'Rose', hindi: 'गुलाब', scientific: 'Rosa', kind: 'plant', blurb: 'Thorned canes, glossy leaflets and layered crimson blooms.' },
  { id: 'jasmine', name: 'Jasmine', hindi: 'चमेली', scientific: 'Jasminum sambac', kind: 'plant', blurb: 'Small white stars that open at dusk.' },
  { id: 'marigold', name: 'Marigold', hindi: 'गेंदा', scientific: 'Tagetes erecta', kind: 'plant', blurb: 'Tough orange pom-poms above lacy leaves.' },
  { id: 'hibiscus', name: 'Hibiscus', hindi: 'गुड़हल', scientific: 'Hibiscus rosa-sinensis', kind: 'plant', blurb: 'Big red trumpets with a long golden stamen.' },
  { id: 'orchid', name: 'Orchid', hindi: 'ऑर्किड', scientific: 'Phalaenopsis', kind: 'plant', blurb: 'Thick leaves and an arching spray of moth-like flowers.' },
  { id: 'lotus', name: 'Lotus', hindi: 'कमल', scientific: 'Nelumbo nucifera', kind: 'plant', water: true, blurb: 'Round leaves that shed water and pink flowers on tall stalks.' },
  { id: 'lavender', name: 'Lavender', hindi: 'लैवेंडर', scientific: 'Lavandula angustifolia', kind: 'plant', blurb: 'Grey-green needles and violet spikes.' },
  { id: 'sunflower', name: 'Sunflower', hindi: 'सूरजमुखी', scientific: 'Helianthus annuus', kind: 'plant', blurb: 'A tall stalk with a great golden face.' },
  { id: 'monstera', name: 'Monstera', hindi: 'मॉन्स्टेरा', scientific: 'Monstera deliciosa', kind: 'plant', blurb: 'Heart-shaped leaves that split as the plant matures.' },
  { id: 'fern', name: 'Fern', hindi: 'फर्न', scientific: 'Nephrolepis', kind: 'plant', blurb: 'Arching fronds of fine leaflets.' },
  { id: 'lily', name: 'Lily', hindi: 'लिली', scientific: 'Lilium', kind: 'plant', blurb: 'Six recurved, freckled tepals and long stamens on a leafy stalk.' },
  { id: 'dahlia', name: 'Dahlia', hindi: 'डहलिया', scientific: 'Dahlia pinnata', kind: 'plant', blurb: 'Layered pompons of tightly cupped petals.' },
  { id: 'chrysanthemum', name: 'Chrysanthemum', hindi: 'गुलदाउदी', scientific: 'Chrysanthemum morifolium', kind: 'plant', blurb: 'A dense mound of many-rayed autumn flowers.' },
  { id: 'tulip', name: 'Tulip', hindi: 'ट्यूलिप', scientific: 'Tulipa', kind: 'plant', blurb: 'A closed cup of six tepals above two broad blue-green leaves.' },
  { id: 'petunia', name: 'Petunia', hindi: 'पेटूनिया', scientific: 'Petunia × atkinsiana', kind: 'plant', blurb: 'Sprawling stems and open five-lobed funnels.' },
  { id: 'bougainvillea', name: 'Bougainvillea', hindi: 'बोगनविलिया', scientific: 'Bougainvillea glabra', kind: 'plant', blurb: 'Woody thorny canes smothered in papery magenta bracts.' },
  { id: 'gerbera', name: 'Gerbera', hindi: 'जरबेरा', scientific: 'Gerbera jamesonii', kind: 'plant', blurb: 'A flat bright daisy on a bare stalk over lobed leaves.' },
  { id: 'carnation', name: 'Carnation', hindi: 'कार्नेशन', scientific: 'Dianthus caryophyllus', kind: 'plant', blurb: 'Grey-green grassy leaves and ruffled, fringed heads.' },
  { id: 'peony', name: 'Peony', hindi: 'पियोनी', scientific: 'Paeonia lactiflora', kind: 'plant', blurb: 'Huge many-petalled globes over deeply cut leaves.' },
  { id: 'hydrangea', name: 'Hydrangea', hindi: 'हाइड्रेंजिया', scientific: 'Hydrangea macrophylla', kind: 'plant', blurb: 'Mophead balls of tiny blue, violet, pink or white florets.' },
  { id: 'calathea', name: 'Calathea', hindi: 'कैलाथिया', scientific: 'Goeppertia', kind: 'plant', blurb: 'Painted, feather-striped leaves that fold up at night.' },
  { id: 'anthurium', name: 'Anthurium', hindi: 'एन्थुरियम', scientific: 'Anthurium andraeanum', kind: 'plant', blurb: 'Glossy heart leaves, a waxy red spathe and a golden spadix.' },
  { id: 'peace_lily', name: 'Peace Lily', hindi: 'पीस लिली', scientific: 'Spathiphyllum', kind: 'plant', blurb: 'Dark arching leaves and white hooded flowers.' },
  { id: 'areca_palm', name: 'Areca Palm', hindi: 'एरेका पाम', scientific: 'Dypsis lutescens', kind: 'plant', blurb: 'Clumping golden ringed canes with arching feather fronds.' },
  { id: 'snake_plant', name: 'Snake Plant', hindi: 'स्नेक प्लांट', scientific: 'Dracaena trifasciata', kind: 'plant', blurb: 'Stiff banded swords with golden edges.' },
  { id: 'croton', name: 'Croton', hindi: 'क्रोटन', scientific: 'Codiaeum variegatum', kind: 'plant', blurb: 'Leathery leaves splashed red, orange and gold.' },
  { id: 'tulsi', name: 'Tulsi', hindi: 'तुलसी', scientific: 'Ocimum tenuiflorum', kind: 'plant', blurb: 'Holy basil: a bushy, purple-stemmed herb with flower spikes.' },
  { id: 'aloe_vera', name: 'Aloe Vera', hindi: 'घृतकुमारी', scientific: 'Aloe barbadensis', kind: 'plant', blurb: 'A rosette of thick, spotted, toothed succulent leaves.' },
  { id: 'mint', name: 'Mint', hindi: 'पुदीना', scientific: 'Mentha', kind: 'plant', blurb: 'Square creeping stems with paired wrinkled leaves.' },
  { id: 'rosemary', name: 'Rosemary', hindi: 'रोज़मेरी', scientific: 'Salvia rosmarinus', kind: 'plant', blurb: 'Woody stems of needle leaves and pale blue flowers.' },
  { id: 'wilted_sapling', name: 'Wilted sapling', hindi: 'मुरझाया पौधा', scientific: '—', kind: 'plant', hidden: true, blurb: 'Left by a session that was stopped early.' },
  { id: 'banyan', name: 'Banyan', hindi: 'बरगद', scientific: 'Ficus benghalensis', kind: 'tree', blurb: 'The great sheltering tree of India, rooting from its own branches.' },
  { id: 'peepal', name: 'Peepal', hindi: 'पीपल', scientific: 'Ficus religiosa', kind: 'tree', blurb: 'Heart-shaped leaves with long tips that tremble in any breeze.' },
  { id: 'neem', name: 'Neem', hindi: 'नीम', scientific: 'Azadirachta indica', kind: 'tree', blurb: 'Feathery bitter leaves and deep shade.' },
  { id: 'mango', name: 'Mango', hindi: 'आम', scientific: 'Mangifera indica', kind: 'tree', blurb: 'A dense dark crown hung with fruit in season.' },
  { id: 'coconut', name: 'Coconut', hindi: 'नारियल', scientific: 'Cocos nucifera', kind: 'tree', blurb: 'A curved ringed trunk and a crown of long fronds.' },
  { id: 'gulmohar', name: 'Gulmohar', hindi: 'गुलमोहर', scientific: 'Delonix regia', kind: 'tree', blurb: 'A wide umbrella of feathery leaves flaming with red flowers.' },
  { id: 'cherry_blossom', name: 'Cherry Blossom', hindi: 'चेरी ब्लॉसम', scientific: 'Prunus serrulata', kind: 'tree', blurb: 'Dark branches wrapped in pale pink blossom.' },
  { id: 'japanese_maple', name: 'Japanese Maple', hindi: 'जापानी मेपल', scientific: 'Acer palmatum', kind: 'tree', blurb: 'Layered branches of deep red, star-shaped leaves.' },
  { id: 'ashoka', name: 'Ashoka', hindi: 'अशोक', scientific: 'Monoon longifolium', kind: 'tree', blurb: 'A tall narrow column of drooping, wavy leaves.' },
  { id: 'jacaranda', name: 'Jacaranda', hindi: 'जकरांदा', scientific: 'Jacaranda mimosifolia', kind: 'tree', blurb: 'An open umbrella of ferny leaves and violet trumpets.' },
  { id: 'olive', name: 'Olive', hindi: 'जैतून', scientific: 'Olea europaea', kind: 'tree', blurb: 'A twisted trunk, small silver leaves and olives.' },
  { id: 'lemon', name: 'Lemon', hindi: 'नींबू', scientific: 'Citrus limon', kind: 'tree', blurb: 'A compact glossy crown, white blossom, then yellow fruit.' },
  { id: 'orange', name: 'Orange', hindi: 'संतरा', scientific: 'Citrus sinensis', kind: 'tree', blurb: 'A round dark crown hung with orange fruit.' },
  { id: 'apple', name: 'Apple', hindi: 'सेब', scientific: 'Malus domestica', kind: 'tree', blurb: 'A spreading crown, pink-white blossom, then red apples.' },
  { id: 'cypress', name: 'Cypress', hindi: 'सरू', scientific: 'Cupressus sempervirens', kind: 'tree', blurb: 'A dense, narrow, dark-green flame.' },
  { id: 'pine', name: 'Pine', hindi: 'चीड़', scientific: 'Pinus roxburghii', kind: 'tree', blurb: 'A straight trunk with whorled tiers of needles.' },
  { id: 'magnolia', name: 'Magnolia', hindi: 'मैगनोलिया', scientific: 'Magnolia grandiflora', kind: 'tree', blurb: 'Big glossy leaves and creamy goblet flowers.' },
  { id: 'amaltas', name: 'Amaltas', hindi: 'अमलतास', scientific: 'Cassia fistula', kind: 'tree', blurb: 'Long hanging chains of golden flowers.' },
  { id: 'kadamba', name: 'Kadamba', hindi: 'कदंब', scientific: 'Neolamarckia cadamba', kind: 'tree', blurb: 'Horizontal tiers of big leaves and orange ball flowers.' },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const PLANTS = SPECIES.filter((s) => s.kind === 'plant' && !s.hidden);
export const TREES = SPECIES.filter((s) => s.kind === 'tree');

const cache = new Map<string, THREE.BufferGeometry>();

export interface BuiltGeometry {
  geometry: THREE.BufferGeometry;
  triangles: number;
  height: number;
}

const meta = new WeakMap<THREE.BufferGeometry, { triangles: number; height: number }>();

/** The geometry of one species at one growth stage (1..7); `variant` makes a different individual. */
export const LOD_DETAIL = [1, 0.4, 0.2];

export function specimenGeometry(speciesId: string, stage: number, variant = 0, lod = 0): BuiltGeometry {
  const st = Math.max(1, Math.min(7, Math.round(stage)));
  const key = `${speciesId}:${st}:${variant}:${lod}`;
  let g = cache.get(key);
  if (!g) {
    const build = PLANT_BUILDERS[speciesId] ?? PLANT_BUILDERS_2[speciesId] ?? TREE_BUILDERS[speciesId] ?? TREE_BUILDERS_2[speciesId];
    if (!build) throw new Error(`unknown species ${speciesId}`);
    const b = new GeoBuilder();
    b.detail = LOD_DETAIL[lod] ?? 1;
    // the same seed at every level, so a specimen keeps its shape as it changes detail
    build(b, rng(hashStr(`${speciesId}:${st}:${variant}`)), st);
    g = b.build();
    g.boundingBox ??= new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);
    meta.set(g, { triangles: b.triangleCount, height: g.boundingBox.max.y });
    cache.set(key, g);
  }
  const m = meta.get(g)!;
  return { geometry: g, triangles: m.triangles, height: m.height };
}

export function disposeSpecimenCache(): void {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}

/** Every one of the app's 84 species (src/paradise/catalog.ts) shown by a 3D
 * model: its own where one exists, otherwise the closest look-alike. `exact`
 * is false for a stand-in, so the UI can say so. */
const PROXY: Record<string, string> = {
  daffodil: 'tulip', iris: 'lily', gardenia: 'jasmine', plumeria: 'magnolia', maple: 'japanese_maple', palm: 'coconut', cedar: 'pine',
  arjuna: 'neem', fiddle_leaf_fig: 'monstera', rubber_plant: 'anthurium', philodendron: 'monstera', zz_plant: 'snake_plant', bonsai: 'japanese_maple',
  bamboo: 'areca_palm', spider_plant: 'snake_plant', pomegranate: 'apple', guava: 'mango', papaya: 'coconut', banana: 'areca_palm', strawberry: 'mint',
  watermelon: 'petunia', tomato: 'tulsi', chilli: 'tulsi', brinjal: 'tulsi', carrot: 'fern', radish: 'fern', pumpkin: 'petunia', cucumber: 'petunia',
  peas: 'mint', coriander: 'mint', thyme: 'rosemary', lemongrass: 'carnation', ashwagandha: 'tulsi', brahmi: 'mint', giloy: 'bougainvillea',
  chamomile: 'gerbera', sage: 'rosemary', turmeric: 'calathea', ginger: 'calathea',
};

export function modelFor(appSpeciesId: string): { id: string; exact: boolean } | null {
  if (SPECIES_BY_ID[appSpeciesId]) return { id: appSpeciesId, exact: true };
  const p = PROXY[appSpeciesId];
  return p && SPECIES_BY_ID[p] ? { id: p, exact: false } : null;
}
