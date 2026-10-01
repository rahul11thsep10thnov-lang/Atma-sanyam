import { listPublishedAnswerKeys } from "@/lib/services/answerKeys";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

/** GET /api/answer-keys?page=N — public, paginated, published answer keys only. */
export async function GET(request: Request) {
  const page = parsePage(new URL(request.url).searchParams);
  const { answerKeys, total, pageSize } = await listPublishedAnswerKeys(page);
  return paginatedResponse(answerKeys, total, pageSize, page);
}
