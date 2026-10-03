import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { maskMobile } from "@/lib/phone";

export const metadata: Metadata = { title: "User" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: "desc" }, take: 20 }, felicitations: { select: { id: true, refCode: true, status: true, examName: true } } } });
  if (!u) notFound();
  const rows: Array<[string, string]> = [
    ["Full name", u.fullName ?? "—"],
    ["Mobile", admin.role === "SUPER_ADMIN" ? u.mobile : maskMobile(u.mobile)],
    ["Age", u.age?.toString() ?? "—"],
    ["Qualification", u.qualification ?? "—"],
    ["Exams aimed", u.examsAimed.join(", ") || "—"],
    ["Mobile verified", fmt(u.mobileVerifiedAt)],
    ["Profile completed", fmt(u.profileCompletedAt)],
    ["Membership until", fmt(u.membershipUntil)],
    ["SMS alerts", u.smsAlerts ? "on" : "off"],
    ["Joined", fmt(u.createdAt)],
    ["Last login", fmt(u.lastLoginAt)],
  ];
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/users" className="text-xs text-slate-500 hover:underline">← Users</Link>
      <h1 className="text-xl font-semibold">{u.fullName ?? "User"}</h1>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-40 shrink-0 text-slate-500">{k}</dt><dd className="text-slate-900">{v}</dd></div>)}
      </dl>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Payments</h2>
        {u.payments.length ? <ul className="space-y-1">{u.payments.map((p) => <li key={p.id}>{fmt(p.createdAt)} · {p.purpose} · ₹{p.amountPaise / 100} · <b>{p.status}</b> · <span className="font-mono text-xs">{p.orderId}</span></li>)}</ul> : <p className="text-slate-500">None.</p>}
      </section>
      {u.felicitations.length ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">Felicitation entries</h2>
          <ul>{u.felicitations.map((f) => <li key={f.id}><Link href={`/admin/felicitation/${f.id}`} className="text-brand-700 hover:underline">{f.refCode}</Link> · {f.examName} · {f.status}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
