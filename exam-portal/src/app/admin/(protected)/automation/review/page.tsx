import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listNotices } from "@/lib/pipeline/review";
import { NoticeTable } from "../inbox/NoticeTable";

export const metadata: Metadata = { title: "Review queue" };

/** Notices between 80% and 95% confidence, or with validation issues, or
 * that created a new organization — the ones a human must look at. */
export default async function ReviewQueuePage({ searchParams }: { searchParams: Promise<{ page?: string; done?: string; error?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const list = await listNotices({ status: "NEEDS_REVIEW", page, pageSize: 50 });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Review queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          {list.total} notice{list.total === 1 ? "" : "s"} the confidence engine would not approve on its own. Open one to see every extracted field with its source line, fix it, then approve.
        </p>
      </div>
      {sp.done ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Notice {sp.done}.</p> : null}
      {sp.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{sp.error}</p> : null}
      <NoticeTable rows={list.rows} role={admin.role} returnTo="/admin/automation/review" />
      {list.pages > 1 ? (
        <div className="flex gap-3 text-sm">
          {list.page > 1 ? <Link href={`/admin/automation/review?page=${list.page - 1}`} className="text-brand-700 hover:underline">Previous</Link> : null}
          {list.page < list.pages ? <Link href={`/admin/automation/review?page=${list.page + 1}`} className="text-brand-700 hover:underline">Next</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
