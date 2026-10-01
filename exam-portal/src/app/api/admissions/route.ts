import { listPublishedAdmissions } from "@/lib/services/admissions";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/admissions?page=N — public, paginated, published admissions only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { items, total, pageSize } = await listPublishedAdmissions(page);
  return paginatedResponse(items, total, pageSize, page);
}
