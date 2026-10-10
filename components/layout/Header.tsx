import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { siteSettings } from "@/lib/cms/queries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavMenu } from "./NavMenu";

/**
 * Site header: a wide ink-painting wallpaper band (about 8:1), the menu at the far left, the site name
 * centred in Open Sans, language and sign-in on the right. The round logo is larger than the band and
 * hangs down over the top of the page below it.
 */
export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { nav } = dict.common;
  const siteName = siteSettings().site_name;
  const links = [
    { href: `/${locale}`, label: nav.home },
    { href: `/${locale}/explore`, label: nav.explore },
    { href: `/${locale}/trips`, label: nav.trips }
  ];

  return (
    <header className="relative z-30 border-b border-black/5">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-[#f7f5f0]">
        <Image src="/images/header-panda.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[center_55%]" />
      </div>

      <div className="container-page relative flex h-[clamp(104px,12.5vw,200px)] items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NavMenu links={links} label={nav.explore} />
          {/* Logo: bigger than the band, overflowing downwards. */}
          <Link href={`/${locale}`} aria-label={siteName} className="absolute left-[4.25rem] top-[18%] z-40 block sm:left-20">
            <span className="block h-[clamp(64px,15vw,250px)] w-[clamp(64px,15vw,250px)] overflow-hidden rounded-full bg-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)] ring-4 ring-white">
              <Image src="/images/logo.png" alt={`${siteName} logo`} width={560} height={560} priority className="h-full w-full object-cover" />
            </span>
          </Link>
        </div>

        <Link href={`/${locale}`} className="absolute bottom-2 left-[61%] -translate-x-1/2 whitespace-nowrap sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-y-1/2 rounded-full bg-white/70 px-3 py-1 font-brand text-lg font-extrabold tracking-tight text-forest-800 shadow-sm backdrop-blur-sm sm:px-7 sm:py-2 sm:text-4xl lg:text-5xl">
          {siteName}
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher currentLocale={locale} label={nav.language} />
          <Link href={`/${locale}/profile`} className="hidden rounded-full bg-forest-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-forest-700 sm:inline-block">
            {nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
