import { NextRequest, NextResponse } from "next/server";

interface NewDestinationPayload {
  name: string;
  state: string;
  shortDescription: string;
  bestTimeToVisit: string;
}

/**
 * Admin write endpoint stub. Validates the payload shape and reports the
 * storage state honestly (matches the pattern in /api/reviews, /api/trips,
 * /api/wishlist) rather than pretending to persist without a database.
 * Swap the final block for `prisma.destination.create(...)` once
 * DATABASE_URL is configured and admin auth/role checks are wired up.
 */
export async function POST(request: NextRequest) {
  let payload: Partial<NewDestinationPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.name || !payload.state || !payload.shortDescription) {
    return NextResponse.json({ error: "name, state and shortDescription are required" }, { status: 400 });
  }

  return NextResponse.json(
    {
      accepted: true,
      persisted: false,
      message: process.env.DATABASE_URL
        ? "Admin write endpoints are stubbed — wire up role-gated auth before enabling writes."
        : "Configure DATABASE_URL to persist new destinations — see README.md."
    },
    { status: 202 }
  );
}
