/// <reference types="node" />
// Run with: npm run test:world
// Pure tests of the 3D world's rules, using the app's real plant model so the
// flow "completed session → one plant → one position" is tested end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PARADISE, ParadiseState, addPenalty, plantFromSession, removePlant } from '../../paradise/model';
import { SPECIES } from '../../paradise/catalog';
import { GRAND_BANYAN, LANDMARK_CLEARANCE, SlotDef, WorldPlant, WorldState, initialWorld, isWorld, progressOf, reconcile } from '../model';
import { WorldPenalty } from '../model';
import { WINGS, conservatoryZoneAt, arboretumZoneAt, CONSERVATORY_ZONES, ARBORETUM_ZONES } from '../zones';
import { WORLD_KEY } from '../repository.keys';

const TREES = new Set(['banyan', 'peepal', 'neem', 'ashoka', 'gulmohar', 'cherry_blossom', 'jacaranda', 'palm', 'coconut', 'maple', 'cedar', 'pine', 'cypress', 'magnolia', 'amaltas', 'arjuna', 'kadamba', 'mango', 'apple', 'orange', 'lemon', 'pomegranate', 'guava', 'papaya']);

function toWorld(s: ParadiseState): { plants: WorldPlant[]; penalties: WorldPenalty[] } {
  return {
    plants: s.plants.filter((p) => p.place !== 'balcony').map((p) => ({ id: p.id, speciesId: p.speciesId, modelId: p.speciesId, kind: TREES.has(p.speciesId) ? 'tree' : 'plant', water: p.speciesId === 'lotus', size: p.size, plantedAt: p.plantedAt })),
    penalties: s.penalties.map((p) => ({ id: p.id, segment: p.segment, placedAt: p.placedAt })),
  };
}

/** A synthetic floor: a scatter of positions in both wings, zoned like the real ones. */
function floor(spacing = 0.7): SlotDef[] {
  const out: SlotDef[] = [];
  let i = 0;
  for (const [wing, R, inner, s] of [['central-conservatory', 10.4, 2.9, spacing], ['northern-arboretum', 21.2, 4.2, spacing * 1.8]] as const) {
    for (let x = -R; x <= R; x += s) {
      for (let z = -R; z <= R; z += s) {
        const jx = x + ((i * 7919) % 100) / 100 * s * 0.4;
        const jz = z + ((i * 104729) % 100) / 100 * s * 0.4;
        i++;
        const r = Math.hypot(jx, jz);
        if (r > R || r < inner) continue;
        const water = (Math.hypot(jx - 4.6, jz + 3.4) < 2) && wing === 'central-conservatory';
        out.push({ id: `${wing}:${i}`, wing, x: jx, z: jz, water, zone: wing === 'central-conservatory' ? conservatoryZoneAt(jx, jz, water) : arboretumZoneAt(jx, jz, water), maxH: wing === 'central-conservatory' ? 6 : 14 });
      }
    }
  }
  return out;
}

const NOW = 1_700_000_000_000;
const ids = SPECIES.map((s) => s.id);

function grow(n: number, minutes = (i: number) => 15 + (i * 37) % 200, from: ParadiseState = { ...INITIAL_PARADISE }): ParadiseState {
  let s = from;
  for (let i = from.plants.length; i < n; i++) s = plantFromSession(s, ids[i % ids.length]!, minutes(i), `session-${i}`).state;
  return s;
}

test('the world uses its own key, never the garden’s', () => {
  assert.equal(WORLD_KEY, 'focus.world.v1');
  assert.notEqual(WORLD_KEY, 'focus.paradise.v1');
});

