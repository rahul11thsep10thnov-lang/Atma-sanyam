import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { anyBySlug, publishedBySlug, siteSettings } from "@/lib/cms/queries";
import { adminAccess } from "@/lib/auth/admin";
import { assetOf, creditOf, isPlaceholder } from "@/lib/cms/images";
import { Credit } from "@/components/cms/Credit";
import { plainText } from "@/lib/cms/markdown";
import { CmsImg } from "@/components/cms/CmsImg";
import { DestinationTabs } from "@/components/cms/DestinationTabs";
import { RichText } from "@/components/cms/RichText";
import { AttractionList } from "@/components/cms/AttractionList";
import { HotelList, RestaurantList } from "@/components/cms/Listings";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { BreadcrumbJsonLd, CmsDestinationJsonLd, FaqJsonLd } from "@/components/seo/JsonLd";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://budgettourism.com";

interface Params {
  locale: string;
  slug: string;
}
interface Query {
  preview?: string;
}

/** Admins can open an unpublished record with ?preview=1; everyone else only ever sees PUBLISHED pages. */
async function resolve(slug: string, query?: Query) {
  const published = publishedBySlug(slug);
  if (published) return { d: published, preview: false };
  if (query?.preview && (await adminAccess()) !== "denied") {
    const draft = anyBySlug(slug);
    if (draft) return { d: draft, preview: true };
  }
  return { d: null, preview: false };
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams?: Query }): Promise<Metadata> {
  const { d, preview } = await resolve(params.slug, searchParams);
  if (!d) return {};
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const settings = siteSettings();
  const title = d.seo.title ?? `${d.name} Travel Guide${d.state ? ` — ${d.state}` : ""} | ${settings.site_name}`;
  const description = d.seo.description ?? plainText(d.short_description ?? d.about).slice(0, 160);
  const canonicalPath = d.seo.canonical_path ?? `/destinations/${d.slug}`;
  const hero = d.hero_image && !isPlaceholder(d.hero_image) ? assetOf(d.hero_image, d.name).url : null;
  const og = d.seo.og_image ?? hero;
  return {
    title: { absolute: title },
    description,
    keywords: d.seo.keywords,
    alternates: {
      canonical: `/${locale}${canonicalPath}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}${canonicalPath}`]))
    },
    robots: preview ? "noindex, nofollow" : "index, follow",
    openGraph: { title, description, type: "article", images: og ? [{ url: og.startsWith("http") ? og : `${SITE_URL}${og}` }] : undefined }
  };
}

