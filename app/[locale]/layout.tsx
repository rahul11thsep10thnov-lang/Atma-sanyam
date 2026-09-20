import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(params.locale)) {
    notFound();
  }
  const locale: Locale = params.locale;
  const dict = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} dict={dict} />
      <main id="main-content" className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <Footer locale={locale} dict={dict} />
      <MobileBottomNav
        locale={locale}
        labels={{
          home: dict.common.nav.home,
          explore: dict.common.nav.explore,
          search: dict.common.nav.search,
          trips: dict.common.nav.trips,
          profile: dict.common.nav.profile
        }}
      />
    </div>
  );
}
