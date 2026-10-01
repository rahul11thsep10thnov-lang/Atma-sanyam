import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { getDb, stateById } from "@/lib/master/repo";
import { viewBySlug } from "@/lib/master/view";
import { isServable } from "@/lib/master/generation/pipeline";
import { localizedContent } from "@/lib/master/translation/localized";
import { SubPageHeader } from "@/components/destination/SubPageHeader";
import { GeneratedSectionView } from "@/components/destination/GeneratedSectionView";
import { SourcesSection } from "@/components/destination/SourcesSection";
import { WeatherSection } from "@/components/destination/WeatherSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
}

/**
 * A focused sub-page (/where-to-stay, /food, /shopping, /weather, /history) made of specific generated
 * sections of the destination guide — same stored records, same verification badges, no separate copy to drift.
 */
export function createSectionSubPage(opts: {
  /** URL segment under the destination, e.g. "food". */
  path: string;
  sectionIds: string[];
  /** Breadcrumb label. */
  crumb: (dict: Dictionary) => string;
  title: (name: string) => string;
  /** On-page heading in the reader's language (the title above is used for metadata). */
  heading?: (dict: Dictionary, name: string) => string;
  description: (name: string, state: string) => string;
  withLiveWeather?: boolean;
}) {
  function generateStaticParams() {
    const db = getDb();
    return locales.flatMap((locale) => db.destinations.map((d) => ({ locale, state: stateById(d.state_id)!.slug, slug: d.slug })));
  }

  function generateMetadata({ params }: { params: PageParams }): Metadata {
    const view = viewBySlug(params.slug);
    if (!view || view.state.slug !== params.state) return {};
    const locale: Locale = isLocale(params.locale) ? params.locale : "en";
    const title = opts.title(view.record.name);
    return {
      title,
      description: opts.description(view.record.name, view.state.name),
      alternates: {
        canonical: `/${locale}${view.path}/${opts.path}`,
        languages: Object.fromEntries(locales.map((l) => [l, `/${l}${view.path}/${opts.path}`]))
      }
    };
  }

  async function Page({ params }: { params: PageParams }) {
    if (!isLocale(params.locale)) notFound();
    const locale: Locale = params.locale;
    const view = viewBySlug(params.slug);
    if (!view || view.state.slug !== params.state) notFound();
    const dict = getDictionary(locale);
    const localized = localizedContent(view.record, locale);
    const content = localized.content;
    if (!isServable(content.record.published_status)) notFound();
    const sections = opts.sectionIds.map((id) => localized.page.sections.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const name = localized.translator?.localName ?? view.record.name;

    return (
      <>
        <Breadcrumbs
          items={[
            { label: dict.common.nav.home, href: `/${locale}` },
            { label: name, href: `/${locale}${view.path}` },
            { label: opts.crumb(dict), href: `/${locale}${view.path}/${opts.path}` }
          ]}
        />
        <SubPageHeader view={view} locale={locale} name={name} title={opts.heading ? opts.heading(dict, name) : opts.title(name)} />
        {sections.map((s, i) => (
          <GeneratedSectionView key={s.id} section={s} name={name} locale={locale} dict={dict} images={view.watermarkImages} tone={i % 2 ? "tinted" : "plain"} />
        ))}
        {opts.withLiveWeather && <WeatherSection view={view} dict={dict} />}
        <SourcesSection sources={content.input.sources} dict={dict} />
      </>
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}
