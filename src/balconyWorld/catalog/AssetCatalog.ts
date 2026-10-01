import { AssetDefinition } from '../state/types';

/** The bundled starter catalog (architecture doc, section H/K). Every entry
 * here is a PLACEHOLDER built from primitives; swapping one for real art is
 * `kind: 'glb', ref: '<uri>', placeholder: false` — nothing else changes.
 * A remote catalog served by the API merges over this map later. */
export const ASSET_CATALOG: Record<string, AssetDefinition> = {
  sofa_rattan_01: {
    id: 'sofa_rattan_01',
    name: 'Rattan sofa',
    category: 'FURNITURE',
    kind: 'procedural',
    ref: 'sofa_rattan',
    placementType: 'floor',
    footprint: [1.72, 0.86, 0.86],
    scaleLimits: [1, 1],
    rotationAllowed: true,
    placeholder: true,
  },
  table_teak_small_01: {
    id: 'table_teak_small_01',
    name: 'Small teak table',
    category: 'TABLES',
    kind: 'procedural',
    ref: 'table_teak_small',
    placementType: 'floor',
    footprint: [0.7, 0.7, 0.42],
    scaleLimits: [0.85, 1.15],
    rotationAllowed: false,
    placeholder: true,
  },
  lamp_floor_brass_01: {
    id: 'lamp_floor_brass_01',
    name: 'Brass floor lamp',
    category: 'LIGHTING',
    kind: 'procedural',
    ref: 'lamp_floor_brass',
    placementType: 'floor',
    footprint: [0.42, 0.42, 1.62],
    scaleLimits: [1, 1],
    rotationAllowed: false,
    placeholder: true,
  },
  planter_terracotta_01: {
    id: 'planter_terracotta_01',
    name: 'Terracotta planter',
    category: 'PLANTS',
    kind: 'procedural',
    ref: 'planter_terracotta',
    placementType: 'floor',
    footprint: [0.5, 0.5, 1.0],
    scaleLimits: [0.8, 1.3],
    rotationAllowed: true,
    placeholder: true,
  },
  lantern_brass_01: {
    id: 'lantern_brass_01',
    name: 'Brass lantern',
    category: 'DECOR',
    kind: 'procedural',
    ref: 'lantern_brass',
    placementType: 'floor',
    footprint: [0.28, 0.28, 0.58],
    scaleLimits: [0.8, 1.4],
    rotationAllowed: true,
    placeholder: true,
  },
  rug_jute_01: {
    id: 'rug_jute_01',
    name: 'Jute rug',
    category: 'RUGS',
    kind: 'procedural',
    ref: 'rug_jute',
    placementType: 'floor',
    footprint: [1.9, 1.4, 0.02],
    scaleLimits: [0.8, 1.2],
    rotationAllowed: true,
    placeholder: true,
  },
};

export function getAsset(id: string): AssetDefinition | undefined {
  return ASSET_CATALOG[id];
}
