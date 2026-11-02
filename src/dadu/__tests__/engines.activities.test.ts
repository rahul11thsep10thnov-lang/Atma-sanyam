import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, mixColours, runCodeBlocks, walkMaze, memoryFlip, plantSeed, waterPlantInWorld, harvestPlant, careForAnimal, setObjectFlag, refillInventory, cookDish } from '../engines/activities';
import type { MemoryState } from '../engines/activities';
import type { ActivitySpec } from '../core/content';
import { createWorldState } from '../core/worldState';
import { it, L } from '../content/helpers';

const spec = (kind: ActivitySpec['kind'], items: ActivitySpec['items']): ActivitySpec => ({ kind, prompt: L('p', 'p'), items, success: L('yes', 'हाँ'), retry: L('again', 'फिर') });

test('choose-type activities', () => {
  const s = spec('tap-target', [it('a', 'A', 'A', { ok: true }), it('b', 'B', 'B')]);
  assert.ok(evaluate(s, 'a').ok); assert.ok(!evaluate(s, 'b').ok); assert.equal(evaluate(s, 'b').feedback.hi, 'फिर');
  assert.ok(evaluate(spec('water', [it('can', 'c', 'c', { ok: true })]), 'can').ok);
});

test('sort, sequence, memory, count, trace, draw', () => {
  const sort = spec('sort', [it('n', 'n', 'n', { group: 'yes' }), it('m', 'm', 'm', { group: 'no' })]);
  assert.ok(evaluate(sort, { n: 'yes', m: 'no' }).ok); assert.equal(evaluate(sort, { n: 'yes', m: 'yes' }).progress, 0.5);
  const seq = spec('sequence', [it('b', 'b', 'b', { order: 2 }), it('a', 'a', 'a', { order: 1 })]);
  assert.ok(evaluate(seq, ['a', 'b']).ok); assert.ok(!evaluate(seq, ['b', 'a']).ok); assert.ok(!evaluate(seq, ['a']).ok);
  const mem = spec('memory', [it('x1', 'x', 'x', { group: 'x' }), it('x2', 'x', 'x', { group: 'x' }), it('y1', 'y', 'y', { group: 'y' }), it('y2', 'y', 'y', { group: 'y' })]);
  assert.ok(evaluate(mem, ['x1', 'x2']).ok); assert.ok(!evaluate(mem, ['x1', 'y1']).ok); assert.ok(!evaluate(mem, ['x1', 'x1']).ok);
  let st: MemoryState = { revealed: [], matched: [], moves: 0 };
  let r = memoryFlip(mem, st, 'x1'); st = r.state; assert.equal(r.matched, null);
  r = memoryFlip(mem, st, 'y1'); st = r.state; assert.equal(r.matched, false); assert.equal(st.moves, 1);
  r = memoryFlip(mem, st, 'x1'); r = memoryFlip(mem, r.state, 'x2'); assert.equal(r.matched, true); st = r.state;
  r = memoryFlip(mem, st, 'y1'); r = memoryFlip(mem, r.state, 'y2'); assert.ok(r.complete);
  const count = spec('count', [it('a', 'a', 'a', { ok: true }), it('b', 'b', 'b', { ok: true }), it('c', 'c', 'c')]);
  assert.ok(evaluate(count, 2).ok); assert.ok(!evaluate(count, 3).ok);
  assert.ok(evaluate(spec('trace', [it('k', 'k', 'k', { ok: true })]), 0.8).ok); assert.ok(!evaluate(spec('trace', []), 0.2).ok);
  assert.ok(evaluate(spec('draw', []), 3).ok); assert.ok(!evaluate(spec('draw', []), 0).ok);
});

