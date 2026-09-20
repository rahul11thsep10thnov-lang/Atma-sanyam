import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/search/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 10;

  if (!q.trim()) {
    return NextResponse.json({ query: q, count: 0, results: [] });
  }

  const results = search(q, limit);
  return NextResponse.json({ query: q, count: results.length, results });
}
