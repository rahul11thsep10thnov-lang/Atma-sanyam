// Translations. `t(key, params)` looks the key up in the current language
// and falls back to English. The language is chosen on first launch and
// in Settings; components re-render through `useLanguage()`.
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { en, StringKey } from './strings/en';
import { hi } from './strings/hi';

/** FOCUS is bilingual: English (UN English) and Hindi. */
export type Language = 'en' | 'hi';

export const LANGUAGES: { id: Language; name: string; native: string; rtl?: boolean }[] = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
];

const TABLES: Record<Language, Partial<Record<StringKey, string>>> = { en, hi };

/** A saved choice from an older build (French, Arabic…) falls back to English. */
export function normaliseLanguage(l: string | undefined | null): Language | undefined {
  if (!l) return undefined;
  return l === 'hi' ? 'hi' : 'en';
}

let current: Language = 'en';
const listeners = new Set<(l: Language) => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language | string) {
  const l = normaliseLanguage(lang) ?? 'en';
  current = l;
  const rtl = !!LANGUAGES.find((x) => x.id === l)?.rtl;
  try {
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  } catch {
    // web: no layout direction switch
  }
  listeners.forEach((fn) => fn(l));
}

export function isRTL(): boolean {
  return !!LANGUAGES.find((x) => x.id === current)?.rtl;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s = TABLES[current][key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function useLanguage(): Language {
  const [l, setL] = useState(current);
  useEffect(() => {
    listeners.add(setL);
    return () => {
      listeners.delete(setL);
    };
  }, []);
  return l;
}

export type { StringKey };

const CATEGORY_KEYS: [RegExp, StringKey][] = [
  [/nature|landscape/i, 'home.cat.nature'],
  [/monument|heritage/i, 'home.cat.monuments'],
  [/wildlife|animal/i, 'home.cat.wildlife'],
  [/spiritual|sacred/i, 'home.cat.spirituality'],
];

/** A library collection's name in the current language (the four top collections; others as the library names them). */
export function categoryLabel(c: { id: string; name: string; parentId?: string | null }): string {
  if (c.parentId) return c.name;
  const hit = CATEGORY_KEYS.find(([re]) => re.test(`${c.id} ${c.name}`));
  return hit ? t(hit[1]) : c.name;
}
