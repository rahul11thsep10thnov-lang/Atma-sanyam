"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Shield, Search } from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portal target isn't available during SSR — render the trigger button
  // immediately but only portal the overlay once mounted in the browser.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--card-border)] text-gray-600 hover:bg-gray-100 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-50 h-dvh w-screen bg-brand-dark text-white overflow-y-auto lg:hidden">
          <div className="container-page flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-white">
                <Shield size={16} />
              </span>
              <span className="font-display text-lg font-extrabold">
                Police<span className="text-brand-orange">Exams</span>
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          <div className="container-page pb-10">
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              Police Constable &amp; SI ki taiyari — Simple, Smart aur
              State-wise. Practice, mocks, PYQ aur state GK ek hi jagah.
            </p>

            <Link
              href="/search"
              className="mb-8 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-300"
            >
              <Search size={16} /> Exam, state ya topic search karein...
            </Link>

            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="mb-7">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-3">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-lg px-2 py-2.5 text-[15px] text-slate-200 hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Link
              href="/login"
              className="btn-orange mt-2 flex items-center justify-center py-3 text-sm"
            >
              Login / Sign Up
            </Link>

            <div className="mt-8 border-t border-white/10 pt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              <Link href="/about">About Us</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/disclaimer">Disclaimer</Link>
              <Link href="/admin">Admin Panel</Link>
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              © {new Date().getFullYear()} PoliceExams. Made for Police exam aspirants.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
