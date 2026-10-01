import { getPublishedResultBySlug } from "@/lib/services/results";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/results/[slug] — public result detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedResultBySlug(slug);
  if (data) await recordView("Result", data.result.id, `/api/results/${slug}`);
  return detailResponse(data);
}
