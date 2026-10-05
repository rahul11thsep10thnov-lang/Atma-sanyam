// Question text in the three enabled languages. Generators write every
// sentence once per language; nothing is machine-translated at runtime.
export type FigLang = 'hi' | 'hi-Latn' | 'en';

export interface Tri {
  hi: string;
  hl: string; // Hinglish (Hindi in Roman script)
  en: string;
}

export function pickLang(lang: FigLang, t: Tri): string {
  return lang === 'hi' ? t.hi : lang === 'hi-Latn' ? t.hl : t.en;
}

export function optionText(lang: FigLang, label: string): string {
  return lang === 'hi' ? `आकृति (${label})` : `Figure (${label})`;
}

export const LABELS = ['A', 'B', 'C', 'D'] as const;
