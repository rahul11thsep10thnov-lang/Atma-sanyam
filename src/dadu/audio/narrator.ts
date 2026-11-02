// Narration adapter. Production uses recorded character voices from the
// audio packs (docs/dadu/14-voice-audio.md); until those packs exist the
// device's text-to-speech (expo-speech) reads the line in the chosen
// language, so every lesson is audible today. Captions always show.
import * as Speech from 'expo-speech';
import type { CharacterKey } from '../core/characters';
import { SPEED_TABLE } from './mixer';
import type { MixerSettings } from './mixer';

const BCP47: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', as: 'as-IN', or: 'or-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', ur: 'ur-IN', sa: 'hi-IN' };

/** Pitch per character so voices are distinguishable even with TTS. */
const PITCH: Record<CharacterKey, number> = { dadaji: 0.85, chintu: 1.3, buddy: 1.1, chikki: 1.35, gauri: 0.75, nandu: 1.45, mitthu: 1.5 };

let voiceActive = false;
const listeners = new Set<(active: boolean) => void>();
function setActive(v: boolean) { voiceActive = v; listeners.forEach((l) => l(v)); }

export const narrator = {
  isActive: () => voiceActive,
  subscribe(fn: (active: boolean) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  async speak(text: string, who: CharacterKey, lang: string, mixer: MixerSettings): Promise<void> {
    if (mixer.muted || mixer.volumes.voice === 0 || !text) return;
    try { Speech.stop(); } catch { /* ignore */ }
    const { rate } = SPEED_TABLE[mixer.narrationSpeed];
    setActive(true);
    await new Promise<void>((resolve) => {
      try {
        Speech.speak(text, {
          language: BCP47[lang] ?? 'en-IN', pitch: PITCH[who], rate, volume: mixer.master * mixer.volumes.voice,
          onDone: () => { setActive(false); resolve(); }, onStopped: () => { setActive(false); resolve(); }, onError: () => { setActive(false); resolve(); },
        });
      } catch { setActive(false); resolve(); }
    });
  },
  stop() { try { Speech.stop(); } catch { /* ignore */ } setActive(false); },
  /** Audio packs: resolved later by the offline engine; returns null until a recorded line exists. */
  recordedLineFor(_lineId: string): string | null { return null; },
};
