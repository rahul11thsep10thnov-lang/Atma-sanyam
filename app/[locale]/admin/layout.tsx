import Link from "next/link";
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

  const link = "rounded-lg px-3 py-1.5 text-sm font-medium text-charcoal hover:bg-forest-50";
  return (
    <div className="min-h-[70vh] bg-forest-50/40">
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="card-surface h-fit p-4">
          <p className="px-2 pb-3 font-display text-lg font-bold text-forest-700">budgettourism Admin</p>
          <nav aria-label="Admin sections" className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal-light">Content (CMS)</p>
            <Link href={`${base}/cms`} className={link}>Content dashboard</Link>
            <Link href={`${base}/cms/review`} className={`${link} font-semibold text-forest-700`}>Review next destination →</Link>
            <Link href={`${base}/cms/destinations`} className={link}>Destinations</Link>
            <Link href={`${base}/cms/import`} className={link}>Import PDF</Link>
            <Link href={`${base}/cms/master-import`} className={link}>Master database import</Link>
            <Link href={`${base}/cms/pipeline`} className={link}>Pipeline</Link>
            <Link href={`${base}/cms/providers`} className={link}>Image Providers</Link>
            <Link href={`${base}/cms/settings`} className={link}>Settings</Link>
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-charcoal-light">Master database</p>
            <Link href={base} className={link}>Dashboard</Link>
            <Link href={`${base}/onboard`} className={link}>+ Add destination</Link>
            {ADMIN_SECTIONS.map((s) => (
              <Link key={s.slug} href={`${base}/${s.slug}`} className={link}>{s.title}</Link>
            ))}
            <Link href={`${base}/reviews`} className={link}>Reviews</Link>
            <Link href={`${base}/users`} className={link}>Users</Link>
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
