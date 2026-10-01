import { NextResponse } from "next/server";
import { getLatestArticles } from "@/lib/services/home";

/**
 * GET /api/articles — public articles, newest first. Not yet paginated
 * — mirrors the public `/articles` page, which also just takes the
 * latest 50 (Section 10: a dedicated paginated query is a one-line
 * follow-up if volume ever calls for it).
 */
export async function GET() {
  const articles = await getLatestArticles(50);
  return NextResponse.json({ data: articles });
}
