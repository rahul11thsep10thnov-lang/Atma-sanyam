export interface MapMarker {
  id: string;
  label: string;
  lat: number;
  lng: number;
  category: "hotel" | "restaurant" | "attraction" | "market" | "hospital" | "railway" | "airport" | "parking" | "tourist-info";
}

export interface MapEmbedConfig {
  /** Ready-to-use iframe/src URL for the selected map provider. */
  embedUrl: string;
  providerLabel: string;
  /** Link users can open in a new tab for a full interactive map. */
  externalUrl: string;
}

export interface MapProvider {
  getEmbed(input: { lat: number; lng: number; zoom?: number; markers?: MapMarker[] }): MapEmbedConfig;
}
