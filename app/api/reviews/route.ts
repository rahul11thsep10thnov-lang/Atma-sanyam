import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";

interface ReviewPayload {
  destinationSlug: string;
  targetType: "HOTEL" | "RESTAURANT" | "ATTRACTION" | "MARKET" | "DESTINATION";
  overallRating: number;
  title?: string;
  body: string;
  verifiedVisit?: boolean;
}

export async function POST(request: NextRequest) {
  let payload: Partial<ReviewPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.destinationSlug || !payload.body || !payload.overallRating) {
    return NextResponse.json(
      { error: "destinationSlug, body and overallRating are required" },
      { status: 400 }
    );
  }
  if (!getDestinationBySlug(payload.destinationSlug)) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }
  if (payload.overallRating < 1 || payload.overallRating > 5) {
    return NextResponse.json({ error: "overallRating must be between 1 and 5" }, { status: 400 });
  }
  if (payload.body.length > 5000) {
    return NextResponse.json({ error: "Review body too long (max 5000 characters)" }, { status: 400 });
  }

  // Sign-in is required to post a review in the full product (see lib/auth).
  // No session store is wired up in this demo build, so we validate the
  // payload shape and report that persistence is not yet connected rather
  // than silently discarding — swap this block for a Prisma `review.create`
  // once NextAuth sessions + DATABASE_URL are configured.
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        accepted: true,
        persisted: false,
        message:
          "Review payload is valid. Configure DATABASE_URL and sign-in to persist reviews — see README.md.",
        status: "PENDING"
      },
      { status: 202 }
    );
  }

  const { prisma } = await import("@/lib/database/prisma");
  const destination = await prisma.destination.findUnique({ where: { slug: payload.destinationSlug } });
  if (!destination) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  return NextResponse.json(
    { accepted: true, persisted: false, message: "Attach an authenticated user id before enabling writes." },
    { status: 202 }
  );
}
