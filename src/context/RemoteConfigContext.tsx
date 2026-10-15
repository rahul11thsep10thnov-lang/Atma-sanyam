// Remote configuration from the admin console (maintenance mode, version
// notices, feature flags, texts) plus server capabilities (which payment
// providers and SMS are configured). The app always has a complete config:
// the bundled defaults below, then the last cached copy, then the live one.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest } from '../services/apiClient';

export interface RemoteConfig {
  maintenance: { enabled: boolean; message: string };
  appVersion: { minimumVersion: string; latestVersion: string; updateMessage: string; iosStoreUrl: string; androidStoreUrl: string };
  features: {
    games: boolean;
    artAndCraft: boolean;
    didYouKnow: boolean;
    liveMirroring: boolean;
    pushNotifications: boolean;
    showInDevelopmentGames: boolean;
    phoneSignIn: boolean;
    googlePlayBilling: boolean;
    razorpayBilling: boolean;
    sandboxBilling: boolean;
  };
  texts: { announcement: string; guardianWelcome: string; playerWelcome: string; subscriptionPitch: string; timeUpMessage: string };
  limits: { dailyLimitMinutes: number; sessionLimitMinutes: number; maxChildrenPerGuardian: number };
  subscription: { productId: string; priceInr: number };
  termsVersion: string;
}

export const DEFAULT_CONFIG: RemoteConfig = {
  maintenance: { enabled: false, message: 'LoJi is getting a little upgrade. Please check back in a little while.' },
  appVersion: { minimumVersion: '1.0.0', latestVersion: '1.0.0', updateMessage: 'A new version of LoJi is available.', iosStoreUrl: '', androidStoreUrl: '' },
  features: { games: true, artAndCraft: true, didYouKnow: true, liveMirroring: true, pushNotifications: isBackendConfigured, showInDevelopmentGames: false, phoneSignIn: false, googlePlayBilling: false, razorpayBilling: false, sandboxBilling: false },
  texts: {
    announcement: '',
    guardianWelcome: 'Welcome to LoJi. Add a child profile, set their playtime, and watch them learn.',
    playerWelcome: 'Hi {name}! Ready to play?',
    subscriptionPitch: 'One monthly plan unlocks every game, craft and discovery for every child in your home.',
    timeUpMessage: 'Time for a break! Your playtime is finished for now.',
  },
  limits: { dailyLimitMinutes: 60, sessionLimitMinutes: 20, maxChildrenPerGuardian: 8 },
  subscription: { productId: 'loji_monthly', priceInr: 199 },
  termsVersion: '2026-10',
};

const CACHE_KEY = 'loji.remoteConfig.v1';
const REFRESH_MS = 60_000;

function merge(partial: Partial<RemoteConfig> | null | undefined): RemoteConfig {
  const p = partial ?? {};
  return {
    maintenance: { ...DEFAULT_CONFIG.maintenance, ...p.maintenance },
    appVersion: { ...DEFAULT_CONFIG.appVersion, ...p.appVersion },
    features: { ...DEFAULT_CONFIG.features, ...p.features },
    texts: { ...DEFAULT_CONFIG.texts, ...p.texts },
    limits: { ...DEFAULT_CONFIG.limits, ...p.limits },
    subscription: { ...DEFAULT_CONFIG.subscription, ...p.subscription },
    termsVersion: p.termsVersion ?? DEFAULT_CONFIG.termsVersion,
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
      const live = await apiRequest<Partial<RemoteConfig>>('/v1/config', { as: false, timeoutMs: 8_000 });
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
