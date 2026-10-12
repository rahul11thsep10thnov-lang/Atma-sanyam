// Type scale (PHASE 2). One UI family — Manrope — in four weights, loaded by
// expo-font at launch (App.tsx). Each weight is its own family name, so
// styles set `fontFamily` and leave `fontWeight` alone; mixing the two makes
// Android synthesise a faux bold and iOS fall back to the system font.
// Indic scripts (Devanagari, Bengali, Tamil, …) fall through to the system
// Noto fonts, which every supported OS ships; a bundled Noto set lands with
// localisation.
import { Platform, TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  // large numerals (the timer) — tabular, with the UI family's warmth
  numeric: 'Manrope_600SemiBold',
} as const;

type Variant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  fontVariant?: TextStyle['fontVariant'];
};

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 36, lineHeight: 44, letterSpacing: -0.6 },
  headingLarge: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.4 },
  heading: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  subheading: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  bodySmallStrong: { fontFamily: fontFamily.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8 },
  button: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 20 },
  buttonSmall: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 18 },
  timer: { fontFamily: fontFamily.numeric, fontSize: 72, lineHeight: 80, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  timerSmall: { fontFamily: fontFamily.numeric, fontSize: 44, lineHeight: 52, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;

/** The platform serif used for the one decorative moment (the big greeting
 * on Home) — no extra font file, no clipping risk in other scripts. */
export const decorativeSerif: TextStyle = Platform.select({
  ios: { fontFamily: 'Georgia' },
  android: { fontFamily: 'serif' },
  default: { fontFamily: 'Georgia, serif' },
}) as TextStyle;
