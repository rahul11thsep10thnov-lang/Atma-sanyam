import type { MetadataRoute } from "next";
import { EXAM_CONFIGS } from "@/data/examConfigs";
import { STATES } from "@/data/states";
import { STUDY_NOTES } from "@/data/studyNotes";
import { PYQ_PAPERS } from "@/data/pyq";
import { MOCK_TESTS } from "@/data/mockTests";

const SITE_URL = "https://policeexams.example.com";

const STATIC_ROUTES = [
  "",
  "/exams",
  "/exams/constable",
  "/exams/si",
  "/practice",
  "/mock-test",
  "/pyq",
  "/state-gk",
  "/current-affairs",
  "/physical-test",
  "/exam-updates",
  "/study-notes",
  "/daily-quiz",
  "/leaderboard",
  "/search",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/disclaimer",
  "/official-sources",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  for (const cfg of EXAM_CONFIGS) {
    entries.push({ url: `${SITE_URL}/${cfg.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.9 });
  }
  for (const s of STATES) {
    entries.push({ url: `${SITE_URL}/exams/${s.code}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
    entries.push({ url: `${SITE_URL}/state-gk/${s.code}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
    entries.push({ url: `${SITE_URL}/physical-test/${s.code}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }
  for (const n of STUDY_NOTES) {
    entries.push({ url: `${SITE_URL}/study-notes/${n.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }
  for (const p of PYQ_PAPERS) {
    entries.push({ url: `${SITE_URL}/pyq/${p.id}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }
  for (const m of MOCK_TESTS) {
    entries.push({ url: `${SITE_URL}/mock-test/${m.id}`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
  }

  return entries;
}
