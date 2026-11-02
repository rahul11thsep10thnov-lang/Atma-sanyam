// Palette tokens (docs/dadu/00-canon.md section 4) plus the character colour
// specification from docs/dadu/00-visual-canon-v3.md. Scenes may use richer
// gradients, but every UI accent comes from here.
export const palette = {
  paper: '#FFF6E5', cream: '#FFEFD2', saffron: '#F4A523', marigold: '#FFC94D', haldi: '#FFE08A',
  clay: '#D9663D', peepal: '#4E9F3D', leaf: '#8BC34A', monsoon: '#2E86AB', sky: '#BFE6F7',
  indigo: '#2F3C7E', night: '#1B2142', plum: '#8E4585', rose: '#F28DA6', ink: '#3A2E2A',
  inkSoft: '#6F5F58', line: '#EAD9BF', white: '#FFFFFF',
} as const;

/** Outline rule from the canon: 1.5 px, a darker shade of the fill, never black. */
export const OUTLINE_WIDTH = 1.5;

export const skin = {
  dadaji: { base: '#E6B48C', shade: '#C98F6A', line: '#9C6A48' },
  chintu: { base: '#D9A070', shade: '#B9805A', line: '#8E5E3E' },
} as const;

export const characterColours = {
  dadaji: { kurta: '#FFF3DC', kurtaShade: '#E8D7B8', kurtaLine: '#C9B48E', dhoti: '#FFFFFF', dhotiShade: '#E6E1D8', hair: '#F4F1EC', hairShade: '#D6D2CC', sandal: '#3E8E2C', sandalShade: '#2C6B1F', specs: '#4A4F5C', lens: '#9FB7C9' },
  chintu: { hair: '#2B1D14', hairShade: '#17100A', tee: '#FFC94D', teeShade: '#E0A72E', shorts: '#2E86AB', shortsShade: '#236B89', shoeL: '#D9663D', shoeR: '#4E9F3D', sole: '#FFFFFF' },
  buddy: { coat: '#D8A057', coatShade: '#B8823F', ear: '#A66F30', belly: '#FFF2DC', nose: '#2B1D14', collar: '#D9663D', tongue: '#F28DA6' },
  chikki: { fur: '#FFFFFF', furShade: '#E6E1DC', line: '#C9C2BC', innerEar: '#F6C6D0', nose: '#F28DA6', scarf: '#4E9F3D' },
  gauri: { coat: '#F7F1E6', coatShade: '#DED5C6', patch: '#A5733F', patchShade: '#86592C', muzzle: '#F6C6D0', horn: '#E9D9C0', hornShade: '#C9B698', hoof: '#5B3A1E', bell: '#FFC94D' },
  nandu: { coat: '#B9834B', coatShade: '#976636', white: '#FFF8EE', muzzle: '#F6C6D0', hoof: '#5B3A1E', tuft: '#8A5A2B' },
  mitthu: { body: '#5BAE3C', bodyShade: '#3E8E2C', head: '#4A6D9C', headShade: '#375480', beak: '#E8603C', beakShade: '#C9472A', tail: '#2E86AB', wing: '#3E8E2C', foot: '#E8603C' },
} as const;

/** Time-of-day light: tint colour and opacity laid over scenes. */
export const timeTint = {
  morning: { colour: '#FFE08A', opacity: 0.10 },
  afternoon: { colour: '#FFFFFF', opacity: 0 },
  evening: { colour: '#F4A523', opacity: 0.18 },
  night: { colour: '#1B2142', opacity: 0.45 },
} as const;

export const skyGradient = {
  morning: ['#FFE9C7', '#BFE6F7'],
  afternoon: ['#9ED7F2', '#DDF2FB'],
  evening: ['#F7A27A', '#FFD9A3'],
  night: ['#1B2142', '#2F3C7E'],
} as const;
