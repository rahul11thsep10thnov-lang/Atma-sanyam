import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { RemoteConfigProvider } from './src/context/RemoteConfigContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppGate } from './src/components/AppGate';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { setNotificationHandler } from './src/notifications/safeNotifications';
import { setAnalyticsEnabled, startAnalytics, track } from './src/services/analytics';
import { setPushEnabled } from './src/services/device';

setNotificationHandler();
// Hold the splash until the UI font is ready, so the first frame is already
// set in Manrope (App() hides it; a font failure still lets the app through).
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Keeps the analytics consent switch in Settings authoritative.
function AnalyticsConsent() {
  const { settings, loading } = useSettings();
  useEffect(() => {
    if (loading) return;
    setAnalyticsEnabled(settings.analyticsEnabled);
    if (settings.analyticsEnabled) {
      void startAnalytics().then(() => track('app_open'));
    }
  }, [loading, settings.analyticsEnabled]);

  // Push tokens can rotate (reinstall, OS restore); refresh it on launch so
  // announcements keep reaching people who opted in. Never prompts again if
  // permission was already decided.
  useEffect(() => {
    if (!loading && settings.pushEnabled) void setPushEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  return null;
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <SettingsProvider>
            <ThemeProvider>
              <RemoteConfigProvider>
                <AuthProvider>
                  <AnalyticsConsent />
                  <AppGate>
                    <RootNavigator />
                  </AppGate>
                  <ThemedStatusBar />
                </AuthProvider>
              </RemoteConfigProvider>
            </ThemeProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
