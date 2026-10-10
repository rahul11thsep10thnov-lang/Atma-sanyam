import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { suggestionIndex } from "@/lib/master/view";
import { cmsSuggestions, homepageCms, siteSettings } from "@/lib/cms/queries";
import { COMPANION_COOKIE, parseCompanion } from "@/lib/cms/companion";
import { Hero } from "@/components/home/Hero";
import { CmsRail } from "@/components/home/CmsRail";
import { CmsCard } from "@/components/cms/CmsCard";
import { CmsImg } from "@/components/cms/CmsImg";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  const locale: Locale = isLocale(params.locale) ? params.locale : "en";
  const dict = getDictionary(locale);
  const settings = siteSettings();
  return {
    title: { absolute: settings.default_seo_title },
    description: settings.default_seo_description,
    alternates: { canonical: `/${locale}`, languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])) },
    openGraph: { title: `${settings.site_name} — ${dict.home.hero2.headline}`, description: settings.default_seo_description, type: "website", images: settings.default_hero_image ? [{ url: settings.default_hero_image }] : undefined }
  };
}

export default function HomePage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);
  const h = dict.home.hero2;
  const settings = siteSettings();
  const companion = parseCompanion(cookies().get(COMPANION_COOKIE)?.value);
  const home = homepageCms(companion);

  // Autocomplete covers CMS destinations and attractions first, then the seed guides and states.
  const seen = new Set<string>();
  const suggestions = [...cmsSuggestions(), ...suggestionIndex(locale)].filter((s) => (seen.has(s.label + s.href) ? false : (seen.add(s.label + s.href), true)));

  const companionLabels = { COUPLE: h.couple, FAMILY: h.family, FRIENDS: h.friends, SOLO: h.solo } as const;
  const rail = (title: string, cards: typeof home.popular, extra: Partial<Parameters<typeof CmsRail>[0]> = {}) => (
    <CmsRail title={title} cards={cards} locale={locale} bestTimeLabel={dict.home.card.bestTime} seeAllHref={`/${locale}/destinations`} seeAllLabel={h.seeAll} {...extra} />
  );

  return (
    <>
      {/* Travel-doodle wallpaper, fixed behind everything below the hero, faded so content stays readable. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[url('/images/page-doodle.jpg')] bg-cover bg-center opacity-[0.14]" />
      <Hero
        locale={locale}
        backgroundUrl={settings.default_hero_image ?? "/images/hero-waterfall.jpg"}
        headline={h.headline}
        subheading={h.sub}
        placeholder={h.placeholder}
        searchLabel={dict.common.ui.search}
        suggestions={suggestions}
        companion={companion}
        who={{ title: h.whoTitle, labels: companionLabels, hint: h.selectedHint, clear: h.clear }}
      />

      {companion && rail(h.recommended.replace("{type}", companionLabels[companion]), home.recommended, { large: true, tone: "tinted" })}

      {/* Explore India: states with published destinations */}
      {home.byState.length > 0 && (
        <section className="py-10">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="section-heading">{h.exploreIndia}</h2>
                <p className="mt-1 text-sm text-charcoal-light">{h.exploreIndiaSub.replace("{n}", String(home.total)).replace("{s}", String(home.byState.length))}</p>
              </div>
              <Link href={`/${locale}/destinations`} className="shrink-0 text-sm font-semibold text-forest-600 hover:underline">{h.seeAll} →</Link>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {home.byState.slice(0, 12).map((s) => (
                <li key={s.state}>
                  <Link href={`/${locale}/destinations?state=${encodeURIComponent(s.state)}`} className="group relative block aspect-[5/4] overflow-hidden rounded-2xl bg-forest-100">
                    <CmsImg image={s.sample.image} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 200px, 45vw" fill />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent" />
                    <span className="absolute inset-x-3 bottom-3 text-white">
                      <span className="block font-display text-base font-semibold leading-tight">{s.state}</span>
                      <span className="text-[11px] text-white/80">{s.count} {h.places}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {rail(h.popular, home.popular, { large: true })}

      {home.attractions.length > 0 && (
        <section className="bg-forest-50/50 py-10">
          <div className="container-page">
            <h2 className="section-heading">{h.attractions}</h2>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {home.attractions.map((a) => (
                <li key={a.id}>
                  <Link href={`/${locale}${a.href}`} className="group block">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-forest-100">
                      <CmsImg image={a.image} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 640px) 25vw, 50vw" fill />
                    </span>
                    <span className="mt-2 block font-display text-sm font-semibold text-charcoal group-hover:text-forest-700">{a.name}</span>
                    <span className="block text-xs text-charcoal-light">{a.destination}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {rail(h.historical, home.historical)}
      {rail(h.nature, home.nature, { tone: "tinted" })}
      {rail(h.spiritual, home.spiritual)}
      {rail(h.family2, home.family, { tone: "tinted" })}
      {rail(h.couple2, home.couple)}
      {rail(h.solo2, home.solo, { tone: "tinted" })}
      {rail(h.budget, home.budget)}

      {home.recent.length > 0 && (
        <section className="py-10">
          <div className="container-page">
            <h2 className="section-heading">{h.recent}</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {home.recent.slice(0, 4).map((c) => (
                <CmsCard key={c.id} card={c} locale={locale} bestTimeLabel={dict.home.card.bestTime} fluid />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
