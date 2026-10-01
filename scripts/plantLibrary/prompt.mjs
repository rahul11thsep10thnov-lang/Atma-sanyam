// The FOCUS Plant Library master prompt — one fixed visual template, with
// only [PLANT_SPECIES] changing per job. This is the single place the
// photographic/art direction lives; docs/PLANT_LIBRARY.md explains it.
import { ROOT_TYPES } from './species.mjs';

export const IMAGE_SIZE = 2048;

/** Section 22 of the brief, amended with the signature sunlight environment. */
export function masterPrompt(plant) {
  const roots = ROOT_TYPES[plant.rootType] ?? 'a botanically believable root system';
  const species = `${plant.name} (${plant.botanicalName})`;
  return [
    `Generate exactly ONE ${species} as an exceptionally photorealistic premium botanical asset for the FOCUS mobile application.`,
    `Botanical detail for this species: ${plant.hint} Growth form: ${plant.growthForm}. Beneath the soil show ${roots}.`,
    `Use the exact standardized FOCUS Plant Library visual template: square ${IMAGE_SIZE}×${IMAGE_SIZE} composition, identical camera position (eye-level botanical product photography, roughly 50–70 mm equivalent lens, centred and symmetrical, no wide-angle distortion), identical focal length, identical framing, identical soil horizon, identical root-zone proportions, identical background, identical lighting setup, identical colour grading, identical depth of field and identical visual realism across the entire collection.`,
    `The plant occupies approximately 65–75% of the above-ground frame and is sharp from top to base.`,
    `The lower approximately 20% of the image is a realistic horizontal soil cross-section: rich dark-brown, slightly moist, granular soil with tiny organic particles, cut away cleanly so the plant's own root system is visible beneath the soil line, which sits at exactly the same height in every image. Roots emerge naturally from the root crown, branch realistically, stay inside the soil, have realistic thickness and fade naturally into the soil. Roots never glow and are never white.`,
    `Use the signature FOCUS sunlight environment: a darker, peaceful, softly blurred Indian balcony atmosphere in soft green-teal tones (warm wall, a hint of railing, no identifiable plants) with a warm, diffused, slightly hazy volumetric shaft of natural sunlight entering from the upper left and gently illuminating the plant. Create a subtle elliptical pool of warm golden-white sunlight around the base of the plant and on the soil surface, with extremely soft falloff into the darker surrounding environment and darker outer corners. Include very subtle atmospheric haze and a few barely visible dust particles inside the sunlight beam. Where appropriate add extremely subtle, irregular, soft-edged dappled light from unseen foliage.`,
    `The sunlight must look natural and physically plausible, never like a spotlight, stage light, laser or exaggerated god rays. Sunlight colour is golden cream / warm ivory, never orange or neon yellow; the plant's own colours stay accurate. The plant receives highlights along its leaves, flowers, stems and branches according to its real physical structure, with physically accurate shadows. The sunlit soil surface is warm and the deeper root zone gradually darker, roots softly readable but never glowing.`,
    `The plant must be botanically accurate and genuinely photorealistic: realistic leaf veins, leaf thickness, natural imperfections, realistic stems, flowers and fruits where applicable, natural colour variation and believable growth structure. Target the look of high-end botanical photography and premium architectural visualization.`,
    `There must be exactly ONE plant. No second plant. No background plants. No bouquet. No multiple specimens. No pot. No planter. No container. No text. No labels. No numbers. No logo. No watermark. No collage. No grid. No sprite sheet. No illustration. No cartoon. No low-poly rendering. No artificial-looking plastic foliage.`,
    `The final result should look like a high-end botanical photograph captured on a beautiful peaceful balcony during warm natural sunlight, with the exact same camera and lighting setup used for every other plant in the FOCUS collection.`,
  ].join('\n\n');
}

/** Section 23 of the brief. Providers without a negative-prompt field get it appended as an "Avoid:" clause. */
export const NEGATIVE_PROMPT =
  'multiple plants, second plant, background plants, garden full of plants, bouquet, flower arrangement, multiple specimens, collage, grid, contact sheet, sprite sheet, infographic, text, labels, numbers, watermark, logo, pot, planter, container, cartoon, illustration, painting, watercolor, low-poly, plastic plant, fake leaves, unrealistic roots, glowing roots, white roots, incorrect botanical morphology, distorted leaves, malformed flowers, duplicate stems, duplicate plant, extreme saturation, extreme depth of field, fisheye, wide-angle distortion, inconsistent camera angle, inconsistent soil line, spotlight, stage lighting, laser beam, exaggerated god rays, orange tint, neon yellow';

/** Section 24 — the reject criteria the vision QC pass checks. */
export const QC_CRITERIA = [
  'exactly one plant is visible (parts of the same plant are fine; no second specimen, no background plants)',
  'the bottom roughly 20% of the image is a soil cross-section with visible roots',
  'the plant is recognisable as the named species and botanically plausible',
  'the image is photorealistic (not cartoon, illustration, painting or low-poly)',
  'there is no pot, planter or container',
  'there is no text, label, number, logo or watermark',
  'it is a single image, not a collage, grid, contact sheet or sprite sheet',
  'lighting is a warm natural sunbeam from the upper left with a soft pool of light at the base and a darker soft background (no spotlight / stage look)',
];
