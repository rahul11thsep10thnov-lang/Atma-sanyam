import { AdminNav, type AdminNavGroup } from "@/components/admin/AdminNav";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { adminAccess } from "@/lib/auth/admin";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;
  const base = `/${locale}/admin`;

  if ((await adminAccess()) === "denied") {
    return (
      <div className="container-page py-16">
        <h1 className="font-display text-2xl font-bold text-charcoal">Admin access required</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-light">
          Sign in with an account listed in <code className="rounded bg-forest-100 px-1">ADMIN_EMAILS</code>. In production the admin area is closed to everyone else.
        </p>
      </div>
    );
  }

  const groups: AdminNavGroup[] = [
    {
      heading: "Content (CMS)",
      links: [
        { href: `${base}/cms`, label: "Content dashboard" },
        { href: `${base}/cms/review`, label: "Review next destination →", emphasis: true },
        { href: `${base}/cms/destinations`, label: "Destinations" },
        { href: `${base}/cms/import`, label: "Import PDF" },
        { href: `${base}/cms/master-import`, label: "Master database import" },
        { href: `${base}/cms/pipeline`, label: "Pipeline" },
        { href: `${base}/cms/providers`, label: "Image Providers" },
        { href: `${base}/cms/settings`, label: "Settings" }
      ]
    },
    {
      heading: "Master database",
      links: [
        { href: base, label: "Dashboard" },
        { href: `${base}/onboard`, label: "+ Add destination" },
        ...ADMIN_SECTIONS.map((s) => ({ href: `${base}/${s.slug}`, label: s.title })),
        { href: `${base}/reviews`, label: "Reviews" },
        { href: `${base}/users`, label: "Users" }
      ]
    }
  ];
  return (
    <div className="min-h-[70vh] bg-forest-50/40">
      <div className="container-page grid gap-4 py-4 sm:py-6 lg:grid-cols-[240px_1fr] lg:gap-6 lg:py-8">
        <AdminNav groups={groups} title="budgettourism Admin" />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
