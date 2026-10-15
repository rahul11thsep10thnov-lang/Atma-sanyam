// Raw colour palette. Screens never import this file: they use the semantic
// roles in `colors.ts` / `useTheme()`. LoJi has two visual identities that
// share these pigments: the Player Console (candy-bright, lots of colour)
// and the Guardian Console (calm, trustworthy, chart-friendly).
export const palette = {
  // candy — the player console
  bubblegum: '#FF6B9D',
  bubblegumDeep: '#E04B7F',
  tangerine: '#FF8A3D',
  tangerineDeep: '#E56F22',
  sunshine: '#FFC93C',
  sunshineDeep: '#F0B01E',
  lime: '#7ED957',
  limeDeep: '#5CBF34',
  mint: '#4FD1C5',
  mintDeep: '#2BB5A8',
  sky: '#4FB3FF',
  skyDeep: '#2A94E8',
  grape: '#9B6BFF',
  grapeDeep: '#7C4DE8',
  cherry: '#FF5F6D',
  // creams and inks for the player console
  vanilla: '#FFF8EC',
  cloud: '#FFFFFF',
  marshmallow: '#FFF1F6',
  ink: '#2E2A4A',
  inkSoft: '#5D5880',
  inkMuted: '#9A96B8',
  // night (dark mode, player)
  nightSky: '#1E1B3A',
  nightCard: '#2A2650',
  nightRaised: '#34306A',
  nightBorder: '#443F7A',
  starlight: '#F4F1FF',

  // guardian console — indigo and teal on soft grey-blue paper
  indigo: '#4F46E5',
  indigoDeep: '#3B32C9',
  indigoSoft: '#E6E4FD',
  teal: '#0F9F8F',
  tealSoft: '#DCF5F1',
  slateInk: '#1F2340',
  slateSoft: '#5B6180',
  slateMuted: '#8C92AD',
  paper: '#F5F6FB',
  paperAlt: '#EDEFF8',
  paperLine: '#E1E4F0',
  graphite: '#14162B',
  graphiteCard: '#1C1F38',
  graphiteRaised: '#262A4A',
  graphiteBorder: '#343966',

  // status
  success: '#22A06B',
  successSoft: '#DDF5EA',
  warning: '#E9A23B',
  warningSoft: '#FDF0DA',
  danger: '#E5484D',
  dangerSoft: '#FDE2E3',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** The candy rainbow used for cards, rows and confetti, in a fixed order. */
export const rainbow = [palette.bubblegum, palette.tangerine, palette.sunshine, palette.lime, palette.mint, palette.sky, palette.grape] as const;

/** Soft tints matching `rainbow`, for card backgrounds. */
export const rainbowSoft = ['#FFE3EC', '#FFE7D6', '#FFF4CC', '#E6F8DA', '#DBF7F4', '#DDEEFF', '#ECE3FF'] as const;
