import { AnimationType, BalconyObjectState, ObjectCategory, ScenePosition } from '../types';

/** A plant species that can be unlocked via the reward table. Each becomes a
 * real `Plant` entry (types.ts) the first time its reward fires; after that,
 * its own growth is tracked independently by PlantGrowthManager. */
export interface PlantSpecies {
  id: string;
  name: string;
  type: string;
  position: ScenePosition;
}

export const PLANT_SPECIES_CATALOG: Record<string, PlantSpecies> = {
  'plant-small': { id: 'plant-small', name: 'Little basil', type: 'basil-small', position: { x: 0.14, y: 0.94 } },
  'plant-flower': { id: 'plant-flower', name: 'Marigold', type: 'marigold', position: { x: 0.32, y: 0.96 } },
  'plant-tree': { id: 'plant-tree', name: 'Frangipani', type: 'frangipani-tree', position: { x: 0.87, y: 0.9 } },
};

/** Definition for a non-plant unlockable object — the position/scale/rotation
 * here are the defaults used the moment it's unlocked; a later customization
 * phase can let the user drag it to a new spot without touching this catalog. */
export interface ObjectDefinition {
  id: string;
  category: ObjectCategory;
  asset: string;
  position: ScenePosition;
  scale: number;
  rotation: number;
  animationType: AnimationType;
}

export const OBJECT_CATALOG: Record<string, ObjectDefinition> = {
  'pot-terracotta': {
    id: 'pot-terracotta',
    category: 'POTS',
    asset: 'terracotta-pot',
    position: { x: 0.74, y: 0.95 },
    scale: 1,
    rotation: 0,
    animationType: 'NONE',
  },
  'planter-hanging': {
    id: 'planter-hanging',
    category: 'DECORATION',
    asset: 'hanging-planter',
    position: { x: 0.5, y: 0.06 },
    scale: 1,
    rotation: 0,
    animationType: 'SWAY',
  },
  'chair-wood': {
    id: 'chair-wood',
    category: 'FURNITURE',
    asset: 'wood-chair',
    position: { x: 0.6, y: 0.9 },
    scale: 1,
    rotation: 0,
    animationType: 'NONE',
  },
  'wall-decoration': {
    id: 'wall-decoration',
    category: 'DECORATION',
    asset: 'brass-wall-plate',
    position: { x: 0.46, y: 0.32 },
    scale: 1,
    rotation: 0,
    animationType: 'NONE',
  },
  'lighting-lantern': {
    id: 'lighting-lantern',
    category: 'LIGHTING',
    asset: 'hanging-lantern',
    position: { x: 0.82, y: 0.05 },
    scale: 1,
    rotation: 0,
    animationType: 'GLOW',
  },
};

export function createObjectState(def: ObjectDefinition): BalconyObjectState {
  return {
    id: def.id,
    category: def.category,
    asset: def.asset,
    position: def.position,
    scale: def.scale,
    rotation: def.rotation,
    unlockRequirement: 0, // filled in by RewardManager from the reward table
    isUnlocked: false,
    isPlaced: false,
    animationType: def.animationType,
  };
}
