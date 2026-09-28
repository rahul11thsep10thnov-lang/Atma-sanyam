/** Shared between the desktop nav (Header, server component) and the
 * mobile nav (MobileNav, client component) — kept in its own plain
 * module since a `"use client"` file's non-component exports don't
 * survive being imported from server code. */
export const NAV_LINKS: Array<{ label: string; href: string }> = [
  // Real listing page as of Phase 5.
  { label: "Jobs", href: "/jobs" },
  // Still homepage anchors until their own phase ships a real index page
  // (Results/Admit Cards/Answer Keys: Phases 6–8; Articles: Phase 10).
  { label: "Results", href: "/#results" },
  { label: "Admit Cards", href: "/#admit-cards" },
  { label: "Answer Keys", href: "/#answer-keys" },
  { label: "Articles", href: "/#articles" },
];
