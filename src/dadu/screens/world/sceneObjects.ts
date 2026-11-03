// Builds the object list an isometric location shows: the default layout,
// the content registry's interactive objects (which override by id), the
// child's world flags, living plants on their plots and purchased
// decorations. Pure, so it is unit tested.
import type { IsoObject } from '../../render/iso/IsoScene';
import type { InteractiveObject, Localised } from '../../core/content';
import type { PlantState, WorldState } from '../../core/worldState';
import { LOCATION_BY_ID } from '../../core/locations';
import { decorationsAt } from '../../engines/rewards';

export const WORLD_ACTIVITIES = new Set(['water', 'plant', 'harvest', 'feed', 'groom', 'clean', 'cook']);

export function plantSprite(species: string, catalog: Record<string, { stages: string }>): string {
  const kind = catalog[species]?.stages ?? 'veg';
  return kind === 'flower' ? 'bed_flower' : 'bed_veg';
}

/** Tiles for plants on a plot: a row two tiles from the entry edge, left to right, two tiles apart. */
export function plantTile(locationId: string, index: number): { x: number; y: number } {
  const loc = LOCATION_BY_ID[locationId];
  const w = loc?.size.w ?? 8, d = loc?.size.d ?? 6;
  const perRow = Math.max(1, Math.floor((w - 1) / 2));
  return { x: 1 + (index % perRow) * 2, y: Math.max(0, d - 3 - Math.floor(index / perRow) * 2) };
}

export interface SceneBuild {
  objects: IsoObject[];
  /** Object id → content registry entry (for taps). */
  content: Record<string, InteractiveObject>;
  /** Plant IsoObject id → plant. */
  plants: Record<string, PlantState>;
}

export function buildSceneObjects(
  locationId: string,
  layout: IsoObject[],
  contentObjects: InteractiveObject[],
  world: WorldState | null,
  lang: string,
  plantCatalog: Record<string, { name: Localised; stages: string }>
): SceneBuild {
  const byId = new Map<string, IsoObject>();
  for (const o of layout) byId.set(o.id, { ...o });
  const content: Record<string, InteractiveObject> = {};
  for (const c of contentObjects) {
    content[c.id] = c;
    const prev = byId.get(c.id);
    byId.set(c.id, { ...(prev ?? {}), id: c.id, tile: prev?.tile ?? c.tile, sprite: prev?.sprite ?? c.sprite, interactive: true, decorative: false, label: lang === 'hi' ? (c.name.hi ?? c.name.en) : c.name.en });
  }
  if (world) {
    for (const [id, st] of Object.entries(world.objects)) {
      const o = byId.get(id);
      if (o) byId.set(id, { ...o, flags: { ...(o.flags ?? {}), ...st.flags } });
    }
  }
  const plants: Record<string, PlantState> = {};
  const objects = [...byId.values()];
  if (world) {
    world.plants.filter((p) => p.plot === locationId).forEach((p, i) => {
      const id = `plant:${p.id}`;
      plants[id] = p;
      objects.push({ id, tile: plantTile(locationId, i), sprite: plantSprite(p.species, plantCatalog), stage: p.stage, interactive: true, label: lang === 'hi' ? (plantCatalog[p.species]?.name.hi ?? p.species) : (plantCatalog[p.species]?.name.en ?? p.species) });
    });
    decorationsAt(world, locationId).forEach((d, i) => {
      const loc = LOCATION_BY_ID[locationId];
      objects.push({ id: d.id, tile: { x: Math.min((loc?.size.w ?? 6) - 1, i), y: 0 }, sprite: d.icon, decorative: true });
    });
  }
  return { objects, content, plants };
}

/** Which in-world activity an object opens, if any (a full lesson always wins over an activity). */
export function activityFor(obj: InteractiveObject | undefined, isoId: string): 'garden' | 'animal' | 'kitchen' | 'clean' | null {
  if (isoId.startsWith('plant:')) return 'garden';
  if (!obj || obj.lesson) return null;
  const a = obj.activity;
  if (!a || !WORLD_ACTIVITIES.has(a)) return null;
  if (a === 'water' || a === 'plant' || a === 'harvest') return 'garden';
  if (a === 'feed' || a === 'groom') return 'animal';
  if (a === 'cook') return 'kitchen';
  return 'clean';
}
