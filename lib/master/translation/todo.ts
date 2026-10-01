import { getDestinationContent } from "../generation/pipeline";
import type { MasterDatabase } from "../types";
import { collectStrings, isTranslatable, normalise, properNames, translationFile } from "./memory";


export interface SourceString {
  /** English, destination name replaced by {name}. */
  text: string;
  slugs: string[];
}

/** Every sentence the site shows from the database — guide pages and attraction pages — normalised and de-duplicated. */
export function allSourceStrings(db: MasterDatabase): SourceString[] {
  const names = properNames(db);
  const map = new Map<string, Set<string>>();
  const add = (text: string | null | undefined, dest: { name: string; slug: string }) => {
    if (!text || !isTranslatable(text) || names.has(text)) return;
    const key = normalise(text, dest.name);
    (map.get(key) ?? map.set(key, new Set()).get(key)!).add(dest.slug);
  };

  for (const d of db.destinations) {
    collectStrings(getDestinationContent(db, d.id).page, d.name, names).forEach((s) => (map.get(s) ?? map.set(s, new Set()).get(s)!).add(d.slug));
    [[d.primary_language, ...d.secondary_languages].filter(Boolean).join(", "), d.budget_category ? d.budget_category.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : null, d.one_line_description, d.short_description, d.best_time_text, d.ideal_duration_text, d.nearest_airport, d.nearest_railway_station].forEach((t) => add(t, d));
    for (const a of db.attractions.filter((x) => x.destination_id === d.id)) {
      [a.short_description, a.current_description, a.historical_importance, a.cultural_importance, a.religious_importance, a.opening_hours_text, a.weekly_closed_day, a.best_time_of_day, a.nearby_transport, a.dress_code, a.footwear_rules].forEach((t) => add(t, d));
      db.historical_events.filter((e) => e.entity_id === a.id).forEach((e) => { add(e.title, d); add(e.description, d); });
      db.traditions.filter((x) => x.entity_id === a.id).forEach((x) => { add(x.title, d); add(x.short_story, d); });
    }
  }
  return [...map.entries()].map(([text, slugs]) => ({ text, slugs: [...slugs] }));
}

export function untranslated(db: MasterDatabase, lang: string, only?: string): SourceString[] {
  const file = translationFile(lang);
  const have = file?.strings ?? {};
  return allSourceStrings(db)
    .filter((s) => !have[s.text] && (!only || only.split(",").some((o) => s.slugs.includes(o))))
    .sort((a, b) => b.slugs.length - a.slugs.length || a.text.localeCompare(b.text));
}

export function coverageReport(db: MasterDatabase, lang: string) {
  const all = allSourceStrings(db);
  const file = translationFile(lang);
  const done = all.filter((s) => file?.strings[s.text]);
  return {
    lang,
    total: all.length,
    translated: done.length,
    chars_total: all.reduce((n, s) => n + s.text.length, 0),
    chars_translated: done.reduce((n, s) => n + s.text.length, 0)
  };
}

/** Stored translations whose English source no longer exists on any page — stale, and never shown. */
export function orphanStrings(db: MasterDatabase, lang: string): string[] {
  const live = new Set(allSourceStrings(db).map((s) => s.text));
  return Object.keys(translationFile(lang)?.strings ?? {}).filter((k) => !live.has(k) && isTranslatable(k));
}
