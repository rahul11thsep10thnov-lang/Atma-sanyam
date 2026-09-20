import "server-only";

export interface FlightSearchQuery {
  fromCity: string;
  toAirportCode: string;
  departDate: string;
  returnDate?: string;
}

export interface FlightSearchLink {
  provider: string;
  searchUrl: string;
}

export interface FlightSearchProvider {
  getSearchLink(query: FlightSearchQuery): FlightSearchLink;
}

/** Deep-links to a generic flight search until a flight-affiliate partner (FLIGHT_AFFILIATE_API_KEY) is connected. */
class DemoFlightSearchProvider implements FlightSearchProvider {
  getSearchLink(query: FlightSearchQuery): FlightSearchLink {
    return {
      provider: "demo",
      searchUrl: `#flights?from=${encodeURIComponent(query.fromCity)}&to=${encodeURIComponent(
        query.toAirportCode
      )}&depart=${query.departDate}${query.returnDate ? `&return=${query.returnDate}` : ""}`
    };
  }
}

export function getFlightSearchProvider(): FlightSearchProvider {
  return new DemoFlightSearchProvider();
}
