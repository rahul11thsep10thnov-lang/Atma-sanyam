import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityFor, buildSceneObjects, plantSprite, plantTile } from '../screens/world/sceneObjects';
import { createWorldState } from '../core/worldState';
import { plantSeed, purchaseDecoration, grant, PLANT_CATALOG } from '../engines';
import { catalog } from '../content';
import { DEFAULT_LAYOUTS } from '../render/iso/defaultLayouts';
import { toApiEvent } from '../api/syncMapping';

test('scene objects merge layout, content, flags, plants and decorations', () => {
  const now = Date.now();
  let w = createWorldState(now);
  w = plantSeed(w, 'tulsi', 'garden.vegetables', now);
  w = { ...w, objects: { 'garden.vegetables.veg_bed': { id: 'garden.vegetables.veg_bed', flags: { full: true }, completions: 1 } } };
  w = purchaseDecoration(grant(w, { coins: 50 }), 'deco.marigold_bed');
  const built = buildSceneObjects('garden.vegetables', DEFAULT_LAYOUTS['garden.vegetables'] ?? [], catalog.objectsForLocation('garden.vegetables'), w, 'hi', PLANT_CATALOG);
  const bed = built.objects.find((o) => o.id === 'garden.vegetables.veg_bed');
  assert.ok(bed && bed.interactive && bed.flags?.full, 'content object present with world flag');
  assert.equal(bed?.label, 'सब्ज़ी की क्यारी');
  const plant = built.objects.find((o) => o.id.startsWith('plant:'));
  assert.ok(plant && plant.stage === 'seed' && built.plants[plant.id].species === 'tulsi');
  assert.ok(!built.objects.some((o) => o.id === 'deco.marigold_bed'), 'decoration belongs to the flower garden, not the vegetable plot');
  const flowers = buildSceneObjects('garden.flowers', DEFAULT_LAYOUTS['garden.flowers'] ?? [], catalog.objectsForLocation('garden.flowers'), w, 'en', PLANT_CATALOG);
  assert.ok(flowers.objects.some((o) => o.id === 'deco.marigold_bed' && o.decorative));
  assert.equal(plantSprite('marigold', PLANT_CATALOG), 'bed_flower');
  assert.equal(plantSprite('tomato', PLANT_CATALOG), 'bed_veg');
  assert.deepEqual(plantTile('garden.vegetables', 0), { x: 1, y: 5 });
  assert.notDeepEqual(plantTile('garden.vegetables', 1), plantTile('garden.vegetables', 0));
});

test('objects open a lesson, a world activity or a preview', () => {
  const telescope = catalog.objectById('villa.living.telescope');
  assert.equal(activityFor(telescope, 'villa.living.telescope'), null, 'lesson objects never open a world activity');
  const bowl = catalog.objectById('animalia.dog.food_bowl');
  assert.ok(bowl);
  assert.equal(activityFor(bowl, bowl!.id), bowl!.lesson ? null : 'animal');
  assert.equal(activityFor(undefined, 'plant:plant.tulsi.1'), 'garden');
  assert.equal(activityFor({ ...telescope!, lesson: undefined, activity: 'cook' }, 'x'), 'kitchen');
  assert.equal(activityFor({ ...telescope!, lesson: undefined, activity: 'sort' }, 'x'), null);
});

test('engine events map onto the strict API payload', () => {
  const e = toApiEvent({ clientId: 'c1:mastery:count to ten:3', type: 'mastery.updated', at: 1_700_000_000_000, payload: { concept: 'count to ten', score: 0.72, attempts: 3, nextReviewAt: 1 } });
  assert.equal(e.kind, 'assessment');
  assert.deepEqual(e.payload, { concept: 'count to ten', result: 0.72 });
  assert.match(e.clientId, /^[A-Za-z0-9_.:-]+$/);
  assert.equal(e.occurredAt, '2023-11-14T22:13:20.000Z');
  assert.equal(toApiEvent({ clientId: 'c1:lesson:x', type: 'lesson.completed', at: 1, payload: { lessonId: 'academic.maths.counting.01' } }).contentId, 'academic.maths.counting.01');
});
