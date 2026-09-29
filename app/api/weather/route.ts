import { NextRequest } from "next/server";
import { destinationBySlug, getDb } from "@/lib/master/repo";
import { getWeatherProvider } from "@/lib/providers/weather";
import { badRequest, json, notFound, rateLimit } from "@/lib/api/http";

/** GET /api/weather?destination=varanasi — live forecast, plus stored monthly climatology where collected. */
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "weather", 60);
  if (limited) return limited;
  const slug = new URL(request.url).searchParams.get("destination");
  if (!slug) return badRequest("destination query param is required");
  const dest = destinationBySlug(slug);
  if (!dest) return notFound("Unknown destination");
  const live = await getWeatherProvider().getWeather({ lat: dest.latitude, lng: dest.longitude, locationName: dest.name });
  return json({ ...live, climatology: getDb().destination_weather.filter((w) => w.destination_id === dest.id) });
}
