import type { CmsHotel, CmsRestaurant } from "@/lib/cms/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { assetOf, isPlaceholder } from "@/lib/cms/images";
import { CmsImg } from "./CmsImg";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-forest-200 bg-white/70 p-6 text-sm text-charcoal-light">
      <p>{text}</p>
    </div>
  );
}

function Rating({ rating, count, source, t }: { rating: number | null; count: number | null; source: string | null; t: Dictionary["destination"]["cms"] }) {
  if (rating === null) return <span className="rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] text-charcoal-light">{t.ratingUnavailable}</span>;
  return (
    <span className="text-xs font-semibold text-saffron-700">
      ★ {rating.toFixed(1)}{count !== null && <span className="font-normal text-charcoal-light"> · {t.reviews.replace("{n}", count.toLocaleString("en-IN"))}</span>}
      {source && <span className="block text-[10px] font-normal text-charcoal-light">{source}</span>}
    </span>
  );
}

function Photo({ images, label }: { images: CmsHotel["images"]; label: string }) {
  const img = images.find((i) => i.approval_status === "APPROVED" && !isPlaceholder(i));
  if (!img) return <div className="flex aspect-[4/3] items-center justify-center bg-forest-50 text-[11px] text-charcoal-light">{label}</div>;
  return (
    <div className="relative aspect-[4/3] bg-forest-100">
      <CmsImg image={assetOf(img, img.alt)} className="h-full w-full object-cover" sizes="320px" fill />
    </div>
  );
}

export function HotelList({ hotels, name, dict }: { hotels: CmsHotel[]; name: string; dict: Dictionary }) {
  const t = dict.destination.cms;
  const list = hotels.filter((h) => h.status === "PUBLISHED" && h.name.trim()).sort((a, b) => a.sort_order - b.sort_order);
  if (!list.length) return <Empty text={t.hotelsEmpty.replace("{name}", name)} />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((h) => (
        <li key={h.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <Photo images={h.images} label={t.noImage} />
          <div className="flex flex-1 flex-col p-4 text-sm">
            <h3 className="font-display text-lg font-semibold text-charcoal">{h.name}</h3>
            <Rating rating={h.google_rating} count={h.review_count} source={h.rating_source} t={t} />
            {h.address && <p className="mt-2 text-xs text-charcoal-light">{h.address}</p>}
            <p className="mt-2">
              {h.discounted_fare !== null || h.initial_fare !== null ? (
                <>
                  {h.discounted_fare !== null && h.initial_fare !== null && h.discounted_fare < h.initial_fare && <s className="mr-2 text-charcoal-light">{inr(h.initial_fare)}</s>}
                  <strong className="text-forest-700">{inr(h.discounted_fare ?? h.initial_fare!)}</strong> <span className="text-xs text-charcoal-light">{t.perNight}{h.room_type ? ` · ${h.room_type}` : ""}</span>
                </>
              ) : (
                <span className="text-xs text-charcoal-light">{t.unavailable}</span>
              )}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-charcoal-light">
              {h.check_in_time && <><dt>{t.checkIn}</dt><dd className="text-charcoal">{h.check_in_time}</dd></>}
              {h.check_out_time && <><dt>{t.checkOut}</dt><dd className="text-charcoal">{h.check_out_time}</dd></>}
              {h.distance_from_attraction_km !== null && <><dt>{t.distanceAttraction}</dt><dd className="text-charcoal">{h.distance_from_attraction_km} km</dd></>}
              {h.distance_from_railway_km !== null && <><dt>{t.distanceRailway}</dt><dd className="text-charcoal">{h.distance_from_railway_km} km</dd></>}
              {h.distance_from_airport_km !== null && <><dt>{t.distanceAirport}</dt><dd className="text-charcoal">{h.distance_from_airport_km} km</dd></>}
            </dl>
            {(h.amenities.length > 0 || h.breakfast_included || h.wifi || h.parking || h.air_conditioning || h.family_rooms) && (
              <p className="mt-2 flex flex-wrap gap-1">
                {[...h.amenities, h.breakfast_included ? "Breakfast" : null, h.wifi ? "Wi-Fi" : null, h.parking ? "Parking" : null, h.air_conditioning ? "AC" : null, h.family_rooms ? "Family rooms" : null].filter(Boolean).map((x) => (
                  <span key={x!} className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] text-forest-700">{x}</span>
                ))}
              </p>
            )}
            {h.cancellation_policy && <p className="mt-2 text-[11px] text-charcoal-light">{h.cancellation_policy}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-3 text-xs">
              {h.map_url && <a href={h.map_url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.openInMaps} ↗</a>}
              {h.website && <a href={h.website} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.officialWebsite} ↗</a>}
              {h.phone && <a href={`tel:${h.phone}`} className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{h.phone}</a>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RestaurantList({ restaurants, name, dict }: { restaurants: CmsRestaurant[]; name: string; dict: Dictionary }) {
  const t = dict.destination.cms;
  const list = restaurants.filter((r) => r.status === "PUBLISHED" && r.name.trim()).sort((a, b) => a.sort_order - b.sort_order);
  if (!list.length) return <Empty text={t.restaurantsEmpty.replace("{name}", name)} />;
  const vegLabel = { VEG: t.veg, NON_VEG: t.nonVeg, BOTH: t.both } as const;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((r) => (
        <li key={r.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <Photo images={r.images} label={t.noImage} />
          <div className="flex flex-1 flex-col p-4 text-sm">
            <h3 className="font-display text-lg font-semibold text-charcoal">{r.name}</h3>
            <Rating rating={r.google_rating} count={r.review_count} source={r.rating_source} t={t} />
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-charcoal-light">
              {r.cuisine && <><dt>{t.cuisine}</dt><dd className="text-charcoal">{r.cuisine}</dd></>}
              {r.price_range && <><dt>{t.priceRange}</dt><dd className="text-charcoal">{r.price_range}</dd></>}
              {r.opening_hours && <><dt>{t.openingHours}</dt><dd className="text-charcoal">{r.opening_hours}</dd></>}
              {r.veg_type && <><dt>&nbsp;</dt><dd className="text-charcoal">{vegLabel[r.veg_type]}</dd></>}
            </dl>
            {r.address && <p className="mt-2 text-xs text-charcoal-light">{r.address}</p>}
            {r.popular_dishes.length > 0 && <p className="mt-2 text-xs"><span className="text-charcoal-light">{t.popularDishes}: </span>{r.popular_dishes.join(", ")}</p>}
            {r.specialities.length > 0 && <p className="mt-1 flex flex-wrap gap-1">{r.specialities.map((s) => <span key={s} className="rounded-full bg-saffron-50 px-2 py-0.5 text-[11px] text-saffron-700">{s}</span>)}</p>}
            {r.delivery_available && <p className="mt-1 text-[11px] text-forest-700">{t.delivery}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-3 text-xs">
              {r.map_url && <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.openInMaps} ↗</a>}
              {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{t.officialWebsite} ↗</a>}
              {r.phone && <a href={`tel:${r.phone}`} className="rounded-full border border-forest-200 px-3 py-1 font-medium text-forest-700 hover:bg-forest-50">{r.phone}</a>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
