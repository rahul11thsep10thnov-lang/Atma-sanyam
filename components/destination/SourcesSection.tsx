import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SourceRecord } from "@/lib/master/types";

/** Every page lists the sources behind it (spec: source transparency). Draft editorial sources are labelled as such. */
export function SourcesSection({ sources, dict }: { sources: SourceRecord[]; dict: Dictionary }) {
  if (sources.length === 0) return null;
  const { ui } = dict.common;
  return (
    <section id="sources" className="py-8">
      <div className="container-page">
        <h2 className="text-lg font-semibold text-charcoal">{ui.sourcesLabel}</h2>
        <ul className="mt-3 grid gap-2 text-xs text-charcoal-light sm:grid-cols-2">
          {sources.map((s) => (
            <li key={s.id} className="rounded-lg bg-forest-50/60 px-3 py-2">
              <span className="font-medium text-charcoal">{s.source_name}</span> · {s.source_type.replace(/_/g, " ").toLowerCase()} · {ui.reliability}: {s.reliability_class.replace(/_/g, " ").toLowerCase()}
              {s.url && (
                <>
                  {" · "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-forest-600 hover:underline">
                    {ui.website}
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
