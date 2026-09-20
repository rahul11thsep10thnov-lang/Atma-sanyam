import "server-only";
import type { MapProvider } from "./types";
import { OpenStreetMapProvider, GoogleMapsProvider, MapplsProvider } from "./providers";

export type { MapMarker, MapEmbedConfig, MapProvider } from "./types";

/**
 * MAP_PROVIDER switches the active map backend without touching any
 * component code — set it to "google" or "mappls" (with the matching API
 * key env var) once a paid provider is approved; defaults to the
 * key-free OpenStreetMap embed.
 */
export function getMapProvider(): MapProvider {
  const selected = (process.env.MAP_PROVIDER ?? "openstreetmap").toLowerCase();

  if (selected === "google" && process.env.GOOGLE_MAPS_API_KEY) {
    return new GoogleMapsProvider(process.env.GOOGLE_MAPS_API_KEY);
  }
  if (selected === "mappls" && process.env.MAPPLS_API_KEY) {
    return new MapplsProvider(process.env.MAPPLS_API_KEY);
  }
  return new OpenStreetMapProvider();
}
