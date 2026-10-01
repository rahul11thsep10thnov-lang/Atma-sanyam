// The FOCUS Plant Library: 100 Indian balcony plants, one image file each,
// all on the same photographic template (see docs/PLANT_LIBRARY.md). The
// manifest JSON is the single source of truth — generated from
// scripts/plantLibrary/species.mjs — and the image map is generated from it,
// so adding or renaming a plant never touches this file.
import manifest from '../../assets/plants/FOCUS_PLANT_LIBRARY/plant_manifest.json';
import { PLANT_IMAGES } from './plantImages';

export type PlantCategory = 'flowering' | 'foliage' | 'succulent' | 'herb' | 'specialty';

export type PlantGrowthForm =
  | 'shrub'
  | 'bushy'
  | 'vine'
  | 'trailing'
  | 'rosette'
  | 'blades'
  | 'grass'
  | 'broadleaf'
  | 'palm'
  | 'tree'
  | 'bonsai'
  | 'fern'
  | 'cactusPad'
  | 'cactusSegment'
  | 'caudex'
  | 'feather'
  | 'cane'
  | 'conifer';

export type PlantRootType =
  | 'fine-branching'
  | 'fibrous'
  | 'taproot'
  | 'woody'
  | 'adventitious'
  | 'rhizome'
  | 'shallow'
  | 'compact'
  | 'tuberous'
  | 'fleshy'
  | 'bulb';

export interface PlantSpecies {
  id: number;
  name: string;
  botanicalName: string;
  filename: string;
  category: PlantCategory;
  indoor: boolean;
  outdoor: boolean;
  growthForm: PlantGrowthForm;
  rootType: PlantRootType;
  /** Dominant foliage colour — what the environment engine tints sway/glow with. */
  leafColor: string;
  /** Dominant flower/fruit colour, or null for foliage-only plants. */
  accentColor: string | null;
  hint: string;
  /** True while the file is the procedural stand-in rather than a generated photo. */
  placeholder: boolean;
}

export const PLANT_LIBRARY: PlantSpecies[] = manifest.plants as PlantSpecies[];

export const PLANT_CATEGORY_LABELS: Record<PlantCategory, string> = manifest.categories as Record<PlantCategory, string>;

/** Fraction of the image height occupied by the soil cross-section (bottom). */
export const PLANT_ROOT_ZONE_FRACTION: number = manifest.rootZoneFraction;

const BY_ID = new Map(PLANT_LIBRARY.map((p) => [p.id, p]));

export function getPlantSpecies(id: number): PlantSpecies | undefined {
  return BY_ID.get(id);
}

/** Bundled image source for `<Image source={plantImage(id)} />`. */
export function plantImage(id: number): number | undefined {
  return PLANT_IMAGES[id];
}

export function plantsInCategory(category: PlantCategory): PlantSpecies[] {
  return PLANT_LIBRARY.filter((p) => p.category === category);
}

/**
 * How each growth form responds to the environment engine's wind and
 * sunlight (brief: "same light, different physical interaction"). Sway is a
 * multiplier on the engine's plantMotion; glossiness scales specular
 * highlights; translucency lets backlight through petals and thin leaves.
 */
export interface PlantLightResponse {
  sway: number;
  glossiness: number;
  translucency: number;
  /** Shadow pattern the plant casts — informs the shadow sprite/mesh choice. */
  shadow: 'soft' | 'narrow' | 'dappled' | 'fine' | 'solid';
}

export const GROWTH_FORM_LIGHT_RESPONSE: Record<PlantGrowthForm, PlantLightResponse> = {
  shrub: { sway: 0.8, glossiness: 0.6, translucency: 0.5, shadow: 'dappled' },
  bushy: { sway: 1.0, glossiness: 0.4, translucency: 0.6, shadow: 'soft' },
  vine: { sway: 1.2, glossiness: 0.7, translucency: 0.5, shadow: 'dappled' },
  trailing: { sway: 1.3, glossiness: 0.5, translucency: 0.3, shadow: 'fine' },
  rosette: { sway: 0.2, glossiness: 0.5, translucency: 0.7, shadow: 'solid' },
  blades: { sway: 0.3, glossiness: 0.6, translucency: 0.3, shadow: 'narrow' },
  grass: { sway: 1.5, glossiness: 0.3, translucency: 0.6, shadow: 'fine' },
  broadleaf: { sway: 0.6, glossiness: 0.8, translucency: 0.5, shadow: 'dappled' },
  palm: { sway: 1.1, glossiness: 0.5, translucency: 0.4, shadow: 'fine' },
  tree: { sway: 0.5, glossiness: 0.6, translucency: 0.3, shadow: 'dappled' },
  bonsai: { sway: 0.3, glossiness: 0.5, translucency: 0.2, shadow: 'dappled' },
  fern: { sway: 1.3, glossiness: 0.3, translucency: 0.7, shadow: 'fine' },
  cactusPad: { sway: 0.05, glossiness: 0.3, translucency: 0.1, shadow: 'solid' },
  cactusSegment: { sway: 0.4, glossiness: 0.5, translucency: 0.3, shadow: 'narrow' },
  caudex: { sway: 0.2, glossiness: 0.6, translucency: 0.4, shadow: 'solid' },
  feather: { sway: 0.7, glossiness: 0.9, translucency: 0.2, shadow: 'narrow' },
  cane: { sway: 0.4, glossiness: 0.6, translucency: 0.3, shadow: 'narrow' },
  conifer: { sway: 0.4, glossiness: 0.2, translucency: 0.1, shadow: 'fine' },
};
