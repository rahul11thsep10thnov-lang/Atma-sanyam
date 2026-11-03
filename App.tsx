import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Pressable, Text, View } from 'react-native';
import { DaduProvider, useDadu } from './src/dadu/state/DaduContext';
import { DaduNavigator } from './src/dadu/navigation/DaduNavigator';
import { DADU_ENABLED } from './src/config/features';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { RemoteConfigProvider } from './src/context/RemoteConfigContext';
import { AuthProvider } from './src/context/AuthContext';
import { SocialProvider } from './src/social/SocialContext';
import { PokeOverlay } from './src/components/social/PokeOverlay';
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

// DADU is the product; the legacy Tame navigator (its own NavigationContainer)
// is shown instead only while a parent opened it from DADU's settings.
function ProductSwitch() {
  const { legacyOpen, setLegacyOpen, prefs } = useDadu();
  if (!legacyOpen) return <DaduNavigator />;
  return (
    <View style={{ flex: 1 }}>
      <RootNavigator />
      <PokeOverlay />
      <Pressable accessibilityRole="button" onPress={() => setLegacyOpen(false)} testID="back-to-dadu"
        style={{ position: 'absolute', top: 44, left: 12, backgroundColor: '#2F3C7E', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
        <Text style={{ color: '#fff', fontFamily: 'Baloo2_700Bold', fontSize: 14 }}>{prefs.primary === 'hi' ? '← DADU पर वापस' : '← Back to DADU'}</Text>
      </Pressable>
    </View>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Caveat_700Bold, BebasNeue_400Regular, Baloo2_700Bold, Baloo2_800ExtraBold, Nunito_400Regular, Nunito_700Bold });
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
                  <SocialProvider>
                    <AnalyticsConsent />
                    <AppGate>
                      {DADU_ENABLED ? (
                        <DaduProvider>
                          <ProductSwitch />
                        </DaduProvider>
                      ) : (
                        <>
                          <RootNavigator />
                          <PokeOverlay />
                        </>
                      )}
                    </AppGate>
                    <ThemedStatusBar />
                  </SocialProvider>
                </AuthProvider>
              </RemoteConfigProvider>
            </ThemeProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
