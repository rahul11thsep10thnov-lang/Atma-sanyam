import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MIXER } from './mixer';
import type { MixerSettings } from './mixer';
import { narrator } from './narrator';
import type { CharacterKey } from '../core/characters';

const KEY = 'dadu.audio.v1';
let cached: MixerSettings | null = null;

export function useAudio(lang: string) {
  const [mixer, setMixer] = useState<MixerSettings>(cached ?? DEFAULT_MIXER);
  const [speaking, setSpeaking] = useState(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => {
    if (cached) return;
    AsyncStorage.getItem(KEY).then((raw) => { if (raw) { try { cached = { ...DEFAULT_MIXER, ...JSON.parse(raw) }; setMixer(cached!); } catch { /* ignore */ } } }).catch(() => undefined);
  }, []);
  useEffect(() => narrator.subscribe(setSpeaking), []);
  const update = useCallback((patch: Partial<MixerSettings>) => {
    setMixer((m) => { const next = { ...m, ...patch }; cached = next; AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined); return next; });
  }, []);
  const speak = useCallback((text: string, who: CharacterKey) => narrator.speak(text, who, langRef.current, cached ?? DEFAULT_MIXER), []);
  const stop = useCallback(() => narrator.stop(), []);
  useEffect(() => () => narrator.stop(), []);
  return { mixer, update, speak, stop, speaking };
}
