import { getPublishedExamBySlug } from "@/lib/services/exams";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/**
 * GET /api/exams/[slug] — public exam detail. No list endpoint: the
 * public site has no standalone exam index either (exams are discovered
 * through jobs/results/etc that reference them), so there's nothing to
 * mirror.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exam = await getPublishedExamBySlug(slug);
  if (exam) await recordView("Exam", exam.id, `/api/exams/${slug}`);
  return detailResponse(exam);
}
