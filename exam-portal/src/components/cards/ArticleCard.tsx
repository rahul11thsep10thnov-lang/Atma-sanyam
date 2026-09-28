import type { ArticleSummary } from "@/lib/services/home";
import { formatDate } from "@/lib/format";

export function ArticleCard({ article }: { article: ArticleSummary }) {
  const date = formatDate(article.publishedAt);
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">{article.title}</h3>
      {date ? <p className="text-xs text-slate-500">{date}</p> : null}
    </article>
  );
}
