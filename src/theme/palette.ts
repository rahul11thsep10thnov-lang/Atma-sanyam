// Raw colour palette (PHASE 1 design tokens). Screens never import this
// file: they use the semantic roles in `colors.ts` / `useTheme()`, which
// pick from here per colour scheme. Names describe the pigment, not a use.
export const palette = {
  // warm neutrals — the paper the app is drawn on
  ivory: '#FFF9F2',
  cream: '#FBF3E8',
  peach: '#F6DCC6',
  peachDeep: '#EFC7A6',
  sand: '#E9D6C2',
  latte: '#C4A48A',
  clay: '#A17253',
  cocoa: '#7A4630',
  bark: '#5A3A2C',
  barkDeep: '#3F2A20',

  // brand accents
  terracotta: '#C9684A',
  terracottaDeep: '#A64F36',
  coral: '#E8826A',
  saffron: '#E89B3C',
  gold: '#D4A64A',
  sunset: '#E5673E',
  rose: '#D9748C',
  lavender: '#8C7BB3',

  // greens — growth
  moss: '#6F8A5B',
  mossDeep: '#4F6A43',
  emerald: '#2F7F6B',
  teal: '#2E8C8C',

  // night balcony
  night: '#1B1714',
  nightSurface: '#241E1A',
  nightRaised: '#2E2621',
  nightBorder: '#3B302A',
  moonlit: '#F3E7DA',
  amber: '#E8B35C',

  white: '#FFFFFF',
  black: '#000000',
} as const;
