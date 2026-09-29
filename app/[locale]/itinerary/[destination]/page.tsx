import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { destinationBySlug } from "@/lib/master/repo";

// Dynamic so the redirect is a real HTTP 307 with a Location header (crawlers and non-JS clients follow it).
export const dynamic = "force-dynamic";

/** /itinerary/varanasi → the destination's recommended-length itinerary. */
export default function ItineraryIndex({ params }: { params: { locale: string; destination: string } }) {
  if (!isLocale(params.locale)) notFound();
  const dest = destinationBySlug(params.destination);
  if (!dest) notFound();
  const n = dest.recommended_days;
  redirect(`/${params.locale}/itinerary/${dest.slug}/${n}-${n === 1 ? "day" : "days"}`);
}
