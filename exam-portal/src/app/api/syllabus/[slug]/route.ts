import { getPublishedSyllabusBySlug } from "@/lib/services/syllabi";
import { detailResponse } from "@/lib/api/respond";
import { recordView } from "@/lib/analytics/track";

/** GET /api/syllabus/[slug] — public syllabus detail. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const syllabus = await getPublishedSyllabusBySlug(slug);
  if (syllabus) await recordView("Syllabus", syllabus.id, `/api/syllabus/${slug}`);
  return detailResponse(syllabus);
}
