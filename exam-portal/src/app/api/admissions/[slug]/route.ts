import { getPublishedAdmissionBySlug } from "@/lib/services/admissions";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/admissions/[slug] — public admission detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admission = await getPublishedAdmissionBySlug(slug);
  if (admission) await recordView("Admission", admission.id, `/api/admissions/${slug}`);
  return detailResponse(admission);
}
