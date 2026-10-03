"use client";

import { useState } from "react";
import { emptyHotel, emptyRestaurant, type CmsHotel, type CmsRestaurant, type CollaborationStatus } from "@/lib/cms/types";
import { ImageList } from "./ImageList";
import { Badge, btnSecondary, field, fromTri, label, num, splitList, tri } from "./ui";

const COLLAB: CollaborationStatus[] = ["NONE", "CONTACTED", "IN_TALKS", "PARTNER", "DECLINED"];

function Tri({ value, onChange, text }: { value: boolean | null; onChange: (v: boolean | null) => void; text: string }) {
  return (
    <label className={label}>{text}
      <select value={tri(value)} onChange={(e) => onChange(fromTri(e.target.value))} className={field}>
        <option value="">Unknown</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    </label>
  );
}

/** Structured hotel forms. Records start empty; nothing here is ever pre-filled with invented names or prices. */
export function HotelsEditor({ hotels, onChange }: { hotels: CmsHotel[]; onChange: (next: CmsHotel[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<CmsHotel>) => onChange(hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const add = () => { const h = emptyHotel(`HOTEL-${Date.now().toString(36)}`, new Date().toISOString()); onChange([...hotels, { ...h, sort_order: hotels.length }]); setOpen(h.id); };
  const duplicate = (h: CmsHotel) => { const c = { ...structuredClone(h), id: `HOTEL-${Date.now().toString(36)}`, name: `${h.name} (copy)`, status: "DRAFT" as const }; onChange([...hotels, c]); setOpen(c.id); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-light">{hotels.length} hotel records. Only PUBLISHED records with a name appear on the page; the rest stay in the console.</p>
        <button type="button" className={btnSecondary} onClick={add}>+ Add hotel</button>
      </div>
      {hotels.map((h) => (
        <div key={h.id} className="rounded-xl border border-forest-100 bg-white">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <button type="button" onClick={() => setOpen(open === h.id ? null : h.id)} className="min-w-0 flex-1 text-left font-medium text-charcoal">{h.name || "Unnamed hotel"}</button>
            <Badge tone={h.status === "PUBLISHED" ? "bg-forest-100 text-forest-700" : "bg-saffron-100 text-saffron-700"}>{h.status}</Badge>
            <Badge tone="bg-charcoal/5 text-charcoal">{h.collaboration_status.replace("_", " ")}</Badge>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => update(h.id, { status: h.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}>{h.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => duplicate(h)}>Duplicate</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => setOpen(open === h.id ? null : h.id)}>{open === h.id ? "Close" : "Edit"}</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5 text-terracotta-700`} onClick={() => confirm("Delete this hotel record?") && onChange(hotels.filter((x) => x.id !== h.id))}>Delete</button>
          </div>
          {open === h.id && (
            <div className="space-y-4 border-t border-forest-100 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className={label}>Hotel name<input value={h.name} onChange={(e) => update(h.id, { name: e.target.value })} className={field} /></label>
                <label className={`${label} lg:col-span-2`}>Address<input value={h.address ?? ""} onChange={(e) => update(h.id, { address: e.target.value || null })} className={field} /></label>
                <label className={label}>Google Maps URL<input value={h.map_url ?? ""} onChange={(e) => update(h.id, { map_url: e.target.value || null })} className={field} /></label>
                <label className={label}>Rating (authorised source only)<input value={h.google_rating ?? ""} onChange={(e) => update(h.id, { google_rating: num(e.target.value) })} className={field} /></label>
                <label className={label}>Review count<input value={h.review_count ?? ""} onChange={(e) => update(h.id, { review_count: num(e.target.value) })} className={field} /></label>
                <label className={label}>Rating source<input value={h.rating_source ?? ""} onChange={(e) => update(h.id, { rating_source: e.target.value || null })} className={field} /></label>
                <label className={label}>Phone<input value={h.phone ?? ""} onChange={(e) => update(h.id, { phone: e.target.value || null })} className={field} /></label>
                <label className={label}>Website<input value={h.website ?? ""} onChange={(e) => update(h.id, { website: e.target.value || null })} className={field} /></label>
                <label className={label}>Check-in time<input value={h.check_in_time ?? ""} onChange={(e) => update(h.id, { check_in_time: e.target.value || null })} className={field} /></label>
                <label className={label}>Check-out time<input value={h.check_out_time ?? ""} onChange={(e) => update(h.id, { check_out_time: e.target.value || null })} className={field} /></label>
                <label className={label}>Initial fare (₹ / night)<input value={h.initial_fare ?? ""} onChange={(e) => update(h.id, { initial_fare: num(e.target.value) })} className={field} /></label>
                <label className={label}>Discounted fare (₹ / night)<input value={h.discounted_fare ?? ""} onChange={(e) => update(h.id, { discounted_fare: num(e.target.value) })} className={field} /></label>
                <label className={label}>Room type<input value={h.room_type ?? ""} onChange={(e) => update(h.id, { room_type: e.target.value || null })} className={field} /></label>
                <label className={`${label} lg:col-span-2`}>Amenities (comma separated)<input value={h.amenities.join(", ")} onChange={(e) => update(h.id, { amenities: splitList(e.target.value) })} className={field} /></label>
                <Tri text="Breakfast included" value={h.breakfast_included} onChange={(v) => update(h.id, { breakfast_included: v })} />
                <Tri text="Parking" value={h.parking} onChange={(v) => update(h.id, { parking: v })} />
                <Tri text="Wi-Fi" value={h.wifi} onChange={(v) => update(h.id, { wifi: v })} />
                <Tri text="Air conditioning" value={h.air_conditioning} onChange={(v) => update(h.id, { air_conditioning: v })} />
                <Tri text="Family rooms" value={h.family_rooms} onChange={(v) => update(h.id, { family_rooms: v })} />
                <label className={`${label} lg:col-span-3`}>Cancellation policy<textarea rows={2} value={h.cancellation_policy ?? ""} onChange={(e) => update(h.id, { cancellation_policy: e.target.value || null })} className={field} /></label>
                <label className={label}>Distance from main attraction (km)<input value={h.distance_from_attraction_km ?? ""} onChange={(e) => update(h.id, { distance_from_attraction_km: num(e.target.value) })} className={field} /></label>
                <label className={label}>Distance from railway station (km)<input value={h.distance_from_railway_km ?? ""} onChange={(e) => update(h.id, { distance_from_railway_km: num(e.target.value) })} className={field} /></label>
                <label className={label}>Distance from airport (km)<input value={h.distance_from_airport_km ?? ""} onChange={(e) => update(h.id, { distance_from_airport_km: num(e.target.value) })} className={field} /></label>
                <label className={label}>Contact person<input value={h.contact_person ?? ""} onChange={(e) => update(h.id, { contact_person: e.target.value || null })} className={field} /></label>
                <label className={label}>Collaboration status
                  <select value={h.collaboration_status} onChange={(e) => update(h.id, { collaboration_status: e.target.value as CollaborationStatus })} className={field}>{COLLAB.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className={`${label} lg:col-span-3`}>Admin notes (never shown publicly)<textarea rows={2} value={h.admin_notes ?? ""} onChange={(e) => update(h.id, { admin_notes: e.target.value || null })} className={field} /></label>
              </div>
              <ImageList images={h.images} onChange={(images) => update(h.id, { images })} title="Hotel images" max={6} />
              <p className="text-xs text-charcoal-light">Last updated {new Date(h.last_updated).toLocaleString()}</p>
            </div>
          )}
        </div>
      ))}
      {hotels.length === 0 && <p className="rounded-lg border border-dashed border-charcoal/20 p-4 text-sm text-charcoal-light">No hotel records. The page shows the “not yet listed” notice until a published record exists.</p>}
    </div>
  );
}

export function RestaurantsEditor({ restaurants, onChange }: { restaurants: CmsRestaurant[]; onChange: (next: CmsRestaurant[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<CmsRestaurant>) => onChange(restaurants.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () => { const r = emptyRestaurant(`REST-${Date.now().toString(36)}`, new Date().toISOString()); onChange([...restaurants, { ...r, sort_order: restaurants.length }]); setOpen(r.id); };
  const duplicate = (r: CmsRestaurant) => { const c = { ...structuredClone(r), id: `REST-${Date.now().toString(36)}`, name: `${r.name} (copy)`, status: "DRAFT" as const }; onChange([...restaurants, c]); setOpen(c.id); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-light">{restaurants.length} restaurant records. Only PUBLISHED records with a name appear on the page.</p>
        <button type="button" className={btnSecondary} onClick={add}>+ Add restaurant</button>
      </div>
      {restaurants.map((r) => (
        <div key={r.id} className="rounded-xl border border-forest-100 bg-white">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="min-w-0 flex-1 text-left font-medium text-charcoal">{r.name || "Unnamed restaurant"}</button>
            <Badge tone={r.status === "PUBLISHED" ? "bg-forest-100 text-forest-700" : "bg-saffron-100 text-saffron-700"}>{r.status}</Badge>
            <Badge tone="bg-charcoal/5 text-charcoal">{r.collaboration_status.replace("_", " ")}</Badge>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => update(r.id, { status: r.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}>{r.status === "PUBLISHED" ? "Unpublish" : "Publish"}</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => duplicate(r)}>Duplicate</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5`} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Close" : "Edit"}</button>
            <button type="button" className={`${btnSecondary} !px-2 !py-0.5 text-terracotta-700`} onClick={() => confirm("Delete this restaurant record?") && onChange(restaurants.filter((x) => x.id !== r.id))}>Delete</button>
          </div>
          {open === r.id && (
            <div className="space-y-4 border-t border-forest-100 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className={label}>Restaurant name<input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className={field} /></label>
                <label className={label}>Cuisine<input value={r.cuisine ?? ""} onChange={(e) => update(r.id, { cuisine: e.target.value || null })} className={field} /></label>
                <label className={label}>Veg / non-veg
                  <select value={r.veg_type ?? ""} onChange={(e) => update(r.id, { veg_type: (e.target.value || null) as CmsRestaurant["veg_type"] })} className={field}>
                    <option value="">Unknown</option><option value="VEG">Veg</option><option value="NON_VEG">Non-veg</option><option value="BOTH">Both</option>
                  </select>
                </label>
                <label className={`${label} lg:col-span-2`}>Address<input value={r.address ?? ""} onChange={(e) => update(r.id, { address: e.target.value || null })} className={field} /></label>
                <label className={label}>Google Maps URL<input value={r.map_url ?? ""} onChange={(e) => update(r.id, { map_url: e.target.value || null })} className={field} /></label>
                <label className={label}>Rating (authorised source only)<input value={r.google_rating ?? ""} onChange={(e) => update(r.id, { google_rating: num(e.target.value) })} className={field} /></label>
                <label className={label}>Review count<input value={r.review_count ?? ""} onChange={(e) => update(r.id, { review_count: num(e.target.value) })} className={field} /></label>
                <label className={label}>Rating source<input value={r.rating_source ?? ""} onChange={(e) => update(r.id, { rating_source: e.target.value || null })} className={field} /></label>
                <label className={label}>Price range<input value={r.price_range ?? ""} placeholder="₹200–400 per person" onChange={(e) => update(r.id, { price_range: e.target.value || null })} className={field} /></label>
                <label className={label}>Phone<input value={r.phone ?? ""} onChange={(e) => update(r.id, { phone: e.target.value || null })} className={field} /></label>
                <label className={label}>Website<input value={r.website ?? ""} onChange={(e) => update(r.id, { website: e.target.value || null })} className={field} /></label>
                <label className={label}>Opening hours<input value={r.opening_hours ?? ""} onChange={(e) => update(r.id, { opening_hours: e.target.value || null })} className={field} /></label>
                <label className={label}>Specialities (comma separated)<input value={r.specialities.join(", ")} onChange={(e) => update(r.id, { specialities: splitList(e.target.value) })} className={field} /></label>
                <label className={label}>Popular dishes (comma separated)<input value={r.popular_dishes.join(", ")} onChange={(e) => update(r.id, { popular_dishes: splitList(e.target.value) })} className={field} /></label>
                <label className={label}>Amenities (comma separated)<input value={r.amenities.join(", ")} onChange={(e) => update(r.id, { amenities: splitList(e.target.value) })} className={field} /></label>
                <Tri text="Delivery available" value={r.delivery_available} onChange={(v) => update(r.id, { delivery_available: v })} />
                <label className={label}>Contact details<input value={r.contact_details ?? ""} onChange={(e) => update(r.id, { contact_details: e.target.value || null })} className={field} /></label>
                <label className={label}>Collaboration status
                  <select value={r.collaboration_status} onChange={(e) => update(r.id, { collaboration_status: e.target.value as CollaborationStatus })} className={field}>{COLLAB.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className={`${label} lg:col-span-3`}>Admin notes (never shown publicly)<textarea rows={2} value={r.admin_notes ?? ""} onChange={(e) => update(r.id, { admin_notes: e.target.value || null })} className={field} /></label>
              </div>
              <ImageList images={r.images} onChange={(images) => update(r.id, { images })} title="Restaurant images" max={6} />
            </div>
          )}
        </div>
      ))}
      {restaurants.length === 0 && <p className="rounded-lg border border-dashed border-charcoal/20 p-4 text-sm text-charcoal-light">No restaurant records yet.</p>}
    </div>
  );
}
