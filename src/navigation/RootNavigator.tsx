import React, { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationState, useNavigationContainerRef, useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, RootTabParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { SpaceScreen } from '../spaces/ui/SpaceScreen';
import { ParadiseScreen } from '../paradise/ui/ParadiseScreen';
import { GardenOverviewScreen } from '../garden/overview/GardenOverviewScreen';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { MuseumScreen } from '../museum/ui/MuseumScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { useSettings } from '../context/SettingsContext';
import { getLanguage, Language, normaliseLanguage, setLanguage, useLanguage, t } from '../i18n';
import { LanguagePopup } from '../components/LanguagePopup';
import { useEffect } from 'react';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { GroupSetupScreen } from '../screens/GroupSetupScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { GroupLobbyScreen } from '../screens/GroupLobbyScreen';
import { useRemoteConfig } from '../context/RemoteConfigContext';
import { isBackendConfigured } from '../config/env';
import { ActiveSessionScreen } from '../screens/ActiveSessionScreen';
import { ContentBrowserScreen } from '../screens/ContentBrowserScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { track } from '../services/analytics';
import { useTheme } from '../theme/ThemeContext';
import { FloatingTabBar, TabSpec } from '../ui/TabBar';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const BalconyTab = () => <SpaceScreen space="balcony" />;
/** The Garden tab: the new overview (island, statistics, planting record) with the painted garden scene one tap away.
 * Arriving with a freshly grown plant opens the scene, where it is welcomed. */
function GardenTab() {
  const route = useRoute<{ key: string; name: string; params?: { arrival?: string } }>();
  const insets = useSafeAreaInsets();
  const [scene, setScene] = React.useState(!!route.params?.arrival);
  React.useEffect(() => {
    if (route.params?.arrival) setScene(true);
  }, [route.params?.arrival]);
  if (!scene) return <GardenOverviewScreen onOpenScene={() => setScene(true)} />;
  return (
    <View style={{ flex: 1 }}>
      <ParadiseScreen />
      <Pressable
        onPress={() => setScene(false)}
        accessibilityRole="button"
        accessibilityLabel="Back to the garden overview"
        style={{ position: 'absolute', left: 12, top: insets.top + 4, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(15,59,44,0.85)' }}
      >
        <Icon name="chevronLeft" size={16} color="#fff" />
        <AppText variant="caption" style={{ color: '#fff' }}>
          Overview
        </AppText>
      </Pressable>
    </View>
  );
}

function Tabs() {
  useLanguage();
  // The Friends tab needs an account server; it sits next to Progress.
  const { config } = useRemoteConfig();
  const showFriends = isBackendConfigured && config.features.accounts;
  const TABS: Record<keyof RootTabParamList, TabSpec> = {
    Home: { icon: 'home', label: t('tabs.home') },
    History: { icon: 'sprout', label: t('tabs.balcony') },
    Garden: { icon: 'trees', label: t('tabs.garden') },
    Museum: { icon: 'images', label: t('tabs.museum') },
    Friends: { icon: 'users', label: t('tabs.friends') },
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
      <Tab.Screen name="Museum" component={MuseumScreen} />
      {showFriends && <Tab.Screen name="Friends" component={FriendsScreen} />}
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { settings, loading, updateSettings } = useSettings();
  // every time the app opens, it first asks for the language
  const [askLanguage, setAskLanguage] = useState(true);
  // the chosen language applies before anything renders
  useEffect(() => {
    if (settings.language) setLanguage(settings.language);
  }, [settings.language]);
  // A language change remounts the screens so every label updates at once;
  // the navigation state is kept, so the person stays where they were.
  const language = useLanguage();
  const navState = useRef<NavigationState | undefined>(undefined);
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
  // the first screen depends on whether a language was chosen
  if (loading) return null;

  // One screen_view per screen change (feeds "Top screens" in the admin).
  const onRouteChange = () => {
    const name = navRef.getCurrentRoute()?.name;
    if (name && name !== lastRoute.current) {
      lastRoute.current = name;
      track('screen_view', { screen: name });
    }
  };

  const chooseLanguage = (l: Language) => {
    setAskLanguage(false);
    if (l !== normaliseLanguage(settings.language)) void updateSettings({ language: l });
  };

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer
      key={language}
      theme={navTheme}
      ref={navRef}
      initialState={navState.current}
      onReady={onRouteChange}
      onStateChange={(st) => {
        navState.current = st;
        onRouteChange();
      }}
    >
      {/* the language screen is opened from Settings; the popup asks on every launch */}
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Tabs">
        <Stack.Screen name="Language" component={LanguageScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen
          name="ActiveSession"
          component={ActiveSessionScreen}
          options={{ gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="ContentBrowser" component={ContentBrowserScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="GroupSetup" component={GroupSetupScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="GroupLobby" component={GroupLobbyScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
    {askLanguage && <LanguagePopup current={normaliseLanguage(settings.language) ?? getLanguage()} onChoose={chooseLanguage} />}
    </View>
  );
}
