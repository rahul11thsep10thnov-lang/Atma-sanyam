import type { Metadata } from "next";
import { getLatestArticles } from "@/lib/services/home";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Articles",
  description: "Educational and exam-related articles.",
};

export default async function ArticlesIndexPage() {
  // Reuses the homepage's query (Section 14 pagination is a light lift
  // here since Articles don't yet need more than a first page in
  // practice) — a dedicated paginated query is a one-line follow-up if
  // volume ever calls for it.
  const articles = await getLatestArticles(50);

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-8 sm:px-8 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Articles" }]} />
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Articles</h1>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      ) : (
        <EmptyState message="No articles published yet." />
      )}
    </main>
  );
}
