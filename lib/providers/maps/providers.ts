import type { MapProvider, MapEmbedConfig } from "./types";

/** No API key required — used whenever MAP_PROVIDER is unset or "openstreetmap". */
export class OpenStreetMapProvider implements MapProvider {
  getEmbed({ lat, lng, zoom = 14 }: { lat: number; lng: number; zoom?: number }): MapEmbedConfig {
    const delta = 0.02;
    const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
    return {
      embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
      externalUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`,
      providerLabel: "OpenStreetMap"
    };
  }
}

/** Requires GOOGLE_MAPS_API_KEY server-side; the embed URL itself is safe to render client-side. */
export class GoogleMapsProvider implements MapProvider {
  constructor(private apiKey: string) {}

  getEmbed({ lat, lng, zoom = 14 }: { lat: number; lng: number; zoom?: number }): MapEmbedConfig {
    return {
      embedUrl: `https://www.google.com/maps/embed/v1/view?key=${this.apiKey}&center=${lat},${lng}&zoom=${zoom}`,
      externalUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      providerLabel: "Google Maps"
    };
  }
}

/** Requires MAPPLS_API_KEY. Placeholder adapter — wire up Mappls' embed API here when credentials are available. */
export class MapplsProvider implements MapProvider {
  constructor(private apiKey: string) {}

  getEmbed({ lat, lng, zoom = 14 }: { lat: number; lng: number; zoom?: number }): MapEmbedConfig {
    return {
      embedUrl: `https://apis.mappls.com/advancedmaps/api/${this.apiKey}/map_sdk?layer=vector&v=3.0&center=${lat},${lng}&zoom=${zoom}`,
      externalUrl: `https://maps.mappls.com/?q=${lat},${lng}`,
      providerLabel: "Mappls"
    };
  }
}
