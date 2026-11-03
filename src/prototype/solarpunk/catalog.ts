// The prototype's collection: 10 plants and 8 trees with the information the
// selection screen shows, and one function that turns (species, stage) into a
// merged geometry. Geometries are cached; two specimens of one species at one
// stage share it (a production build would instance them).
import * as THREE from 'three';
import { GeoBuilder } from './geo';
import { PLANT_BUILDERS } from './plants';
import { TREE_BUILDERS } from './trees';
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
  { id: 'banyan', name: 'Banyan', hindi: 'बरगद', scientific: 'Ficus benghalensis', kind: 'tree', blurb: 'The great sheltering tree of India, rooting from its own branches.' },
  { id: 'peepal', name: 'Peepal', hindi: 'पीपल', scientific: 'Ficus religiosa', kind: 'tree', blurb: 'Heart-shaped leaves with long tips that tremble in any breeze.' },
  { id: 'neem', name: 'Neem', hindi: 'नीम', scientific: 'Azadirachta indica', kind: 'tree', blurb: 'Feathery bitter leaves and deep shade.' },
  { id: 'mango', name: 'Mango', hindi: 'आम', scientific: 'Mangifera indica', kind: 'tree', blurb: 'A dense dark crown hung with fruit in season.' },
  { id: 'coconut', name: 'Coconut', hindi: 'नारियल', scientific: 'Cocos nucifera', kind: 'tree', blurb: 'A curved ringed trunk and a crown of long fronds.' },
  { id: 'gulmohar', name: 'Gulmohar', hindi: 'गुलमोहर', scientific: 'Delonix regia', kind: 'tree', blurb: 'A wide umbrella of feathery leaves flaming with red flowers.' },
  { id: 'cherry_blossom', name: 'Cherry Blossom', hindi: 'चेरी ब्लॉसम', scientific: 'Prunus serrulata', kind: 'tree', blurb: 'Dark branches wrapped in pale pink blossom.' },
  { id: 'japanese_maple', name: 'Japanese Maple', hindi: 'जापानी मेपल', scientific: 'Acer palmatum', kind: 'tree', blurb: 'Layered branches of deep red, star-shaped leaves.' },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const PLANTS = SPECIES.filter((s) => s.kind === 'plant');
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
    const build = PLANT_BUILDERS[speciesId] ?? TREE_BUILDERS[speciesId];
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
