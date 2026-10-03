// Fixed parts of the master photographic spec (MASTER_PROMPT.md). Anything
// that must be identical across the whole collection lives here so the model
// never has to reproduce it — and can never drift from it.

export const CATEGORIES = [
  'Monument', 'Fort', 'Palace', 'Temple', 'Mosque', 'Church', 'Gurudwara',
  'Buddhist Site', 'Jain Site', 'Historical Site', 'Archaeological Site',
  'Museum', 'City', 'Old City', 'Village', 'Beach', 'Island', 'Lake', 'River',
  'Waterfall', 'Mountain', 'Valley', 'Hill Station', 'Forest', 'National Park',
  'Wildlife Sanctuary', 'Cave', 'Desert', 'Dam', 'Garden', 'Cultural Site',
  'Pilgrimage Site', 'Adventure Destination', 'Other',
];

// Part 4 ranges. Categories the spec doesn't list borrow the closest one.
const RANGE = {
  monument: [60, 120], fort: [80, 150], palace: [60, 120], temple: [60, 120],
  city: [120, 250], beach: [80, 150], lake: [80, 160], river: [80, 180],
  waterfall: [60, 120], forest: [100, 200], mountain: [150, 300],
  valley: [150, 350], desert: [100, 250], nationalPark: [100, 250],
  landscape: [150, 400],
};

export const ALTITUDE_RANGES = {
  Monument: RANGE.monument, Fort: RANGE.fort, Palace: RANGE.palace,
  Temple: RANGE.temple, Mosque: RANGE.temple, Church: RANGE.temple,
  Gurudwara: RANGE.temple, 'Buddhist Site': RANGE.temple, 'Jain Site': RANGE.temple,
  'Historical Site': RANGE.monument, 'Archaeological Site': RANGE.monument,
  Museum: RANGE.monument, City: RANGE.city, 'Old City': RANGE.city,
  Village: RANGE.forest, Beach: RANGE.beach, Island: RANGE.landscape,
  Lake: RANGE.lake, River: RANGE.river, Waterfall: RANGE.waterfall,
  Mountain: RANGE.mountain, Valley: RANGE.valley, 'Hill Station': RANGE.mountain,
  Forest: RANGE.forest, 'National Park': RANGE.nationalPark,
  'Wildlife Sanctuary': RANGE.nationalPark, Cave: RANGE.waterfall,
  Desert: RANGE.desert, Dam: RANGE.river, Garden: RANGE.monument,
  'Cultural Site': RANGE.monument, 'Pilgrimage Site': RANGE.temple,
  'Adventure Destination': RANGE.landscape, Other: RANGE.landscape,
};

// Part 5. Anything >= NEAR_TOP_DOWN_MIN counts as the "occasional near-top-down".
export const CAMERA_ANGLES = [15, 20, 25, 30, 35, 40, 45];
export const NEAR_TOP_DOWN_MIN = 70;

export const TIMES_OF_DAY = [
  'early morning', 'mid morning', 'midday', 'late afternoon', 'early evening',
];

export const SUN_DIRECTIONS = [
  'front-lit', 'side-lit from left', 'side-lit from right', 'back-lit', 'overhead',
];

// Part 17 + Part 12 + Part 3, appended verbatim to every prompt. Image models draw
// whatever they are told about, so the camera is never described as a "drone".
export const REALISM_SUFFIX =
  'Ultra-realistic professional aerial photograph, physically accurate lighting, ' +
  'realistic atmospheric perspective, natural photographic textures, realistic scale, ' +
  'authentic geography, natural imperfections, professional travel photography, ' +
  'high-resolution photographic detail, believable high-altitude aerial perspective. ' +
  'Unretouched RAW-style capture on a full-frame camera with a natural 24–35mm perspective: ' +
  'fine micro-texture on every surface (rock strata, stone grain, water ripples, roof weathering, ' +
  'dust), asymmetric real-world detail, subtle atmospheric haze that softens distant detail, ' +
  'a pale natural sky, gentle lens vignetting, no over-smoothing, no HDR look. ' +
  'Natural premium color science: natural greens, blues and earth tones, accurate stone colors, ' +
  'controlled highlights, moderate saturation and contrast. ' +
  '16:9 landscape frame. No text, no logo, no watermark, no border, no frame.';

