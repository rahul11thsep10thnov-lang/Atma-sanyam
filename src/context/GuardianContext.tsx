// The guardian's session: sign-in, the household (children, entitlement),
// and the subscription state. The token lives in the OS keychain; a cached
// copy of /guardian/me lets the console open offline with the last known
// state (never with more rights than the server last granted: an expired
// cached entitlement is treated as expired).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest, ApiError, setAuthToken, setUnauthorizedHandler } from '../services/apiClient';
import { secureDelete, secureGet, secureSet } from '../services/secureStorage';
import { getInstallId } from '../services/installId';
import { syncDevice } from '../services/device';
import type { Child, Entitlement, Guardian } from '../types';

type Status = 'loading' | 'signedOut' | 'signedIn';

export interface GuardianMe {
  guardian: Guardian;
  entitlement: Entitlement;
  children: Child[];
  stepUpValidUntil: string | null;
  pendingDeletion: { requestedAt: string; scheduledFor: string } | null;
}

interface SessionResponse {
  token: string;
  expiresAt: string;
  guardian: Guardian;
  entitlement: Entitlement;
  children: Child[];
}

export interface Challenge {
  challengeId: string;
  phoneMasked: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

interface GuardianCtx {
  status: Status;
  me: GuardianMe | null;
  guardian: Guardian | null;
  entitlement: Entitlement;
  children: Child[];
  /** Entitlement as the server last said, with the cached expiry applied locally. */
  entitled: boolean;
  offline: boolean;
  stepUpValid: boolean;
  registerStart: (input: { name: string; phone: string; password: string }) => Promise<Challenge>;
  registerVerify: (challengeId: string, code: string) => Promise<void>;
  loginStart: (phone: string, password: string) => Promise<Challenge>;
  loginVerify: (challengeId: string, code: string) => Promise<void>;
  resendCode: (challengeId: string) => Promise<Challenge>;
  recoveryStart: (phone: string) => Promise<{ challengeId: string | null; phone: string | null }>;
  recoveryVerify: (challengeId: string, code: string, newPassword: string) => Promise<void>;
  stepUpStart: () => Promise<Challenge>;
  stepUpVerify: (challengeId: string, code: string) => Promise<void>;
  refresh: () => Promise<GuardianMe | null>;
  updateProfile: (patch: { name?: string; email?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  signOutEverywhere: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ scheduledFor: string }>;
  cancelDeletion: () => Promise<void>;
}

const TOKEN_KEY = 'loji.guardianToken';
const ME_KEY = 'loji.guardianMe.v1';
const NO_ENTITLEMENT: Entitlement = { active: false, status: 'never_subscribed', validUntil: null };

const GuardianContext = createContext<GuardianCtx | null>(null);

/** Cached entitlement is only honoured until its own validUntil. */
function effectiveEntitlement(e: Entitlement | undefined | null): Entitlement {
  if (!e) return NO_ENTITLEMENT;
  if (e.active && e.validUntil && new Date(e.validUntil).getTime() < Date.now()) return { ...e, active: false, status: 'expired' };
  return e;
}

export function GuardianProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(isBackendConfigured ? 'loading' : 'signedOut');
  const [me, setMe] = useState<GuardianMe | null>(null);
  const [offline, setOffline] = useState(false);

  const clearLocal = useCallback(async () => {
    setAuthToken('guardian', null);
    setMe(null);
    setStatus('signedOut');
    await secureDelete(TOKEN_KEY);
    await AsyncStorage.removeItem(ME_KEY).catch(() => undefined);
  }, []);

  const remember = useCallback(async (m: GuardianMe) => {
    setMe(m);
    await AsyncStorage.setItem(ME_KEY, JSON.stringify(m)).catch(() => undefined);
  }, []);

  const refresh = useCallback(async (): Promise<GuardianMe | null> => {
    try {
      const m = await apiRequest<GuardianMe>('/v1/guardian/me');
      await remember(m);
      setOffline(false);
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await clearLocal();
      else if (e instanceof ApiError && e.isNetwork) setOffline(true);
      return null;
    }
  }, [remember, clearLocal]);

  const applySession = useCallback(
    async (res: SessionResponse) => {
      setAuthToken('guardian', res.token);
      await secureSet(TOKEN_KEY, res.token);
      await remember({ guardian: res.guardian, entitlement: res.entitlement, children: res.children, stepUpValidUntil: new Date(Date.now() + 15 * 60_000).toISOString(), pendingDeletion: null });
      setStatus('signedIn');
      void syncDevice();
    },
    [remember]
  );

