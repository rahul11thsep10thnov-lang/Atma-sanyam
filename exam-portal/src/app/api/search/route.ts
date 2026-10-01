import { NextResponse } from "next/server";
import { searchSite, type SearchContentType } from "@/lib/services/search";
import { paginatedResponse, parsePage } from "@/lib/api/respond";

const VALID_TYPES: SearchContentType[] = [
  "exam",
  "job",
  "result",
  "admit-card",
  "answer-key",
  "syllabus",
  "article",
  "organization",
];

/**
 * GET /api/search?q=...&type=...&organizationId=...&categoryId=...&stateId=...&page=N
 * Public, filterable, paginated site search (Section 14/30).
 */
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json(
      { error: "Query parameter 'q' must be at least 2 characters." },
      { status: 400 },
    );
  }

  const typeParam = searchParams.get("type");
  const type = VALID_TYPES.includes(typeParam as SearchContentType)
    ? (typeParam as SearchContentType)
    : undefined;
  const page = parsePage(searchParams);

  const { items, total, pageSize } = await searchSite({
    q,
    type,
    organizationId: searchParams.get("organizationId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    stateId: searchParams.get("stateId") ?? undefined,
    page,
  });

  return paginatedResponse(items, total, pageSize, page);
}
