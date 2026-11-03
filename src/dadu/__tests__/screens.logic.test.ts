import { test } from 'node:test';
import assert from 'node:assert/strict';
import { samplePath, traceCoverage, templateFor, sortZones, rhythmSpec, sortProgress, gridCells, expandProgram, choiceColumns } from '../screens/activities/logic';
import { sceneForIllustration } from '../screens/story/illustration';

test('trace coverage rewards drawing along the template and not scribbles elsewhere', () => {
  const template = samplePath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10);
  assert.equal(template.length, 11);
  assert.equal(traceCoverage(template, samplePath([{ x: 0, y: 2 }, { x: 100, y: 2 }], 5)), 1);
  assert.equal(traceCoverage(template, [{ x: 0, y: 80 }, { x: 50, y: 90 }]), 0);
  const half = traceCoverage(template, samplePath([{ x: 0, y: 0 }, { x: 50, y: 0 }], 5));
  assert.ok(half >= 0.5 && half < 0.7);
  assert.equal(traceCoverage([], [{ x: 0, y: 0 }]), 0);
  assert.ok(templateFor('ka').length === 3 && templateFor('unknown').length === 1);
});

test('sort zones, progress and rhythm spec', () => {
  const items = [{ key: 'a', label: { en: 'a' }, group: 'x' }, { key: 'b', label: { en: 'b' }, group: 'y' }, { key: 'c', label: { en: 'c' } }];
  assert.deepEqual(sortZones(items), ['x', 'y']);
  assert.equal(sortProgress(items, { a: 'x', b: 'x' }), 0.5);
  assert.deepEqual(rhythmSpec([{ key: 'beat', label: { en: 'b' }, group: '600' }, { key: '1', label: { en: '1' }, order: 1 }, { key: '2', label: { en: '2' }, order: 2 }]), { beatMs: 600, taps: 2 });
  assert.equal(rhythmSpec([]).beatMs, 500);
});

test('grid parsing and program expansion match the engine conventions', () => {
  const g = gridCells([{ key: 'size', label: { en: '' }, group: '4,3' }, { key: 'start', label: { en: '' }, group: '0,0,1' }, { key: 'goal', label: { en: '' }, group: '3,2' }, { key: 'wall1', label: { en: '' }, group: '1,0' }]);
  assert.equal(g.w, 4); assert.equal(g.h, 3); assert.ok(g.walls.has('1,0')); assert.deepEqual(g.goal, { x: 3, y: 2 });
  assert.deepEqual(expandProgram(['repeat:3:move', 'left']), ['move', 'move', 'move', 'left']);
  assert.equal(choiceColumns(3, true), 1); assert.equal(choiceColumns(4, true), 2); assert.equal(choiceColumns(4, false), 2);
});

test('story illustration keys map to a scene', () => {
  assert.equal(sceneForIllustration('river_tree').background, 'pond');
  assert.equal(sceneForIllustration('birbal_court').background, 'bazaar');
  assert.equal(sceneForIllustration('howl_moon').background, 'forest');
  assert.equal(sceneForIllustration('sleep_star').background, 'bedroom');
  assert.equal(sceneForIllustration('something_else').background, 'living');
});
