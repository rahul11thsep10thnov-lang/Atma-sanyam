import { createContext, useContext, useState, ReactNode } from "react";
import { clearToken, getStoredToken, storeToken } from "../api/client";

interface AuthContextValue {
  isAuthenticated: boolean;
  /** For showing/hiding super-admin controls only; the server enforces permissions. */
  role: string | null;
  login: (token: string, role?: string) => void;
  logout: () => void;
}

const ROLE_KEY = "atma_admin_role";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredToken());
  const [role, setRole] = useState<string | null>(localStorage.getItem(ROLE_KEY));

  const login = (token: string, r?: string) => {
    storeToken(token);
    if (r) localStorage.setItem(ROLE_KEY, r);
    setRole(r ?? null);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearToken();
    localStorage.removeItem(ROLE_KEY);
    setRole(null);
    setIsAuthenticated(false);
  };

  return <AuthContext.Provider value={{ isAuthenticated, role, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
