import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { syncFelicitationStatuses } from "@/lib/felicitation/service";
import { decryptField } from "@/lib/security/crypto";
import { maskMobile } from "@/lib/phone";
import { FelicitationBadge } from "@/components/admin/FelicitationBadge";
import { approveAction, rejectAction, pauseAction, resumeAction, extendAction, orderAction, editAction, deleteAction } from "../actions";

export const metadata: Metadata = { title: "Felicitation entry" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "—");
const input = "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm";

export default async function EntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const admin = await requireAdmin(["SUPER_ADMIN", "EDITOR", "REVIEWER"]);
  const { id } = await params;
  const sp = await searchParams;
  await syncFelicitationStatuses();
  const e = await prisma.felicitationEntry.findUnique({ where: { id }, include: { payments: { orderBy: { createdAt: "desc" } }, actions: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!e) notFound();
  const superAdmin = admin.role === "SUPER_ADMIN";
  const canManage = superAdmin || admin.role === "EDITOR";
  let identity = e.identityPurgedAt ? "purged (retention period over)" : e.identityLast4Enc ? "stored (encrypted)" : "—";
  if (superAdmin && e.identityLast4Enc) {
    try {
      identity = `XXXX XXXX ${decryptField(e.identityLast4Enc)} (consent ${fmt(e.identityConsentAt)})`;
    } catch {
      identity = "could not decrypt (key changed?)";
    }
  }
  const here = `/admin/felicitation/${id}`;
  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/felicitation" className="text-xs text-slate-500 hover:underline">← Felicitation Board</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{e.candidateName}</h1>
        <FelicitationBadge status={e.status} />
        <span className="font-mono text-xs text-slate-500">{e.refCode} · {e.id}</span>
      </div>
      {sp.done ? <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Entry {sp.done}.</p> : null}
      {sp.error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.error}</p> : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <dt className="text-slate-500">Exam</dt><dd>{e.examName}</dd>
          <dt className="text-slate-500">Locality</dt><dd>{e.locality}</dd>
          <dt className="text-slate-500">City / State</dt><dd>{e.city}, {e.state}</dd>
          <dt className="text-slate-500">Mobile</dt><dd className="font-mono">{superAdmin ? e.mobile : maskMobile(e.mobile)}</dd>
          <dt className="text-slate-500">Aadhaar</dt><dd>{identity}</dd>
          <dt className="text-slate-500">Submitted</dt><dd>{fmt(e.createdAt)}</dd>
          <dt className="text-slate-500">Payment</dt><dd>{e.paymentStatus ?? "—"}</dd>
          <dt className="text-slate-500">Approved</dt><dd>{fmt(e.approvedAt)}</dd>
          <dt className="text-slate-500">Start</dt><dd>{fmt(e.startAt)}</dd>
          <dt className="text-slate-500">Expiry</dt><dd>{fmt(e.expiresAt)}</dd>
          <dt className="text-slate-500">Display order</dt><dd>{e.displayOrder}</dd>
          {e.rejectedReason ? <><dt className="text-slate-500">Reject reason</dt><dd>{e.rejectedReason}</dd></> : null}
        </dl>
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">Actions</h2>
          {e.status === "PAID_PENDING_APPROVAL" ? (
            <form action={approveAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} />
              <label className="text-xs text-slate-600">Start (optional, IST)<input type="datetime-local" name="startAt" className={input} /></label>
              <button className="rounded-md bg-emerald-700 px-3 py-2 text-white">Approve</button>
            </form>
          ) : null}
          {["PAID_PENDING_APPROVAL", "APPROVED", "SCHEDULED", "BROADCASTING", "PAUSED"].includes(e.status) ? (
            <form action={rejectAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><label className="text-xs text-slate-600">Reason<input name="reason" className={input} /></label><button className="rounded-md border border-red-300 px-3 py-2 text-red-700">Reject</button></form>
          ) : null}
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              {["APPROVED", "SCHEDULED", "BROADCASTING"].includes(e.status) ? <form action={pauseAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md border border-purple-300 px-3 py-2 text-purple-700">Pause</button></form> : null}
              {e.status === "PAUSED" ? <form action={resumeAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><button className="rounded-md border border-purple-300 px-3 py-2 text-purple-700">Resume</button></form> : null}
              {e.approvedAt && e.status !== "REJECTED" ? <form action={extendAction} className="flex items-center gap-1"><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><input name="hours" type="number" defaultValue={24} min={1} max={720} className="w-16 rounded border border-slate-300 px-1 py-1.5" aria-label="Hours" /><button className="rounded-md border border-slate-300 px-3 py-2">Extend (hours)</button></form> : null}
              <form action={orderAction} className="flex items-center gap-1"><input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} /><input name="displayOrder" type="number" defaultValue={e.displayOrder} className="w-16 rounded border border-slate-300 px-1 py-1.5" aria-label="Display order" /><button className="rounded-md border border-slate-300 px-3 py-2">Set order</button></form>
            </div>
          ) : null}
          {superAdmin ? <form action={deleteAction}><input type="hidden" name="id" value={id} /><button className="rounded-md border border-red-300 px-3 py-2 text-xs text-red-700">Delete permanently</button></form> : null}
        </div>
      </section>

      {canManage ? (
        <form action={editAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="returnTo" value={here} />
          <label className="text-xs text-slate-600">Name<input name="candidateName" defaultValue={e.candidateName} className={input} /></label>
          <label className="text-xs text-slate-600">Exam<input name="examName" defaultValue={e.examName} className={input} /></label>
          <label className="text-xs text-slate-600">Locality<input name="locality" defaultValue={e.locality} className={input} /></label>
          <label className="text-xs text-slate-600">City<input name="city" defaultValue={e.city} className={input} /></label>
          <label className="text-xs text-slate-600">State<input name="state" defaultValue={e.state} className={input} /></label>
          <div className="sm:col-span-5"><button className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white">Save changes</button></div>
        </form>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">Payments</h2>
        {e.payments.length ? <table className="w-full text-xs"><thead className="text-left text-slate-500"><tr><th>Created</th><th>Order</th><th>Payment</th><th>Amount</th><th>Status</th><th>Paid at</th></tr></thead><tbody>{e.payments.map((p) => <tr key={p.id} className="border-t border-slate-100"><td>{fmt(p.createdAt)}</td><td className="font-mono">{p.orderId}</td><td className="font-mono">{p.paymentId ?? "—"}</td><td>₹{p.amountPaise / 100} {p.currency}</td><td>{p.status}{p.failureReason ? ` (${p.failureReason})` : ""}</td><td>{fmt(p.paidAt)}</td></tr>)}</tbody></table> : <p className="text-slate-500">None.</p>}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h2 className="mb-2 font-semibold">History</h2>
        <ul className="space-y-1 text-xs">{e.actions.map((a) => <li key={a.id}>{fmt(a.createdAt)} · <b>{a.action}</b> by {a.actor}{a.fromStatus || a.toStatus ? ` · ${a.fromStatus ?? "—"} → ${a.toStatus ?? "—"}` : ""}{a.note ? ` · ${a.note}` : ""}</li>)}</ul>
      </section>
    </div>
  );
}
