import Image from "next/image";
import type { SuggestionItem } from "@/lib/master/view";
import type { CompanionType } from "@/lib/cms/types";
import { HeroSearch } from "./HeroSearch";
import { CompanionPicker } from "./CompanionPicker";

/**
 * Homepage hero: the waterfall photograph (public/images/hero-waterfall.jpg, or the default hero image
 * from Settings) fills the section; a dark gradient keeps the headline, description and the large
 * search box readable on top of it.
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
    <section className="relative isolate overflow-hidden bg-forest-900">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Image src={backgroundUrl} alt="" fill priority sizes="100vw" className="object-cover object-[center_45%]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/60" />
      </div>
      <div className="container-page relative pb-14 pt-24 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-6xl md:text-7xl">{headline}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/90 drop-shadow sm:text-lg">{subheading}</p>
          <HeroSearch locale={locale} placeholder={placeholder} suggestions={suggestions} buttonLabel={searchLabel} />
        </div>
        <CompanionPicker initial={companion} title={who.title} labels={who.labels} hint={who.hint} clearLabel={who.clear} tone="light" />
      </div>
    </section>
  );
}
