import { getPublishedArticleBySlug } from "@/lib/services/articles";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/articles/[slug] — public article detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (article) await recordView("Article", article.id, `/api/articles/${slug}`);
  return detailResponse(article);
}
