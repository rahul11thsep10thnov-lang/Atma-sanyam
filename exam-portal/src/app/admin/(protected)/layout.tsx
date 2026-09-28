import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = {
  title: { template: "%s — Exam Portal Admin", default: "Exam Portal Admin" },
  robots: { index: false, follow: false },
};

/**
 * Every route under /admin (other than /admin/login) renders inside this
 * layout, and `requireAdmin()` is the server-side authorization check
 * (Section 16) — the middleware redirect is only a UX convenience on top
 * of this, not a substitute for it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar role={admin.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <span className="text-sm text-slate-500">
            Signed in as <strong className="text-slate-900">{admin.email}</strong>{" "}
            · {admin.role}
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
