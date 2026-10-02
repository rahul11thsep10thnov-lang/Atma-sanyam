/**
 * One place for site-wide SEO facts (Section 23) — used by the root
 * layout's default metadata, the sitemap, robots.txt, and JSON-LD.
 * Falls back to localhost in dev; set NEXT_PUBLIC_SITE_URL in
 * production (Vercel sets a preview URL automatically otherwise).
 */
export const SITE_NAME = "SarkariChayan";
export const SITE_DESCRIPTION =
  "Government examination information: jobs, results, admit cards, answer keys, syllabus, admissions and scholarships.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
