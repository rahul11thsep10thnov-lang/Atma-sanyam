import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedArticleBySlug } from "@/lib/services/articles";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDate } from "@/lib/format";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return {};
  return {
    title: `${article.title} — Exam Portal`,
    description: article.description || undefined,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: article.coverImageUrl ? { images: [article.coverImageUrl] } : undefined,
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n{2,}/).filter(Boolean);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Articles", href: "/articles" },
          { label: article.title },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{article.title}</h1>
        {article.publishedAt ? (
          <p className="text-sm text-slate-500">{formatDate(article.publishedAt)}</p>
        ) : null}
      </div>

      {article.coverImageUrl ? (
        // Admin-pasted external URL from any host — next/image would need
        // every possible remote host allow-listed up front, not worth it here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt=""
          className="w-full rounded-lg border border-slate-200 object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-700">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}
