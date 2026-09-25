"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";

// The mock-test instructions screen and the live test run full-screen with
// their own header and sticky actions — no site header, footer or tab bar
// competing with them, the way a dedicated exam app behaves.
function isExamRoute(pathname: string): boolean {
  return /^\/mock-test\/[^/]+(\/attempt)?\/?$/.test(pathname);
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isExamRoute(pathname)) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col has-mobile-nav">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}
