import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import type { NoticePriority, NoticeType } from "@/generated/prisma/enums";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";
import { recordAuditLog, PIPELINE_ACTOR } from "@/lib/services/auditLog";
import { getEmailSender, type EmailSender } from "./email";
import type { AlertSubscribeInput } from "@/lib/validation/alert";

/**
 * Alerts (spec §23/§24): readers subscribe to a recruitment, an
 * organization, a category, a state, a keyword or everything, pick the
 * notice types and a minimum priority; every published notice is matched
 * against verified subscriptions and e-mailed, with one AlertDelivery
 * row per subscriber as the record of what went out (or why not).
 */
export const PRIORITY_RANK: Record<NoticePriority, number> = { URGENT: 3, HIGH: 2, NORMAL: 1, LOW: 0 };

export interface MatchableNotice {
  noticeType: NoticeType;
  priority: NoticePriority;
  title: string;
  summary: string | null;
  recruitmentId: string | null;
  organizationId: string | null;
  organizationName: string | null;
  organizationStateId: string | null;
  categoryIds: string[];
}

export interface MatchableSubscription {
  recruitmentId: string | null;
  organizationId: string | null;
  categoryId: string | null;
  stateId: string | null;
  keyword: string | null;
  noticeTypes: NoticeType[];
  minPriority: NoticePriority;
}

/** Pure matching rule: every scope the subscriber set must hold. */
export function subscriptionMatches(sub: MatchableSubscription, n: MatchableNotice): boolean {
  if (PRIORITY_RANK[n.priority] < PRIORITY_RANK[sub.minPriority]) return false;
  if (sub.noticeTypes.length && !sub.noticeTypes.includes(n.noticeType)) return false;
  if (sub.recruitmentId && sub.recruitmentId !== n.recruitmentId) return false;
  if (sub.organizationId && sub.organizationId !== n.organizationId) return false;
  if (sub.categoryId && !n.categoryIds.includes(sub.categoryId)) return false;
  if (sub.stateId && sub.stateId !== n.organizationStateId) return false;
  if (sub.keyword) {
    const hay = `${n.title} ${n.summary ?? ""} ${n.organizationName ?? ""}`.toLowerCase();
    if (!hay.includes(sub.keyword.toLowerCase())) return false;
  }
  return true;
}

const token = () => randomBytes(24).toString("base64url");