  useEffect(() => {
    if (!isBackendConfigured) return;
    setUnauthorizedHandler('guardian', () => void clearLocal());
    (async () => {
      const token = await secureGet(TOKEN_KEY);
      if (!token) {
        setStatus('signedOut');
        void syncDevice();
        return;
      }
      setAuthToken('guardian', token);
      const cached = await AsyncStorage.getItem(ME_KEY).catch(() => null);
      if (cached) {
        setMe(JSON.parse(cached) as GuardianMe);
        setStatus('signedIn');
      }
      const live = await refresh();
      if (live || cached) setStatus('signedIn');
      else if (!live) setStatus('signedIn'); // offline with no cache: show the console shell; requests will surface the state
      void syncDevice();
    })();
    return () => setUnauthorizedHandler('guardian', null);
  }, [clearLocal, refresh]);

  const withInstall = useCallback(async (body: Record<string, unknown>) => ({ ...body, installId: await getInstallId() }), []);

  const value = useMemo<GuardianCtx>(
    () => ({
      status,
      me,
      guardian: me?.guardian ?? null,
      entitlement: effectiveEntitlement(me?.entitlement),
      children: me?.children ?? [],
      entitled: effectiveEntitlement(me?.entitlement).active,
      offline,
      stepUpValid: !!me?.stepUpValidUntil && new Date(me.stepUpValidUntil).getTime() > Date.now(),
      registerStart: (input) => apiRequest<Challenge>('/v1/guardian/register/start', { method: 'POST', as: false, body: { ...input, acceptTerms: true } }),
      registerVerify: async (challengeId, code) => applySession(await apiRequest<SessionResponse>('/v1/guardian/register/verify', { method: 'POST', as: false, body: await withInstall({ challengeId, code }) })),
      loginStart: (phone, password) => apiRequest<Challenge>('/v1/guardian/login', { method: 'POST', as: false, body: { phone, password } }),
      loginVerify: async (challengeId, code) => applySession(await apiRequest<SessionResponse>('/v1/guardian/login/verify', { method: 'POST', as: false, body: await withInstall({ challengeId, code }) })),
      resendCode: (challengeId) => apiRequest<Challenge>('/v1/guardian/otp/resend', { method: 'POST', as: false, body: { challengeId } }),
      recoveryStart: (phone) => apiRequest<{ challengeId: string | null; phone: string | null }>('/v1/guardian/recovery/start', { method: 'POST', as: false, body: { phone } }),
      recoveryVerify: async (challengeId, code, newPassword) => applySession(await apiRequest<SessionResponse>('/v1/guardian/recovery/verify', { method: 'POST', as: false, body: await withInstall({ challengeId, code, newPassword }) })),
      stepUpStart: () => apiRequest<Challenge>('/v1/guardian/step-up/start', { method: 'POST' }),
      stepUpVerify: async (challengeId, code) => {
        const r = await apiRequest<{ stepUpValidUntil: string }>('/v1/guardian/step-up/verify', { method: 'POST', body: { challengeId, code } });
        if (me) await remember({ ...me, stepUpValidUntil: r.stepUpValidUntil });
      },
      refresh,
      updateProfile: async (patch) => {
        const g = await apiRequest<Guardian>('/v1/guardian/me', { method: 'PATCH', body: patch });
        if (me) await remember({ ...me, guardian: g });
      },
      changePassword: (currentPassword, newPassword) => apiRequest('/v1/guardian/password', { method: 'POST', body: { currentPassword, newPassword } }),
      signOut: async () => {
        await apiRequest('/v1/guardian/logout', { method: 'POST' }).catch(() => undefined);
        await clearLocal();
        void syncDevice();
      },
      signOutEverywhere: async () => {
        await apiRequest('/v1/guardian/logout-all', { method: 'POST' });
        await refresh();
      },
      deleteAccount: async (password) => {
        const r = await apiRequest<{ scheduledFor: string }>('/v1/guardian/me', { method: 'DELETE', body: { password } });
        await refresh();
        return r;
      },
      cancelDeletion: async () => {
        await apiRequest('/v1/guardian/me/deletion/cancel', { method: 'POST' });
        await refresh();
      },
    }),
    [status, me, offline, applySession, withInstall, refresh, remember, clearLocal]
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian() {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error('useGuardian must be used inside GuardianProvider');
  return ctx;
}
