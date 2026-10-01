import { getPublishedAnswerKeyBySlug } from "@/lib/services/answerKeys";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/answer-keys/[slug] — public answer key detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedAnswerKeyBySlug(slug);
  if (data) await recordView("AnswerKey", data.answerKey.id, `/api/answer-keys/${slug}`);
  return detailResponse(data);
}
