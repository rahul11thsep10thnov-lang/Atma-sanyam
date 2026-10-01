import { listPublishedSyllabi } from "@/lib/services/syllabi";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/syllabus?page=N — public, paginated, published syllabi only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { syllabi, total, pageSize } = await listPublishedSyllabi(page);
  return paginatedResponse(syllabi, total, pageSize, page);
}
