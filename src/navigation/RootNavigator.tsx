import React, { useRef } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, RootTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { SpaceScreen } from '../spaces/ui/SpaceScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { useSettings } from '../context/SettingsContext';
import { setLanguage, useLanguage, t } from '../i18n';
import { useEffect } from 'react';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ActiveSessionScreen } from '../screens/ActiveSessionScreen';
import { ContentBrowserScreen } from '../screens/ContentBrowserScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { track } from '../services/analytics';
import { useTheme } from '../theme/ThemeContext';
import { FloatingTabBar, TabSpec } from '../ui/TabBar';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const BalconyTab = () => <SpaceScreen space="balcony" />;
const GardenTab = () => <SpaceScreen space="garden" />;
const RoomTab = () => <SpaceScreen space="room" />;

function Tabs() {
  useLanguage();
  const TABS: Record<keyof RootTabParamList, TabSpec> = {
    Home: { icon: 'home', label: t('tabs.home') },
    History: { icon: 'sprout', label: t('tabs.balcony') },
    Garden: { icon: 'trees', label: t('tabs.garden') },
    Room: { icon: 'lamp', label: t('tabs.room') },
    Progress: { icon: 'chart', label: t('tabs.progress') },
    Settings: { icon: 'settings', label: t('tabs.settings') },
  };
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} specs={TABS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={BalconyTab} options={{ title: 'Balcony' }} />
      <Tab.Screen name="Garden" component={GardenTab} />
      <Tab.Screen name="Room" component={RoomTab} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { settings, loading } = useSettings();
  // the chosen language applies before anything renders
  useEffect(() => {
    if (settings.language) setLanguage(settings.language);
  }, [settings.language]);
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surfaceRaised,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
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
        {!loading && !settings.language && <Stack.Screen name="Language" component={LanguageScreen} options={{ animation: 'fade' }} />}
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
