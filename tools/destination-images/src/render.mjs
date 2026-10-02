// Turns generated records into the deliverables: Part 27 text blocks in
// Part 28 batches, plus a JSON manifest and CSV for the website.

import { REALISM_SUFFIX } from './spec.mjs';

export const BATCH_SIZE = 50;

export function fullPrompt(pkg) {
  return `${pkg.image_prompt.trim().replace(/\s*\.?$/, '.')} ${REALISM_SUFFIX}`;
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const angleLabel = (deg) => (deg >= 70 ? `${deg}° downward (near-top-down)` : `${deg}° downward`);

export function renderRecord(rec) {
  const p = rec.package;
  const qc = rec.qc.errors.length
    ? `NEEDS REVIEW\n${rec.qc.errors.map((e) => `- ${e}`).join('\n')}`
    : 'PASS';
  const notes = [
    ...rec.qc.warnings.map((w) => `- Warning: ${w}`),
    p.research.uncertainties?.trim() && `- Unverified: ${p.research.uncertainties.trim()}`,
  ].filter(Boolean);
  return `---

DESTINATION #${rec.id}

NAME:
${p.name}

STATE:
${p.state}

CITY/DISTRICT:
${p.city_district || '—'}

CATEGORY:
${p.category}

PRIMARY SUBJECT:
${p.primary_subject}

DRONE VIEWPOINT:
${p.drone_viewpoint}

DRONE ALTITUDE:
${p.drone_altitude_m} m

CAMERA ANGLE:
${angleLabel(p.camera_angle_deg)}

LIGHTING:
${capitalise(p.time_of_day)}, ${p.sun_direction}. ${p.lighting}

WEATHER:
${p.weather}

GEOGRAPHIC DESCRIPTION:
${p.geographic_description}

ENVIRONMENTAL DETAILS:
${p.environmental_details}

COMPOSITION:
${p.composition}

VISUAL DESCRIPTION:
${p.visual_description}

IMAGE GENERATION PROMPT:
${rec.prompt}

NEGATIVE PROMPT:
${rec.negative_prompt}

FILE NAME:
${rec.filename}

SEO ALT TEXT:
${p.alt_text}

IMAGE DESCRIPTION:
${p.image_description}

WEBSITE CAPTION:
${p.website_caption}

TAGS:
${p.tags.join(', ')}

QUALITY CONTROL:
${qc}${notes.length ? `\n\nREVIEW NOTES:\n${notes.join('\n')}` : ''}
`;
}

/** Records sorted by id → [{ number, from, to, text }]. */
export function renderBatches(records) {
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
  const batches = [];
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const chunk = sorted.slice(i, i + BATCH_SIZE);
    const number = String(batches.length + 1).padStart(2, '0');
    const from = chunk[0].id;
    const to = chunk.at(-1).id;
    const text = `BATCH ${number}\nDestinations ${from}–${to}\n\n${chunk.map(renderRecord).join('\n')}---\n`;
    batches.push({ number, from, to, text });
  }
  return batches;
}

/** What the website consumes: one entry per image. */
export function manifestEntry(rec) {
  const p = rec.package;
  return {
    id: rec.id,
    name: p.name,
    state: p.state,
    city_district: p.city_district || null,
    category: p.category,
    file: rec.filename,
    alt: p.alt_text,
    description: p.image_description,
    caption: p.website_caption,
    tags: p.tags,
    width: rec.image?.width ?? null,
    height: rec.image?.height ?? null,
    qc: rec.qc.errors.length ? 'review' : 'pass',
  };
}

const csvCell = (v) => {
  const s = Array.isArray(v) ? v.join('; ') : String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function renderCsv(records) {
  const cols = ['id', 'name', 'state', 'city_district', 'category', 'altitude_m', 'angle_deg',
    'time_of_day', 'file', 'alt', 'caption', 'tags', 'qc', 'prompt', 'negative_prompt'];
  const rows = [...records].sort((a, b) => a.id.localeCompare(b.id)).map((rec) => {
    const m = manifestEntry(rec);
    const p = rec.package;
    return [m.id, m.name, m.state, m.city_district, m.category, p.drone_altitude_m,
      p.camera_angle_deg, p.time_of_day, m.file, m.alt, m.caption, m.tags, m.qc,
      rec.prompt, rec.negative_prompt].map(csvCell).join(',');
  });
  return `${cols.join(',')}\n${rows.join('\n')}\n`;
}
