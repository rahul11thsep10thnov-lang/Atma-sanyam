// Which console the device was last showing (guardian or player), so a
// household phone reopens where it left off.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ConsoleKind = 'guardian' | 'player' | null;
const KEY = 'loji.activeConsole.v1';

const Ctx = createContext<{ console: ConsoleKind; setConsole: (c: ConsoleKind) => void }>({ console: null, setConsole: () => undefined });

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ConsoleKind>(null);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'guardian' || v === 'player') && setCurrent(v))
      .catch(() => undefined);
  }, []);
  const setConsole = useCallback((c: ConsoleKind) => {
    setCurrent(c);
    if (c) AsyncStorage.setItem(KEY, c).catch(() => undefined);
    else AsyncStorage.removeItem(KEY).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({ console: current, setConsole }), [current, setConsole]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useConsole = () => useContext(Ctx);
