import type { Metadata } from "next";
import { listPublishedAdmitCards } from "@/lib/services/admitCards";
import { AdmitCard } from "@/components/cards/AdmitCard";
import { EmptyState } from "@/components/EmptyState";
import { Pagination } from "@/components/Pagination";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Latest Admit Cards — Exam Portal",
  description: "Download links and instructions for the latest government exam admit cards.",
};

export default async function AdmitCardsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { admitCards, total, pageSize } = await listPublishedAdmitCards(page);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admit Cards" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
        Latest Admit Cards
      </h1>

      {admitCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {admitCards.map((admitCard) => (
            <AdmitCard key={admitCard.slug} admitCard={admitCard} />
          ))}
        </div>
      ) : (
        <EmptyState message="No admit cards published yet." />
      )}

      <Pagination page={page} pageSize={pageSize} total={total} basePath="/admit-card" />
    </main>
  );
}
