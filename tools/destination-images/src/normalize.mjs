// Part 30 + Part 31 steps 1–3: turn whatever list the user pastes into
// numbered, de-duplicated destination records.
//
// Accepted line forms (one destination per line):
//   Destination
//   Destination — City/District — State        (—, –, |, or " - " separate fields)
//   Destination, City, State
// or a CSV/TSV/Markdown table whose header names the columns
// (Name | State | District | Category, in any order; City is an alias of District).

import { canonicalCategory, canonicalState } from './spec.mjs';

const HEADER_ALIASES = {
  name: 'name', destination: 'name', place: 'name', 'tourist place': 'name',
  state: 'state', 'state/ut': 'state', ut: 'state',
  district: 'district', city: 'district', 'city/district': 'district', 'district/city': 'district',
  category: 'category', type: 'category',
};

const tidy = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

function splitDelimited(line, delimiter) {
  if (delimiter === '|') {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(tidy);
  }
  // Minimal CSV: honours "quoted, fields".
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === delimiter && !quoted) { out.push(tidy(cur)); cur = ''; }
    else cur += ch;
  }
  out.push(tidy(cur));
  return out;
}

function detectTable(lines) {
  const first = lines[0];
  for (const delimiter of ['|', '\t', ',']) {
    if (!first.includes(delimiter)) continue;
    const cells = splitDelimited(first, delimiter).map((c) => c.toLowerCase());
    const columns = cells.map((c) => HEADER_ALIASES[c] ?? null);
    if (columns.includes('name')) return { delimiter, columns };
  }
  return null;
}

function stripNumbering(line) {
  return line.replace(/^\s*(?:[-*•]|\d{1,4}[.)]|#\d+)\s+/, '');
}

/** Free-form line → { name, district, state }. */
function parseFreeLine(line) {
  const parts = stripNumbering(line)
    .split(/\s+[—–]\s+|\s*[—–]\s*|\s+-\s+|\s*\|\s*/)
    .map(tidy)
    .filter(Boolean);
  let fields = parts;
  // "Name, City, State" only when the last comma part is a real state, so
  // names that contain commas ("Fort Kochi, Kochi") still work.
  if (parts.length === 1 && parts[0].includes(',')) {
    const commaParts = parts[0].split(',').map(tidy).filter(Boolean);
    if (canonicalState(commaParts.at(-1))) fields = commaParts;
  }
  const [name, ...rest] = fields;
  let state = null;
  let district = null;
  if (rest.length) {
    const last = rest.at(-1);
    if (canonicalState(last)) {
      state = last;
      district = rest.length > 1 ? rest.slice(0, -1).join(', ') : null;
    } else if (rest.length === 1) {
      district = last; // "Destination — City"; state left for the model
    } else {
      state = last; // unknown state spelling — keep it, the model normalizes
      district = rest.slice(0, -1).join(', ');
    }
  }
  return { name, district, state };
}

export function dedupeKey(r) {
  const k = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return [k(r.name), k(r.state), k(r.district)].join('|');
}

/**
 * Parse raw list text. Returns { destinations, duplicates, warnings }.
 * Each destination: { id: '001', key, name, state, district, category, input }.
 */
export function parseDestinations(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .filter((l) => !/^\s*\|?\s*:?-{3,}/.test(l)); // markdown table rule

  const raw = [];
  if (lines.length) {
    const table = detectTable(lines);
    if (table) {
      for (const line of lines.slice(1)) {
        const cells = splitDelimited(line, table.delimiter);
        const rec = {};
        table.columns.forEach((col, i) => { if (col) rec[col] = cells[i] || null; });
        raw.push({ ...rec, input: tidy(line) });
      }
    } else {
      for (const line of lines) raw.push({ ...parseFreeLine(line), input: tidy(line) });
    }
  }

  const destinations = [];
  const duplicates = [];
  const warnings = [];
  const seen = new Map();

  for (const r of raw) {
    const name = tidy(r.name);
    if (!name) { warnings.push(`Skipped line with no destination name: "${r.input}"`); continue; }
    const state = r.state ? canonicalState(r.state) ?? tidy(r.state) : null;
    if (r.state && !canonicalState(r.state)) {
      warnings.push(`Unrecognised state "${r.state}" for ${name}; the model will normalise it.`);
    }
    const category = r.category ? canonicalCategory(r.category) : null;
    if (r.category && !category) {
      warnings.push(`Unknown category "${r.category}" for ${name}; the model will classify it.`);
    }
    const rec = { name, state, district: tidy(r.district) || null, category, input: r.input };
    rec.key = dedupeKey(rec);
    if (seen.has(rec.key)) {
      duplicates.push({ input: r.input, duplicateOf: seen.get(rec.key) });
      continue;
    }
    rec.id = String(destinations.length + 1).padStart(3, '0');
    seen.set(rec.key, rec.id);
    destinations.push(rec);
  }

  // Same name, different (or missing) state is legitimate (Part 31 step 3)
  // but worth a human glance when one side has no state at all.
  const byName = new Map();
  for (const d of destinations) {
    const n = d.name.toLowerCase();
    byName.set(n, [...(byName.get(n) ?? []), d]);
  }
  for (const group of byName.values()) {
    if (group.length > 1 && group.some((d) => !d.state)) {
      warnings.push(`Possible duplicate: ${group.map((d) => `#${d.id} ${d.input}`).join(' / ')}`);
    }
  }

  return { destinations, duplicates, warnings };
}
