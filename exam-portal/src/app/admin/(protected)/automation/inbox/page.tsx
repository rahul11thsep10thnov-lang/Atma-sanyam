import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listNotices, inboxCounts, NOTICE_TYPES_ALL } from "@/lib/pipeline/review";
import type { NoticeStatus, NoticeType } from "@/generated/prisma/enums";
import { NoticeTable } from "./NoticeTable";

export const metadata: Metadata = { title: "Inbox" };

const TABS: Array<{ label: string; status: NoticeStatus | "INBOX" | "ALL" }> = [
  { label: "Inbox", status: "INBOX" },
  { label: "New", status: "NEW" },
  { label: "Needs review", status: "NEEDS_REVIEW" },
  { label: "Auto-approved", status: "AUTO_APPROVED" },
  { label: "Approved", status: "APPROVED" },
  { label: "Published", status: "PUBLISHED" },
  { label: "Rejected", status: "REJECTED" },
  { label: "Duplicate", status: "DUPLICATE" },
  { label: "All", status: "ALL" },
];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string; page?: string; done?: string; error?: string; content?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const status = (TABS.some((t) => t.status === sp.status) ? sp.status : "INBOX") as NoticeStatus | "INBOX" | "ALL";
  const type = NOTICE_TYPES_ALL.includes(sp.type as NoticeType) ? (sp.type as NoticeType) : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const [list, counts] = await Promise.all([
    listNotices({ status: status === "ALL" ? undefined : status, noticeType: type, q: sp.q?.trim() || undefined, page }),
    inboxCounts(),
  ]);
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, type: type ?? "", q: sp.q ?? "", ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/admin/automation/inbox?${p.toString()}`;
  };
  const returnTo = qs({ page: page > 1 ? String(page) : undefined });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">Notices the pipeline found. Approve what is right, fix what is not, publish when ready.</p>
      </div>

      {sp.done ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Notice {sp.done}{sp.content ? ` → ${sp.content}` : ""}.</p> : null}
      {sp.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{sp.error}</p> : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const n = t.status === "INBOX" ? counts.inbox : t.status === "ALL" ? Object.values(counts.byStatus).reduce((a, b) => a + b, 0) : counts.byStatus[t.status];
          const active = t.status === status;
          return (
            <Link key={t.status} href={qs({ status: t.status, page: undefined })} className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              {t.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{n}</span>
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3" action="/admin/automation/inbox">
        <input type="hidden" name="status" value={status} />
        <label className="text-xs text-slate-600">
          Type
          <select name="type" defaultValue={type ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All types</option>
            {NOTICE_TYPES_ALL.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600">
          Search
          <input name="q" defaultValue={sp.q ?? ""} placeholder="title, organization, URL" className="mt-1 block w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Filter</button>
      </form>

      <NoticeTable rows={list.rows} role={admin.role} returnTo={returnTo} />

      {list.pages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Page {list.page} of {list.pages} · {list.total} notices</span>
          <div className="flex gap-3">
            {list.page > 1 ? <Link href={qs({ page: String(list.page - 1) })} className="text-brand-700 hover:underline">Previous</Link> : null}
            {list.page < list.pages ? <Link href={qs({ page: String(list.page + 1) })} className="text-brand-700 hover:underline">Next</Link> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
