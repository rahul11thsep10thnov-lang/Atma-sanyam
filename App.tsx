import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { RemoteConfigProvider } from './src/context/RemoteConfigContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppGate } from './src/components/AppGate';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { setNotificationHandler } from './src/notifications/safeNotifications';
import { setAnalyticsEnabled, startAnalytics, track } from './src/services/analytics';
import { setPushEnabled } from './src/services/device';

setNotificationHandler();

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

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <SettingsProvider>
            <RemoteConfigProvider>
              <AuthProvider>
                <AnalyticsConsent />
                <AppGate>
                  <RootNavigator />
                </AppGate>
                <StatusBar style="dark" />
              </AuthProvider>
            </RemoteConfigProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
