import Image from "next/image";
import type { SuggestionItem } from "@/lib/master/view";
import type { CompanionType } from "@/lib/cms/types";
import { HeroSearch } from "./HeroSearch";
import { CompanionPicker } from "./CompanionPicker";

/**
 * Homepage hero. The uploaded meadow photograph (public/images/home-meadow.jpg)
 * is the full-width backdrop at low opacity; a light wash and a soft blur keep
 * the headline and the search box fully readable while the mountain-and-flower
 * composition stays visible edge to edge.
 */
export function Hero({
  locale,
  backgroundUrl,
  headline,
  subheading,
  placeholder,
  searchLabel,
  suggestions,
  companion,
  who
}: {
  locale: string;
  backgroundUrl: string;
  headline: string;
  subheading: string;
  placeholder: string;
  searchLabel: string;
  suggestions: SuggestionItem[];
  companion: CompanionType | null;
  who: { title: string; labels: Record<CompanionType, string>; hint: string; clear: string };
}) {
  return (
    <section className="relative isolate overflow-hidden bg-offwhite">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Image
          src={backgroundUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_60%]"
          style={{ opacity: 0.16, filter: "saturate(1.05) brightness(1.08)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-offwhite/40 via-offwhite/10 to-offwhite" />
      </div>
      <div className="container-page relative pb-14 pt-16 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-saffron-600">budgettourism · India</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-forest-800 sm:text-6xl md:text-7xl">{headline}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-charcoal-light sm:text-lg">{subheading}</p>
          <HeroSearch locale={locale} placeholder={placeholder} suggestions={suggestions} buttonLabel={searchLabel} />
        </div>
        <CompanionPicker initial={companion} title={who.title} labels={who.labels} hint={who.hint} clearLabel={who.clear} />
      </div>
    </section>
  );
}
