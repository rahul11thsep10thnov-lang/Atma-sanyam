import Link from "next/link";
import { SearchBar } from "@/components/layout/SearchBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { NAV_LINKS } from "@/lib/navLinks";

export function Header() {
  return (
    <header className="relative border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-semibold text-slate-900">
          Exam<span className="text-brand-700">Portal</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <SearchBar className="hidden max-w-xs flex-1 sm:flex md:max-w-sm" />

        <MobileNav />
      </div>

      <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
