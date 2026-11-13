import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bitmapGeometry, pickCharacterImage, pickVariant } from '../art/logic';

test('prop picture size follows the footprint and rests on the floor', () => {
  const one = bitmapGeometry({ w: 400, h: 400 }, { w: 1, d: 1 });
  assert.equal(one.width, 64); assert.equal(one.height, 64); assert.equal(one.x, -32);
  assert.equal(one.y + one.height, 8, 'bottom edge sits a little below the tile centre');
  const sofa = bitmapGeometry({ w: 600, h: 300 }, { w: 2, d: 1 });
  assert.equal(sofa.width, 96); assert.equal(sofa.height, 48);
  const tuned = bitmapGeometry({ w: 400, h: 400, scale: 2, dx: 5, dy: -3 }, { w: 1, d: 1 });
  assert.equal(tuned.width, 128); assert.equal(tuned.x, -64 + 5); assert.equal(tuned.y + tuned.height, 8 - 3);
});

test('variants: plant stage first, then the first switched-on state, else the base picture', () => {
  const v = { on: 1, open: 2, seedling: 3 };
  assert.equal(pickVariant(v, { on: true }), 1);
  assert.equal(pickVariant(v, { open: true }), 2);
  assert.equal(pickVariant(v, { on: true }, 'seedling'), 3);
  assert.equal(pickVariant(v, {}), undefined);
  assert.equal(pickVariant(undefined, { on: true }), undefined);
});

test('character picture choice falls back from specific to general', () => {
  const names = ['idle', 'talk', 'happy', 'walk', 'side_idle', 'walk_happy'];
  assert.equal(pickCharacterImage(names, 'front', 'stand', 'neutral', false, 0), 'idle');
  assert.equal(pickCharacterImage(names, 'front', 'stand', 'happy', false, 0), 'happy');
  assert.equal(pickCharacterImage(names, 'front', 'walk', 'happy', false, 0), 'walk_happy');
  assert.equal(pickCharacterImage(names, 'front', 'walk', 'neutral', false, 0), 'walk');
  assert.equal(pickCharacterImage(names, 'side', 'stand', 'neutral', false, 0), 'side_idle');
  assert.equal(pickCharacterImage(names, 'back', 'stand', 'neutral', false, 0), 'idle');
  assert.equal(pickCharacterImage(names, 'front', 'stand', 'neutral', true, 0), 'talk');
  assert.equal(pickCharacterImage(names, 'front', 'stand', 'neutral', true, 0.25), 'idle', 'mouth closes between flaps');
  assert.equal(pickCharacterImage([], 'front', 'stand', 'neutral', false, 0), null);
});
