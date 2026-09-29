import type { Locale } from "./config";

import enCommon from "@/locales/en/common.json";
import enHome from "@/locales/en/home.json";
import enDestination from "@/locales/en/destination.json";

import hiCommon from "@/locales/hi/common.json";
import hiHome from "@/locales/hi/home.json";
import hiDestination from "@/locales/hi/destination.json";

import mrCommon from "@/locales/mr/common.json";
import mrHome from "@/locales/mr/home.json";
import mrDestination from "@/locales/mr/destination.json";

import knCommon from "@/locales/kn/common.json";
import knHome from "@/locales/kn/home.json";
import knDestination from "@/locales/kn/destination.json";

import taCommon from "@/locales/ta/common.json";
import taHome from "@/locales/ta/home.json";
import taDestination from "@/locales/ta/destination.json";

import teCommon from "@/locales/te/common.json";
import teHome from "@/locales/te/home.json";
import teDestination from "@/locales/te/destination.json";

import bnCommon from "@/locales/bn/common.json";
import bnHome from "@/locales/bn/home.json";
import bnDestination from "@/locales/bn/destination.json";

import mlCommon from "@/locales/ml/common.json";
import mlHome from "@/locales/ml/home.json";
import mlDestination from "@/locales/ml/destination.json";

export interface Dictionary {
  common: typeof enCommon;
  home: typeof enHome;
  destination: typeof enDestination;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const dictionaries: Record<Locale, DeepPartial<Dictionary>> = {
  en: { common: enCommon, home: enHome, destination: enDestination },
  hi: { common: hiCommon, home: hiHome, destination: hiDestination },
  mr: { common: mrCommon, home: mrHome, destination: mrDestination },
  kn: { common: knCommon, home: knHome, destination: knDestination },
  ta: { common: taCommon, home: taHome, destination: taDestination },
  te: { common: teCommon, home: teHome, destination: teDestination },
  bn: { common: bnCommon, home: bnHome, destination: bnDestination },
  ml: { common: mlCommon, home: mlHome, destination: mlDestination }
};

/**
 * All UI strings must come from translation files, never hard-coded in
 * components. This loader is synchronous (dictionaries are small JSON
 * files bundled at build time) which keeps both server and client
 * components simple — no async dictionary fetch is required.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (typeof override === "object" && override !== null) {
    for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
      out[k] = k in out ? deepMerge(out[k], v) : v;
    }
  }
  return out as T;
}

const resolved = new Map<Locale, Dictionary>();

/**
 * Any key a locale has not translated yet falls back to English instead of
 * rendering blank — so new UI strings can ship before every translation lands.
 */
export function getDictionary(locale: Locale): Dictionary {
  const cached = resolved.get(locale);
  if (cached) return cached;
  const english: Dictionary = { common: enCommon, home: enHome, destination: enDestination };
  const merged = locale === "en" ? english : deepMerge(english, dictionaries[locale]);
  resolved.set(locale, merged);
  return merged;
}
