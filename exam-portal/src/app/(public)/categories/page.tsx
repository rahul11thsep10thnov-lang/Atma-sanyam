import type { Metadata } from "next";
import Link from "next/link";
import { listPublicCategories } from "@/lib/services/recruitments";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Job Categories",
  description: "Government recruitments by category: UPSC, SSC, Railway, Banking, Defence, Police, Teaching, State PSC and more.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesIndexPage() {
  const cats = await listPublicCategories();
  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Job Categories</h1>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <li key={c.slug}>
            <Link href={`/category/${c.slug}`} className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand-600">
              <span className="text-sm font-medium text-slate-900">{c.name}</span>
              {c.description ? <span className="text-xs text-slate-500">{c.description}</span> : null}
              <span className="text-xs text-slate-500">{c._count.recruitmentCategories} recruitment{c._count.recruitmentCategories === 1 ? "" : "s"} · {c._count.exams} exam{c._count.exams === 1 ? "" : "s"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