export default async function CmsDestinationPage({ params, searchParams }: { params: Params; searchParams?: Query }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const { d, preview } = await resolve(params.slug, searchParams);
  if (!d) notFound();
  const dict = getDictionary(locale);
  const t = dict.destination.cms;
  const hero = assetOf(d.hero_image, d.name, 1600, 900);
  const heroCredit = d.hero_image ? creditOf(d.hero_image) : null;
  const path = `/destinations/${d.slug}`;

  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: t.allDestinations, href: `/${locale}/destinations` },
    ...(d.state && d.state_slug ? [{ label: d.state, href: `/${locale}/india/${d.state_slug}` }] : []),
    { label: d.name, href: `/${locale}${path}` }
  ];

  const tabs = [
    { id: "about", label: t.tabAbout },
    { id: "history", label: t.tabHistory },
    { id: "attractions", label: t.tabAttractions },
    { id: "hotels", label: t.tabHotels },
    { id: "restaurants", label: t.tabRestaurants }
  ];

  const facts: Array<[string, string | null]> = [
    [dict.destination.quickInfo.bestTimeToVisit, d.best_time_text],
    [dict.destination.quickInfo.idealDuration, d.ideal_duration_text],
    [dict.destination.quickInfo.nearestAirport, d.nearest_airport],
    [dict.destination.quickInfo.nearestRailway, d.nearest_railway_station]
  ];
  const activeAttractions = d.attractions.filter((a) => a.status === "ACTIVE").length;
  const sourceList = (field: string) => d.provenance[field] ?? [];

  const Sources = ({ field }: { field: string }) => {
    const list = sourceList(field);
    if (!list.length) return null;
    return (
      <p className="mt-4 text-[11px] text-charcoal-light">
        {t.sources}:{" "}
        {list.map((s, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-forest-700">{s.label}</a> : s.label}
            {s.status === "SOURCE_UNAVAILABLE" && ` (${t.sourceUnavailable})`}
            {s.retrieved_at && ` · ${s.retrieved_at.slice(0, 10)}`}
          </span>
        ))}
      </p>
    );
  };

  return (
    <>
      <BreadcrumbJsonLd items={crumbs} />
      <CmsDestinationJsonLd destination={d} locale={locale} description={plainText(d.short_description ?? d.about).slice(0, 300)} image={isPlaceholder(d.hero_image) ? null : hero.url} />
      {d.faq.length > 0 && <FaqJsonLd faqs={d.faq.map((f) => ({ question: f.question, answer: f.answer }))} />}

      {preview && (
        <div className="bg-saffron-500 px-4 py-2 text-center text-sm font-medium text-white">
          Admin preview — this destination is {d.status} and not visible to visitors. <Link href={`/${locale}/admin/cms/destinations/${d.id}`} className="underline">Back to the editor</Link>
        </div>
      )}

      {/* Hero */}
      <header className="relative">
        <div className="relative h-[56vh] min-h-[340px] w-full overflow-hidden bg-forest-800 sm:h-[62vh]">
          <CmsImg image={hero} className="h-full w-full object-cover" priority sizes="100vw" fill />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent" />
          {heroCredit && <span className="absolute bottom-2 right-3 z-10 rounded bg-black/40 px-2 py-0.5 text-[10px] text-white/80"><Credit credit={heroCredit} label={heroCredit.style === "unsplash" ? undefined : t.photoCredit} /></span>}
          <div className="container-page absolute inset-x-0 bottom-0 pb-8 text-white sm:pb-12">
            <Breadcrumbs items={crumbs} tone="light" />
            {d.state && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-saffron-300">{d.state}{d.region ? ` · ${d.region} India` : ""}</p>}
            <h1 className="mt-1 font-display text-4xl font-bold leading-tight sm:text-6xl">{d.name}</h1>
            {d.headline && <p className="mt-2 max-w-2xl text-base text-white/90 sm:text-lg">{d.headline}</p>}
            {d.short_description && <p className="mt-3 hidden max-w-2xl text-sm text-white/80 sm:block">{d.short_description}</p>}
          </div>
        </div>
        {facts.some(([, v]) => v) && (
          <div className="border-b border-forest-100 bg-white">
            <dl className="container-page grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-saffron-600">{label}</dt>
                  <dd className="mt-0.5 text-sm text-charcoal">{value ?? <span className="text-charcoal-light/70">{t.notCollected}</span>}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </header>

      <DestinationTabs tabs={tabs} />

      <section id="about" className="scroll-mt-32 border-b border-forest-100/70 py-10">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="section-heading">{t.tabAbout}</h2>
            {d.about ? <RichText text={d.about} className="mt-4 max-w-3xl" /> : <p className="mt-4 text-sm text-charcoal-light">{t.notCollected}</p>}
            <Sources field="about" />
          </div>
          <aside className="space-y-4">
            {d.transportation && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-700">{t.gettingThere}</h3>
                <RichText text={d.transportation} className="mt-2 !text-sm" />
                <Sources field="transportation" />
              </div>
            )}
            {d.travel_info && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-700">{t.travelInfo}</h3>
                <RichText text={d.travel_info} className="mt-2 !text-sm" />
              </div>
            )}
            {d.legacy_slug && d.state_slug && (
              <Link href={`/${locale}/india/${d.state_slug}/${d.legacy_slug}`} className="block rounded-2xl bg-forest-600 p-4 text-sm font-semibold text-white hover:bg-forest-700">
                {t.fullGuide} →
              </Link>
            )}
          </aside>
        </div>
      </section>

      <section id="history" className="scroll-mt-32 border-b border-forest-100/70 bg-forest-50/50 py-10">
        <div className="container-page">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="section-heading">{t.tabHistory}</h2>
            {d.history && !d.history_verified && <span className="rounded-full bg-terracotta-100 px-2.5 py-0.5 text-[11px] font-semibold text-terracotta-700">{t.historyDraft}</span>}
          </div>
          {d.history ? <RichText text={d.history} className="mt-4 max-w-3xl" /> : <p className="mt-4 max-w-3xl rounded-xl bg-white p-4 text-sm text-charcoal-light ring-1 ring-black/5">{t.historyUnavailable}</p>}
          <Sources field="history" />
        </div>
      </section>

      <section id="attractions" className="scroll-mt-32 border-b border-forest-100/70 py-10">
        <div className="container-page">
          <h2 className="section-heading">{t.tabAttractions}</h2>
          <p className="mt-1 text-sm text-charcoal-light">{t.attractionsCount.replace("{n}", String(activeAttractions))}</p>
          <div className="mt-6">
            <AttractionList attractions={d.attractions} dict={dict} />
          </div>
          <Sources field="attractions" />
        </div>
      </section>

      <section id="hotels" className="scroll-mt-32 border-b border-forest-100/70 bg-forest-50/50 py-10">
        <div className="container-page">
          <h2 className="section-heading">{t.tabHotels}</h2>
          <div className="mt-6">
            <HotelList hotels={d.hotels} name={d.name} dict={dict} />
          </div>
        </div>
      </section>

      <section id="restaurants" className="scroll-mt-32 border-b border-forest-100/70 py-10">
        <div className="container-page">
          <h2 className="section-heading">{t.tabRestaurants}</h2>
          <div className="mt-6">
            <RestaurantList restaurants={d.restaurants} name={d.name} dict={dict} />
          </div>
        </div>
      </section>

      {d.images.filter((i) => i.approval_status === "APPROVED" && !isPlaceholder(i)).length > 0 && (
        <section className="border-b border-forest-100/70 py-10">
          <div className="container-page">
            <h2 className="section-heading">{t.gallery}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {d.images.filter((i) => i.approval_status === "APPROVED" && !isPlaceholder(i)).map((img) => (
                <li key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-forest-100">
                  <CmsImg image={assetOf(img, d.name, 800, 600)} className="h-full w-full object-cover" sizes="(min-width: 1024px) 300px, 50vw" fill />
                  {creditOf(img) && <span className="absolute bottom-1 right-1 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white/90"><Credit credit={creditOf(img)!} /></span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {d.faq.length > 0 && (
        <section className="border-b border-forest-100/70 py-10">
          <div className="container-page">
            <h2 className="section-heading">{dict.destination.sectionTitles.faq}</h2>
            <dl className="mt-4 max-w-3xl divide-y divide-forest-100 rounded-2xl bg-white ring-1 ring-black/5">
              {d.faq.map((f, i) => (
                <div key={i} className="p-4">
                  <dt className="font-semibold text-charcoal">{f.question}</dt>
                  <dd className="mt-1 text-sm text-charcoal-light">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </>
  );
}
