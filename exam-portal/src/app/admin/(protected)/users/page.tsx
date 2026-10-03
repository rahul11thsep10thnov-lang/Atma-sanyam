import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { maskMobile } from "@/lib/phone";

export const metadata: Metadata = { title: "Users" };
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Registered readers with the profile they gave at sign-up. Full mobile
 * numbers are visible to SUPER_ADMIN only. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; member?: string; page?: string }> }) {
  const admin = await requireAdmin(["SUPER_ADMIN", "EDITOR"]);
  const sp = await searchParams;
  const q = sp.q?.trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const where = {
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q.replace(/\D/g, "") || q } }, { qualification: { contains: q, mode: "insensitive" as const } }, { examsAimed: { has: q } }] } : {}),
    ...(sp.member === "1" ? { membershipUntil: { gt: now } } : sp.member === "0" ? { OR: [{ membershipUntil: null }, { membershipUntil: { lte: now } }] } : {}),
  };
  const [users, total, members, profiles] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }),
    prisma.user.count({ where }),
    prisma.user.count({ where: { membershipUntil: { gt: now } } }),
    prisma.user.count({ where: { profileCompletedAt: { not: null } } }),
  ]);
  const showFull = admin.role === "SUPER_ADMIN";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-600">{total} shown · {members} active members · {profiles} completed profiles</p>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">Search<input name="q" defaultValue={q ?? ""} placeholder="name, mobile, qualification, exam" className="mt-1 block w-72 rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="text-xs text-slate-600">Membership<select name="member" defaultValue={sp.member ?? ""} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">All</option><option value="1">Members</option><option value="0">Not members</option></select></label>
        <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">Filter</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Age</th><th className="px-3 py-2">Qualification</th><th className="px-3 py-2">Exams aimed</th><th className="px-3 py-2">Membership</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Last login</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 font-medium text-slate-900"><Link href={`/admin/users/${u.id}`} className="hover:underline">{u.fullName ?? <span className="text-slate-400">profile not filled</span>}</Link></td>
                <td className="px-3 py-2 font-mono text-xs">{showFull ? u.mobile : maskMobile(u.mobile)}</td>
                <td className="px-3 py-2">{u.age ?? "—"}</td>
                <td className="px-3 py-2">{u.qualification ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{u.examsAimed.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs">{u.membershipUntil && u.membershipUntil > now ? <span className="text-emerald-700">till {u.membershipUntil.toLocaleDateString("en-IN")}</span> : <span className="text-slate-400">none</span>}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmt(u.createdAt)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{fmt(u.lastLoginAt)}</td>
              </tr>
            ))}
            {users.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No users yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {total > page * 50 ? <Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(sp.member ? { member: sp.member } : {}), page: String(page + 1) })}`} className="text-sm text-brand-700 hover:underline">Next page →</Link> : null}
    </div>
  );
}
