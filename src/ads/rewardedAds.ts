// Rewarded ads behind one small interface, so an ad network (Google AdMob,
// Unity Ads, …) can be wired in without touching the screens. Until one
// is, the bundled provider plays a 30-second placeholder "ad" so the coin
// flow can be used and tested. Membership turns ads off entirely.
import { AD_SECONDS } from '../spaces/rewards';

export interface RewardedAdProvider {
  /** A human-readable name for Settings/debugging. */
  readonly name: string;
  /** True when a real network is connected (false for the placeholder). */
  readonly real: boolean;
  isReady(): Promise<boolean>;
  /**
   * Show the ad. Resolves `{ watched: true }` only when the person watched
   * it to the end (the network's "reward" callback). `onTick` reports the
   * seconds remaining for providers that expose it.
   */
  show(onTick?: (secondsLeft: number) => void): Promise<{ watched: boolean }>;
}

class PlaceholderAdProvider implements RewardedAdProvider {
  readonly name = 'Placeholder (no ad network connected)';
  readonly real = false;
  private cancel: (() => void) | null = null;

  async isReady() {
    return true;
  }

  show(onTick?: (secondsLeft: number) => void) {
    return new Promise<{ watched: boolean }>((resolve) => {
      let left = AD_SECONDS;
      onTick?.(left);
      const id = setInterval(() => {
        left -= 1;
        onTick?.(left);
        if (left <= 0) {
          clearInterval(id);
          this.cancel = null;
          resolve({ watched: true });
        }
      }, 1000);
      this.cancel = () => {
        clearInterval(id);
        this.cancel = null;
        resolve({ watched: false });
      };
    });
  }

  /** Leaving early forfeits the reward. */
  abort() {
    this.cancel?.();
  }
}

export const placeholderAds = new PlaceholderAdProvider();

let provider: RewardedAdProvider = placeholderAds;

export function setRewardedAdProvider(p: RewardedAdProvider) {
  provider = p;
}

export function rewardedAds(): RewardedAdProvider {
  return provider;
}
