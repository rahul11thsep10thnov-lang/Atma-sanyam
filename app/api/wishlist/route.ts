import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";

interface WishlistPayload {
  destinationSlug: string;
  targetType: "DESTINATION" | "HOTEL" | "RESTAURANT";
  targetId?: string;
}

export async function POST(request: NextRequest) {
  let payload: Partial<WishlistPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.destinationSlug || !payload.targetType) {
    return NextResponse.json({ error: "destinationSlug and targetType are required" }, { status: 400 });
  }
  if (!getDestinationBySlug(payload.destinationSlug)) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  // Wishlists require a signed-in user (see lib/auth) — not wired to a
  // session store in this demo build.
  return NextResponse.json(
    {
      accepted: true,
      persisted: false,
      message: process.env.DATABASE_URL
        ? "Attach an authenticated user id before enabling writes."
        : "Configure DATABASE_URL and sign-in to save wishlist items — see README.md."
    },
    { status: 202 }
  );
}
