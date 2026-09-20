import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";

interface TripPayload {
  destinationSlug: string;
  title: string;
  days: number;
  travellers: number;
  budget: number;
  travelStyle: "budget" | "comfort" | "luxury";
  interests: string[];
}

export async function POST(request: NextRequest) {
  let payload: Partial<TripPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.destinationSlug || !payload.title || !payload.days) {
    return NextResponse.json({ error: "destinationSlug, title and days are required" }, { status: 400 });
  }
  if (!getDestinationBySlug(payload.destinationSlug)) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  // Saved trips require a signed-in user (see lib/auth) — not wired to a
  // session store in this demo build. Validate and report the storage
  // state honestly instead of pretending to save it.
  return NextResponse.json(
    {
      accepted: true,
      persisted: false,
      message: process.env.DATABASE_URL
        ? "Attach an authenticated user id before enabling writes."
        : "Configure DATABASE_URL and sign-in to save trips — see README.md."
    },
    { status: 202 }
  );
}
