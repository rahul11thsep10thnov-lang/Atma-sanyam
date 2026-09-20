import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { destinationSummaries } from "@/lib/data/destinations";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { footer, nav } = dict.common;
  const featured = destinationSummaries.slice(0, 6);

  return (
    <footer className="mt-16 border-t border-forest-100 bg-forest-700 pb-24 pt-12 text-forest-50 md:pb-12">
      <div className="container-page grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-bold text-white">TripToe</p>
          <p className="mt-1 text-sm text-saffron-300">{dict.common.tagline}</p>
          <p className="mt-3 max-w-xs text-sm text-forest-100">{footer.aboutText}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-saffron-300">{footer.explore}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {featured.map((d) => (
              <li key={d.slug}>
                <Link href={`/${locale}/india/${d.stateSlug}/${d.slug}`} className="hover:text-saffron-300">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-saffron-300">{footer.company}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={`/${locale}/admin`} className="hover:text-saffron-300">
                {nav.admin}
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-saffron-300">
                {footer.contact}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-saffron-300">{footer.legal}</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-saffron-300">
                {footer.privacy}
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-saffron-300">
                {footer.terms}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-page mt-8 border-t border-forest-600 pt-6 text-xs text-forest-200">
        © {new Date().getFullYear()} TripToe. {footer.rights}
      </div>
    </footer>
  );
}
