import Link from "next/link";
import { Search } from "lucide-react";
import MobileMenu from "@/components/layout/MobileMenu";
import Logo from "@/components/layout/Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="PoliceExams home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
          >
            <Search size={22} />
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
