import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: { template: `%s — ${SITE_NAME} Admin`, default: `${SITE_NAME} Admin` },
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
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <AdminSidebar role={admin.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <span className="min-w-0 break-all text-sm text-slate-500">
            Signed in as <strong className="text-slate-900">{admin.email}</strong>{" "}
            · {admin.role}
          </span>
          <LogoutButton />
        </header>
        <main className="min-w-0 flex-1 overflow-x-auto px-3 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
