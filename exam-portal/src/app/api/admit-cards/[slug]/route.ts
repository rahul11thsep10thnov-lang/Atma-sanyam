import { getPublishedAdmitCardBySlug } from "@/lib/services/admitCards";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/admit-cards/[slug] — public admit card detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedAdmitCardBySlug(slug);
  if (data) await recordView("AdmitCard", data.admitCard.id, `/api/admit-cards/${slug}`);
  return detailResponse(data);
}
