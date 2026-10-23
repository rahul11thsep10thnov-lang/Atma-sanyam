// Note and percussion playback for the music lessons. Tones are synthesised
// (no licensed samples): WebAudio on web; on native a short WAV is generated
// in memory and played with expo-audio. Everything is best-effort — a device
// without audio simply shows the visual.
import { Platform } from 'react-native';

const NOTE_INDEX: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/** "C4" → 261.63 Hz. */
export function noteToFreq(note: string): number {
  const m = /^([A-G](?:#|b)?)(\d)$/.exec(note);
  if (!m) return 440;
  const semis = NOTE_INDEX[m[1]!] ?? 0;
  const octave = Number(m[2]);
  const midi = (octave + 1) * 12 + semis;
  return 440 * 2 ** ((midi - 69) / 12);
}

export type Timbre = 'piano' | 'guitar' | 'tabla-dayan' | 'tabla-bayan' | 'click' | 'clap';

interface Sample {
  freq: number;
  ms: number;
  timbre: Timbre;
}

function render(sample: Sample, rate = 22050): Float32Array {
  const n = Math.floor((sample.ms / 1000) * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const tsec = i / rate;
    const env = Math.exp(-tsec * (sample.timbre === 'click' || sample.timbre === 'clap' ? 40 : sample.timbre.startsWith('tabla') ? 12 : 4));
    let v = 0;
    switch (sample.timbre) {
      case 'piano':
        v = Math.sin(2 * Math.PI * sample.freq * tsec) * 0.6 + Math.sin(4 * Math.PI * sample.freq * tsec) * 0.25 + Math.sin(6 * Math.PI * sample.freq * tsec) * 0.1;
        break;
      case 'guitar':
        v = Math.sin(2 * Math.PI * sample.freq * tsec) * 0.5 + Math.sin(4 * Math.PI * sample.freq * tsec) * 0.3 + Math.sin(8 * Math.PI * sample.freq * tsec) * 0.15 * Math.exp(-tsec * 8);
        break;
      case 'tabla-dayan': {
        const f = sample.freq * (1 + 0.6 * Math.exp(-tsec * 60));
        v = Math.sin(2 * Math.PI * f * tsec) * 0.8 + (Math.random() - 0.5) * 0.15 * Math.exp(-tsec * 80);
        break;
      }
      case 'tabla-bayan': {
        const f = sample.freq * (1 + 1.2 * Math.exp(-tsec * 25));
        v = Math.sin(2 * Math.PI * f * tsec);
        break;
      }
      case 'click':
        v = Math.sin(2 * Math.PI * sample.freq * tsec);
        break;
      case 'clap':
        v = (Math.random() - 0.5) * 2;
        break;
    }
    out[i] = v * env * 0.7;
  }
  return out;
}

function wavDataUri(samples: Float32Array, rate = 22050): string {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)));
  str(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i]!)) * 32767, true);
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = (globalThis as { btoa?: (s: string) => string }).btoa?.(bin) ?? '';
  return `data:audio/wav;base64,${b64}`;
}

let webCtx: AudioContext | null = null;
const uriCache = new Map<string, string>();

function playWeb(sample: Sample) {
  const Ctx = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  webCtx ??= new Ctx();
  const data = render(sample, webCtx.sampleRate);
  const buffer = webCtx.createBuffer(1, data.length, webCtx.sampleRate);
  buffer.getChannelData(0).set(data);
  const src = webCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(webCtx.destination);
  src.start();
}

let nativeAudio: { createAudioPlayer: (source: { uri: string }) => { play: () => void; remove: () => void; addListener?: (event: string, cb: (e: { isLoaded: boolean; playing: boolean; didJustFinish?: boolean }) => void) => { remove: () => void } } } | null | undefined;

function playNative(sample: Sample) {
  if (nativeAudio === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      nativeAudio = require('expo-audio');
    } catch {
      nativeAudio = null;
    }
  }
  if (!nativeAudio) return;
  const key = `${sample.timbre}:${Math.round(sample.freq)}:${sample.ms}`;
  let uri = uriCache.get(key);
  if (!uri) {
    uri = wavDataUri(render(sample));
    uriCache.set(key, uri);
  }
  try {
    const player = nativeAudio.createAudioPlayer({ uri });
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already gone
      }
    }, sample.ms + 400);
  } catch {
    // no audio on this device
  }
}

export function playSample(sample: Sample) {
  try {
    if (Platform.OS === 'web') playWeb(sample);
    else playNative(sample);
  } catch {
    // silence is fine
  }
}

export const playNote = (note: string, timbre: 'piano' | 'guitar' = 'piano', ms = 600) => playSample({ freq: noteToFreq(note), ms, timbre });
export const playClick = (accent = false) => playSample({ freq: accent ? 1500 : 1000, ms: 60, timbre: 'click' });
export const playClap = () => playSample({ freq: 0, ms: 90, timbre: 'clap' });

/** Tabla bols → which drum and roughly what pitch. */
export const BOL_INFO: Record<string, { drum: 'dayan' | 'bayan' | 'both'; freq: number }> = {
  Na: { drum: 'dayan', freq: 330 },
  Ta: { drum: 'dayan', freq: 330 },
  Tin: { drum: 'dayan', freq: 290 },
  Tun: { drum: 'dayan', freq: 260 },
  Te: { drum: 'dayan', freq: 240 },
  Ge: { drum: 'bayan', freq: 90 },
  Ghe: { drum: 'bayan', freq: 90 },
  Ka: { drum: 'bayan', freq: 120 },
  Dha: { drum: 'both', freq: 330 },
  Dhin: { drum: 'both', freq: 290 },
};

export function playBol(bol: string) {
  const info = BOL_INFO[bol] ?? { drum: 'dayan', freq: 300 };
  if (info.drum === 'dayan' || info.drum === 'both') playSample({ freq: info.freq, ms: 350, timbre: 'tabla-dayan' });
  if (info.drum === 'bayan' || info.drum === 'both') playSample({ freq: 90, ms: 450, timbre: 'tabla-bayan' });
}

/** Standard tuning, low to high: E2 A2 D3 G3 B3 E4. */
export const GUITAR_OPEN = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
export function guitarStringNote(stringIndex: number, fret: number | null): string | null {
  if (fret === null) return null;
  const open = GUITAR_OPEN[stringIndex];
  if (!open) return null;
  const m = /^([A-G](?:#|b)?)(\d)$/.exec(open)!;
  const midi = (Number(m[2]) + 1) * 12 + (NOTE_INDEX[m[1]!] ?? 0) + fret;
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Plays a sequence with a tempo; returns a stop function. */
export function playSequence(items: { at: number; play: () => void }[], bpm: number, onStep?: (index: number) => void, onDone?: () => void): () => void {
  const beat = 60_000 / bpm;
  const timers = items.map((it, i) => setTimeout(() => { it.play(); onStep?.(i); }, it.at * beat));
  const last = Math.max(0, ...items.map((i) => i.at)) * beat + beat;
  timers.push(setTimeout(() => onDone?.(), last));
  return () => timers.forEach(clearTimeout);
}