test('zones: 15 in the conservatory, 10 in the arboretum, 11 wings', () => {
  assert.equal(CONSERVATORY_ZONES.length, 15);
  assert.equal(ARBORETUM_ZONES.length, 10);
  assert.equal(WINGS.length, 11);
  const seen = new Set(floor().filter((s) => s.wing === 'central-conservatory').map((s) => s.zone));
  for (const z of CONSERVATORY_ZONES) assert.ok(seen.has(z.id), `conservatory floor has zone ${z.id}`);
  const seenA = new Set(floor().filter((s) => s.wing === 'northern-arboretum').map((s) => s.zone));
  for (const z of ARBORETUM_ZONES) assert.ok(seenA.has(z.id), `arboretum floor has zone ${z.id}`);
});

test('one completed session makes one plant and one position, however often it is reported', () => {
  let s: ParadiseState = { ...INITIAL_PARADISE };
  for (let k = 0; k < 5; k++) s = plantFromSession(s, 'rose', 95, 'same-session').state;
  assert.equal(s.plants.length, 1);
  assert.equal(s.plants[0]!.size, 4, '90–119 min is size 4');
  const { plants, penalties } = toWorld(s);
  let w = initialWorld(NOW);
  for (let k = 0; k < 3; k++) w = reconcile(w, plants, penalties, floor(), progressOf(s.plants), NOW + k).world;
  assert.equal(Object.keys(w.placements).length, 1);
});

test('the growth table is unchanged', () => {
  const cases: [number, number | null][] = [[14, null], [15, 1], [29, 1], [30, 2], [59, 2], [60, 3], [89, 3], [90, 4], [119, 4], [120, 5], [149, 5], [150, 6], [179, 6], [180, 7], [400, 7]];
  for (const [m, size] of cases) {
    const r = plantFromSession({ ...INITIAL_PARADISE }, 'rose', m, `m${m}`);
    assert.equal(r.plant?.size ?? null, size, `${m} min`);
  }
});

test('an abandoned session leaves a sapling, never a plant', () => {
  const s = addPenalty({ ...INITIAL_PARADISE }, 'flowers');
  const { plants, penalties } = toWorld(s);
  assert.equal(plants.length, 0);
  const w = reconcile(initialWorld(NOW), plants, penalties, floor(), progressOf(s.plants), NOW).world;
  const ps = Object.values(w.placements);
  assert.equal(ps.length, 1);
  assert.equal(ps[0]!.kind, 'penalty');
});

test('placed plants never move when more are grown or wings open', () => {
  const slots = floor();
  const s1 = grow(60);
  const w1 = reconcile(initialWorld(NOW), toWorld(s1).plants, [], slots, progressOf(s1.plants), NOW).world;
  const s2 = grow(400, undefined, s1);
  const w2 = reconcile(w1, toWorld(s2).plants, [], slots, progressOf(s2.plants), NOW + 1).world;
  for (const [id, p] of Object.entries(w1.placements)) assert.deepEqual(w2.placements[id], p);
});

test('no plant is ever lost: when every position is taken, the rest wait in pending', () => {
  const slots = floor(1.6); // a small floor
  const s = grow(900);
  const { plants } = toWorld(s);
  const w = reconcile(initialWorld(NOW), plants, [], slots, progressOf(s.plants), NOW).world;
  const placed = Object.keys(w.placements).length;
  assert.ok(w.pending.length > 0, 'some wait');
  assert.equal(placed + w.pending.length, plants.length, 'every plant is placed or pending');
  // a plant removed in the garden frees its position; the oldest pending plant takes one
  const freed = Object.keys(w.placements)[0]!;
  const s2 = removePlant(s, freed);
  const w2 = reconcile(w, toWorld(s2).plants, [], slots, progressOf(s2.plants), NOW + 1).world;
  assert.equal(w2.placements[freed], undefined);
  assert.equal(Object.keys(w2.placements).length + w2.pending.length, toWorld(s2).plants.length);
});

