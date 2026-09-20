import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { HeaderSearch } from "@/components/search/HeaderSearch";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { nav } = dict.common;

  const links = [
    { href: `/${locale}`, label: nav.home },
    { href: `/${locale}/explore`, label: nav.explore },
    { href: `/${locale}/trips`, label: nav.trips }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-forest-100 bg-offwhite/95 backdrop-blur supports-[backdrop-filter]:bg-offwhite/80">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="flex shrink-0 items-baseline gap-1 font-display text-2xl font-bold text-forest-700">
          TripToe
          <span className="hidden text-xs font-sans font-medium tracking-wide text-saffron-600 sm:inline">
            {dict.common.tagline}
          </span>
        </Link>

        <nav aria-label={nav.explore} className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-charcoal hover:text-forest-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 max-w-sm md:block">
          <HeaderSearch locale={locale} placeholder={dict.home.searchPlaceholder} />
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} label={nav.language} />
          <Link
            href={`/${locale}/profile`}
            className="hidden rounded-full bg-forest-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-forest-700 sm:inline-block"
          >
            {nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
