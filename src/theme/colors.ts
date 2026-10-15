// Semantic colour roles. Two identities (player / guardian), each with a
// light and a dark scheme. Components read the active set via `useTheme()`.
import { palette } from './palette';

export type ThemeMode = 'player' | 'guardian';

export interface ThemeColors {
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceTinted: string;
  navSurface: string;
  overlay: string;
  scrim: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  secondary: string;
  secondarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  border: string;
  borderStrong: string;
  divider: string;
  icon: string;
  iconActive: string;
  shadow: string;
  white: string;
  /** Gradient stops for the screen background. */
  gradient: [string, string, ...string[]];
}

export const playerLight: ThemeColors = {
  scheme: 'light',
  mode: 'player',
  background: palette.vanilla,
  backgroundAlt: palette.marshmallow,
  surface: palette.cloud,
  surfaceRaised: palette.cloud,
  surfaceMuted: '#F3EEF9',
  surfaceTinted: '#FFF0DB',
  navSurface: palette.cloud,
  overlay: 'rgba(46,42,74,0.45)',
  scrim: 'rgba(46,42,74,0.6)',
  text: palette.ink,
  textSecondary: palette.inkSoft,
  textMuted: palette.inkMuted,
  textOnAccent: palette.white,
  textInverse: palette.starlight,
  primary: palette.bubblegum,
  primaryPressed: palette.bubblegumDeep,
  primarySoft: '#FFE3EC',
  accent: palette.sunshine,
  accentSoft: '#FFF4CC',
  secondary: palette.sky,
  secondarySoft: '#DDEEFF',
  success: palette.success,
  successSoft: palette.successSoft,
  warning: palette.warning,
  warningSoft: palette.warningSoft,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  border: '#F0E4EE',
  borderStrong: '#E3D3E2',
  divider: 'rgba(46,42,74,0.08)',
  icon: palette.inkMuted,
  iconActive: palette.bubblegum,
  shadow: '#7A4A7A',
  white: palette.white,
  gradient: ['#FFF3D6', '#FFE4EF', '#E3F0FF'],
};

export const playerDark: ThemeColors = {
  ...playerLight,
  scheme: 'dark',
  background: palette.nightSky,
  backgroundAlt: '#23204A',
  surface: palette.nightCard,
  surfaceRaised: palette.nightRaised,
  surfaceMuted: '#2F2B5C',
  surfaceTinted: '#3A2F5C',
  navSurface: palette.nightCard,
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.65)',
  text: palette.starlight,
  textSecondary: '#C9C4EC',
  textMuted: '#8F8AB8',
  textOnAccent: palette.white,
  textInverse: palette.ink,
  primary: '#FF7FAE',
  primaryPressed: '#FF99BF',
  primarySoft: 'rgba(255,127,174,0.2)',
  accent: palette.sunshine,
  accentSoft: 'rgba(255,201,60,0.2)',
  secondary: palette.sky,
  secondarySoft: 'rgba(79,179,255,0.2)',
  successSoft: 'rgba(34,160,107,0.2)',
  warningSoft: 'rgba(233,162,59,0.2)',
  dangerSoft: 'rgba(229,72,77,0.2)',
  border: palette.nightBorder,
  borderStrong: '#54509A',
  divider: 'rgba(244,241,255,0.08)',
  icon: '#8F8AB8',
  iconActive: '#FF7FAE',
  shadow: palette.black,
  gradient: ['#1E1B3A', '#2A2250', '#1B2A4A'],
};

export const guardianLight: ThemeColors = {
  scheme: 'light',
  mode: 'guardian',
  background: palette.paper,
  backgroundAlt: palette.paperAlt,
  surface: palette.white,
  surfaceRaised: palette.white,
  surfaceMuted: '#EEF0F8',
  surfaceTinted: palette.indigoSoft,
  navSurface: palette.white,
  overlay: 'rgba(31,35,64,0.45)',
  scrim: 'rgba(31,35,64,0.6)',
  text: palette.slateInk,
  textSecondary: palette.slateSoft,
  textMuted: palette.slateMuted,
  textOnAccent: palette.white,
  textInverse: palette.white,
  primary: palette.indigo,
  primaryPressed: palette.indigoDeep,
  primarySoft: palette.indigoSoft,
  accent: palette.teal,
  accentSoft: palette.tealSoft,
  secondary: palette.tangerine,
  secondarySoft: '#FFE7D6',
  success: palette.success,
  successSoft: palette.successSoft,
  warning: palette.warning,
  warningSoft: palette.warningSoft,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
  border: palette.paperLine,
  borderStrong: '#C9CDE0',
  divider: 'rgba(31,35,64,0.08)',
  icon: palette.slateMuted,
  iconActive: palette.indigo,
  shadow: '#3B3F6B',
  white: palette.white,
  gradient: ['#F5F6FB', '#EEF0FA'],
};

export const guardianDark: ThemeColors = {
  ...guardianLight,
  scheme: 'dark',
  background: palette.graphite,
  backgroundAlt: '#191C33',
  surface: palette.graphiteCard,
  surfaceRaised: palette.graphiteRaised,
  surfaceMuted: '#22264A',
  surfaceTinted: 'rgba(79,70,229,0.18)',
  navSurface: palette.graphiteCard,
  overlay: 'rgba(0,0,0,0.5)',
  scrim: 'rgba(0,0,0,0.65)',
  text: '#EEF0FA',
  textSecondary: '#B9BEDA',
  textMuted: '#7E85A8',
  textInverse: palette.slateInk,
  primary: '#8B84FF',
  primaryPressed: '#A29CFF',
  primarySoft: 'rgba(139,132,255,0.2)',
  accent: '#3FC7B6',
  accentSoft: 'rgba(63,199,182,0.18)',
  secondarySoft: 'rgba(255,138,61,0.2)',
  successSoft: 'rgba(34,160,107,0.2)',
  warningSoft: 'rgba(233,162,59,0.2)',
  dangerSoft: 'rgba(229,72,77,0.2)',
  border: palette.graphiteBorder,
  borderStrong: '#4A5088',
  divider: 'rgba(238,240,250,0.08)',
  icon: '#7E85A8',
  iconActive: '#8B84FF',
  shadow: palette.black,
  gradient: ['#14162B', '#1A1D38'],
};

// Kept for a few shared components that predate the theme hook.
export const lightColors = playerLight;
export const darkColors = playerDark;
export const colors = {
  primary: playerLight.primary,
  secondary: playerLight.accent,
  background: playerLight.background,
  card: playerLight.surfaceRaised,
  text: playerLight.text,
  textSecondary: playerLight.textSecondary,
  border: playerLight.border,
  danger: playerLight.danger,
  success: playerLight.success,
  white: palette.white,
};
export const buttonHeight = 56;
