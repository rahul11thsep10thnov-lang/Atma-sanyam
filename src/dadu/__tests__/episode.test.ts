import test from 'node:test';
import assert from 'node:assert/strict';
import { placeCast, stageHeight, autoAdvanceMs, STAGE_SCALE } from '../episode/logic';

test('cast gets distinct default slots and stays inside the stage', () => {
  const p = placeCast([{ key: 'dadaji' }, { key: 'chintu' }, { key: 'buddy' }], 400, 360);
  assert.equal(new Set(p.map((x) => Math.round(x.left))).size, 3);
  for (const x of p) { assert.ok(x.size > 0); assert.ok(x.left + x.size / 2 <= 400 * 0.95); assert.ok(x.left + x.size / 2 >= 400 * 0.1); }
});
test('explicit slots win and others fill the free ones', () => {
  const p = placeCast([{ key: 'dadaji', slot: 'right' }, { key: 'chintu' }], 400, 360);
  assert.ok(p[0].left > p[1].left);
});
test('Dadaji is drawn largest, Mitthu smallest', () => {
  const max = Math.max(...Object.values(STAGE_SCALE)); const min = Math.min(...Object.values(STAGE_SCALE));
  assert.equal(STAGE_SCALE.dadaji, max); assert.equal(STAGE_SCALE.mitthu, min);
});
test('stage height never exceeds half the screen', () => {
  assert.equal(stageHeight(400, 860), 368);
  assert.equal(stageHeight(900, 600), 300);
});
test('auto advance grows with words and shrinks with faster narration', () => {
  assert.ok(autoAdvanceMs('one two three four five six') > autoAdvanceMs('one two'));
  assert.ok(autoAdvanceMs('one two three four', 1.5) < autoAdvanceMs('one two three four', 1));
});

import { gamesFor, GAME_NAMES } from '../episode/games';
test('Play offers one game per activity kind, each with a name', () => {
  for (const band of ['A2', 'A3', 'A4', 'A5'] as const) {
    const g = gamesFor(band, band === 'A5' ? 'explorer' : 'little');
    assert.ok(g.length >= 3, `${band} has games`);
    assert.equal(new Set(g.map((x) => x.kind)).size, g.length);
    for (const x of g) { assert.ok(GAME_NAMES[x.kind].en); assert.ok(x.spec.items.length > 0); }
  }
});
