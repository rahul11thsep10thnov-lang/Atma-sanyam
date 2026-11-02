import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, coverage, lessonForObject, objectsForLocation, lessonsBySection, lessonsForBand, assignmentsForLesson, LESSONS, STORIES, ASSIGNMENTS, OBJECTS, COLLECTIONS } from '../content/catalog';
import { PLANNED_LESSONS, canonicalObject } from '../content/objects';
import { SECTIONS } from '../core/worlds';
import { LOCATIONS } from '../core/locations';

test('content validates structurally and bilingually', () => {
  const v = validate();
  assert.deepEqual(v.errors, []);
  assert.ok(v.ok);
});

test('content volumes meet the launch floor', () => {
  const c = coverage();
  assert.ok(c.lessons >= 40, `lessons ${c.lessons}`); assert.ok(c.stories >= 12); assert.ok(c.assignments >= 40); assert.ok(c.objects >= 120);
  for (const s of SECTIONS) assert.ok(c.bySection[s.key].lessons >= 4, `${s.key} has ${c.bySection[s.key].lessons} lessons`);
  assert.equal(c.byLanguage.en.lessons, c.lessons); assert.equal(c.byLanguage.hi.lessons, c.lessons); assert.equal(c.byLanguage.ta.lessons, 0, 'other languages are honestly reported as missing');
  for (const loc of LOCATIONS) if (loc.id !== 'map') assert.ok(objectsForLocation(loc.id).length >= 2, `${loc.id} needs objects`);
});

test('indexes and legacy ids', () => {
  assert.equal(lessonForObject('house.living_room.telescope')?.meta.id, 'explore.astronomy.telescope.01');
  assert.equal(canonicalObject('house.lab.magnet'), 'villa.activity.magnet');
  assert.ok(lessonsBySection('music').length >= 4);
  assert.ok(lessonsForBand('A1', 'nature').every((l) => l.meta.bands.includes('A1') && l.meta.section === 'nature'));
  assert.ok(assignmentsForLesson('stem.physics.magnet.01').length >= 1);
  assert.ok(Object.keys(PLANNED_LESSONS).length > 0 && Object.values(PLANNED_LESSONS).every((id) => !LESSONS.some((l) => l.meta.id === id)));
  assert.ok(COLLECTIONS.filter((c) => c.rights === 'pending').length === 4);
  assert.ok(STORIES.every((s) => s.meta.rights !== 'pending'));
  assert.ok(ASSIGNMENTS.every((a) => a.instructions.length >= 2 && a.safety !== undefined));
  assert.ok(OBJECTS.every((o) => o.sprite.length > 0));
});
