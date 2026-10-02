import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { alertStats } from "@/lib/alerts/subscriptions";
import { isEmailConfigured } from "@/lib/alerts/email";
import { retryFailedAlertsAction } from "./actions";

export const metadata: Metadata = { title: "Alerts" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function AlertsAdminPage({ searchParams }: { searchParams: Promise<{ retried?: string; sent?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const [stats, subs, deliveries] = await Promise.all([
    alertStats(),
    prisma.alertSubscription.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { recruitment: { select: { title: true } }, organization: { select: { name: true } }, category: { select: { name: true } }, state: { select: { name: true } }, _count: { select: { deliveries: true } } } }),
    prisma.alertDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { subscription: { select: { email: true } }, recruitmentNotice: { select: { id: true, title: true } } } }),
  ]);
  const configured = isEmailConfigured();
  const canOperate = admin.role === "SUPER_ADMIN" || admin.role === "EDITOR";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Alerts</h1>
          <p className="mt-1 text-sm text-slate-600">Reader subscriptions and what was sent. E-mail provider: {configured ? <span className="text-emerald-700">configured</span> : <span className="text-red-600">not configured — set <code className="font-mono">RESEND_API_KEY</code> and <code className="font-mono">ALERTS_FROM_EMAIL</code></span>}.</p>
        </div>
        {canOperate && configured ? <form action={retryFailedAlertsAction}><button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Retry failed deliveries</button></form> : null}
      </div>
      {sp.retried ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Retried {sp.retried}, sent {sp.sent}.</p> : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[{ l: "Active subscribers", v: stats.active }, { l: "Awaiting confirmation", v: stats.pending }, { l: "Alerts sent", v: stats.sent }, { l: "Failed deliveries", v: stats.failed }].map((c) => (
          <div key={c.l} className="rounded-lg border border-slate-200 bg-white p-4"><dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{c.l}</dt><dd className="mt-1 text-2xl font-semibold text-slate-900">{c.v}</dd></div>
        ))}
      </div>
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <h2 className="px-4 py-3 text-sm font-semibold text-slate-800">Latest subscriptions</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"><tr><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Types</th><th className="px-3 py-2">Min priority</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Sent</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">{s.email} <span className="text-xs text-slate-400">{s.locale}</span></td>
                <td className="px-3 py-2 text-xs text-slate-600">{[s.recruitment?.title && `recruitment: ${s.recruitment.title}`, s.organization?.name && `org: ${s.organization.name}`, s.category?.name && `category: ${s.category.name}`, s.state?.name && `state: ${s.state.name}`, s.keyword && `keyword: ${s.keyword}`].filter(Boolean).join(" · ") || "everything"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{s.noticeTypes.length ? s.noticeTypes.join(", ") : "all"}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{s.minPriority}</td>
                <td className="px-3 py-2 text-xs">{!s.active ? <span className="text-slate-500">unsubscribed</span> : s.verifiedAt ? <span className="text-emerald-700">active</span> : <span className="text-amber-700">unconfirmed</span>}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmt(s.createdAt)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{s._count.deliveries}</td>
              </tr>
            ))}
            {subs.length === 0 ? <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No subscriptions yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <h2 className="px-4 py-3 text-sm font-semibold text-slate-800">Latest deliveries</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Notice</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Error</th></tr></thead>
          <tbody>
            {deliveries.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-500">{fmt(d.createdAt)}</td>
                <td className="px-3 py-2 text-slate-800">{d.subscription.email}</td>
                <td className="px-3 py-2 text-xs">{d.recruitmentNotice ? <Link href={`/admin/automation/inbox/${d.recruitmentNotice.id}`} className="text-brand-700 hover:underline">{d.recruitmentNotice.title}</Link> : "—"}</td>
                <td className="px-3 py-2 text-xs"><span className={d.status === "SENT" ? "text-emerald-700" : d.status === "FAILED" ? "text-red-600" : "text-slate-500"}>{d.status}</span></td>
                <td className="max-w-md px-3 py-2 text-xs text-slate-500"><span className="line-clamp-2" title={d.error ?? ""}>{d.error ?? ""}</span></td>
              </tr>
            ))}
            {deliveries.length === 0 ? <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Nothing sent yet.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
