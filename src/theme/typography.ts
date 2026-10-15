// Type scale. Three families, loaded by expo-font at launch (App.tsx):
//  • Fredoka — rounded display face for the Player Console (headings, numbers)
//  • Nunito — friendly body face used everywhere
//  • Manrope — the Guardian Console's headings (serious, compact)
// Each weight is its own family name, so styles set `fontFamily` and leave
// `fontWeight` alone (mixing the two makes Android synthesise a faux bold).
// Indic scripts fall through to the system Noto fonts.
import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_600SemiBold',
  semibold: 'Nunito_700Bold',
  bold: 'Nunito_800ExtraBold',
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  guardian: 'Manrope_700Bold',
  guardianMedium: 'Manrope_600SemiBold',
  numeric: 'Fredoka_600SemiBold',
} as const;

type Variant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontVariant?: TextStyle['fontVariant'];
};

export const typography = {
  // playful display (player console)
  hero: { fontFamily: fontFamily.displayBold, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  display: { fontFamily: fontFamily.displayBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  headingLarge: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: fontFamily.display, fontSize: 21, lineHeight: 27 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  // guardian console headings
  dashTitle: { fontFamily: fontFamily.guardian, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  dashHeading: { fontFamily: fontFamily.guardian, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  dashLabel: { fontFamily: fontFamily.guardianMedium, fontSize: 13, lineHeight: 18 },
  // body
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 23 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19 },
  bodySmallStrong: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fontFamily.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
  button: { fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 22 },
  buttonSmall: { fontFamily: fontFamily.bold, fontSize: 14, lineHeight: 18 },
  // big numbers (scores, timers, dice)
  numeral: { fontFamily: fontFamily.numeric, fontSize: 56, lineHeight: 64, fontVariant: ['tabular-nums'] },
  numeralSmall: { fontFamily: fontFamily.numeric, fontSize: 32, lineHeight: 38, fontVariant: ['tabular-nums'] },
  // kept for compatibility with older components
  timer: { fontFamily: fontFamily.numeric, fontSize: 56, lineHeight: 64, fontVariant: ['tabular-nums'] },
  timerSmall: { fontFamily: fontFamily.numeric, fontSize: 32, lineHeight: 38, fontVariant: ['tabular-nums'] },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;
export const decorativeSerif: TextStyle = {};
