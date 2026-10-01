import { listPublishedJobs } from "@/lib/services/jobs";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/jobs?page=N — public, paginated, published jobs only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { jobs, total, pageSize } = await listPublishedJobs(page);
  return paginatedResponse(jobs, total, pageSize, page);
}
