import { NextRequest, NextResponse } from "next/server";
import { getDestinationBySlug } from "@/lib/data/destinations";
import { getWeatherProvider } from "@/lib/providers/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destinationSlug = searchParams.get("destination");

  if (!destinationSlug) {
    return NextResponse.json({ error: "destination query param is required" }, { status: 400 });
  }
  const destination = getDestinationBySlug(destinationSlug);
  if (!destination) {
    return NextResponse.json({ error: "Unknown destination" }, { status: 404 });
  }

  const provider = getWeatherProvider();
  const weather = await provider.getWeather({
    lat: destination.latitude,
    lng: destination.longitude,
    locationName: destination.name
  });

  return NextResponse.json(weather);
}
