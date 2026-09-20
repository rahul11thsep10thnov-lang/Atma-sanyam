export interface AdSlotConfig {
  slotId: string;
  format: "banner" | "native" | "sponsored-listing";
}

export interface AdRenderResult {
  enabled: boolean;
  html?: string;
  provider?: string;
}

export interface AdvertisingProvider {
  renderSlot(config: AdSlotConfig): AdRenderResult;
}

/** No ad network is connected. Every slot renders disabled until ADVERTISING_PROVIDER + credentials are set. */
class NoopAdvertisingProvider implements AdvertisingProvider {
  renderSlot(): AdRenderResult {
    return { enabled: false };
  }
}

export function getAdvertisingProvider(): AdvertisingProvider {
  return new NoopAdvertisingProvider();
}
