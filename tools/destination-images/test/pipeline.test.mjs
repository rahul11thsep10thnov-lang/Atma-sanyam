import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { parseDestinations } from '../src/normalize.mjs';
import { buildFilename, FILENAME_RE } from '../src/slug.mjs';
import { checkPackage } from '../src/qc.mjs';
import { renderBatches, manifestEntry, fullPrompt } from '../src/render.mjs';
import { generateDestination } from '../src/generate.mjs';
import { NEGATIVE_PROMPT, REALISM_SUFFIX } from '../src/spec.mjs';

const samples = JSON.parse(readFileSync(new URL('../examples/sample-packages.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

test('parses every input form, normalises states, removes only exact duplicates', () => {
  const { destinations, duplicates } = parseDestinations(`
# comment
Triveni Sangam — Prayagraj — Uttar Pradesh
Pangong Lake — Ladakh
2. Konark Sun Temple, Puri, Orissa
Hampi | Vijayanagara | Karnataka
Dudhsagar Falls - Goa
triveni sangam — prayagraj — uttar pradesh
Kalimpong
`);
  assert.deepEqual(destinations.map((d) => d.id), ['001', '002', '003', '004', '005', '006']);
  assert.equal(duplicates.length, 1);
  assert.deepEqual(destinations[1], { ...destinations[1], name: 'Pangong Lake', state: 'Ladakh', district: null });
  assert.equal(destinations[2].state, 'Odisha');
  assert.equal(destinations[2].district, 'Puri');
  assert.equal(destinations[3].district, 'Vijayanagara');
  assert.equal(destinations[4].state, 'Goa');
  assert.equal(destinations[5].state, null);
});

test('keeps same-named destinations in different states', () => {
  const { destinations } = parseDestinations('Name|State|District\nShiv Temple|Assam|Sivasagar\nShiv Temple|Kerala|Kochi\n');
  assert.equal(destinations.length, 2);
});

test('reads CSV tables with quoted commas and categories', () => {
  const { destinations } = parseDestinations('Name,State,District,Category\n"Radhanagar Beach, Havelock",Andaman & Nicobar,South Andaman,beach\n');
  assert.equal(destinations[0].name, 'Radhanagar Beach, Havelock');
  assert.equal(destinations[0].state, 'Andaman and Nicobar Islands');
  assert.equal(destinations[0].category, 'Beach');
});

test('filenames follow Part 19 and stay unique', () => {
  const used = new Set();
  assert.equal(buildFilename({ state: 'Uttar Pradesh', district: 'Prayagraj', name: 'Triveni Sangam' }, used), 'india_uttar_pradesh_prayagraj_triveni_sangam.webp');
  assert.equal(buildFilename({ state: 'Rajasthan', district: 'Jaisalmer', name: 'Jaisalmer Fort' }, used), 'india_rajasthan_jaisalmer_jaisalmer_fort.webp');
  assert.equal(buildFilename({ state: 'Ladakh', district: '', name: 'Pangong Lake' }, used), 'india_ladakh_pangong_lake.webp');
  assert.equal(buildFilename({ state: 'Delhi', district: 'Delhi', name: "Humayun's Tomb" }, used), 'india_delhi_humayun_s_tomb.webp');
  assert.equal(buildFilename({ state: 'Ladakh', district: '', name: 'Pangong Lake' }, used), 'india_ladakh_pangong_lake_2.webp');
  assert.equal(buildFilename({ state: 'Tamil Nadu', district: 'Chennai', name: 'The Marina Beach' }, used), 'india_tamil_nadu_chennai_marina_beach.webp');
  for (const f of used) assert.match(f, FILENAME_RE);
});

test('the reference packages pass QC', () => {
  for (const s of samples) {
    const qc = checkPackage(s.package, { filename: 'india_x_y.webp' });
    assert.deepEqual(qc.errors, [], s.package.name);
  }
});

test('QC rejects broken packages with actionable reasons', () => {
  const pkg = clone(samples[1].package);
  pkg.drone_altitude_m = 600;
  pkg.camera_angle_deg = 52;
  pkg.alt_text = 'best beautiful jaisalmer fort tourist HD image';
  pkg.image_description = 'Too short.';
  pkg.tags = ['India', 'Rajasthan', 'Fort'];
  pkg.self_check.colors_natural = false;
  const { pass, errors } = checkPackage(pkg, {});
  assert.equal(pass, false);
  for (const fragment of ['altitude 600', 'camera angle 52', 'alt_text', '20–40', 'tags; must be 5–10', 'colors_natural']) {
    assert.ok(errors.some((e) => e.includes(fragment)), `expected an error about ${fragment}:\n${errors.join('\n')}`);
  }
});

test('QC flags copied shots and stereotype props', () => {
  const pkg = clone(samples[1].package);
  pkg.image_prompt += ' Cows wander the lanes.';
  const twin = { id: '010', ...clone(samples[1].package), name: 'Another Fort' };
  const { errors, warnings } = checkPackage(pkg, { recent: [twin] });
  assert.ok(errors.some((e) => e.includes('#010')));
  assert.ok(warnings.some((w) => w.includes('cows')));
});

test('renders Part 27 blocks in Part 28 batches with manifest entries', () => {
  const records = samples.map((s, i) => ({
    id: s.id, key: s.id, input: s.input, status: 'pass',
    filename: ['a', 'b', 'c'].map((x) => `india_${x}.webp`)[i],
    prompt: fullPrompt(s.package), negative_prompt: NEGATIVE_PROMPT,
    package: s.package, qc: { errors: [], warnings: [] },
  }));
  const [batch] = renderBatches(records);
  assert.equal(batch.number, '01');
  assert.match(batch.text, /^BATCH 01\nDestinations 001–004/);
  assert.match(batch.text, /DESTINATION #004\n\nNAME:\nPangong Lake/);
  assert.match(batch.text, /QUALITY CONTROL:\nPASS/);
  assert.ok(batch.text.includes(REALISM_SUFFIX));
  assert.equal(manifestEntry(records[0]).alt, 'Aerial view of Triveni Sangam in Prayagraj, Uttar Pradesh, India');
});

test('generateDestination sends one destination per call and revises on QC failure', async () => {
  const good = samples[0].package;
  const bad = { ...clone(good), tags: ['India'] };
  const replies = [bad, good];
  const bodies = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    bodies.push({ body, headers: init.headers });
    const pkg = replies.shift();
    return new Response(JSON.stringify({
      id: `msg_${bodies.length}`, type: 'message', role: 'assistant', model: body.model,
      content: [{ type: 'text', text: JSON.stringify(pkg) }],
      stop_reason: 'end_turn', stop_sequence: null, stop_details: null,
      usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 0 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const client = new Anthropic({ apiKey: 'test', fetch, maxRetries: 0 });
  const dest = parseDestinations(samples[0].input).destinations[0];
  const ctx = { recent: [], usedFilenames: new Set() };
  const rec = await generateDestination(client, dest, ctx, { model: 'claude-opus-5-5', effort: 'high', research: false });

  assert.equal(bodies.length, 2, 'one initial call + one revision');
  const first = bodies[0].body;
  assert.equal(first.model, 'claude-opus-5-5');
  assert.equal(first.output_config.effort, 'high');
  assert.equal(first.output_config.format.type, 'json_schema');
  assert.equal(first.fallbacks, 'default');
  assert.equal(first.system[0].cache_control.type, 'ephemeral');
  assert.equal(first.messages.length, 1);
  assert.match(first.messages[0].content, /Destination #001: Triveni Sangam/);
  assert.match(bodies[1].body.messages.at(-1).content, /tags/);

  assert.equal(rec.status, 'pass');
  assert.equal(rec.filename, 'india_uttar_pradesh_prayagraj_triveni_sangam.webp');
  assert.ok(ctx.usedFilenames.has(rec.filename));
  assert.ok(rec.prompt.endsWith(REALISM_SUFFIX));
  assert.equal(rec.usage.input_tokens, 20);
});

test('QC catches values outside the fixed vocabularies', () => {
  const pkg = { ...clone(samples[2].package), category: 'Hill station', time_of_day: 'dusk', state: 'ladakh' };
  const { errors } = checkPackage(pkg, {});
  assert.ok(errors.some((e) => e.startsWith('category "Hill station"')));
  assert.ok(errors.some((e) => e.startsWith('time_of_day')));
  assert.ok(errors.some((e) => e === 'state must be written "Ladakh"'));
});
