import type { Metadata } from "next";
import Link from "next/link";
import { listPublishedRecruitments, listPublicCategories } from "@/lib/services/recruitments";
import { RecruitmentCard } from "@/components/cards/RecruitmentCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { resolveLang } from "@/lib/i18n/lang";

export const metadata: Metadata = {
  title: "Government Recruitments — every notice in one place",
  description: "Every government recruitment with its job notification, admit card, answer key, result and corrigenda on one timeline, straight from official sources.",
  alternates: { canonical: "/recruitments", languages: { en: "/recruitments", hi: "/recruitments?lang=hi", "x-default": "/recruitments" } },
  openGraph: { title: "Government Recruitments", description: "Every recruitment with its notification, admit card, answer key and result on one timeline.", url: "/recruitments", type: "website" },
};

export default async function RecruitmentsIndexPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string; window?: string; q?: string; lang?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const window = sp.window === "closed" ? "closed" : sp.window === "all" ? "all" : "open";
  const lang = await resolveLang(sp.lang);
  const [list, categories] = await Promise.all([
    listPublishedRecruitments({ page, categorySlug: sp.category || undefined, window, q: sp.q?.trim() || undefined }),
    listPublicCategories(),
  ]);
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ category: sp.category, window, q: sp.q, lang: sp.lang, ...o })) if (v && !(k === "window" && v === "open") && !(k === "lang" && v === "en")) p.set(k, v);
    const s = p.toString();
    return `/recruitments${s ? `?${s}` : ""}`;
  };
  const t = lang === "hi"
    ? { h1: "सरकारी भर्तियाँ", sub: "हर भर्ती का विज्ञापन, एडमिट कार्ड, उत्तर कुंजी, परिणाम और शुद्धिपत्र — एक ही पृष्ठ पर, आधिकारिक स्रोतों से।", open: "खुली", closed: "बंद", all: "सभी", allCats: "सभी श्रेणियाँ", empty: "अभी कोई भर्ती प्रकाशित नहीं है।", search: "खोजें" }
    : { h1: "Government Recruitments", sub: "Each recruitment with its notification, admit card, answer key, result and corrigenda on one timeline, from official sources.", open: "Open", closed: "Closed", all: "All", allCats: "All categories", empty: "No recruitments published yet.", search: "Search" };

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: lang === "hi" ? "भर्तियाँ" : "Recruitments" }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl" lang={lang}>{t.h1}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600" lang={lang}>{t.sub}</p>
        </div>
        <Link href={qs({ lang: lang === "hi" ? "en" : "hi", page: undefined })} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" lang={lang === "hi" ? "en" : "hi"}>
          {lang === "hi" ? "English" : "हिन्दी"}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["open", "closed", "all"] as const).map((w) => (
          <Link key={w} href={qs({ window: w, page: undefined })} className={`rounded-full px-3 py-1 ${window === w ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{t[w]}</Link>
        ))}
        <span className="mx-2 text-slate-300">|</span>
        <Link href={qs({ category: undefined, page: undefined })} className={`rounded-full px-3 py-1 ${!sp.category ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{t.allCats}</Link>
        {categories.filter((c) => c._count.recruitmentCategories > 0).map((c) => (
          <Link key={c.slug} href={qs({ category: c.slug, page: undefined })} className={`rounded-full px-3 py-1 ${sp.category === c.slug ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{c.name} <span className="opacity-60">{c._count.recruitmentCategories}</span></Link>
        ))}
        <form method="get" className="ml-auto flex items-center gap-2">
          {sp.category ? <input type="hidden" name="category" value={sp.category} /> : null}
          {window !== "open" ? <input type="hidden" name="window" value={window} /> : null}
          {lang === "hi" ? <input type="hidden" name="lang" value="hi" /> : null}
          <input name="q" defaultValue={sp.q ?? ""} placeholder={lang === "hi" ? "भर्ती या संगठन" : "recruitment or organization (e.g. UPPRPB)"} className="w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">{t.search}</button>
        </form>
      </div>

      {list.rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.rows.map((r) => <RecruitmentCard key={r.slug} recruitment={r} lang={lang} />)}
        </div>
      ) : (
        <EmptyState message={t.empty} />
      )}
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} basePath={qs({ page: undefined })} />
    </main>
  );
}
