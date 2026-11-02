import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalCharacter, CHARACTERS, characterName } from '../core/characters';
import { adapt, bandForAge, contentLevel, modeForBand } from '../core/ageBands';
import { WORLDS, worldsForMode, worldsForSection } from '../core/worlds';
import { canonicalLocation, LOCATIONS, LOCATION_BY_ID } from '../core/locations';
import { createWorldState, PLANT_STAGES } from '../core/worldState';
import type { PlantState } from '../core/worldState';
import { advanceAnimal, advancePlant, careFor, tick, waterPlant, weatherFor } from '../core/simulation';
import { coverage, helperText, pick, ui } from '../i18n';

test('legacy character keys resolve to the canonical six', () => {
  assert.equal(canonicalCharacter('gopu'), 'chintu');
  assert.equal(canonicalCharacter('kim'), 'buddy');
  assert.equal(canonicalCharacter('molly'), 'chikki');
  assert.equal(canonicalCharacter('dhanu'), 'nandu');
  assert.equal(canonicalCharacter('dadaji'), 'dadaji');
  assert.equal(canonicalCharacter('nobody'), null);
  assert.equal(characterName('gopu', 'hi'), 'चिंटू');
  assert.equal(Object.keys(CHARACTERS).length, 7);
});

test('age bands, modes and adaptation', () => {
  assert.equal(bandForAge(1), 'A0');
  assert.equal(bandForAge(4), 'A2');
  assert.equal(bandForAge(10), 'A5');
  assert.equal(modeForBand('A0'), 'lap');
  assert.equal(contentLevel('A2'), 'little');
  assert.equal(contentLevel('A3'), 'explorer');
  const steady = adapt({ band: 'A3', difficulty: 'steady' });
  assert.equal(steady.effectiveBand, 'A3');
  assert.equal(adapt({ band: 'A3', difficulty: 'gentle' }).effectiveBand, 'A2');
  assert.equal(adapt({ band: 'A3', difficulty: 'stretch' }).effectiveBand, 'A4');
  // mastery and difficulty never push more than one band either way
  assert.equal(adapt({ band: 'A3', difficulty: 'stretch', mastery: 0.95, recentAccuracy: 0.9 }).effectiveBand, 'A4');
  assert.equal(adapt({ band: 'A0', difficulty: 'gentle', mastery: 0.1 }).effectiveBand, 'A0');
  assert.equal(adapt({ band: 'A1', difficulty: 'steady' }).choices, 2);
});

test('twelve worlds share the eight sections and known locations', () => {
  assert.equal(WORLDS.length, 12);
  for (const w of WORLDS) for (const loc of w.locations) assert.ok(LOCATION_BY_ID[loc], `${w.key} references unknown location ${loc}`);
  assert.ok(worldsForSection('nature').includes('garden'));
  assert.ok(!worldsForMode('little', false).some((w) => w.key === 'temple'));
  assert.ok(worldsForMode('little', true).some((w) => w.key === 'temple'));
  assert.ok(LOCATIONS.length > 30);
  assert.equal(canonicalLocation('house.living_room'), 'villa.living');
  assert.equal(canonicalLocation('house.living_room.telescope'), 'villa.living');
  assert.equal(canonicalLocation('garden.pond'), 'garden.pond');
});

test('plants grow only while watered and never regress', () => {
  const t0 = Date.UTC(2026, 0, 1, 3);
  const HOUR = 3_600_000;
  const p: PlantState = { id: 'plant.tulsi.1', species: 'tulsi', plot: 'garden.vegetables', stage: 'seed', progress: 0, plantedAt: t0, lastWateredAt: t0, waterings: [t0], harvested: 0 };
  let s = advancePlant(p, t0, t0 + 3 * HOUR);
  assert.equal(s.stage, 'seed'); assert.ok(s.progress > 0.49 && s.progress < 0.51);
  s = advancePlant(p, t0, t0 + 7 * HOUR);
  assert.equal(s.stage, 'germination');
  // not watered for 36h: growth stops at the watered horizon
  const stale = advancePlant(p, t0, t0 + 200 * HOUR);
  const fresh = advancePlant(waterPlant(p, t0 + 30 * HOUR), t0 + 30 * HOUR, t0 + 60 * HOUR);
  assert.ok(PLANT_STAGES.indexOf(stale.stage) <= PLANT_STAGES.indexOf('seedling'));
  assert.ok(PLANT_STAGES.indexOf(fresh.stage) >= PLANT_STAGES.indexOf('germination'));
  // a long watered run reaches harvest and stays there
  let q: PlantState = p;
  for (let i = 0; i < 40; i++) { q = waterPlant(q, t0 + i * 24 * HOUR); q = advancePlant(q, t0 + i * 24 * HOUR, t0 + (i + 1) * 24 * HOUR); }
  assert.equal(q.stage, 'harvest');
});

test('animal needs rise gently and care resets them', () => {
  const t0 = 1_700_000_000_000;
  const a = { key: 'buddy' as const, hunger: 0, thirst: 0, rest: 0, groom: 0, mood: 'happy' as const, lastCaredAt: t0, location: 'animalia.dog' };
  const later = advanceAnimal(a, t0, t0 + 12 * 3_600_000);
  assert.ok(later.hunger > 0.9 && later.hunger <= 1);
  assert.equal(later.mood, 'needs-care');
  const fed = careFor(careFor(later, 'feed', t0), 'water', t0);
  assert.equal(fed.hunger, 0); assert.equal(fed.thirst, 0);
  assert.notEqual(fed.mood, 'needs-care');
});

test('tick advances time, weather, season and routines deterministically', () => {
  const t0 = Date.UTC(2026, 6, 10, 2); // 07:30 IST, monsoon
  const s0 = createWorldState(t0);
  const s1 = tick(s0, t0 + 10 * 3_600_000);
  assert.equal(s1.season, 'monsoon');
  assert.equal(weatherFor(t0), weatherFor(t0 + 1000));
  assert.ok(['sunny', 'cloudy', 'rainy', 'stormy', 'foggy'].includes(s1.weather));
  assert.equal(tick(s1, t0), s1, 'ticking backwards is a no-op');
  const held = tick(s0, t0 + 10 * 3_600_000, new Set(['dadaji' as const]));
  assert.equal(held.positions.find((p) => p.key === 'dadaji')!.location, s0.positions.find((p) => p.key === 'dadaji')!.location);
});

test('i18n falls back to helper then English and reports coverage', () => {
  assert.equal(pick({ en: 'Hello', hi: 'नमस्ते' }, 'hi').text, 'नमस्ते');
  assert.deepEqual(pick({ en: 'Hello' }, { primary: 'ta', helper: 'hi', mode: 'bilingual' }), { text: 'Hello', lang: 'en' });
  assert.equal(helperText({ en: 'Hello', hi: 'नमस्ते' }, { primary: 'en', mode: 'en-with-hi' }), 'नमस्ते');
  assert.equal(ui('parent.gateQuestion', 'en', { a: 7, b: 8 }), 'What is 7 times 8?');
  const c = coverage();
  assert.equal(c.en, 1); assert.equal(c.hi, 1); assert.equal(c.ta, 0);
});
