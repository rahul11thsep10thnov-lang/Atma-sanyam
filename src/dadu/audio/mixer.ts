// Pure audio mixing rules: buses, ducking, narration speed. No RN imports.
export type Bus = 'voice' | 'music' | 'ambience' | 'sfx';
export type Speed = 'verySlow' | 'slow' | 'normal' | 'fast' | 'veryFast';

export interface MixerSettings {
  master: number;          // 0..1
  volumes: Record<Bus, number>;
  muted: boolean;
  captions: boolean;
  narrationSpeed: Speed;
  reducedAudio: boolean;   // accessibility: no ambience loops
}

export const DEFAULT_MIXER: MixerSettings = {
  master: 1, volumes: { voice: 1, music: 0.5, ambience: 0.4, sfx: 0.8 }, muted: false, captions: true, narrationSpeed: 'normal', reducedAudio: false,
};

/** Playback rate and the pause factor between sentences (docs/dadu/14-voice-audio.md). */
export const SPEED_TABLE: Record<Speed, { rate: number; pause: number }> = {
  verySlow: { rate: 0.7, pause: 1.8 }, slow: { rate: 0.85, pause: 1.4 }, normal: { rate: 1, pause: 1 }, fast: { rate: 1.15, pause: 0.8 }, veryFast: { rate: 1.3, pause: 0.6 },
};

/** Music and ambience duck to 25 percent while a voice line plays; sfx never duck. */
export function effectiveVolume(s: MixerSettings, bus: Bus, voiceActive: boolean): number {
  if (s.muted) return 0;
  const base = s.master * s.volumes[bus];
  if (bus === 'ambience' && s.reducedAudio) return 0;
  if ((bus === 'music' || bus === 'ambience') && voiceActive) return base * 0.25;
  return base;
}

/** Ambience set per location/time; keys resolve to bundled loops when they exist (none are bundled yet, see ASSET_COMPLETION_MATRIX.md). */
export function ambienceFor(ambienceKey: string, time: 'morning' | 'afternoon' | 'evening' | 'night', weather: string): string {
  if (weather === 'rainy' || weather === 'stormy') return `${ambienceKey}.rain`;
  if (time === 'night') return `${ambienceKey}.night`;
  return `${ambienceKey}.day`;
}

/** Narration speeds above normal are restricted to A3 and up (14-voice-audio.md). */
export function allowedSpeeds(band: string): Speed[] {
  return ['A0', 'A1', 'A2'].includes(band) ? ['verySlow', 'slow', 'normal'] : ['verySlow', 'slow', 'normal', 'fast', 'veryFast'];
}
