import { NextRequest, NextResponse } from "next/server";
import { destinations } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");
  const category = searchParams.get("category");

  let hotels = destinations.flatMap((d) => d.hotels.map((h) => ({ ...h, destinationSlug: d.slug, destinationName: d.name })));

  if (destinationSlug) hotels = hotels.filter((h) => h.destinationSlug === destinationSlug);
  if (category) hotels = hotels.filter((h) => h.category === category);

  return NextResponse.json({ count: hotels.length, results: hotels });
}
