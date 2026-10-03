// Builds the system prompt (stable → cached across every destination) and
// the per-destination user message (volatile → after the cache breakpoint).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALTITUDE_RANGES, NEGATIVE_PROMPT, REALISM_SUFFIX } from './spec.mjs';

const MASTER = readFileSync(fileURLToPath(new URL('../MASTER_PROMPT.md', import.meta.url)), 'utf8');

export const SYSTEM_PROMPT = `${MASTER}

## HOW THIS PIPELINE USES YOUR ANSWER

You are called once per destination and return one JSON package. Code does the rest:

- The pipeline appends this universal suffix to your image_prompt, so do not repeat it:
  "${REALISM_SUFFIX}"
- The pipeline attaches the Part 18 negative prompt verbatim. If a destination needs an
  extra exclusion (e.g. "snow" for a summer desert scene), state it inside image_prompt as
  an "avoid …" clause instead.
- The pipeline builds the filename from your normalised name, state and city_district.
- Write image_prompt as flowing photographic direction, in this order: destination and
  location context; primary subject with real architectural/geographic detail; camera
  altitude in metres; camera angle in degrees; lens/perspective; surrounding landscape;
  lighting with time of day and sun direction; weather; composition and landmark
  position; people and vehicles only if they belong. 120–220 words.
- NEVER write "drone", "UAV" or "quadcopter" in image_prompt: image models paint the aircraft into
  the frame. Describe the viewpoint as "shot from 140 m above the river, camera tilted 35° downward".
- Realism comes from specific detail, not adjectives. Include 4–6 concrete observations a real
  photograph would show: surface textures (rock strata, stone grain, wind ripples in sand, roof
  weathering), real materials and colours of local buildings, small asymmetric details, how water
  actually looks here (clarity, colour banding, foam), and the true scale of people and vehicles.
- Keep the sky pale and natural; never ask for a deep saturated blue sky. Prefer haze to clear blue.
- Describe architecture and terrain exactly as they are. Do not add generic "Rajasthani" domes,
  towers or ornament to a fort, or smooth dunes to a rocky mountain. When unsure of a form,
  say less rather than invent it.
- alt_text exactly: "Aerial view of [DESTINATION] in [CITY/REGION], [STATE], India"
  (drop "in [CITY/REGION]," when no city applies: "Aerial view of Pangong Lake in Ladakh, India").
- image_description: 20–40 words, only what the photograph shows.
- tags: 5–10, must include "India" and the state name exactly as in the state field.
- Altitude guideline per category (metres): ${Object.entries(ALTITUDE_RANGES).map(([c, [lo, hi]]) => `${c} ${lo}–${hi}`).join('; ')}.
- self_check: answer each Part 26 question honestly. If one would be NO, fix the package
  first — never return a NO you could have fixed.
- research.uncertainties: list anything you are unsure of and keep unverified details
  out of the prompt. Accuracy comes before artistic drama.

Reference — negative prompt the pipeline attaches: ${NEGATIVE_PROMPT}.`;

/** Short digest of recent shots so the model can vary the collection (Part 25). */
export function varietyContext(recent) {
  if (!recent.length) return 'This is the first image in the collection.';
  const lines = recent.map(
    (r) => `#${r.id} ${r.name} (${r.category}) — ${r.drone_altitude_m} m, ${r.camera_angle_deg}°, ${r.time_of_day}, ${r.sun_direction}, ${r.weather.split(/[.;,]/)[0]}`,
  );
  return `Most recent images already in the collection (vary altitude, angle, time of day, sun direction and weather against these where the destination allows — never at the cost of accuracy):\n${lines.join('\n')}`;
}

export function destinationMessage(dest, recent) {
  const given = [
    `Destination #${dest.id}: ${dest.name}`,
    dest.district && `City/district (as provided): ${dest.district}`,
    dest.state && `State (as provided): ${dest.state}`,
    dest.category && `Category (as provided): ${dest.category}`,
    `Original input line: "${dest.input}"`,
  ].filter(Boolean).join('\n');
  return `${given}\n\n${varietyContext(recent)}\n\nResearch this destination, then return its image-generation package.`;
}

export function revisionMessage(errors) {
  return `Quality control rejected this package. Fix every point and return the full corrected package:\n- ${errors.join('\n- ')}`;
}
