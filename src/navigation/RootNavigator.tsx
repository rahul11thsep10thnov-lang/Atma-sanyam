import React, { useRef } from 'react';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { RootStackParamList, RootTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { BalconyWorldScreen } from '../balconyWorld/ui/BalconyWorldScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActiveSessionScreen } from '../screens/ActiveSessionScreen';
import { ContentBrowserScreen } from '../screens/ContentBrowserScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { track } from '../services/analytics';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Home: '🧩',
  History: '🪴',
  Settings: '⚙️',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={BalconyWorldScreen} options={{ title: 'Balcony' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const lastRoute = useRef<string | undefined>(undefined);

  // One screen_view per screen change (feeds "Top screens" in the admin).
  const onRouteChange = () => {
    const name = navRef.getCurrentRoute()?.name;
    if (name && name !== lastRoute.current) {
      lastRoute.current = name;
      track('screen_view', { screen: name });
    }
  };

  return (
    <NavigationContainer theme={navTheme} ref={navRef} onReady={onRouteChange} onStateChange={onRouteChange}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="ActiveSession"
          component={ActiveSessionScreen}
          options={{ gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="ContentBrowser" component={ContentBrowserScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
