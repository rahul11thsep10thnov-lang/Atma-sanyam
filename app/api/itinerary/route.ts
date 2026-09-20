import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { generateItinerary, type ItineraryRequest } from "@/lib/itinerary/generate";

export async function POST(request: NextRequest) {
  let body: Partial<ItineraryRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { destinationSlug, days, travellers, budget, travelStyle, interests } = body;

  if (!destinationSlug || typeof destinationSlug !== "string") {
    return NextResponse.json({ error: "destinationSlug is required" }, { status: 400 });
  }
  const destination = getDestinationBySlug(destinationSlug);
  if (!destination) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  const safeDays = Math.min(Math.max(Number(days) || 1, 1), 14);
  const safeTravellers = Math.min(Math.max(Number(travellers) || 1, 1), 20);
  const safeBudget = Math.max(Number(budget) || 0, 0);
  const safeStyle = (["budget", "comfort", "luxury"] as const).includes(travelStyle as any)
    ? (travelStyle as "budget" | "comfort" | "luxury")
    : "comfort";
  const safeInterests = Array.isArray(interests) ? interests : [];

  const result = generateItinerary(destination, {
    destinationSlug,
    days: safeDays,
    travellers: safeTravellers,
    budget: safeBudget,
    travelStyle: safeStyle,
    interests: safeInterests
  });

  return NextResponse.json(result);
}
