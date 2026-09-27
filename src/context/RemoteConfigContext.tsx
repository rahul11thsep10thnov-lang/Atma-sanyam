// Remote configuration from the admin console (maintenance mode, version
// notices, feature flags, texts). The app always has a complete config: the
// bundled defaults below, then the last cached copy, then the live one.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest } from '../services/apiClient';

export interface RemoteConfig {
  maintenance: { enabled: boolean; message: string };
  appVersion: { minimumVersion: string; latestVersion: string; updateMessage: string; iosStoreUrl: string; androidStoreUrl: string };
  features: { contentLibrary: boolean; quoteTiles: boolean; customPhotos: boolean; accounts: boolean; pushNotifications: boolean };
  texts: {
    announcement: string;
    sessionCompleteTitle: string;
    sessionCompleteMessage: string;
    sessionFailedTitle: string;
    sessionLeftAppMessage: string;
    sessionGaveUpMessage: string;
  };
  session: { gracePeriodSeconds: number };
}

export const DEFAULT_CONFIG: RemoteConfig = {
  maintenance: { enabled: false, message: "We're making FOCUS even better. Please check back in a little while." },
  appVersion: { minimumVersion: '1.0.0', latestVersion: '1.0.0', updateMessage: 'A new version of FOCUS is available.', iosStoreUrl: '', androidStoreUrl: '' },
  features: {
    contentLibrary: true,
    quoteTiles: true,
    customPhotos: true,
    // Accounts and push need a server.
    accounts: isBackendConfigured,
    pushNotifications: isBackendConfigured,
  },
  texts: {
    announcement: '',
    sessionCompleteTitle: 'Puzzle complete!',
    sessionCompleteMessage: 'Great focus — your picture is fully assembled.',
    sessionFailedTitle: 'Session failed',
    sessionLeftAppMessage: "You left the app too long, so this puzzle didn't get finished.",
    sessionGaveUpMessage: 'Session ended early — the puzzle stays incomplete.',
  },
  session: { gracePeriodSeconds: 5 },
};

const CACHE_KEY = 'focus.remoteConfig.v1';
const REFRESH_MS = 60_000;

function merge(partial: Partial<RemoteConfig> | null | undefined): RemoteConfig {
  const p = partial ?? {};
  const grace = Number(p.session?.gracePeriodSeconds);
  return {
    maintenance: { ...DEFAULT_CONFIG.maintenance, ...p.maintenance },
    appVersion: { ...DEFAULT_CONFIG.appVersion, ...p.appVersion },
    features: { ...DEFAULT_CONFIG.features, ...p.features },
    texts: { ...DEFAULT_CONFIG.texts, ...p.texts },
    session: { gracePeriodSeconds: Number.isFinite(grace) && grace >= 3 && grace <= 60 ? grace : DEFAULT_CONFIG.session.gracePeriodSeconds },
  };
}

interface Ctx {
  config: RemoteConfig;
  refresh: () => Promise<void>;
}

const RemoteConfigContext = createContext<Ctx>({ config: DEFAULT_CONFIG, refresh: async () => undefined });

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);
  const lastFetch = useRef(0);

  const refresh = useCallback(async () => {
    if (!isBackendConfigured) return;
    lastFetch.current = Date.now();
    try {
      const live = await apiRequest<Partial<RemoteConfig>>('/v1/config', { auth: false, timeoutMs: 8_000 });
      const merged = merge(live);
      setConfig(merged);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged)).catch(() => undefined);
    } catch {
      // Offline: keep the cached/default config.
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) setConfig(merge(JSON.parse(raw)));
      })
      .catch(() => undefined)
      .finally(() => void refresh());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastFetch.current > REFRESH_MS) void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return <RemoteConfigContext.Provider value={{ config, refresh }}>{children}</RemoteConfigContext.Provider>;
}

export function useRemoteConfig() {
  return useContext(RemoteConfigContext);
}
