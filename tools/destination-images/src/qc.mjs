// Part 26 quality control, the parts that can be checked mechanically.
// `errors` send the package back to the model for revision; `warnings` are
// kept on the record for a human to review.

import {
  ALTITUDE_RANGES, CAMERA_ANGLES, CATEGORIES, NEAR_TOP_DOWN_MIN, STEREOTYPE_TERMS, SUN_DIRECTIONS, AIRCRAFT_WORDS,
  TIMES_OF_DAY, canonicalState,
} from './spec.mjs';
import { FILENAME_RE } from './slug.mjs';

const words = (s) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
const has = (haystack, needle) => haystack.toLowerCase().includes(needle.toLowerCase());

export function checkPackage(pkg, { filename, recent = [] } = {}) {
  const errors = [];
  const warnings = [];

  if (!canonicalState(pkg.state)) errors.push(`state "${pkg.state}" is not a canonical Indian state/UT name`);
  else if (canonicalState(pkg.state) !== pkg.state) errors.push(`state must be written "${canonicalState(pkg.state)}"`);
  if (!CATEGORIES.includes(pkg.category)) errors.push(`category "${pkg.category}" must be exactly one of: ${CATEGORIES.join(', ')}`);
  if (!TIMES_OF_DAY.includes(pkg.time_of_day)) errors.push(`time_of_day must be one of: ${TIMES_OF_DAY.join(', ')}`);
  if (!SUN_DIRECTIONS.includes(pkg.sun_direction)) errors.push(`sun_direction must be one of: ${SUN_DIRECTIONS.join(', ')}`);

  const [lo, hi] = ALTITUDE_RANGES[pkg.category] ?? [60, 400];
  const alt = pkg.drone_altitude_m;
  if (!(alt > 0)) errors.push('drone_altitude_m must be a positive number');
  else if (alt < lo * 0.5 || alt > hi * 1.5) {
    errors.push(`altitude ${alt} m is far outside the ${pkg.category} guideline (${lo}–${hi} m)`);
  } else if (alt < lo || alt > hi) {
    warnings.push(`altitude ${alt} m is outside the ${pkg.category} guideline (${lo}–${hi} m) — confirm it is deliberate`);
  }

  const angle = pkg.camera_angle_deg;
  if (!CAMERA_ANGLES.includes(angle) && !(angle >= NEAR_TOP_DOWN_MIN && angle <= 90)) {
    errors.push(`camera angle ${angle}° must be one of ${CAMERA_ANGLES.join(', ')} or ${NEAR_TOP_DOWN_MIN}–90 (near-top-down)`);
  }

  const promptWords = words(pkg.image_prompt);
  if (promptWords < 90) errors.push(`image_prompt is only ${promptWords} words; it must be specific, not generic (aim for 120–220)`);
  if (promptWords > 320) warnings.push(`image_prompt is ${promptWords} words; some generators truncate long prompts`);
  if (!has(pkg.image_prompt, pkg.name.split(/[(,]/)[0].trim())) errors.push('image_prompt must name the destination');
  if (!/\d+\s*(m|metres|meters)\b/i.test(pkg.image_prompt)) errors.push('image_prompt must state the drone altitude in metres');
  if (!/\d+\s*°|\d+\s*degrees?|top-down/i.test(pkg.image_prompt)) errors.push('image_prompt must state the camera angle');
  if (AIRCRAFT_WORDS.test(pkg.image_prompt)) {
    errors.push('image_prompt mentions a drone/UAV; image models draw it into the picture. Say "shot from N m above" instead');
  }
  for (const term of STEREOTYPE_TERMS) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(pkg.image_prompt)) {
      warnings.push(`prompt mentions "${term}" — confirm it genuinely belongs at this destination (Part 7)`);
    }
  }

  if (!/^Aerial view of .+, India$/.test(pkg.alt_text)) {
    errors.push('alt_text must follow "Aerial view of [DESTINATION] in [CITY/REGION], [STATE], India"');
  } else if (!has(pkg.alt_text, pkg.state)) {
    errors.push('alt_text must name the state');
  }
  if (words(pkg.alt_text) > 25) errors.push('alt_text is too long; keep it natural, not keyword-stuffed');

  const descWords = words(pkg.image_description);
  if (descWords < 20 || descWords > 40) errors.push(`image_description is ${descWords} words; it must be 20–40`);

  if (!pkg.website_caption?.trim()) errors.push('website_caption is empty');
  else if (pkg.website_caption.length > 220) errors.push('website_caption should be concise (≤ 220 characters)');

  const tags = pkg.tags ?? [];
  const uniqueTags = new Set(tags.map((t) => t.toLowerCase()));
  if (tags.length < 5 || tags.length > 10) errors.push(`${tags.length} tags; must be 5–10`);
  if (uniqueTags.size !== tags.length) errors.push('tags contain duplicates');
  if (!uniqueTags.has('india')) errors.push('tags must include "India"');
  if (!uniqueTags.has(pkg.state.toLowerCase())) errors.push(`tags must include the state "${pkg.state}"`);

  if (filename && !FILENAME_RE.test(filename)) errors.push(`filename "${filename}" breaks the naming rules`);

  const failedSelfChecks = Object.entries(pkg.self_check ?? {}).filter(([, ok]) => !ok).map(([k]) => k);
  if (failedSelfChecks.length) errors.push(`self-check answered NO for: ${failedSelfChecks.join(', ')} — revise until all are YES`);

  // Part 24/25: the same category shot with the same altitude, angle, time and
  // sun direction as a recent image is a copy, not a new photograph.
  const signature = (p) => [p.category, p.drone_altitude_m, p.camera_angle_deg, p.time_of_day, p.sun_direction].join('|');
  const twin = recent.find((r) => signature(r) === signature(pkg));
  if (twin) errors.push(`same altitude/angle/time/sun as #${twin.id} ${twin.name}; vary the shot (Part 24)`);

  return { pass: errors.length === 0, errors, warnings };
}
