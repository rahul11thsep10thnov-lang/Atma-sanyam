// Part 19: india_state_city_destination.webp

export function slugify(text, { dropLeadingThe = false } = {}) {
  const words = (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics: Ā → A
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  // "The Ridge" → ridge; inner words stay so names remain readable.
  if (dropLeadingThe && words[0] === 'the' && words.length > 1) words.shift();
  return words.join('_');
}

/**
 * Builds the filename from the normalised record. `used` (a Set) makes names
 * unique across the run: a clash gets a numeric suffix.
 */
export function buildFilename({ state, district, name }, used = new Set()) {
  const parts = ['india', slugify(state)];
  const city = slugify(district);
  // Delhi/Chandigarh etc. — the city is the state; don't repeat it.
  if (city && city !== slugify(state)) parts.push(city);
  parts.push(slugify(name, { dropLeadingThe: true }));
  const base = parts.filter(Boolean).join('_');
  let candidate = `${base}.webp`;
  let n = 2;
  while (used.has(candidate)) candidate = `${base}_${n++}.webp`;
  used.add(candidate);
  return candidate;
}

export const FILENAME_RE = /^india(_[a-z0-9]+)+\.webp$/;
