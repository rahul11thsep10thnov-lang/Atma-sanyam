import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AudioSettings } from '../state/types';

/** Bundled clips, keyed by the `clip` names environment files use. Today a
 * single PLACEHOLDER loop (soft wind + sparse chirps, synthesized) stands in
 * for every layer; real recordings drop in here as more keys (section K). */
const CLIPS: Record<string, number> = {
  // PLACEHOLDER ASSET — replace with birds_morning_a.m4a / wind_light_a.m4a
  ambient_placeholder: require('../../../assets/balconyWorld/audio/ambient_placeholder.wav'),
};

interface Layer {
  layer: string;
  clip: string;
  gain: number;
}

/** Layered ambient loops with a master volume (architecture doc, section F).
 * Each environment layer gets its own looping player so layers can be muted
 * or attenuated independently; positional attenuation plugs in here once
 * emitters have positions. Fades out rather than cutting when the balcony
 * loses focus so a 2-hour session never hears a click. */
export class AudioEngine {
  private players: { layer: string; gain: number; player: AudioPlayer }[] = [];
  private settings: AudioSettings = { enabled: true, master: 0.8 };
  private started = false;
  /** Per-layer multipliers from the environment engine (time of day, weather, focus). */
  private mix: Record<string, number> = {};
  private mixCurrent: Record<string, number> = {};

  async start(layers: Layer[], settings: AudioSettings) {
    this.settings = settings;
    try {
      await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
    } catch {
      // Audio mode is a nicety; playback still works with platform defaults.
    }
    for (const layer of layers) {
      const source = CLIPS[layer.clip];
      if (!source) {
        // The environment lists the layer so the engine's mix is already
        // authored; the layer becomes audible once its clip is bundled.
        if (__DEV__) console.info(`Balcony audio: no clip "${layer.clip}" yet for layer "${layer.layer}"`);
        continue;
      }
      const player = createAudioPlayer(source);
      player.loop = true;
      player.volume = 0;
      this.players.push({ layer: layer.layer, gain: layer.gain, player });
    }
    this.started = true;
    this.applyVolumes();
    if (settings.enabled) this.players.forEach((p) => p.player.play());
  }

  setSettings(settings: AudioSettings) {
    const wasEnabled = this.settings.enabled;
    this.settings = settings;
    if (!this.started) return;
    this.applyVolumes();
    if (settings.enabled && !wasEnabled) this.players.forEach((p) => p.player.play());
    if (!settings.enabled && wasEnabled) this.players.forEach((p) => p.player.pause());
  }

  /**
   * The environment engine's audio frame: birds by day, crickets at night,
   * rain when it rains, everything softer during deep focus. Eased so a
   * state change is a fade, never a cut (architecture doc, section F).
   */
  applyMix(gains: Record<string, number>, dtSeconds: number) {
    this.mix = gains;
    const k = 1 - Math.exp(-Math.max(0, dtSeconds) / 1.5);
    let changed = false;
    for (const p of this.players) {
      const target = gains[p.layer] ?? 1;
      const current = this.mixCurrent[p.layer] ?? target;
      const next = current + (target - current) * k;
      if (Math.abs(next - current) > 0.001) changed = true;
      this.mixCurrent[p.layer] = next;
    }
    if (changed && this.started) this.applyVolumes();
  }

  /** Called when the screen blurs / app backgrounds. */
  suspend() {
    this.players.forEach((p) => p.player.pause());
  }

  resume() {
    if (this.settings.enabled) this.players.forEach((p) => p.player.play());
  }

  dispose() {
    this.players.forEach((p) => {
      try {
        p.player.pause();
        p.player.remove();
      } catch {
        // already released
      }
    });
    this.players = [];
    this.started = false;
  }

  private applyVolumes() {
    const master = this.settings.enabled ? this.settings.master : 0;
    this.players.forEach((p) => {
      const mix = this.mixCurrent[p.layer] ?? this.mix[p.layer] ?? 1;
      p.player.volume = Math.max(0, Math.min(1, master * p.gain * mix));
    });
  }
}
