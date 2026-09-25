"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils";

// Exam-taking screens get a distraction-free, full-screen layout — no
// marketing header, footer, or bottom tab bar competing with the exam's own
// sticky timer/controls. Matches how real CBT software hides site chrome
// during a live test.
function isExamRoute(pathname: string): boolean {
  return /^\/mock-test\/[^/]+\/attempt/.test(pathname);
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const examMode = isExamRoute(pathname);

  if (examMode) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className={cn("flex min-h-full flex-1 flex-col", "has-mobile-nav")}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}
