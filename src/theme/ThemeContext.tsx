// Active colour set for the whole app. Two identities (Player Console is
// candy-bright and playful; Guardian Console is a calm dashboard) resolved
// against the appearance setting ('system' | 'light' | 'dark'). Screens read
// `useTheme()`; a console sets its identity with <ThemeMode mode="…">.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { guardianDark, guardianLight, playerDark, playerLight, ThemeColors, ThemeMode as Mode } from './colors';
import { shadows } from './shadows';
import { useSettings } from '../context/SettingsContext';

export type Appearance = 'system' | 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  shadow: ReturnType<typeof shadows>;
  isDark: boolean;
  mode: Mode;
}

const ThemeContext = createContext<Theme>({ colors: playerLight, shadow: shadows(playerLight.shadow), isDark: false, mode: 'player' });
const ModeContext = createContext<Mode>('player');

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeMode mode="player">{children}</ThemeMode>;
}

export function ThemeMode({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  const osScheme = useColorScheme();
  const { settings } = useSettings();
  const appearance: Appearance = settings.appearance ?? 'system';
  const isDark = appearance === 'dark' || (appearance === 'system' && osScheme === 'dark');
  const value = useMemo<Theme>(() => {
    const c = mode === 'guardian' ? (isDark ? guardianDark : guardianLight) : isDark ? playerDark : playerLight;
    return { colors: c, shadow: shadows(c.shadow), isDark, mode };
  }, [isDark, mode]);
  return (
    <ModeContext.Provider value={mode}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </ModeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useThemeMode(): Mode {
  return useContext(ModeContext);
}
