// Translations. `t(key, params)` looks the key up in the current language
// and falls back to English. The language is chosen on first launch and
// in Settings; components re-render through `useLanguage()`.
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { en, StringKey } from './strings/en';
import { fr } from './strings/fr';
import { de } from './strings/de';
import { it } from './strings/it';
import { es } from './strings/es';
import { ar } from './strings/ar';
import { zh } from './strings/zh';
import { ru } from './strings/ru';

export type Language = 'en' | 'fr' | 'de' | 'it' | 'es' | 'ar' | 'zh' | 'ru';

export const LANGUAGES: { id: Language; name: string; native: string; rtl?: boolean }[] = [
  { id: 'en', name: 'English', native: 'English' },
  { id: 'fr', name: 'French', native: 'Français' },
  { id: 'de', name: 'German', native: 'Deutsch' },
  { id: 'it', name: 'Italian', native: 'Italiano' },
  { id: 'es', name: 'Spanish', native: 'Español' },
  { id: 'ar', name: 'Standard Arabic', native: 'العربية', rtl: true },
  { id: 'zh', name: 'Mandarin Chinese', native: '中文' },
  { id: 'ru', name: 'Russian', native: 'Русский' },
];

const TABLES: Record<Language, Partial<Record<StringKey, string>>> = { en, fr, de, it, es, ar, zh, ru };

let current: Language = 'en';
const listeners = new Set<(l: Language) => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(l: Language) {
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
