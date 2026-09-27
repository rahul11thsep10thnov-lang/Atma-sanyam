// Optional accounts. The app is fully usable signed-out; an account links
// devices (for targeted announcements) and enables in-app account deletion.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest, ApiError, setAuthToken, setUnauthorizedHandler } from '../services/apiClient';
import { secureDelete, secureGet, secureSet } from '../services/secureStorage';
import { syncDevice } from '../services/device';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthCtx {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const TOKEN_KEY = 'focus.sessionToken';
const USER_KEY = 'focus.user.v1';

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>(isBackendConfigured ? 'loading' : 'signedOut');
  const [user, setUser] = useState<User | null>(null);

  const clearLocal = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    setStatus('signedOut');
    await secureDelete(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY).catch(() => undefined);
  }, []);

  const applySession = useCallback(async (token: string, u: User) => {
    setAuthToken(token);
    await secureSet(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => undefined);
    setUser(u);
    setStatus('signedIn');
    void syncDevice();
  }, []);

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
        setUser(JSON.parse(cached) as User);
        setStatus('signedIn');
      }
      try {
        const me = await apiRequest<User>('/v1/me');
        setUser(me);
        setStatus('signedIn');
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(me)).catch(() => undefined);
        void syncDevice();
      } catch (e) {
        // Offline: stay signed in with the cached profile. Revoked: sign out.
        if (e instanceof ApiError && e.status === 401) await clearLocal();
        else if (!cached) setStatus('signedIn');
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearLocal]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ token: string; user: User }>('/v1/auth/login', { method: 'POST', body: { email, password }, auth: false });
      await applySession(res.token, res.user);
    },
    [applySession]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const res = await apiRequest<{ token: string; user: User }>('/v1/auth/register', {
        method: 'POST',
        body: { email, password, ...(displayName ? { displayName } : {}) },
        auth: false,
      });
      await applySession(res.token, res.user);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    await apiRequest('/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clearLocal();
    void syncDevice();
  }, [clearLocal]);

  const deleteAccount = useCallback(
    async (password: string) => {
      await apiRequest('/v1/me', { method: 'DELETE', body: { password } });
      await clearLocal();
      void syncDevice();
    },
    [clearLocal]
  );

  return (
    <AuthContext.Provider value={{ status, user, signIn, signUp, signOut, deleteAccount }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
