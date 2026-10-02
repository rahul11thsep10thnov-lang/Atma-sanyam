import { prisma } from "@/lib/db/prisma";
import type { NoticeType } from "@/generated/prisma/enums";
import { nameMatchScore } from "./resolve/names";

/**
 * Deduplication (spec §14): the same notice reaches us through several
 * doors — the official PDF, a mirror of it on a second page, an RSS item,
 * a "what's new" link — and must become ONE notice. Checked in order of
 * certainty: same URL → same file bytes → same advertisement number for
 * the same organization and notice type → near-identical title for the
 * same organization/recruitment and type with agreeing dates.
 */
export type DuplicateReason = "url" | "checksum" | "advertisement" | "title";

export interface DuplicateMatch {
  duplicateOfId: string;
  reason: DuplicateReason;
  score: number;
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|source$|_ga$|sessionid$|phpsessid$|jsessionid$)/i;

/** Scheme-less, host-lower-cased, tracking-free, sorted-query form of a URL
 * so `HTTP://WWW.ssc.gov.in/notice.pdf?utm_source=x#top` and
 * `https://ssc.gov.in/notice.pdf` compare equal. */
export function canonicalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return url.trim().toLowerCase() || null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const port = u.port && !["80", "443"].includes(u.port) ? `:${u.port}` : "";
  const params = [...u.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? "?" + params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&") : "";
  let path = u.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/$/, "");
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep as-is
  }
  return `${host}${port}${path}${query}`;
}

export interface DuplicateQuery {
  /** The notice being created/updated — never its own duplicate. */
  noticeId?: string | null;
  documentId: string;
  documentChecksum?: string | null;
  canonicalUrl: string | null;
  sourceUrl: string | null;
  organizationId: string | null;
  recruitmentId: string | null;
  noticeType: NoticeType;
  title: string;
  advertisementNumber: string | null;
  applicationEndDate: string | null;
  examDate: string | null;
}

const TITLE_MIN = 0.9;
const LOOKBACK_DAYS = 365;

export async function findDuplicate(q: DuplicateQuery): Promise<DuplicateMatch | null> {
  const notSelf = {
    ...(q.noticeId ? { id: { not: q.noticeId } } : {}),
    documentId: { not: q.documentId },
    status: { not: "DUPLICATE" as const },
    duplicateOfId: null,
  };

  // 1. same URL (canonical or raw)
  const urls = [q.canonicalUrl, canonicalizeUrl(q.sourceUrl)].filter((x): x is string => !!x);
  if (urls.length) {
    const byUrl = await prisma.recruitmentNotice.findFirst({
      where: { ...notSelf, OR: [{ canonicalUrl: { in: urls } }, ...(q.sourceUrl ? [{ sourceUrl: q.sourceUrl }] : [])] },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (byUrl) return { duplicateOfId: byUrl.id, reason: "url", score: 1 };
  }

  // 2. same file bytes under a different URL
  if (q.documentChecksum) {
    const sameBytes = await prisma.document.findMany({ where: { checksum: q.documentChecksum, id: { not: q.documentId } }, select: { id: true } });
    if (sameBytes.length) {
      const byHash = await prisma.recruitmentNotice.findFirst({
        where: { ...notSelf, documentId: { in: sameBytes.map((d) => d.id) } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (byHash) return { duplicateOfId: byHash.id, reason: "checksum", score: 1 };
    }
  }

  if (!q.organizationId) return null;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);

  // 3. same advertisement number, organization and notice type
  const advt = q.advertisementNumber?.trim();
  if (advt && advt.length >= 3) {
    const byAdvt = await prisma.recruitmentNotice.findFirst({
      where: { ...notSelf, organizationId: q.organizationId, noticeType: q.noticeType, extracted: { path: ["advertisement_number"], equals: advt } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (byAdvt) return { duplicateOfId: byAdvt.id, reason: "advertisement", score: 0.97 };
  }

  // 4. near-identical title for the same organization (or recruitment) and type, dates agreeing
  const candidates = await prisma.recruitmentNotice.findMany({
    where: {
      ...notSelf,
      noticeType: q.noticeType,
      createdAt: { gte: since },
      OR: [{ organizationId: q.organizationId }, ...(q.recruitmentId ? [{ recruitmentId: q.recruitmentId }] : [])],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, title: true, extracted: true },
  });
  const agree = (a: string | null, b: unknown) => !a || !b || a === b;
  let best: DuplicateMatch | null = null;
  for (const c of candidates) {
    const ex = (c.extracted ?? {}) as { application_end_date?: string | null; exam_date?: string | null };
    if (!agree(q.applicationEndDate, ex.application_end_date) || !agree(q.examDate, ex.exam_date)) continue;
    const score = nameMatchScore(q.title, c.title);
    if (score >= TITLE_MIN && (!best || score > best.score)) best = { duplicateOfId: c.id, reason: "title", score };
  }
  return best;
}
