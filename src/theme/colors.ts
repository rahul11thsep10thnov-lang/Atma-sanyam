// Semantic colour roles (PHASE 1 design tokens).
//
// `lightColors` is "Golden Morning", `darkColors` is "Night Balcony" — a
// designed palette, not an inversion. Components read the active scheme via
// `useTheme()` (ThemeContext.tsx). The legacy named exports at the bottom
// (`colors`, `spacing`, `radius`, `buttonHeight`, `typography`) keep every
// existing screen compiling and already move them onto the new palette;
// they resolve to the light scheme and are being migrated screen by screen.
import { palette } from './palette';
import { typography as typographyTokens } from './typography';
import { radii } from './radii';
import { space } from './spacing';

export interface ThemeColors {
  scheme: 'light' | 'dark';
  // surfaces
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceTinted: string;
  navSurface: string;
  overlay: string;
  scrim: string;
  // ink
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textInverse: string;
  // brand
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  growth: string;
  growthSoft: string;
  // status (never used as "series 4")
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  // lines
  border: string;
  borderStrong: string;
  divider: string;
  // icons
  icon: string;
  iconActive: string;
  // puzzle covers
  coverPiece: string;
  coverPieceAlt: string;
  overlayLine: string;
  // misc
  shadow: string;
  white: string;
}

export const lightColors: ThemeColors = {
  scheme: 'light',
  background: palette.cream,
  backgroundAlt: palette.peach,
  surface: '#FFFCF8',
  surfaceRaised: palette.white,
  surfaceMuted: '#F3E6D8',
  surfaceTinted: '#F9E6D6',
  navSurface: '#FFFCF8',
  overlay: 'rgba(63,42,32,0.45)',
  scrim: 'rgba(63,42,32,0.6)',
  text: palette.barkDeep,
  textSecondary: '#7A5B4A',
  textMuted: '#A88B78',
  textOnAccent: palette.white,
  textInverse: palette.moonlit,
  primary: palette.terracotta,
  primaryPressed: palette.terracottaDeep,
  primarySoft: '#F7DED1',
  accent: palette.saffron,
  accentSoft: '#FBE8CC',
  growth: palette.moss,
  growthSoft: '#E6EDDC',
  success: '#4F7A48',
  successSoft: '#E3EFDD',
  warning: '#D9962E',
  warningSoft: '#FBEFD6',
  danger: '#C8503E',
  dangerSoft: '#F9E0DA',
  border: '#EADBC9',
  borderStrong: '#D9C4AD',
  divider: 'rgba(63,42,32,0.08)',
  icon: '#A88B78',
  iconActive: palette.terracotta,
  coverPiece: '#F2E6D9',
  coverPieceAlt: '#E8DACA',
  overlayLine: 'rgba(23, 32, 42, 0.12)',
  shadow: palette.bark,
  white: palette.white,
};

export const darkColors: ThemeColors = {
  scheme: 'dark',
  background: palette.night,
  backgroundAlt: '#211B17',
  surface: palette.nightSurface,
  surfaceRaised: palette.nightRaised,
  surfaceMuted: '#2A2320',
  surfaceTinted: '#33271F',
  navSurface: '#272019',
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.65)',
  text: palette.moonlit,
  textSecondary: '#C9B5A4',
  textMuted: '#8F7A6B',
  textOnAccent: palette.night,
  textInverse: palette.barkDeep,
  primary: '#E08A6B',
  primaryPressed: '#F0A287',
  primarySoft: 'rgba(224,138,107,0.18)',
  accent: palette.amber,
  accentSoft: 'rgba(232,179,92,0.18)',
  growth: '#8AA77A',
  growthSoft: 'rgba(138,167,122,0.18)',
  success: '#8DBB82',
  successSoft: 'rgba(141,187,130,0.16)',
  warning: '#E2AE5C',
  warningSoft: 'rgba(226,174,92,0.16)',
  danger: '#E07A6A',
  dangerSoft: 'rgba(224,122,106,0.16)',
  border: palette.nightBorder,
  borderStrong: '#4A3D35',
  divider: 'rgba(243,231,218,0.08)',
  icon: '#8F7A6B',
  iconActive: '#E08A6B',
  coverPiece: '#2E2621',
  coverPieceAlt: '#352C26',
  overlayLine: 'rgba(243,231,218,0.1)',
  shadow: palette.black,
  white: palette.white,
};

// ---------------------------------------------------------------------------
// Legacy exports — same keys the existing screens import, now on the new
// palette. New code should use `useTheme()` and the token modules instead.
// ---------------------------------------------------------------------------
export const colors = {
  primary: lightColors.primary,
  secondary: lightColors.accent,
  background: lightColors.background,
  card: lightColors.surfaceRaised,
  text: lightColors.text,
  textSecondary: lightColors.textSecondary,
  border: lightColors.border,
  danger: lightColors.danger,
  success: lightColors.success,
  coverPiece: lightColors.coverPiece,
  coverPieceAlt: lightColors.coverPieceAlt,
  overlayLine: lightColors.overlayLine,
  white: palette.white,
};

export const spacing = {
  screenPadding: space.screen,
  cardPadding: space.card,
};

export const radius = {
  card: radii.md,
};

export const buttonHeight = 52;

export const typography = {
  heading: typographyTokens.headingLarge,
  title: typographyTokens.subheading,
  body: typographyTokens.body,
  caption: typographyTokens.caption,
};
