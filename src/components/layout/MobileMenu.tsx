"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  GraduationCap,
  FileText,
  Target,
  PenSquare,
  Sparkles,
  MapPinned,
  Newspaper,
  NotebookText,
  Dumbbell,
  Bell,
  LayoutDashboard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", href: "/", icon: Home, color: "#ff6a13" },
  { label: "Exams", href: "/exams", icon: GraduationCap, color: "#1c2333" },
  { label: "PYQ Bank", href: "/pyq", icon: FileText, color: "#1d78d8" },
  { label: "Mock Tests", href: "/mock-test", icon: Target, color: "#dc3b2f" },
  { label: "Subject-wise Practice", href: "/practice", icon: PenSquare, color: "#6d4fe0" },
  { label: "Aaj ka Quiz", href: "/daily-quiz", icon: Sparkles, color: "#e0a100" },
  { label: "State GK", href: "/state-gk", icon: MapPinned, color: "#10a760" },
  { label: "Current Affairs", href: "/current-affairs", icon: Newspaper, color: "#64748b" },
  { label: "Study Notes", href: "/study-notes", icon: NotebookText, color: "#1c2333" },
  { label: "Physical Test", href: "/physical-test", icon: Dumbbell, color: "#c2410c" },
  { label: "Exam Updates", href: "/exam-updates", icon: Bell, color: "#e0a100" },
  { label: "My Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#1d78d8" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Close whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-brand-dark hover:bg-gray-100"
      >
        {open ? <X size={26} /> : <Menu size={26} />}
      </button>

      {/* Portaled so it isn't trapped in the sticky header's stacking
          context and always layers above page content and the tab bar. */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 top-16 z-50">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 h-full w-full bg-black/25"
            />
            <nav className="relative max-h-full overflow-y-auto border-b border-[var(--card-border)] bg-white shadow-lg">
              <div className="container-page py-2">
                {ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3.5 rounded-xl px-3 py-3 font-display text-[17px] font-medium text-brand-dark",
                        active ? "bg-brand-orange-light" : "hover:bg-gray-50"
                      )}
                    >
                      <Icon size={21} style={{ color: item.color }} />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/login"
                  className="mt-2 mb-2 flex items-center gap-3 rounded-2xl border border-brand-orange/40 bg-brand-orange-light px-4 py-3.5 font-display text-[17px] font-semibold text-brand-orange"
                >
                  <User size={21} /> Login / Register
                </Link>
              </div>
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}
