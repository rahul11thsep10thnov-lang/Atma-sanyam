import { getPublishedScholarshipBySlug } from "@/lib/services/scholarships";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/scholarships/[slug] — public scholarship detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const scholarship = await getPublishedScholarshipBySlug(slug);
  if (scholarship) await recordView("Scholarship", scholarship.id, `/api/scholarships/${slug}`);
  return detailResponse(scholarship);
}
