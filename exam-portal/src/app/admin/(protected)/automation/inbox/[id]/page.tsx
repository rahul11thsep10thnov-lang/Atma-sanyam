import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getNoticeDetail, NOTICE_TYPES_ALL, NOTICE_PRIORITIES } from "@/lib/pipeline/review";
import { ConfidenceBar, NoticeStatusBadge, NoticeTypeBadge, PriorityBadge } from "@/components/admin/NoticeBadges";
import { approveNoticeAction, rejectNoticeAction, reopenNoticeAction, publishNoticeAction, markDuplicateAction, reextractNoticeAction } from "../actions";
import { NoticeEditForm } from "./NoticeEditForm";

export const metadata: Metadata = { title: "Notice" };

type Prov = { confidence: number; extractor: string; verified: boolean; sourcePage: number | null; sourceText: string | null };
type Resolution = { organization?: { method: string; confidence: number }; exam?: { method: string; confidence: number }; recruitment?: { method: string; confidence: number }; year?: number | null; createdAny?: boolean };

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const FIELD_ORDER = ["notice_type", "organization", "exam_name", "department", "advertisement_number", "post_names", "vacancies", "application_start_date", "application_end_date", "exam_date", "admit_card_date", "result_date", "application_fee", "eligibility", "salary", "selection_process", "official_notification_url", "official_apply_url", "important_dates", "reservation_information", "physical_requirements", "source_language", "summary"];

function show(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" && x ? Object.values(x as object).join(": ") : String(x))).join("; ") : "—";
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== null && !(Array.isArray(x) && !x.length)).map(([k, x]) => `${k.replace(/_/g, " ")}: ${Array.isArray(x) ? x.join(", ") : String(x)}`).join(" · ") || "—";
  return String(v);
}

