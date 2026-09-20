import { NextRequest, NextResponse } from "next/server";
import { destinations } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");

  let markets = destinations.flatMap((d) => d.markets.map((m) => ({ ...m, destinationSlug: d.slug, destinationName: d.name })));

  if (destinationSlug) markets = markets.filter((m) => m.destinationSlug === destinationSlug);

  return NextResponse.json({ count: markets.length, results: markets });
}
