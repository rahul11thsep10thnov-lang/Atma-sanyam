import { NextRequest, NextResponse } from "next/server";
import { destinations } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");
  const category = searchParams.get("category");

  let restaurants = destinations.flatMap((d) =>
    d.restaurants.map((r) => ({ ...r, destinationSlug: d.slug, destinationName: d.name }))
  );

  if (destinationSlug) restaurants = restaurants.filter((r) => r.destinationSlug === destinationSlug);
  if (category) restaurants = restaurants.filter((r) => r.categories.includes(category as any));

  return NextResponse.json({ count: restaurants.length, results: restaurants });
}
