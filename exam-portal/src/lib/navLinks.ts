/** Shared between the desktop nav (Header, server component) and the
 * mobile nav (MobileNav, client component) — kept in its own plain
 * module since a `"use client"` file's non-component exports don't
 * survive being imported from server code. */
export const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: "Jobs", href: "/#jobs" },
  { label: "Results", href: "/#results" },
  { label: "Admit Cards", href: "/#admit-cards" },
  { label: "Answer Keys", href: "/#answer-keys" },
  { label: "Articles", href: "/#articles" },
];
