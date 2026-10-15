import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { RemoteConfigProvider } from './src/context/RemoteConfigContext';
import { GuardianProvider } from './src/context/GuardianContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { ConsoleProvider } from './src/context/ConsoleContext';
import { AppGate } from './src/components/AppGate';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { setNotificationHandler } from './src/notifications/safeNotifications';
import { setAnalyticsEnabled, startAnalytics, track } from './src/services/analytics';
import { setPushEnabled } from './src/services/device';

setNotificationHandler();
SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Keeps the analytics consent switch in Settings authoritative.
function AnalyticsConsent() {
  const { settings, loading } = useSettings();
  useEffect(() => {
    if (loading) return;
    setAnalyticsEnabled(settings.analyticsEnabled);
    if (settings.analyticsEnabled) void startAnalytics().then(() => track('app_open'));
  }, [loading, settings.analyticsEnabled]);
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
  const [fontsLoaded, fontError] = useFonts({ Manrope_600SemiBold, Manrope_700Bold, Fredoka_600SemiBold, Fredoka_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });
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
                <ConsoleProvider>
                  <GuardianProvider>
                    <PlayerProvider>
                      <AnalyticsConsent />
                      <AppGate>
                        <RootNavigator />
                      </AppGate>
                      <ThemedStatusBar />
                    </PlayerProvider>
                  </GuardianProvider>
                </ConsoleProvider>
              </RemoteConfigProvider>
            </ThemeProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
