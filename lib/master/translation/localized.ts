import { getDestinationContent } from "../generation/pipeline";
import { destinationBySlug, getDb } from "../repo";
import type { DestinationRecord } from "../types";
import { collectStrings, coverageOf, hasTranslations, properNames, translatePage, translatorFor, type Coverage, type Translator } from "./memory";

let cachedNames: Set<string> | null = null;
const names = () => (cachedNames ??= properNames(getDb()));

export interface LocalizedContent {
  content: ReturnType<typeof getDestinationContent>;
  /** The page in the reader's language where translations exist, English otherwise (string by string). */
  page: ReturnType<typeof getDestinationContent>["page"];
  translator: Translator | null;
  /** null when the language has no translation memory at all. */
  coverage: Coverage | null;
}

export function localizedContent(dest: DestinationRecord, locale: string): LocalizedContent {
  const content = getDestinationContent(getDb(), dest.id);
  if (locale === "en" || !hasTranslations(locale)) return { content, page: content.page, translator: null, coverage: null };
  const translator = translatorFor(locale, dest, names());
  return {
    content,
    page: translatePage(content.page, translator),
    translator,
    coverage: coverageOf(locale, collectStrings(content.page, dest.name, names()))
  };
}

/** Same translator for attraction pages and other text drawn straight from records. */
export function translatorForDestination(dest: DestinationRecord, locale: string): Translator | null {
  return locale === "en" ? null : translatorFor(locale, dest, names());
}

/** Card text (name, state, blurb, best time) in the reader's language; English where a translation is missing. */
export function localizeSummary(
  s: { slug: string; name: string; state: string; stateSlug: string; shortDescription: string; bestTimeToVisit: string },
  locale: string
) {
  const dest = locale === "en" ? undefined : destinationBySlug(s.slug);
  const tr = dest ? translatorForDestination(dest, locale) : null;
  if (!tr) return { name: s.name, state: s.state, shortDescription: s.shortDescription, bestTimeToVisit: s.bestTimeToVisit };
  return {
    name: tr.localName,
    state: tr.stateName(s.stateSlug, s.state),
    shortDescription: tr.t(s.shortDescription),
    bestTimeToVisit: tr.t(s.bestTimeToVisit)
  };
}
