import { NextRequest, NextResponse } from "next/server";
import { destinations } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");

  let foods = destinations.flatMap((d) => d.localFoods.map((f) => ({ ...f, destinationSlug: d.slug, destinationName: d.name })));

  if (destinationSlug) foods = foods.filter((f) => f.destinationSlug === destinationSlug);

  return NextResponse.json({ count: foods.length, results: foods });
}