// Short ending used when the prompt goes straight to an image model. FLUX.1-schnell reads
// only about the first 256 tokens, so the destination detail comes first and this stays brief.
export const IMAGE_SUFFIX =
  'Unretouched aerial photograph on a full-frame camera, natural colours, fine surface texture ' +
  'and weathering, realistic shadows, subtle atmospheric haze, pale natural sky, true scale, ' +
  'high detail, 16:9 landscape, clean frame.';

/** Words that make image models draw an aircraft into the picture. */
export const AIRCRAFT_WORDS = /\b(drones?|uavs?|quadcopters?|multicopters?)\b/i;

/** Rewrites any "drone" wording into plain camera language before it reaches an image model. */
export function sanitizeForImage(text) {
  return text
    .replace(/\b(aerial) drone\b/gi, '$1')
    .replace(/\bdrone (photograph|photography|photo|shot|footage)\b/gi, 'aerial $1')
    .replace(/\b(captured|shot|photographed|taken) from an? (?:drone|uav|quadcopter)\b/gi, '$1 from a high vantage point')
    .replace(/\b(?:an?|the) (?:drone|uav|quadcopter)\b/gi, 'the camera')
    .replace(/\b(drones?|uavs?|quadcopters?|multicopters?)\b/gi, 'aerial camera');
}

// Part 18, verbatim.
export const NEGATIVE_PROMPT =
  'AI art, illustration, painting, cartoon, anime, CGI, 3D render, game graphics, concept art, ' +
  'fantasy landscape, surreal architecture, impossible geography, distorted buildings, warped ' +
  'structures, duplicated buildings, duplicated people, malformed people, deformed vehicles, ' +
  'floating objects, impossible shadows, unrealistic perspective, excessive HDR, oversaturation, ' +
  'neon colors, plastic textures, excessive sharpening, artificial symmetry, fake depth of field, ' +
  'extreme cinematic grading, unrealistic sun rays, fantasy clouds, text, letters, captions, logo, ' +
  'watermark, border, frame';

// Part 7: elements that must not appear by default. Their presence in a
// prompt is a QC warning so a human can confirm they belong there.
export const STEREOTYPE_TERMS = [
  'cow', 'cows', 'tuk-tuk', 'tuk tuk', 'auto-rickshaw', 'saffron', 'indian flag',
  'tricolour', 'tricolor', 'prayer flags', 'religious flags',
];

// Canonical states and union territories, with common aliases.
export const STATES = {
  'Andhra Pradesh': ['ap'], 'Arunachal Pradesh': [], Assam: [], Bihar: [],
  Chhattisgarh: ['chattisgarh'], Goa: [], Gujarat: [], Haryana: [],
  'Himachal Pradesh': ['hp'], Jharkhand: [], Karnataka: [], Kerala: [],
  'Madhya Pradesh': ['mp'], Maharashtra: [], Manipur: [], Meghalaya: [],
  Mizoram: [], Nagaland: [], Odisha: ['orissa'], Punjab: [], Rajasthan: [],
  Sikkim: [], 'Tamil Nadu': ['tn'], Telangana: [], Tripura: [],
  'Uttar Pradesh': ['up'], Uttarakhand: ['uttaranchal', 'uk'], 'West Bengal': ['wb'],
  'Andaman and Nicobar Islands': ['andaman & nicobar', 'andaman and nicobar', 'a&n islands'],
  Chandigarh: [],
  'Dadra and Nagar Haveli and Daman and Diu': ['daman and diu', 'dadra and nagar haveli', 'dnhdd'],
  Delhi: ['new delhi', 'nct of delhi', 'nct delhi'],
  'Jammu and Kashmir': ['j&k', 'jammu & kashmir', 'jk'],
  Ladakh: [], Lakshadweep: [], Puducherry: ['pondicherry'],
};

const STATE_LOOKUP = new Map();
for (const [name, aliases] of Object.entries(STATES)) {
  STATE_LOOKUP.set(name.toLowerCase(), name);
  for (const alias of aliases) STATE_LOOKUP.set(alias, name);
}

/** Canonical state/UT name, or null when the text is not a known state. */
export function canonicalState(text) {
  if (!text) return null;
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^state of /, '');
  return STATE_LOOKUP.get(key) ?? null;
}

/** Case-insensitive category match; null when unknown. */
export function canonicalCategory(text) {
  if (!text) return null;
  const key = text.trim().toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === key) ?? null;
}
