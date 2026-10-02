import Link from "next/link";
import { Search, User } from "lucide-react";
import MobileMenu from "@/components/layout/MobileMenu";
import Logo from "@/components/layout/Logo";
import DesktopNav from "@/components/layout/DesktopNav";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-white/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-3 py-2">
        <Link href="/" aria-label="PoliceExams home" className="min-w-0">
          <Logo withQuote />
        </Link>

        {/* Visible navigation on laptops; the hamburger stays for phones. */}
        <DesktopNav />

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
          >
            <Search size={22} />
          </Link>
          <Link
            href="/login"
            className="btn-cta hidden items-center gap-1.5 px-4 py-2 text-[15px] md:inline-flex"
          >
            <User size={17} /> Login
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
