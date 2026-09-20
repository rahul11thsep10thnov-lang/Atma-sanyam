import "server-only";
import type { Hotel } from "@/lib/types";

export interface HotelAvailabilityQuery {
  destinationSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface HotelBookingLink {
  hotelId: string;
  bookingUrl: string;
  provider: string;
}

export interface HotelBookingProvider {
  /** Returns an affiliate/booking deep link for a hotel, or null if the provider has none configured. */
  getBookingLink(hotel: Hotel, query: HotelAvailabilityQuery): Promise<HotelBookingLink | null>;
}

/**
 * No live hotel-booking API is connected yet (see section 8 of the brief —
 * prices/availability/ratings must never be fabricated). This adapter
 * always returns null so the UI falls back to "Sample data" messaging
 * instead of inventing a bookable link. Swap in a real implementation
 * (behind HOTEL_BOOKING_API_KEY) once a partner integration is approved.
 */
class DemoHotelBookingProvider implements HotelBookingProvider {
  async getBookingLink(): Promise<HotelBookingLink | null> {
    return null;
  }
}

export function getHotelBookingProvider(): HotelBookingProvider {
  return new DemoHotelBookingProvider();
}