test('colour mixing, rhythm, balance, circuit', () => {
  assert.equal(mixColours(['blue', 'yellow']), 'green'); assert.equal(mixColours(['red', 'blue']), 'purple'); assert.equal(mixColours(['red', 'blue', 'yellow']), 'brown');
  const mix = spec('mix-colours', [it('red', 'r', 'r'), it('blue', 'b', 'b'), it('yellow', 'y', 'y'), it('green', 'g', 'g', { ok: true })]);
  assert.ok(evaluate(mix, ['blue', 'yellow']).ok); assert.ok(!evaluate(mix, ['red', 'yellow']).ok);
  const rhythm = spec('rhythm', [it('beat', 'b', 'b', { group: '500' }), it('1', '1', '1', { order: 1 }), it('2', '2', '2', { order: 2 }), it('3', '3', '3', { order: 3 }), it('4', '4', '4', { order: 4 })]);
  assert.ok(evaluate(rhythm, [1000, 1510, 1990, 2500]).ok); assert.ok(!evaluate(rhythm, [1000, 1200, 2900, 3000]).ok); assert.ok(!evaluate(rhythm, [1000, 1500]).ok);
  const bal = spec('balance', [it('L', 'L', 'L', { order: 1 }), it('R', 'R', 'R', { order: 2 })]);
  assert.ok(evaluate(bal, ['L', 'R']).ok); assert.equal(evaluate(bal, ['L', 'L']).progress, 0.5);
  const circ = spec('circuit', [it('battery', 'b', 'b', { ok: true }), it('bulb', 'l', 'l', { ok: true }), it('wire1', 'w', 'w', { ok: true }), it('stick', 's', 's', { group: 'break' })]);
  assert.ok(evaluate(circ, ['battery', 'bulb', 'wire1']).ok);
  assert.ok(!evaluate(circ, ['battery', 'bulb', 'wire1', 'stick']).ok, 'an insulator breaks the loop');
  assert.ok(!evaluate(circ, ['battery', 'wire1']).ok);
});

test('code-blocks interpreter and mazes', () => {
  const grid = [it('size', 'g', 'g', { group: '4,3' }), it('start', 's', 's', { group: '0,0,1' }), it('goal', 'g', 'g', { group: '3,2' }), it('wall1', 'w', 'w', { group: '2,0' }), it('wall2', 'w', 'w', { group: '2,1' })];
  const run = runCodeBlocks(grid, ['right', 'repeat:2:move', 'left', 'repeat:3:move']);
  assert.ok(run.reachedGoal, JSON.stringify(run.path));
  assert.ok(!runCodeBlocks(grid, ['repeat:3:move']).reachedGoal, 'bumps into the wall and stays');
  assert.equal(runCodeBlocks(grid, ['repeat:3:move']).path.length, 2);
  assert.ok(evaluate(spec('code-blocks', grid), ['right', 'move', 'move', 'left', 'move', 'move', 'move']).ok);
  const maze = [it('size', 'g', 'g', { group: '3,2' }), it('start', 's', 's', { group: '0,0,1' }), it('goal', 'g', 'g', { group: '2,1' }), it('wall1', 'w', 'w', { group: '1,1' })];
  assert.ok(walkMaze(maze, ['R', 'R', 'D']).reachedGoal);
  assert.ok(!walkMaze(maze, ['D', 'R', 'R']).valid, 'walking into a wall is invalid');
  assert.ok(!walkMaze(maze, ['X']).valid);
});

test('world effects: plant, water, harvest, care, flags, refill, cook', () => {
  const t0 = Date.UTC(2026, 0, 1);
  let w = createWorldState(t0);
  w = plantSeed(w, 'tulsi', 'garden.vegetables', t0);
  assert.equal(w.plants.length, 1); assert.equal(w.inventory.seeds, 2);
  assert.equal(plantSeed(w, 'unknown', 'garden.vegetables', t0).plants.length, 1);
  w = waterPlantInWorld(w, 'plant.tulsi.1', t0 + 1000);
  assert.equal(w.plants[0].lastWateredAt, t0 + 1000);
  assert.equal(harvestPlant(w, 'plant.tulsi.1').inventory['produce.tulsi'], undefined, 'cannot harvest before ready');
  w = { ...w, plants: [{ ...w.plants[0], stage: 'harvest' }] };
  w = harvestPlant(w, 'plant.tulsi.1');
  assert.equal(w.inventory['produce.tulsi'], 1); assert.equal(w.plants[0].harvested, 1); assert.equal(w.plants[0].stage, 'growing');
  w = { ...w, animals: w.animals.map((a) => ({ ...a, hunger: 0.9 })) };
  w = careForAnimal(w, 'buddy', 'feed', t0);
  assert.equal(w.animals.find((a) => a.key === 'buddy')!.hunger, 0); assert.equal(w.inventory.fodder, 2);
  w = { ...w, inventory: { ...w.inventory, fodder: 0 } };
  assert.equal(careForAnimal(w, 'gauri', 'feed', t0).animals.find((a) => a.key === 'gauri')!.hunger, 0.9, 'no fodder, no change');
  w = setObjectFlag(w, 'villa.kitchen.sink', 'clean', true, t0);
  assert.equal(w.objects['villa.kitchen.sink'].flags.clean, true);
  w = refillInventory(w, t0 + 2 * 86_400_000);
  assert.equal(w.inventory.fodder, 3);
  assert.equal(cookDish(w, 'poha').inventory['dish.poha'], 1);
});
