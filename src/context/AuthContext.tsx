// Accounts. The app is fully usable signed-out; an account is phone-first: a
// one-time code by SMS signs you in (and creates the account the first
// time), then a password, a username and an avatar are set. Accounts made
// with an email keep working with email + password.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest, ApiError, setAuthToken, setUnauthorizedHandler } from '../services/apiClient';
import { secureDelete, secureGet, secureSet } from '../services/secureStorage';
import { syncDevice } from '../services/device';

export interface User {
  id: string;
  phone: string | null;
  phoneMasked: string | null;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarId: string | null;
  allowPokes: boolean;
  discoverableByPhone: boolean;
  hasPassword: boolean;
  createdAt: string;
}

/** What a new account still has to do before it is complete. */
export interface Onboarding {
  needsPassword: boolean;
  needsUsername: boolean;
}

export interface ProfilePatch {
  displayName?: string | null;
  username?: string;
  avatarId?: string | null;
  allowPokes?: boolean;
  discoverableByPhone?: boolean;
}

type Status = 'loading' | 'signedOut' | 'signedIn';
type SessionResponse = { token: string; user: User; onboarding: Onboarding };

interface AuthCtx {
  status: Status;
  user: User | null;
  onboarding: Onboarding | null;
  /** Sends a one-time code; resolves with how long to wait before asking again. */
  requestOtp: (phone: string) => Promise<{ phoneMasked: string; resendAfterSeconds: number }>;
  verifyOtp: (phone: string, code: string) => Promise<Onboarding>;
  /** `identifier` is a mobile number or, for older accounts, an email. */
  signInWithPassword: (identifier: string, password: string) => Promise<Onboarding>;
  /** No current password is needed on first set-up or right after a code sign-in. */
  setPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  checkUsername: (username: string) => Promise<{ available: boolean; reason: 'invalid' | 'reserved' | 'taken' | null }>;
  updateProfile: (patch: ProfilePatch) => Promise<User>;
  signOut: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  requestEmailReset: (email: string) => Promise<void>;
  confirmEmailReset: (email: string, code: string, newPassword: string) => Promise<void>;
}

const TOKEN_KEY = 'focus.sessionToken';
const USER_KEY = 'focus.user.v2';

const AuthContext = createContext<AuthCtx | null>(null);

const onboardingOf = (u: User): Onboarding => ({ needsPassword: !u.hasPassword, needsUsername: !u.username });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(isBackendConfigured ? 'loading' : 'signedOut');
  const [user, setUser] = useState<User | null>(null);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);

  const clearLocal = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setOnboarding(null);
    setStatus('signedOut');
    await secureDelete(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY).catch(() => undefined);
  }, []);

  const rememberUser = useCallback(async (u: User) => {
    setUser(u);
    setOnboarding(onboardingOf(u));
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => undefined);
  }, []);

  const applySession = useCallback(
    async (res: SessionResponse) => {
      setAuthToken(res.token);
      await secureSet(TOKEN_KEY, res.token);
      await rememberUser(res.user);
      setStatus('signedIn');
      void syncDevice();
      return res.onboarding;
    },
    [rememberUser]
  );

  useEffect(() => {
    if (!isBackendConfigured) return;
    setUnauthorizedHandler(() => {
      void clearLocal();
    });
    (async () => {
      const token = await secureGet(TOKEN_KEY);
      if (!token) {
        setStatus('signedOut');
        void syncDevice();
        return;
      }
      setAuthToken(token);
      const cached = await AsyncStorage.getItem(USER_KEY).catch(() => null);
      if (cached) {
        const u = JSON.parse(cached) as User;
        setUser(u);
        setOnboarding(onboardingOf(u));
        setStatus('signedIn');
      }
      try {
        const me = await apiRequest<User & { onboarding: Onboarding }>('/v1/me');
        await rememberUser(me);
        setStatus('signedIn');
        void syncDevice();
      } catch (e) {
        // Offline: stay signed in with the cached profile. Revoked: sign out.
        if (e instanceof ApiError && e.status === 401) await clearLocal();
        else if (!cached) setStatus('signedIn');
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearLocal, rememberUser]);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await apiRequest<{ phone: string; resendAfterSeconds: number }>('/v1/auth/otp/request', { method: 'POST', body: { phone }, auth: false });
    return { phoneMasked: res.phone, resendAfterSeconds: res.resendAfterSeconds };
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string) => applySession(await apiRequest<SessionResponse>('/v1/auth/otp/verify', { method: 'POST', body: { phone, code }, auth: false })),
    [applySession]
  );

  const signInWithPassword = useCallback(
    async (identifier: string, password: string) => {
      const body = identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password };
      return applySession(await apiRequest<SessionResponse>('/v1/auth/login', { method: 'POST', body, auth: false }));
    },
    [applySession]
  );

  const setPassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      await apiRequest('/v1/me/password', { method: 'POST', body: { newPassword, ...(currentPassword ? { currentPassword } : {}) } });
      if (user) await rememberUser({ ...user, hasPassword: true });
    },
    [user, rememberUser]
  );

  const checkUsername = useCallback(
    (username: string) => apiRequest<{ available: boolean; reason: 'invalid' | 'reserved' | 'taken' | null }>('/v1/usernames/availability', { query: { username } }),
    []
  );

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const u = await apiRequest<User & { onboarding: Onboarding }>('/v1/me', { method: 'PATCH', body: patch });
      await rememberUser(u);
      return u;
    },
    [rememberUser]
  );

  const signOut = useCallback(async () => {
    await apiRequest('/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clearLocal();
    void syncDevice();
  }, [clearLocal]);

  const deleteAccount = useCallback(
    async (password?: string) => {
      await apiRequest('/v1/me', { method: 'DELETE', body: password ? { password } : {} });
      await clearLocal();
      void syncDevice();
    },
    [clearLocal]
  );

  const requestEmailReset = useCallback(async (email: string) => {
    await apiRequest('/v1/auth/password-reset/request', { method: 'POST', body: { email }, auth: false });
  }, []);

  const confirmEmailReset = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await applySession(await apiRequest<SessionResponse>('/v1/auth/password-reset/confirm', { method: 'POST', body: { email, code, newPassword }, auth: false }));
    },
    [applySession]
  );

  return (
    <AuthContext.Provider
      value={{ status, user, onboarding, requestOtp, verifyOtp, signInWithPassword, setPassword, checkUsername, updateProfile, signOut, deleteAccount, requestEmailReset, confirmEmailReset }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
