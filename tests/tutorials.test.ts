// Every playable game has a pictorial tutorial in the five-step shape, with a
// real "try it" target, and every step names a scene the overlay can draw.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIALS } from '../src/games/tutorials/definitions.ts';

const registry = readFileSync(new URL('../src/games/registry.ts', import.meta.url), 'utf8');
const loaderBlock = registry.slice(registry.indexOf('GAME_LOADERS'), registry.indexOf('};', registry.indexOf('GAME_LOADERS')));
const gameIds = [...loaderBlock.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*\(\)\s*=>\s*import\(/gm)].map((m) => m[1]!);

describe('game tutorials', () => {
  it('cover every game in the registry', () => {
    assert.ok(gameIds.length >= 40, `expected 40 loaders, found ${gameIds.length}`);
    const missing = gameIds.filter((id) => !TUTORIALS[id]);
    assert.deepEqual(missing, []);
    const extra = Object.keys(TUTORIALS).filter((id) => !gameIds.includes(id));
    assert.deepEqual(extra, []);
  });
  it('follow the meet → controls → demo → try it → play template with a tappable target', () => {
    for (const [id, tut] of Object.entries(TUTORIALS)) {
      assert.equal(tut.gameId, id);
      assert.deepEqual(tut.steps.map((s) => s.kind), ['meet', 'controls', 'demo', 'tryIt', 'play'], id);
      for (const s of tut.steps) {
        assert.ok(s.text.length > 10, `${id}: ${s.kind} text`);
        assert.ok(['grid', 'icons', 'gesture'].includes(s.scene.kind), `${id}: ${s.kind} scene`);
      }
      const tryIt = tut.steps[3];
      assert.ok(tryIt.target?.prompt, `${id}: try-it prompt`);
      if (tryIt.scene.kind === 'grid') {
        assert.ok((tryIt.scene.highlight?.length ?? 0) > 0, `${id}: try-it needs a highlighted cell`);
        for (const [r, c] of tryIt.scene.highlight!) assert.ok(tryIt.scene.rows[r] !== undefined && c < Math.max(...tryIt.scene.rows.map((x) => x.length)), `${id}: highlight inside the grid`);
      }
      const demo = tut.steps[2];
      if (demo.scene.kind === 'grid' && demo.scene.frames) for (const f of demo.scene.frames) assert.equal(f.length, demo.scene.rows.length, `${id}: demo frames keep the row count`);
    }
  });
  it('simplify text for the youngest bracket where a game is offered to it', () => {
    for (const id of ['picture-matching', 'shape-sorting', 'colour-matching', 'connect-the-dots', 'virtual-garden', 'animal-sounds']) {
      assert.ok(TUTORIALS[id]!.steps.some((s) => s.textByBracket?.A), `${id} has age-3-5 wording`);
    }
  });
});
