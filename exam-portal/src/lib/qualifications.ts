/** Minimum-qualification filter for the job search. Matching is done on
 * the job's free-text qualification/eligibility with these keywords; a
 * higher level also matches jobs open to lower levels' holders is NOT
 * assumed — the filter shows jobs whose stated minimum is this level. */
export const QUALIFICATION_LEVELS = [
  { code: "8th", label: "8th pass", keywords: ["8th", "class viii", "middle"] },
  { code: "10th", label: "10th pass", keywords: ["10th", "matric", "high school", "class x", "secondary school", "ssc exam"] },
  { code: "12th", label: "12th pass", keywords: ["12th", "10+2", "intermediate", "higher secondary", "class xii"] },
  { code: "iti", label: "ITI", keywords: ["iti", "industrial training"] },
  { code: "diploma", label: "Diploma", keywords: ["diploma", "polytechnic"] },
  { code: "graduate", label: "Graduate", keywords: ["graduate", "graduation", "bachelor", "degree", "b.a", "b.sc", "b.com"] },
  { code: "engineering", label: "B.Tech / B.E.", keywords: ["b.tech", "b.e.", "engineering degree", "btech"] },
  { code: "postgraduate", label: "Post Graduate", keywords: ["post graduate", "postgraduate", "master", "m.a", "m.sc", "m.com", "mba", "pg "] },
] as const;
export type QualificationCode = (typeof QUALIFICATION_LEVELS)[number]["code"];
export function qualificationByCode(code?: string | null) {
  return QUALIFICATION_LEVELS.find((q) => q.code === code) ?? null;
}
