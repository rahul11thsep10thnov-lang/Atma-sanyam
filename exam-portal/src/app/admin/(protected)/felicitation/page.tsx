import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { statusCounts, syncFelicitationStatuses } from "@/lib/felicitation/service";
import { getFelicitationSettings } from "@/lib/felicitation/settings";
import { normalizeIndianMobile } from "@/lib/phone";
import { FelicitationBadge } from "@/components/admin/FelicitationBadge";
import { approveAction, rejectAction, pauseAction, resumeAction, extendAction, orderAction, quickPauseAllAction } from "./actions";

export const metadata: Metadata = { title: "Felicitation Board" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—");

const FILTERS: Record<string, Prisma.FelicitationEntryWhereInput> = {
  pending: { status: "PAID_PENDING_APPROVAL" },
  approved: { approvedAt: { not: null } },
  broadcasting: { status: "BROADCASTING" },
  scheduled: { status: "SCHEDULED" },
  paused: { status: "PAUSED" },
  expired: { status: "EXPIRED" },
  rejected: { status: "REJECTED" },
  paid: { paymentStatus: "PAID" },
  failed: { status: "PAYMENT_FAILED" },
};

export default async function FelicitationAdminPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; exam?: string; city?: string; from?: string; to?: string; done?: string; error?: string; page?: string }> }) {
  const admin = await requireAdmin(["SUPER_ADMIN", "EDITOR", "REVIEWER"]);
  const sp = await searchParams;
  await syncFelicitationStatuses();
  const [counts, settings] = await Promise.all([statusCounts(), getFelicitationSettings()]);
  const and: Prisma.FelicitationEntryWhereInput[] = [{ status: { not: "DRAFT" } }];
  if (sp.f && FILTERS[sp.f]) and.push(FILTERS[sp.f]);
  const q = sp.q?.trim();
  if (q) {
    const m = normalizeIndianMobile(q);
    and.push({ OR: [{ candidateName: { contains: q, mode: "insensitive" } }, { refCode: { equals: q.toUpperCase() } }, { id: q }, ...(m ? [{ mobile: m }] : [])] });
  }
  if (sp.exam?.trim()) and.push({ examName: { contains: sp.exam.trim(), mode: "insensitive" } });
  if (sp.city?.trim()) and.push({ city: { contains: sp.city.trim(), mode: "insensitive" } });
  if (sp.from) and.push({ createdAt: { gte: new Date(sp.from + "T00:00:00+05:30") } });
  if (sp.to) and.push({ createdAt: { lte: new Date(sp.to + "T23:59:59+05:30") } });
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { AND: and };
  const [rows, total] = await Promise.all([
    prisma.felicitationEntry.findMany({ where, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * 50, take: 50 }),
    prisma.felicitationEntry.count({ where }),
  ]);
  const canManage = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  const qsObj = Object.fromEntries(Object.entries({ f: sp.f, q: sp.q, exam: sp.exam, city: sp.city, from: sp.from, to: sp.to }).filter(([, v]) => v)) as Record<string, string>;
  const here = `/admin/felicitation?${new URLSearchParams(qsObj)}`;
  const cards: Array<[string, number, string]> = [
    ["Total submissions", counts.total, ""], ["Pending approval", counts.pending, "pending"], ["Approved", counts.approved, "approved"], ["Broadcasting now", counts.broadcasting, "broadcasting"],
    ["Scheduled", counts.scheduled, "scheduled"], ["Paused", counts.paused, "paused"], ["Expired", counts.expired, "expired"], ["Payment successful", counts.paid, "paid"], ["Payment failed", counts.failed, "failed"], ["Rejected", counts.rejected, "rejected"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Felicitation Board</h1>
          <p className="mt-1 text-sm text-slate-600">
            ₹{settings.priceRupees} for {settings.listingHours} h · {settings.broadcastSeconds} s per entry · board {settings.enabled ? "enabled" : <b className="text-red-600">disabled</b>}
            {settings.pausedAll ? <b className="ml-2 text-purple-700">· ALL BROADCASTS PAUSED</b> : null}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <form action={quickPauseAllAction}><input type="hidden" name="pausedAll" value={settings.pausedAll ? "false" : "true"} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">{settings.pausedAll ? "Resume broadcasts" : "Pause all broadcasts"}</button></form>
            <Link href="/admin/felicitation/settings" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Settings</Link>
          </div>
        ) : null}
      </div>
      {sp.done ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Entry {sp.done}.</p> : null}
      {sp.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, n, f]) => (
          <Link key={label} href={f ? `/admin/felicitation?f=${f}` : "/admin/felicitation"} className={`rounded-lg border bg-white p-3 hover:bg-slate-50 ${sp.f === f && f ? "border-slate-900" : "border-slate-200"}`}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
            <div className="text-2xl font-semibold text-slate-900">{n}</div>
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-600">Status<select name="f" defaultValue={sp.f ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">All</option>{Object.keys(FILTERS).map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
        <label className="text-xs text-slate-600">Search<input name="q" defaultValue={sp.q ?? ""} placeholder="name, mobile, FB-ref or id" className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-600">Exam<input name="exam" defaultValue={sp.exam ?? ""} className="mt-1 block w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-600">City<input name="city" defaultValue={sp.city ?? ""} className="mt-1 block w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-600">From<input type="date" name="from" defaultValue={sp.from ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-600">To<input type="date" name="to" defaultValue={sp.to ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white">Apply</button>
        <Link href="/admin/felicitation" className="text-sm text-slate-500 hover:underline">Clear</Link>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr><th className="px-3 py-2">Candidate</th><th className="px-3 py-2">Exam</th><th className="px-3 py-2">City</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Approval</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2"><Link href={`/admin/felicitation/${e.id}`} className="font-medium text-slate-900 hover:underline">{e.candidateName}</Link><div className="font-mono text-[11px] text-slate-400">{e.refCode} · #{e.displayOrder}</div></td>
                <td className="px-3 py-2 text-slate-700">{e.examName}</td>
                <td className="px-3 py-2 text-slate-700">{e.city}<div className="text-[11px] text-slate-400">{e.locality}</div></td>
                <td className="px-3 py-2 text-xs"><span className={e.paymentStatus === "PAID" ? "text-emerald-700" : e.paymentStatus === "FAILED" ? "text-red-600" : "text-slate-500"}>{e.paymentStatus ?? "—"}</span></td>
                <td className="px-3 py-2 text-xs">{e.approvedAt ? <span className="text-emerald-700">approved {fmt(e.approvedAt)}</span> : e.status === "REJECTED" ? <span className="text-red-600">rejected</span> : e.paymentStatus === "PAID" ? <span className="text-amber-700">pending</span> : "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmt(e.startAt)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{fmt(e.expiresAt)}</td>
                <td className="px-3 py-2"><FelicitationBadge status={e.status} /></td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <Link href={`/admin/felicitation/${e.id}`} className="text-brand-700 hover:underline">View / Edit</Link>
                    {e.status === "PAID_PENDING_APPROVAL" ? <form action={approveAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="returnTo" value={here} /><button className="font-semibold text-emerald-700 hover:underline">Approve</button></form> : null}
                    {["PAID_PENDING_APPROVAL", "APPROVED", "SCHEDULED", "BROADCASTING", "PAUSED"].includes(e.status) ? <form action={rejectAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="returnTo" value={here} /><button className="text-red-600 hover:underline">Reject</button></form> : null}
                    {canManage && ["APPROVED", "SCHEDULED", "BROADCASTING"].includes(e.status) ? <form action={pauseAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="returnTo" value={here} /><button className="text-purple-700 hover:underline">Pause</button></form> : null}
                    {canManage && e.status === "PAUSED" ? <form action={resumeAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="returnTo" value={here} /><button className="text-purple-700 hover:underline">Resume</button></form> : null}
                    {canManage && e.approvedAt && e.status !== "REJECTED" ? <form action={extendAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="hours" value="24" /><input type="hidden" name="returnTo" value={here} /><button className="text-slate-700 hover:underline">Extend 24h</button></form> : null}
                    {canManage ? (
                      <form action={orderAction} className="flex items-center gap-1"><input type="hidden" name="id" value={e.id} /><input type="hidden" name="returnTo" value={here} /><input name="displayOrder" type="number" defaultValue={e.displayOrder} className="w-14 rounded border border-slate-300 px-1 py-0.5" aria-label="Display order" /><button className="text-slate-700 hover:underline">Order</button></form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500">No entries match.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {total > page * 50 ? <Link href={`${here}&page=${page + 1}`} className="text-sm text-brand-700 hover:underline">Next page →</Link> : null}
    </div>
  );
}
