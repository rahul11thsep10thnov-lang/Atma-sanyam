import { listPublishedScholarships } from "@/lib/services/scholarships";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/scholarships?page=N — public, paginated, published scholarships only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { items, total, pageSize } = await listPublishedScholarships(page);
  return paginatedResponse(items, total, pageSize, page);
}
