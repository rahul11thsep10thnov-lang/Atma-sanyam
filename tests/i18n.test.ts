// Hindi must never silently drift from English. Keys without Hindi fall back
// to English at run time, so the allowed set of missing keys is frozen in
// tests/i18n-hi-baseline.json and may only shrink: a new English string needs
// its Hindi translation in the same change.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { en } from '../src/i18n/strings/en.ts';
import { hi } from '../src/i18n/strings/hi.ts';

const enT = en as Record<string, string>;
const hiT = hi as Record<string, string>;
const baseline: string[] = JSON.parse(readFileSync(new URL('./i18n-hi-baseline.json', import.meta.url), 'utf8'));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe('Hindi strings', () => {
  it('have no keys that English lacks (stale or misspelt)', () => {
    assert.deepEqual(Object.keys(hiT).filter((k) => !(k in enT)), []);
  });
  it('are never empty', () => {
    assert.deepEqual(Object.entries(hiT).filter(([, v]) => !v.trim()).map(([k]) => k), []);
  });
  it('use exactly the same {placeholders} as English', () => {
    const bad = Object.keys(hiT).filter((k) => k in enT && placeholders(hiT[k]!).join() !== placeholders(enT[k]!).join());
    assert.deepEqual(bad, []);
  });
  it('are not missing for any new English string (only the frozen baseline may fall back)', () => {
    const missing = Object.keys(enT).filter((k) => !hiT[k]?.trim());
    const fresh = missing.filter((k) => !baseline.includes(k));
    assert.deepEqual(fresh, [], `Add Hindi for these new strings in src/i18n/strings/hi.ts:\n${fresh.join('\n')}`);
  });
  it('keep the baseline honest: translated keys are removed from it', () => {
    const translated = baseline.filter((k) => hiT[k]?.trim());
    assert.deepEqual(translated, [], 'Run `npm run i18n:missing -- --write` to shrink tests/i18n-hi-baseline.json');
    const unknown = baseline.filter((k) => !(k in enT));
    assert.deepEqual(unknown, []);
  });
});
