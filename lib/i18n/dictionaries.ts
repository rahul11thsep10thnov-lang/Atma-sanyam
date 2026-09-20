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

export interface Dictionary {
  common: typeof enCommon;
  home: typeof enHome;
  destination: typeof enDestination;
}

const dictionaries: Record<Locale, Dictionary> = {
  en: { common: enCommon, home: enHome, destination: enDestination },
  hi: { common: hiCommon, home: hiHome, destination: hiDestination },
  mr: { common: mrCommon, home: mrHome, destination: mrDestination },
  kn: { common: knCommon, home: knHome, destination: knDestination },
  ta: { common: taCommon, home: taHome, destination: taDestination },
  te: { common: teCommon, home: teHome, destination: teDestination }
};

/**
 * All UI strings must come from translation files, never hard-coded in
 * components. This loader is synchronous (dictionaries are small JSON
 * files bundled at build time) which keeps both server and client
 * components simple — no async dictionary fetch is required.
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
