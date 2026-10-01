import { listPublishedResults } from "@/lib/services/results";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/results?page=N — public, paginated, published results only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { results, total, pageSize } = await listPublishedResults(page);
  return paginatedResponse(results, total, pageSize, page);
}
