/** Shared between the desktop nav (Header, server component) and the
 * mobile nav (MobileNav, client component) — kept in its own plain
 * module since a `"use client"` file's non-component exports don't
 * survive being imported from server code. */
export const NAV_LINKS: Array<{ label: string; href: string }> = [
  // Real listing pages, shipped Phases 5–10 — every nav item now points
  // to a real page; no homepage anchors left.
  { label: "Jobs", href: "/jobs" },
  { label: "Results", href: "/results" },
  { label: "Admit Cards", href: "/admit-card" },
  { label: "Answer Keys", href: "/answer-key" },
  { label: "Syllabus", href: "/syllabus" },
  { label: "Admissions", href: "/admission" },
  { label: "Scholarships", href: "/scholarship" },
  { label: "Articles", href: "/articles" },
];
