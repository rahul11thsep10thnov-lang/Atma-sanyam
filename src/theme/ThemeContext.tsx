// Active colour scheme for the whole app. The appearance setting
// ('system' | 'light' | 'dark', Settings → Appearance) resolves against the
// OS scheme; screens and ui/ components read `useTheme()` instead of the
// static `colors` object so dark mode is a data change, not a rewrite.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';
import { shadows } from './shadows';
import { useSettings } from '../context/SettingsContext';

export type Appearance = 'system' | 'light' | 'dark';

export interface Theme {
  colors: ThemeColors;
  shadow: ReturnType<typeof shadows>;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ colors: lightColors, shadow: shadows(lightColors.shadow), isDark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme();
  const { settings } = useSettings();
  const appearance: Appearance = settings.appearance ?? 'system';
  const isDark = appearance === 'dark' || (appearance === 'system' && osScheme === 'dark');
  const value = useMemo<Theme>(() => {
    const c = isDark ? darkColors : lightColors;
    return { colors: c, shadow: shadows(c.shadow), isDark };
  }, [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
