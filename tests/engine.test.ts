// The app and the server must deal and replay games identically, so the pieces
// they share are pinned here: the seed derivation and the list of games the
// server replays (backend/scripts/bundleEngines.mjs).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deriveSeed } from '../src/games/engine.ts';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('seeds', () => {
  it('derive exactly as the server does (same vector as backend/tests/verifiedResults.test.ts)', () => {
    assert.deepEqual([[12345, 0], [12345, 1], [12345, 2], [2147483647, 5], [0, 1]].map(([b, r]) => deriveSeed(b!, r!)), [12345, 2085447349, 1056969962, 109232715, 63015048]);
  });
  it('stay inside the 31-bit range the games expect', () => {
    for (let i = 0; i < 200; i++) {
      const s = deriveSeed(Math.floor(Math.random() * 2 ** 31), 1 + (i % 30));
      assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 31);
    }
  });
});

describe('games the server replays', () => {
  const bundler = read('../backend/scripts/bundleEngines.mjs');
  const block = bundler.slice(bundler.indexOf('export const REPLAYABLE'), bundler.indexOf('};', bundler.indexOf('export const REPLAYABLE')));
  const entries = [...block.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*'([A-Za-z0-9]+)',/gm)].map((m) => ({ id: m[1]!, file: m[2]! }));
  const registry = read('../src/games/registry.ts');
  const scoring = read('../backend/src/services/rankingService.ts');

  it('lists the expected ranked games', () => {
    assert.ok(entries.length >= 16, `found ${entries.length}`);
  });
  for (const { id, file } of entries) {
    it(`${id}: is registered, ranked, has no timer, and its definition id matches`, () => {
      assert.match(registry, new RegExp(`'?${id}'?:\\s*\\(\\)\\s*=>\\s*import\\('\\./defs/${file}'\\)`), 'listed in the game registry under this file');
      assert.match(scoring, new RegExp(`'?${id}'?:\\s*\\{ kind:`), 'has a scoring rule (only ranked games are replayed)');
      const src = read(`../src/games/defs/${file}.tsx`);
      assert.doesNotMatch(src, /^\s*tick:\s*\{\s*intervalMs/m, 'a timer-driven game cannot be replayed');
      assert.doesNotMatch(src, /Math\.random|Date\.now/, 'a replayable reducer must be deterministic');
      // quiz games get their id from makeQuizGame('science-quiz', ...), the rest from `id: '...'`
      assert.ok(src.includes(`'${id}'`), 'the definition names this id');
    });
  }
  it('leaves out the timing and aim games', () => {
    for (const id of ['cricket', 'bowling', 'football-penalty']) assert.ok(!entries.some((e) => e.id === id), `${id} must stay unreplayed`);
  });
});
