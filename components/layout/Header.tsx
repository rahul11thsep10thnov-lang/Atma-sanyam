import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { siteSettings } from "@/lib/cms/queries";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavMenu } from "./NavMenu";

/**
 * Site header: the ink-painting wallpaper at its own proportions (nothing cropped), the menu at the far
 * left, language and sign-in on the right. The round logo sits between the panda and the quote, half on
 * the wallpaper and half over the section below.
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
        <Image src="/images/header-panda.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      </div>

      <div className="relative flex aspect-[2172/430] min-h-[96px] w-full px-4 sm:px-6 lg:px-8 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <NavMenu links={links} label={nav.explore} />
        </div>

        {/* Logo between the panda and the quote, half on the wallpaper and half below it. */}
        <Link href={`/${locale}`} aria-label={siteName} className="absolute left-[46%] top-[calc(100%-var(--logo)/2)] z-40 block -translate-x-1/2 [--logo:clamp(72px,11.5vw,240px)]">
          <span className="block aspect-square h-[var(--logo)] overflow-hidden rounded-full drop-shadow-[0_14px_24px_rgba(0,0,0,0.4)]">
            <Image src="/images/logo-bt.png" alt={`${siteName} logo`} width={600} height={600} priority className="h-full w-full object-contain" />
          </span>
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
