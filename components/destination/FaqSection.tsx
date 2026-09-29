import type { Dictionary } from "@/lib/i18n/dictionaries";

/** FAQ built only from questions the stored data can answer (see the writer); renders nothing when there are none. */
export function FaqSection({ faq, dict, id = "faq" }: { faq: Array<{ question: string; answer: string }>; dict: Dictionary; id?: string }) {
  if (faq.length === 0) return null;
  return (
    <section id={id} className="border-b border-forest-100/70 py-9">
      <div className="container-page">
        <h2 className="section-heading">{dict.destination.sectionTitles.faq}</h2>
        <div className="mt-4 max-w-3xl divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white">
          {faq.map((f) => (
            <details key={f.question} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-charcoal marker:hidden sm:text-base">
                <span className="mr-2 text-saffron-600 group-open:hidden">+</span>
                <span className="mr-2 hidden text-saffron-600 group-open:inline">−</span>
                {f.question}
              </summary>
              <p className="mt-2 text-sm text-charcoal-light">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
