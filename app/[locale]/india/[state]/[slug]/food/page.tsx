import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { destinations, getDestinationBySlug } from "@/lib/data/destinations";
import { SubPageHeader } from "@/components/destination/SubPageHeader";
import { FoodSection } from "@/components/destination/FoodSection";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface PageParams {
  locale: string;
  state: string;
  slug: string;
}

export function generateStaticParams() {
  return locales.flatMap((locale) => destinations.map((d) => ({ locale, state: d.stateSlug, slug: d.slug })));
}

export function generateMetadata({ params }: { params: PageParams }): Metadata {
  const destination = getDestinationBySlug(params.slug);
  if (!destination) return {};
  return {
    title: `Famous Food in ${destination.name}`,
    description: `Eat like a local in ${destination.name}, ${destination.state} — signature dishes, street food and sweets.`
  };
}

export default function DestinationFoodPage({ params }: { params: PageParams }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const destination = getDestinationBySlug(params.slug);
  if (!destination || destination.stateSlug !== params.state) notFound();
  const dict = getDictionary(locale);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: dict.common.nav.home, href: `/${locale}` },
          { label: destination.name, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}` },
          { label: dict.destination.sections.food, href: `/${locale}/india/${destination.stateSlug}/${destination.slug}/food` }
        ]}
      />
      <SubPageHeader
        destination={destination}
        locale={locale}
        title={`${dict.destination.sections.food} — ${destination.name}`}
      />
      <FoodSection destination={destination} dict={dict} id="food-full" />
    </>
  );
}
