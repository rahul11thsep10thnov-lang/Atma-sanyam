import { NextRequest, NextResponse } from "next/server";
import { destinationSummaries } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const state = searchParams.get("state");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  let results = destinationSummaries;
  if (tag) results = results.filter((d) => d.tags.includes(tag));
  if (state) results = results.filter((d) => d.stateSlug === state);
  if (limit) results = results.slice(0, limit);

  return NextResponse.json({ count: results.length, results });
}
