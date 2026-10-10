import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SeedStub } from "@/lib/cms/seedView";
import { publishedCards } from "@/lib/cms/queries";
import { getDestination } from "@/lib/cms/store";
import { draftCircuits, draftCircuitsOf } from "@/lib/cms/seedView";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { CmsCard } from "./CmsCard";
import { DraftCircuits } from "./DraftCircuits";

/**
 * Page for a destination that is on the master list but not yet researched. It states only what the list
 * says (name, state, classification, circuits) and labels every other detail as unverified with its source.
 */
export function SeedStubPage({ stub, locale, dict }: { stub: SeedStub; locale: Locale; dict: Dictionary }) {
  const t = dict.destination.cms;
  const record = getDestination(stub.id);
  const circuits = record ? draftCircuitsOf(record) : [];
  const nearby = stub.state ? publishedCards().filter((c) => c.state === stub.state).slice(0, 4) : [];
  const stateCircuits = !circuits.length && stub.state ? draftCircuits(stub.state).slice(0, 3) : [];
  const crumbs = [
    { label: dict.common.nav.home, href: `/${locale}` },
    { label: t.allDestinations, href: `/${locale}/destinations` },
    ...(stub.state && stub.state_slug ? [{ label: stub.state, href: `/${locale}/india/${stub.state_slug}` }] : []),
    { label: stub.name, href: `/${locale}${stub.href}` }
  ];
  const state = stub.state ?? "India";

  return (
    <div className="container-page py-10">
      <Breadcrumbs items={crumbs} />
      <span className="mt-4 inline-block rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-saffron-800">{t.seedBadge}</span>
      <h1 className="mt-2 font-display text-4xl font-bold text-charcoal sm:text-5xl">{stub.name}</h1>
      {stub.state && <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-saffron-700">{stub.state}</p>}
      <div className="card-surface mt-6 max-w-3xl p-5">
        <p className="text-sm text-charcoal">{t.seedIntro.replace("{name}", stub.name).replace("{state}", state)}</p>
        {stub.listed_as && (
          <p className="mt-3 text-sm text-charcoal-light">
            {t.seedListedAs}: <span className="font-medium text-charcoal">{stub.listed_as}</span>
          </p>
        )}
      </div>

      {stub.hints.length > 0 && (
        <section className="mt-8 max-w-3xl">
          <h2 className="section-heading">{t.seedHints}</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {stub.hints.map((h) => (
              <div key={h.label} className="rounded-xl bg-peach p-4 ring-1 ring-black/5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-saffron-600">
                  {h.label} <span className="ml-1 rounded bg-white/70 px-1.5 py-0.5 text-[10px] normal-case text-charcoal-light">{t.seedUnverified}</span>
                </dt>
                <dd className="mt-1 text-sm text-charcoal">{h.href ? <a href={h.href} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{h.value}</a> : h.value}</dd>
                {h.source && (
                  <dd className="mt-1 text-[11px] text-charcoal-light">
                    {t.sources}: {h.source.url ? <a href={h.source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{h.source.label}</a> : h.source.label}
                    {h.source.retrieved_at && ` · ${h.source.retrieved_at.slice(0, 10)}`}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-charcoal-light">{t.seedHintsNote}</p>
        </section>
      )}

      {(circuits.length > 0 || stateCircuits.length > 0) && (
        <section className="mt-10">
          <h2 className="section-heading">{circuits.length ? t.circuitsIncluding.replace("{name}", stub.name) : t.draftCircuitsTitle}</h2>
          <DraftCircuits circuits={circuits.length ? circuits : stateCircuits} locale={locale} note={t.draftCircuitsNote} typicalDays={t.typicalDays} highlight={stub.name} />
        </section>
      )}

      {nearby.length > 0 && (
        <section className="mt-10">
          <h2 className="section-heading">{t.seedPublishedNearby.replace("{state}", state)}</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((c) => (
              <CmsCard key={c.id} card={c} locale={locale} bestTimeLabel={dict.home.card.bestTime} fluid />
            ))}
          </div>
        </section>
      )}

      {stub.state_slug && (
        <p className="mt-10 text-sm">
          <Link href={`/${locale}/india/${stub.state_slug}`} className="font-semibold text-forest-700 hover:underline">{t.seedMoreIn.replace("{state}", state)} →</Link>
        </p>
      )}
    </div>
  );
}
