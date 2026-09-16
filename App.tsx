import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SettingsProvider } from './src/context/SettingsContext';
import { setNotificationHandler } from './src/notifications/safeNotifications';

setNotificationHandler();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
