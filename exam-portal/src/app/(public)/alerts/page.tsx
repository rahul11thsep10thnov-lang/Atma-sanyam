import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AlertSubscribeForm } from "@/components/AlertSubscribeForm";
import { resolveLang } from "@/lib/i18n/lang";

export const metadata: Metadata = {
  title: "Job alerts by e-mail",
  description: "Get every official recruitment update — new notifications, last-date extensions, admit cards, answer keys and results — by e-mail, filtered by category, organization, state or keyword.",
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: l } = await searchParams;
  const lang = await resolveLang(l);
  const [categories, organizations, states] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.organization.findMany({ where: { recruitments: { some: { status: "PUBLISHED" } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.state.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: lang === "hi" ? "अलर्ट" : "Alerts" }]} />
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{lang === "hi" ? "ई-मेल पर सरकारी नौकरी अलर्ट" : "Government job alerts by e-mail"}</h1>
        <p className="mt-1 text-sm text-slate-600">{lang === "hi" ? "नई भर्तियाँ, अंतिम तिथि विस्तार, एडमिट कार्ड, उत्तर कुंजी और परिणाम — आधिकारिक सूचना प्रकाशित होते ही।" : "New recruitments, last-date extensions, admit cards, answer keys and results — as soon as the official notice is published and reviewed."}</p>
      </div>
      <AlertSubscribeForm scope={{ label: lang === "hi" ? "सभी सरकारी भर्तियों" : "all government recruitments" }} lang={lang} options={{ categories, organizations, states }} />
    </main>
  );
}
