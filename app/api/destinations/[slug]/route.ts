import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const destination = getDestinationBySlug(params.slug);
  if (!destination) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 });
  }
  return NextResponse.json(destination);
}