test('specimens keep their distance: no overlaps, nothing on the landmark', () => {
  const s = grow(500);
  const w = reconcile(initialWorld(NOW), toWorld(s).plants, [], floor(), progressOf(s.plants), NOW).world;
  const ps = Object.values(w.placements);
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i]!;
    if (a.wing === 'northern-arboretum') assert.ok(Math.hypot(a.x, a.z) >= LANDMARK_CLEARANCE, 'clear of the banyan');
    for (let j = i + 1; j < ps.length; j++) {
      const b = ps[j]!;
      if (a.wing !== b.wing) continue;
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= Math.max(a.radius, b.radius) * 0.92 - 1e-9, `${a.refId} and ${b.refId} overlap`);
    }
  }
});

test('the Grand Banyan is always there, at its own place, and takes no planting position', () => {
  const broken: WorldState = { ...initialWorld(NOW), landmarks: [] };
  const w = reconcile(broken, [], [], floor(), progressOf([]), NOW).world;
  const lm = w.landmarks.find((l) => l.id === 'grand-banyan')!;
  assert.ok(lm);
  assert.equal(lm.x, GRAND_BANYAN.x);
  assert.equal(lm.z, GRAND_BANYAN.z);
  assert.equal(lm.permanent, true);
  const moved: WorldState = { ...initialWorld(NOW), landmarks: [{ ...lm, x: 9 }] };
  assert.equal(reconcile(moved, [], [], floor(), progressOf([]), NOW).world.landmarks[0]!.x, GRAND_BANYAN.x);
  assert.ok(!Object.values(w.placements).some((p) => p.refId === 'grand-banyan'));
});

test('an ordinary banyan grown by focusing is a normal tree', () => {
  const s = plantFromSession({ ...INITIAL_PARADISE }, 'banyan', 180, 's-banyan').state;
  const w = reconcile(initialWorld(NOW), toWorld(s).plants, [], floor(), progressOf(s.plants), NOW).world;
  const p = w.placements[s.plants[0]!.id]!;
  assert.ok(p);
  assert.equal(p.kind, 'specimen');
  assert.equal(p.wing, 'northern-arboretum');
});

test('trees go to the arboretum, plants to the conservatory, lotus to water, each to its zone', () => {
  let s: ParadiseState = { ...INITIAL_PARADISE };
  s = plantFromSession(s, 'mango', 120, 'a').state;
  s = plantFromSession(s, 'rose', 60, 'b').state;
  s = plantFromSession(s, 'lotus', 60, 'c').state;
  s = plantFromSession(s, 'tulsi', 30, 'd').state;
  const w = reconcile(initialWorld(NOW), toWorld(s).plants, [], floor(), progressOf(s.plants), NOW).world;
  const at = (sid: string) => w.placements[s.plants.find((p) => p.speciesId === sid)!.id]!;
  assert.equal(at('mango').zone, 'fruit_orchard');
  assert.equal(at('rose').zone, 'rose_terrace');
  assert.equal(at('lotus').zone, 'water');
  assert.equal(at('tulsi').zone, 'herb');
});

test('wings open by progression, never by payment', () => {
  const w0 = reconcile(initialWorld(NOW), [], [], floor(), { sessions: 0, minutes: 0, species: 0 }, NOW).world;
  assert.ok(!w0.wings['eastern-conservatory']);
  const w1 = reconcile(w0, [], [], floor(), { sessions: 40, minutes: 0, species: 0 }, NOW).world;
  assert.ok(w1.wings['eastern-conservatory']);
});

test('saved worlds round-trip and unknown shapes are rejected', () => {
  const s = grow(30);
  const w = reconcile(initialWorld(NOW), toWorld(s).plants, [], floor(), progressOf(s.plants), NOW).world;
  assert.ok(isWorld(JSON.parse(JSON.stringify(w))));
  assert.ok(!isWorld({ schemaVersion: 2 }));
  assert.ok(!isWorld(null));
});

test('a thousand plants place quickly', () => {
  const s = grow(1000);
  const t = Date.now();
  reconcile(initialWorld(NOW), toWorld(s).plants, [], floor(), progressOf(s.plants), NOW);
  assert.ok(Date.now() - t < 4000, `took ${Date.now() - t} ms`);
});