export async function createSubscription(input: AlertSubscribeInput) {
  // The same person asking for the same scope twice gets the same row.
  const existing = await prisma.alertSubscription.findFirst({
    where: {
      email: input.email,
      recruitmentId: input.recruitmentId ?? null,
      organizationId: input.organizationId ?? null,
      categoryId: input.categoryId ?? null,
      stateId: input.stateId ?? null,
      keyword: input.keyword ?? null,
    },
  });
  const sub = existing
    ? await prisma.alertSubscription.update({ where: { id: existing.id }, data: { active: true, noticeTypes: input.noticeTypes, minPriority: input.minPriority, locale: input.locale } })
    : await prisma.alertSubscription.create({
        data: {
          email: input.email,
          recruitmentId: input.recruitmentId ?? null,
          organizationId: input.organizationId ?? null,
          categoryId: input.categoryId ?? null,
          stateId: input.stateId ?? null,
          keyword: input.keyword ?? null,
          noticeTypes: input.noticeTypes,
          minPriority: input.minPriority,
          locale: input.locale,
          verifyToken: token(),
          unsubscribeToken: token(),
        },
      });
  const verifyUrl = `${SITE_URL}/alerts/verify?token=${sub.verifyToken}`;
  let verificationSent = false;
  if (!sub.verifiedAt) {
    const sender = getEmailSender();
    if (sender) {
      const r = await sender.send({
        to: sub.email,
        subject: sub.locale === "hi" ? `${SITE_NAME} अलर्ट की पुष्टि करें` : `Confirm your ${SITE_NAME} alerts`,
        text: sub.locale === "hi" ? `अपने अलर्ट चालू करने के लिए यह लिंक खोलें: ${verifyUrl}` : `Open this link to switch on your alerts: ${verifyUrl}`,
        html: `<p>${sub.locale === "hi" ? "अपने अलर्ट चालू करने के लिए क्लिक करें" : "Click to switch on your alerts"}: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
      });
      verificationSent = r.ok;
    }
  }
  return { subscription: sub, verifyUrl, verificationSent, alreadyVerified: !!sub.verifiedAt };
}

export async function verifySubscription(verifyToken: string) {
  const sub = await prisma.alertSubscription.findUnique({ where: { verifyToken } });
  if (!sub) return null;
  if (!sub.verifiedAt) await prisma.alertSubscription.update({ where: { id: sub.id }, data: { verifiedAt: new Date(), active: true } });
  return sub;
}

export async function unsubscribe(unsubscribeToken: string) {
  const sub = await prisma.alertSubscription.findUnique({ where: { unsubscribeToken } });
  if (!sub) return null;
  await prisma.alertSubscription.update({ where: { id: sub.id }, data: { active: false } });
  return sub;
}

export async function loadMatchableNotice(noticeId: string): Promise<(MatchableNotice & { id: string; recruitmentSlug: string | null; sourceUrl: string | null; titleHi: string | null; summaryHi: string | null }) | null> {
  const n = await prisma.recruitmentNotice.findUnique({
    where: { id: noticeId },
    select: {
      id: true, noticeType: true, priority: true, title: true, titleHi: true, summary: true, summaryHi: true, sourceUrl: true, recruitmentId: true, organizationId: true,
      organization: { select: { name: true, stateId: true } },
      recruitment: { select: { slug: true, categories: { select: { categoryId: true } } } },
    },
  });
  if (!n) return null;
  return {
    id: n.id,
    noticeType: n.noticeType,
    priority: n.priority,
    title: n.title,
    titleHi: n.titleHi,
    summary: n.summary,
    summaryHi: n.summaryHi,
    sourceUrl: n.sourceUrl,
    recruitmentId: n.recruitmentId,
    recruitmentSlug: n.recruitment?.slug ?? null,
    organizationId: n.organizationId,
    organizationName: n.organization?.name ?? null,
    organizationStateId: n.organization?.stateId ?? null,
    categoryIds: n.recruitment?.categories.map((c) => c.categoryId) ?? [],
  };
}

const TYPE_WORD: Record<NoticeType, { en: string; hi: string }> = {
  JOB: { en: "New recruitment", hi: "नई भर्ती" },
  ADMIT_CARD: { en: "Admit card", hi: "एडमिट कार्ड" },
  EXAM_DATE: { en: "Exam date", hi: "परीक्षा तिथि" },
  ANSWER_KEY: { en: "Answer key", hi: "उत्तर कुंजी" },
  RESULT: { en: "Result", hi: "परिणाम" },
  MERIT_LIST: { en: "Merit list", hi: "मेरिट सूची" },
  SELECTION_LIST: { en: "Selection list", hi: "चयन सूची" },
  INTERVIEW: { en: "Interview", hi: "साक्षात्कार" },
  DOCUMENT_VERIFICATION: { en: "Document verification", hi: "दस्तावेज़ सत्यापन" },
  CORRIGENDUM: { en: "Corrigendum", hi: "शुद्धिपत्र" },
  DEADLINE_EXTENSION: { en: "Last date extended", hi: "अंतिम तिथि बढ़ी" },
  EXAM_POSTPONED: { en: "Exam postponed", hi: "परीक्षा स्थगित" },
  EXAM_CANCELLED: { en: "Exam cancelled", hi: "परीक्षा रद्द" },
  APPLICATION_STARTED: { en: "Application started", hi: "आवेदन शुरू" },
  CORRECTION_WINDOW: { en: "Correction window", hi: "सुधार विंडो" },
  OTHER: { en: "Update", hi: "अपडेट" },
};

export function buildAlertEmail(n: NonNullable<Awaited<ReturnType<typeof loadMatchableNotice>>>, locale: string, unsubscribeToken: string) {
  const hi = locale === "hi";
  const kind = hi ? TYPE_WORD[n.noticeType].hi : TYPE_WORD[n.noticeType].en;
  const title = hi && n.titleHi ? n.titleHi : n.title;
  const summary = hi && n.summaryHi ? n.summaryHi : n.summary;
  const link = n.recruitmentSlug ? `${SITE_URL}/recruitments/${n.recruitmentSlug}${hi ? "?lang=hi" : ""}` : `${SITE_URL}/recruitments`;
  const unsub = `${SITE_URL}/alerts/unsubscribe?token=${unsubscribeToken}`;
  const urgent = n.priority === "URGENT" ? (hi ? "[तत्काल] " : "[URGENT] ") : "";
  const subject = `${urgent}${kind}: ${title}`.slice(0, 200);
  const text = [`${kind}${n.organizationName ? ` — ${n.organizationName}` : ""}`, title, summary ?? "", "", `${hi ? "विवरण" : "Details"}: ${link}`, n.sourceUrl ? `${hi ? "आधिकारिक स्रोत" : "Official source"}: ${n.sourceUrl}` : "", "", `${hi ? "अलर्ट बंद करें" : "Unsubscribe"}: ${unsub}`].filter((l) => l !== null).join("\n");
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px"><p style="color:#25D482;font-weight:600">${esc(kind)}${n.organizationName ? ` · ${esc(n.organizationName)}` : ""}</p><h2 style="margin:0 0 8px">${esc(title)}</h2>${summary ? `<p>${esc(summary)}</p>` : ""}<p><a href="${link}" style="background:#25D482;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">${hi ? "विवरण देखें" : "View details"}</a></p>${n.sourceUrl ? `<p style="font-size:12px;color:#666">${hi ? "आधिकारिक स्रोत" : "Official source"}: <a href="${esc(n.sourceUrl)}">${esc(n.sourceUrl)}</a></p>` : ""}<hr style="border:none;border-top:1px solid #eee"><p style="font-size:12px;color:#888">${SITE_NAME} · <a href="${unsub}">${hi ? "अलर्ट बंद करें" : "Unsubscribe"}</a></p></div>`;
  return { subject, text, html, link };
}

export interface DispatchAlertsResult {
  matched: number;
  sent: number;
  failed: number;
}

/** Called when a notice is published. Idempotent per (subscription, notice). */
export async function dispatchAlertsForNotice(noticeId: string, options: { notificationId?: string | null; sender?: EmailSender | null } = {}): Promise<DispatchAlertsResult> {
  const n = await loadMatchableNotice(noticeId);
  const out: DispatchAlertsResult = { matched: 0, sent: 0, failed: 0 };
  if (!n) return out;
  const sender = options.sender === undefined ? getEmailSender() : options.sender;

  // Candidate rows: scoped to anything that could match (cheap filter), then the exact rule in JS.
  const candidates = await prisma.alertSubscription.findMany({
    where: {
      active: true,
      verifiedAt: { not: null },
      OR: [
        { recruitmentId: null, organizationId: null, categoryId: null, stateId: null },
        ...(n.recruitmentId ? [{ recruitmentId: n.recruitmentId }] : []),
        ...(n.organizationId ? [{ organizationId: n.organizationId }] : []),
        ...(n.categoryIds.length ? [{ categoryId: { in: n.categoryIds } }] : []),
        ...(n.organizationStateId ? [{ stateId: n.organizationStateId }] : []),
      ],
    },
  });
  for (const sub of candidates) {
    if (!subscriptionMatches(sub, n)) continue;
    out.matched += 1;
    const already = await prisma.alertDelivery.findUnique({ where: { subscriptionId_recruitmentNoticeId: { subscriptionId: sub.id, recruitmentNoticeId: n.id } } });
    if (already && already.status === "SENT") continue;
    const delivery = already ?? (await prisma.alertDelivery.create({ data: { subscriptionId: sub.id, recruitmentNoticeId: n.id, notificationId: options.notificationId ?? null, channel: sub.channel } }));
    if (!sender) {
      await prisma.alertDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", error: "EMAIL provider not configured (set RESEND_API_KEY and ALERTS_FROM_EMAIL)." } });
      out.failed += 1;
      continue;
    }
    const mail = buildAlertEmail(n, sub.locale, sub.unsubscribeToken);
    const r = await sender.send({ to: sub.email, subject: mail.subject, text: mail.text, html: mail.html });
    if (r.ok) {
      await prisma.alertDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", sentAt: new Date(), error: null } });
      await prisma.alertSubscription.update({ where: { id: sub.id }, data: { lastNotifiedAt: new Date() } });
      out.sent += 1;
    } else {
      await prisma.alertDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", error: r.error.slice(0, 500) } });
      out.failed += 1;
    }
  }
  if (out.matched) {
    await recordAuditLog({ actor: PIPELINE_ACTOR, action: "UPDATE", contentType: "RecruitmentNotice", contentId: noticeId, newValue: { alerts: { ...out } } });
  }
  return out;
}

/** Retry FAILED deliveries whose subscription is still active (admin button / cron). */
export async function retryFailedAlerts(limit = 100, sender: EmailSender | null = getEmailSender()) {
  if (!sender) return { retried: 0, sent: 0 };
  const failed = await prisma.alertDelivery.findMany({ where: { status: "FAILED", subscription: { active: true, verifiedAt: { not: null } }, recruitmentNoticeId: { not: null } }, orderBy: { createdAt: "asc" }, take: limit, include: { subscription: true } });
  let sent = 0;
  for (const d of failed) {
    const n = await loadMatchableNotice(d.recruitmentNoticeId!);
    if (!n) continue;
    const mail = buildAlertEmail(n, d.subscription.locale, d.subscription.unsubscribeToken);
    const r = await sender.send({ to: d.subscription.email, subject: mail.subject, text: mail.text, html: mail.html });
    await prisma.alertDelivery.update({ where: { id: d.id }, data: r.ok ? { status: "SENT", sentAt: new Date(), error: null } : { error: r.error.slice(0, 500) } });
    if (r.ok) sent += 1;
  }
  return { retried: failed.length, sent };
}

export function alertStats() {
  return Promise.all([
    prisma.alertSubscription.count({ where: { active: true, verifiedAt: { not: null } } }),
    prisma.alertSubscription.count({ where: { verifiedAt: null } }),
    prisma.alertDelivery.count({ where: { status: "SENT" } }),
    prisma.alertDelivery.count({ where: { status: "FAILED" } }),
  ]).then(([active, pending, sent, failed]) => ({ active, pending, sent, failed }));
}
