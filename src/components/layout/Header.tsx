import Link from "next/link";
import { Shield, Search } from "lucide-react";
import { MAIN_NAV } from "@/lib/nav";
import MobileMenu from "@/components/layout/MobileMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange text-white shadow-sm shadow-orange-200">
            <Shield size={20} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-brand-navy">
            Police<span className="text-brand-orange">Exams</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto text-sm font-medium">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-2 text-gray-700 hover:bg-orange-50 hover:text-brand-orange"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/search"
            aria-label="Search"
            className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] text-gray-600 hover:bg-gray-100"
          >
            <Search size={18} />
          </Link>
          <Link
            href="/login"
            className="btn-orange hidden sm:inline-flex items-center px-4 py-2 text-sm"
          >
            Login
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