export default async function NoticeDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string; content?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const notice = await getNoticeDetail(id);
  if (!notice) notFound();
  const [exams, recruitments] = await Promise.all([
    notice.organizationId ? prisma.exam.findMany({ where: { organizationId: notice.organizationId }, select: { id: true, title: true }, orderBy: { title: "asc" } }) : Promise.resolve([]),
    notice.organizationId ? prisma.recruitment.findMany({ where: { organizationId: notice.organizationId }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
  ]);
  const canReview = admin.role !== "AUTHOR";
  const canPublish = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  const extracted = (notice.extracted ?? {}) as Record<string, unknown>;
  const conf = (notice.fieldConfidence ?? {}) as Record<string, Prov | Resolution | null>;
  const resolution = (conf.__resolution ?? null) as Resolution | null;
  const errors = (notice.validationErrors as string[] | null) ?? [];
  const change = notice.changeSummary as { versionNumber?: number; diff?: Array<{ old: string | null; new: string | null }>; duplicate?: { reason: string; score: number } } | null;
  const here = `/admin/automation/inbox/${id}`;
  const publicHref = notice.publishedContentType === "Job" ? "/jobs" : notice.publishedContentType === "AdmitCard" ? "/admit-cards" : notice.publishedContentType === "AnswerKey" ? "/answer-keys" : notice.publishedContentType === "Result" ? "/results" : notice.recruitment ? `/recruitments/${notice.recruitment.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/automation/inbox" className="text-xs text-slate-500 hover:underline">← Inbox</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={notice.priority} />
          <NoticeTypeBadge type={notice.noticeType} />
          <NoticeStatusBadge status={notice.status} />
          <ConfidenceBar value={notice.overallConfidence} />
        </div>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{notice.title}</h1>
        {notice.titleHi ? <p className="text-slate-700" lang="hi">{notice.titleHi}</p> : null}
        <p className="mt-1 text-sm text-slate-600">{notice.summary ?? "No summary."}</p>
        <p className="mt-1 text-xs text-slate-500">
          Found {fmt(notice.createdAt)} from {notice.source ? <Link href={`/admin/automation/sources/${notice.source.id}/edit`} className="text-brand-700 hover:underline">{notice.source.name}</Link> : notice.sourceDomain}
          {notice.sourceUrl ? <> · <a href={notice.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">original document</a></> : null}
          {notice.reviewedAt ? <> · reviewed {fmt(notice.reviewedAt)}</> : null}
          {notice.publishedAt ? <> · published {fmt(notice.publishedAt)} as {notice.publishedContentType}{publicHref ? <> (<Link href={publicHref} className="text-brand-700 hover:underline">view</Link>)</> : null}</> : null}
        </p>
      </div>

      {sp.done ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Notice {sp.done}{sp.content ? ` → ${sp.content}` : ""}.</p> : null}
      {sp.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{sp.error}</p> : null}
      {errors.length ? (
        <ul className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {errors.map((e) => <li key={e}>⚠ {e}</li>)}
        </ul>
      ) : null}
      {notice.duplicateOf ? (
        <p className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-800">
          Marked as a duplicate of <Link href={`/admin/automation/inbox/${notice.duplicateOf.id}`} className="font-medium hover:underline">{notice.duplicateOf.title}</Link>
          {change?.duplicate ? ` (${change.duplicate.reason}, ${Math.round(change.duplicate.score * 100)}%)` : ""}.
        </p>
      ) : null}

      {/* Actions */}
      {canReview ? (
        <section className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          {notice.status !== "PUBLISHED" && notice.status !== "APPROVED" && notice.status !== "REJECTED" ? (
            <form action={approveNoticeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">Approve</button></form>
          ) : null}
          {canPublish && notice.status !== "PUBLISHED" && notice.status !== "REJECTED" && notice.status !== "DUPLICATE" ? (
            <form action={publishNoticeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">Publish</button></form>
          ) : null}
          {notice.status === "REJECTED" || notice.status === "DUPLICATE" ? (
            <form action={reopenNoticeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Re-open for review</button></form>
          ) : null}
          {notice.status !== "REJECTED" && notice.status !== "PUBLISHED" ? (
            <form action={rejectNoticeAction} className="flex items-end gap-2">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} />
              <label className="text-xs text-slate-600">Reason<input name="note" className="mt-1 block w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="optional" /></label>
              <button className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Reject</button>
            </form>
          ) : null}
          {notice.status !== "DUPLICATE" && notice.status !== "PUBLISHED" ? (
            <form action={markDuplicateAction} className="flex items-end gap-2">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} />
              <label className="text-xs text-slate-600">Duplicate of (notice id)<input name="ofId" className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs" placeholder="paste id" /></label>
              <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" name="merge" value="true" /> merge fields into it</label>
              <button className="rounded-md border border-purple-300 bg-white px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50">Mark duplicate</button>
            </form>
          ) : null}
          {canPublish && notice.documentId ? (
            <form action={reextractNoticeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Re-extract</button></form>
          ) : null}
          <span className="ml-auto font-mono text-[11px] text-slate-400" title="notice id">{id}</span>
        </section>
      ) : null}

      {/* Links */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: "Organization", value: notice.organization?.name, auto: notice.organization?.isAutoCreated, href: notice.organization ? `/admin/organizations?q=${encodeURIComponent(notice.organization.name)}` : null, res: resolution?.organization },
          { label: "Exam", value: notice.exam?.title, auto: notice.exam?.isAutoCreated, href: notice.exam ? `/admin/exams/${notice.exam.id}/edit` : null, res: resolution?.exam },
          { label: "Recruitment", value: notice.recruitment?.title, auto: notice.recruitment?.isAutoCreated, href: notice.recruitment ? `/admin/recruitments?q=${encodeURIComponent(notice.recruitment.title)}` : null, res: resolution?.recruitment },
        ].map((l) => (
          <div key={l.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">{l.label}</div>
            <div className="mt-1 text-sm text-slate-900">
              {l.value ? (l.href ? <Link href={l.href} className="hover:underline">{l.value}</Link> : l.value) : <span className="text-red-600">not linked</span>}
              {l.auto ? <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] text-amber-700">auto-created</span> : null}
            </div>
            {l.res ? <div className="text-xs text-slate-500">matched by {l.res.method} · {Math.round(l.res.confidence * 100)}%</div> : null}
          </div>
        ))}
      </section>

      {/* Extracted fields with provenance */}
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Extracted fields</h2>
          <span className="text-xs text-slate-500">value · confidence · where it came from</span>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {FIELD_ORDER.filter((f) => f in extracted).map((f) => {
              const p = conf[f] as Prov | null | undefined;
              return (
                <tr key={f} className="border-t border-slate-100 align-top">
                  <td className="w-44 px-4 py-2 text-xs font-medium text-slate-500">{f.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2 text-slate-900">{show(extracted[f])}</td>
                  <td className="w-40 px-4 py-2">{p ? <ConfidenceBar value={p.confidence} /> : <span className="text-xs text-slate-400">—</span>}</td>
                  <td className="w-72 px-4 py-2 text-xs text-slate-500">
                    {p ? (
                      <>
                        <span className={p.verified ? "text-emerald-700" : "text-red-600"}>{p.verified ? "verified" : "UNVERIFIED"}</span> · {p.extractor}
                        {p.sourcePage ? ` · page ${p.sourcePage}` : ""}
                        {p.sourceText ? <div className="mt-0.5 line-clamp-2 italic" title={p.sourceText}>“{p.sourceText}”</div> : null}
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Edit */}
      {canReview && notice.status !== "PUBLISHED" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Correct before approving</h2>
          <NoticeEditForm
            notice={{ id, title: notice.title, titleHi: notice.titleHi, summary: notice.summary, summaryHi: notice.summaryHi, noticeType: notice.noticeType, priority: notice.priority, examId: notice.examId, recruitmentId: notice.recruitmentId, extracted }}
            noticeTypes={NOTICE_TYPES_ALL}
            priorities={NOTICE_PRIORITIES}
            exams={exams}
            recruitments={recruitments}
          />
        </section>
      ) : null}

      {/* Document + versions */}
      {notice.document ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">Document</h2>
          <p className="mt-1 text-slate-700">
            {notice.document.filename} · {notice.document.mimeType ?? "?"}{notice.document.pageCount ? ` · ${notice.document.pageCount} pages` : ""} ·{" "}
            <a href={notice.document.storageUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">stored copy</a>
            {notice.document.sourceUrl ? <> · <a href={notice.document.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">official URL</a></> : null}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {notice.document.versions.map((v) => {
              const diff = (v.diff as Array<{ old: string | null; new: string | null }> | null) ?? [];
              return (
                <li key={v.id}>
                  <span className="font-medium">v{v.versionNumber}</span> · {fmt(v.fetchedAt)} · <span className="font-mono">{v.checksum.slice(0, 12)}</span>
                  {v.id === notice.documentVersionId ? <span className="ml-1 rounded bg-slate-100 px-1 text-[10px]">this notice</span> : null}
                  {diff.length ? (
                    <ul className="mt-0.5 ml-4 list-disc">
                      {diff.slice(0, 10).map((d, i) => <li key={i}><span className="text-red-600 line-through">{d.old ?? ""}</span> → <span className="text-emerald-700">{d.new ?? ""}</span></li>)}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {change?.diff?.length ? <p className="mt-2 text-xs text-amber-700">The document changed after this notice was first created (version {change.versionNumber}); the fields above were re-extracted from the new version.</p> : null}
        </section>
      ) : null}

      {notice.duplicates.length ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">Duplicates pointing here</h2>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            {notice.duplicates.map((d) => <li key={d.id}><Link href={`/admin/automation/inbox/${d.id}`} className="hover:underline">{d.title}</Link> <span className="text-xs text-slate-500">{d.sourceUrl}</span></li>)}
          </ul>
        </section>
      ) : null}

      {notice.errors.length ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <h2 className="text-sm font-semibold">Unresolved pipeline errors</h2>
          <ul className="mt-1 list-disc pl-5">{notice.errors.map((e) => <li key={e.id}>{e.errorType}: {e.message}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
