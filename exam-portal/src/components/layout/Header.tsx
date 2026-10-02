import Link from "next/link";
import { SearchBar } from "@/components/layout/SearchBar";
import { SITE_NAME } from "@/lib/siteConfig";
import { resolveLang } from "@/lib/i18n/lang";
import { LangToggle } from "@/components/layout/LangToggle";
import { Suspense } from "react";

export async function Header() {
  const lang = await resolveLang();
  return (
    <header className="relative border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Site name: Josefin Sans in the brand gradient, 6pt (8px) larger
            than the previous 18px wordmark. */}
        <Link
          href="/"
          className="font-heading shrink-0 text-[26px] font-bold tracking-wide"
          style={{
            backgroundImage: "var(--heading-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
        >
          {SITE_NAME}
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          <SearchBar className="hidden max-w-xs flex-1 sm:flex md:max-w-sm" />
          <Suspense fallback={null}>
            <LangToggle lang={lang} />
          </Suspense>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
