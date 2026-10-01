import { getPublishedJobBySlug } from "@/lib/services/jobs";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/jobs/[slug] — public job detail, including related jobs/exam. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublishedJobBySlug(slug);
  if (data) await recordView("Job", data.job.id, `/api/jobs/${slug}`);
  return detailResponse(data);
}
