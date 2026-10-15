// Sound effects and spoken help. Effects are short synthesised tones on web
// (WebAudio) and haptics on native — no sound files to license. Speech uses
// expo-speech (on-device TTS; web speechSynthesis). Both respect the
// guardian's controls and the device settings.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

type Kind = 'tap' | 'good' | 'bad' | 'win' | 'pop';

let audioCtx: AudioContext | null = null;
function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.08) {
  try {
    const Ctx = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    // no audio
  }
}

export function playSfx(kind: Kind, enabled: boolean) {
  if (!enabled) return;
  if (Platform.OS === 'web') {
    switch (kind) {
      case 'tap':
        return tone(440, 60, 'triangle');
      case 'pop':
        return tone(660, 90, 'square', 0.05);
      case 'good':
        tone(523, 110);
        return setTimeout(() => tone(784, 160), 100);
      case 'bad':
        return tone(180, 220, 'sawtooth', 0.05);
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 180), i * 120));
        return;
    }
  }
  switch (kind) {
    case 'tap':
    case 'pop':
      return void Haptics.selectionAsync().catch(() => undefined);
    case 'good':
      return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    case 'bad':
      return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    case 'win':
      return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }
}

let speaking = false;
export function speak(text: string, enabled: boolean, language = 'en-IN') {
  if (!enabled || !text) return;
  try {
    Speech.stop();
    speaking = true;
    Speech.speak(text, { language, rate: 0.95, pitch: 1.05, onDone: () => {
        speaking = false;
      },
      onStopped: () => {
        speaking = false;
      },
      onError: () => {
        speaking = false;
      } });
  } catch {
    speaking = false;
  }
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  speaking = false;
}

export const isSpeaking = () => speaking;
