import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { GeneratedSection } from "@/lib/master/generation/types";
import { sectionTitle } from "./GeneratedSectionView";

/** Sticky in-page navigation; horizontally scrollable on phones. */
export function SectionNav({ sections, name, dict, extra = [] }: { sections: GeneratedSection[]; name: string; dict: Dictionary; extra?: Array<[string, string]> }) {
  const items: Array<[string, string]> = [...sections.map((s): [string, string] => [s.id, sectionTitle(s, name, dict)]), ...extra];
  return (
    <nav aria-label={dict.common.ui.jumpTo} className="sticky top-16 z-20 border-b border-forest-100 bg-white/95 backdrop-blur">
      <ul className="container-page flex gap-1 overflow-x-auto py-2 text-xs sm:text-sm">
        {items.map(([id, label]) => (
          <li key={id} className="shrink-0">
            <a href={`#${id}`} className="rounded-full px-3 py-1.5 font-medium text-charcoal-light hover:bg-forest-50 hover:text-forest-700">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
