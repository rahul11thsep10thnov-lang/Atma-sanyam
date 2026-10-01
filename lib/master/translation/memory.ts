import hi from "@/data/translations/hi.json";
import ta from "@/data/translations/ta.json";
import type { GeneratedPage, GeneratedSection, Cell } from "../generation/types";
import type { MasterDatabase } from "../types";

/**
 * Translation memory for guide text (server-side only — never import into a client component).
 *
 * The database holds English. Each stored translation is keyed by the exact English sentence with the
 * destination's name replaced by {name}, so one translation of a templated sentence serves every
 * destination, and any change to the English automatically makes the old translation unused
 * (a stale translation can never be shown against new facts). Missing strings fall back to English.
 */

export interface TranslationFile {
  language: string;
  status: string;
  note: string;
  names: Record<string, string>;
  states: Record<string, string>;
  units: { h: string; min: string };
  strings: Record<string, string>;
}

const FILES: Record<string, TranslationFile> = { hi: hi as TranslationFile, ta: ta as TranslationFile };

export const TRANSLATED_LANGUAGES = Object.keys(FILES);
export const hasTranslations = (lang: string) => lang in FILES;
export const translationFile = (lang: string): TranslationFile | undefined => FILES[lang];

const LATIN_WORD = /[A-Za-z]{3}/;

/** Station / airport codes (BOM, AGC…) are identifiers, not text. */
export const isTranslatable = (s: string) => LATIN_WORD.test(s) && !/^[A-Z]{2,5}$/.test(s);

export const normalise = (text: string, name: string) => text.split(name).join("{name}");

/** Names of places, dishes and hubs stay as written — they are proper nouns, not sentences to translate. */
export function properNames(db: MasterDatabase): Set<string> {
  const s = new Set<string>();
  db.destinations.forEach((d) => s.add(d.name));
  db.attractions.forEach((a) => s.add(a.name));
  db.transport_hubs.forEach((h) => s.add(h.name));
  db.local_foods.forEach((f) => s.add(f.name));
  db.shopping.forEach((x) => { s.add(x.item); if (x.famous_market) s.add(x.famous_market); });
  db.accommodation_areas.forEach((a) => s.add(a.area_name));
  db.festivals.forEach((f) => s.add(f.name));
  db.experiences.forEach((e) => s.add(e.name));
  return s;
}

export interface Translator {
  lang: string;
  /** The destination's name in this language (transliterated), used in headings and breadcrumbs. */
  localName: string;
  stateName: (slug: string, fallback: string) => string;
  /** Translate one string; returns the English original when no translation exists. */
  t: (text: string) => string;
}

export function translatorFor(lang: string, destination: { slug: string; name: string }, names: Set<string>): Translator | null {
  const file = FILES[lang];
  if (!file) return null;
  const local = file.names[destination.slug] ?? destination.name;
  return {
    lang,
    localName: local,
    stateName: (slug, fallback) => file.states[slug] ?? fallback,
    t: (text) => {
      const unit = text.match(/^(\d+(?:\.\d+)?) (h|min)$/);
      if (unit) return `${unit[1]} ${unit[2] === "h" ? file.units.h : file.units.min}`;
      if (!text || !isTranslatable(text) || names.has(text)) return text;
      const found = file.strings[normalise(text, destination.name)];
      return found ? found.split("{name}").join(local) : text;
    }
  };
}

const mapCell = (c: Cell, t: Translator["t"]): Cell => (typeof c === "string" ? t(c) : { ...c, text: t(c.text) });

function mapSection(s: GeneratedSection, t: Translator["t"]): GeneratedSection {
  return {
    ...s,
    title: t(s.title),
    paragraphs: s.paragraphs.map((p) => ({ ...p, text: t(p.text) })),
    bullets: s.bullets.map((b) => mapCell(b, t)),
    table: s.table ? { headers: s.table.headers.map(t), rows: s.table.rows.map((r) => r.map((c) => mapCell(c, t))) } : null,
    missing: s.missing.map(t),
    notices: s.notices.map(t)
  };
}

export function translatePage(page: GeneratedPage, tr: Translator | null): GeneratedPage {
  if (!tr) return page;
  return {
    ...page,
    title: tr.t(page.title),
    subtitle: page.subtitle ? tr.t(page.subtitle) : page.subtitle,
    sections: page.sections.map((s) => mapSection(s, tr.t)),
    faq: page.faq.map((f) => ({ question: tr.t(f.question), answer: tr.t(f.answer) }))
  };
}

/** Every distinct sentence on a page that a translator would need to handle (normalised), excluding proper names. */
export function collectStrings(page: GeneratedPage, destName: string, names: Set<string>): string[] {
  const out = new Set<string>();
  const add = (s: string | null | undefined) => {
    if (s && isTranslatable(s) && !names.has(s)) out.add(normalise(s, destName));
  };
  const addCell = (c: Cell) => add(typeof c === "string" ? c : c.text);
  add(page.title);
  add(page.subtitle);
  for (const s of page.sections) {
    add(s.title);
    s.paragraphs.forEach((p) => add(p.text));
    s.bullets.forEach(addCell);
    s.missing.forEach(add);
    s.notices.forEach(add);
    if (s.table) {
      s.table.headers.forEach(add);
      s.table.rows.flat().forEach(addCell);
    }
  }
  page.faq.forEach((f) => { add(f.question); add(f.answer); });
  return [...out];
}

export interface Coverage {
  total: number;
  translated: number;
  ratio: number;
}

export function coverageOf(lang: string, strings: string[]): Coverage {
  const file = FILES[lang];
  const translated = file ? strings.filter((s) => file.strings[s]).length : 0;
  return { total: strings.length, translated, ratio: strings.length ? translated / strings.length : 1 };
}

/** A destination's names in every translated language (for search and autocomplete). */
export const localNamesOf = (slug: string): string[] => Object.values(FILES).map((f) => f.names[slug]).filter((n): n is string => Boolean(n));
