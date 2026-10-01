import { listPublishedAdmitCards } from "@/lib/services/admitCards";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/admit-cards?page=N — public, paginated, published admit cards only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { admitCards, total, pageSize } = await listPublishedAdmitCards(page);
  return paginatedResponse(admitCards, total, pageSize, page);
}
