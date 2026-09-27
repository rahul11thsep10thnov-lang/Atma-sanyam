import { BaseVoiceRef, VoiceProvider } from "./VoiceProvider";
import { MockVoiceProvider } from "./MockVoiceProvider";

export interface VoiceRoute {
  provider: VoiceProvider;
  providerVoiceId: string;
  isFallback: boolean;
  reason?: string;
}

/**
 * Chooses which TTS provider speaks a base voice in a language: the first
 * provider (in priority order) that is enabled, configured, declares support
 * for the language and has a voice ID for this base voice. Falls back to
 * the silent mock voice (flagged for QC) rather than guessing.
 */
export class VoiceRouter {
  private readonly mock = new MockVoiceProvider();

  constructor(private readonly providers: VoiceProvider[]) {}

  route(voice: BaseVoiceRef, languageCode: string): VoiceRoute {
    const reasons: string[] = [];
    for (const provider of this.providers) {
      if (provider.key === "mock") continue;
      if (!provider.isConfigured()) {
        reasons.push(`${provider.key}: not configured`);
        continue;
      }
      if (!provider.supportsLanguage(languageCode)) {
        reasons.push(`${provider.key}: ${languageCode} not supported`);
        continue;
      }
      const providerVoiceId = provider.resolveVoiceId(voice, languageCode);
      if (!providerVoiceId) {
        reasons.push(`${provider.key}: no voice ID set for ${voice.code}`);
        continue;
      }
      return { provider, providerVoiceId, isFallback: false };
    }
    return {
      provider: this.mock,
      providerVoiceId: this.mock.resolveVoiceId(voice, languageCode),
      isFallback: true,
      reason: reasons.join("; ") || "no voice providers enabled",
    };
  }

  describe(): string[] {
    return this.providers.map((p) => p.key);
  }
}
