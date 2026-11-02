import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centreOffset, clampOffset, depthKey, facingFromDelta, fitZoom, inside, sceneBounds, screenToTile, screenToTileRounded, tileDistance, tilePolygon, tileToScreen, walkPath, TILE_H, TILE_W } from '../render/iso/isoMath';

test('tile projection round-trips', () => {
  assert.deepEqual(tileToScreen(0, 0), { sx: 0, sy: 0 });
  assert.deepEqual(tileToScreen(1, 0), { sx: TILE_W / 2, sy: TILE_H / 2 });
  assert.deepEqual(tileToScreen(0, 1), { sx: -TILE_W / 2, sy: TILE_H / 2 });
  for (const [x, y] of [[3, 5], [0, 7], [9, 2]]) {
    const p = tileToScreen(x, y);
    const back = screenToTile(p.sx, p.sy);
    assert.ok(Math.abs(back.x - x) < 1e-9 && Math.abs(back.y - y) < 1e-9);
    assert.deepEqual(screenToTileRounded(p.sx + 3, p.sy - 2), { x, y });
  }
  assert.equal(tileToScreen(2, 2, 10).sy, tileToScreen(2, 2).sy - 10);
});

test('depth ordering and polygons', () => {
  assert.ok(depthKey(3, 4) < depthKey(4, 4));
  assert.ok(depthKey(3, 4, 1) > depthKey(3, 4, 0));
  assert.ok(depthKey(3, 4, 9) < depthKey(4, 4, 0), 'z bias never beats a row change');
  assert.equal(tilePolygon(0, 0).split(' ').length, 4);
});

test('bounds, fit and clamp', () => {
  const b = sceneBounds(10, 8, 120);
  assert.ok(b.width > 0 && b.height > 0);
  const z = fitZoom(b, 400, 500);
  assert.ok(z >= 0.45 && z <= 2);
  const c = centreOffset(b, 400, 500, z);
  const mid = { x: (b.minX + b.maxX) / 2 * z + c.tx, y: (b.minY + b.maxY) / 2 * z + c.ty };
  assert.ok(Math.abs(mid.x - 200) < 1e-6 && Math.abs(mid.y - 250) < 1e-6);
  const far = clampOffset(c.tx + 5000, c.ty - 5000, b, 400, 500, z);
  assert.ok(far.tx < c.tx + 5000 && far.ty > c.ty - 5000);
  assert.ok(inside(4, 4, 3, 3) && !inside(4, 4, 4, 0));
});

test('paths and facing', () => {
  assert.equal(facingFromDelta(1, 0), 'se');
  assert.equal(facingFromDelta(-1, 0), 'nw');
  assert.equal(facingFromDelta(0, 1), 'sw');
  assert.equal(facingFromDelta(0, -1), 'ne');
  const path = walkPath({ x: 0, y: 0 }, { x: 3, y: 2 }, () => false);
  assert.deepEqual(path[path.length - 1], { x: 3, y: 2 });
  assert.equal(tileDistance({ x: 0, y: 0 }, { x: 3, y: 2 }), 5);
  const blocked = walkPath({ x: 0, y: 0 }, { x: 2, y: 0 }, (t) => t.x === 1 && t.y === 0);
  assert.deepEqual(blocked[blocked.length - 1], { x: 2, y: 0 });
  assert.ok(!blocked.some((t) => t.x === 1 && t.y === 0));
});
