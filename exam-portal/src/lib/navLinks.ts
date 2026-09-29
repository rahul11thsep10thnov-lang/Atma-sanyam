/** Shared between the desktop nav (Header, server component) and the
 * mobile nav (MobileNav, client component) — kept in its own plain
 * module since a `"use client"` file's non-component exports don't
 * survive being imported from server code. */
export const NAV_LINKS: Array<{ label: string; href: string }> = [
  // Real listing pages, shipped Phases 5–9 (Jobs, Results, Admit Cards,
  // Answer Keys, Syllabus).
  { label: "Jobs", href: "/jobs" },
  { label: "Results", href: "/results" },
  { label: "Admit Cards", href: "/admit-card" },
  { label: "Answer Keys", href: "/answer-key" },
  { label: "Syllabus", href: "/syllabus" },
  // Still a homepage anchor until Phase 10 ships a real Articles index.
  { label: "Articles", href: "/#articles" },
];
