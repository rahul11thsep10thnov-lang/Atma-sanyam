import { NextRequest, NextResponse } from "next/server";
import { destinations } from "@/lib/data/destinations";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");
  const category = searchParams.get("category");

  let attractions = destinations.flatMap((d) =>
    d.attractions.map((a) => ({ ...a, destinationSlug: d.slug, destinationName: d.name }))
  );

  if (destinationSlug) attractions = attractions.filter((a) => a.destinationSlug === destinationSlug);
  if (category) attractions = attractions.filter((a) => a.categories.includes(category as any));

  return NextResponse.json({ count: attractions.length, results: attractions });
}
