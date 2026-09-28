/** Shared between the desktop nav (Header, server component) and the
 * mobile nav (MobileNav, client component) — kept in its own plain
 * module since a `"use client"` file's non-component exports don't
 * survive being imported from server code. */
export const NAV_LINKS: Array<{ label: string; href: string }> = [
  // Real listing pages, shipped Phase 5 (Jobs), Phase 6 (Results), and
  // Phase 7 (Admit Cards).
  { label: "Jobs", href: "/jobs" },
  { label: "Results", href: "/results" },
  { label: "Admit Cards", href: "/admit-card" },
  // Still homepage anchors until their own phase ships a real index page
  // (Answer Keys: Phase 8; Articles: Phase 10).
  { label: "Answer Keys", href: "/#answer-keys" },
  { label: "Articles", href: "/#articles" },
];
