import type { Destination } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function FaqSection({ destination, dict }: { destination: Destination; dict: Dictionary }) {
  const { sections } = dict.destination;
  if (destination.faqs.length === 0) return null;

  return (
    <section id="faq" className="py-10">
      <div className="container-page">
        <h2 className="section-heading">{sections.faq}</h2>
        <div className="mt-6 divide-y divide-forest-100 rounded-2xl border border-forest-100">
          {destination.faqs.map((faq) => (
            <details key={faq.question} className="group p-4">
              <summary className="cursor-pointer list-none font-medium text-charcoal marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span aria-hidden="true" className="text-forest-500 transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-charcoal-light">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
