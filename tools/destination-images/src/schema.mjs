// What the model returns for ONE destination. Enums and numeric/length limits
// are not expressed as schema constraints: the SDK's strict-schema transform
// drops them, and a hard parse failure would lose the whole answer. qc.mjs
// enforces them instead and sends violations back for revision.

import { z } from 'zod';
import { CATEGORIES, SUN_DIRECTIONS, TIMES_OF_DAY } from './spec.mjs';

export const PackageSchema = z.object({
  name: z.string().describe('Normalised official/common destination name, e.g. "Jaisalmer Fort"'),
  state: z.string().describe('Canonical Indian state or union territory'),
  city_district: z.string().describe('City or district; empty string only when none applies'),
  category: z.string().describe(`Exactly one of: ${CATEGORIES.join(', ')}`),
  research: z.object({
    recognisable_features: z.string().describe('What makes it visually recognisable from the air'),
    dominant_landscape: z.string(),
    key_landmark: z.string(),
    surroundings: z.string().describe('What really surrounds it: urban fabric, forest, desert, coast…'),
    uncertainties: z.string().describe('Facts you could not verify and kept out of the prompt; empty if none'),
  }),
  geographic_description: z.string(),
  primary_subject: z.string(),
  drone_viewpoint: z.string().describe('Where the drone is relative to the subject, and why'),
  drone_altitude_m: z.number().describe('Single altitude in metres'),
  camera_angle_deg: z.number().describe('Downward tilt: 15,20,25,30,35,40,45, or 70–90 for near-top-down'),
  time_of_day: z.string().describe(`Exactly one of: ${TIMES_OF_DAY.join(', ')}`),
  sun_direction: z.string().describe(`Exactly one of: ${SUN_DIRECTIONS.join(', ')}`),
  lighting: z.string(),
  weather: z.string(),
  environmental_details: z.string(),
  composition: z.string().describe('Framing, landmark position, negative space for website text'),
  visual_description: z.string(),
  image_prompt: z.string().describe(
    'The destination-specific FLUX/Leonardo prompt. Do NOT include the universal realism, ' +
    'color-science or no-text/16:9 boilerplate — the pipeline appends it.',
  ),
  alt_text: z.string(),
  image_description: z.string().describe('20–40 words, only what the photograph shows'),
  website_caption: z.string(),
  tags: z.array(z.string()),
  self_check: z.object({
    geographically_plausible: z.boolean(),
    landmark_recognisable: z.boolean(),
    architecture_appropriate: z.boolean(),
    landscape_authentic: z.boolean(),
    perspective_realistic: z.boolean(),
    altitude_appropriate: z.boolean(),
    lighting_believable: z.boolean(),
    shadows_realistic: z.boolean(),
    colors_natural: z.boolean(),
    looks_like_real_photo: z.boolean(),
    avoids_ai_artifacts: z.boolean(),
    premium_website_ready: z.boolean(),
    distinct_from_others: z.boolean(),
    same_collection_style: z.boolean(),
  }),
});
