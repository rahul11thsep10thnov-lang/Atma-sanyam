import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, NavigationState, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GuardianTabParamList, PlayerTabParamList, RootStackParamList } from './types';
import { useSettings } from '../context/SettingsContext';
import { useGuardian } from '../context/GuardianContext';
import { usePlayer } from '../context/PlayerContext';
import { setLanguage, t, useLanguage } from '../i18n';
import { track } from '../services/analytics';
import { ThemeMode, useTheme } from '../theme/ThemeContext';
import { FloatingTabBar, TabSpec } from '../ui/TabBar';
import { useConsole } from '../context/ConsoleContext';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { GuardianRegisterScreen, GuardianLoginScreen, GuardianOtpScreen, GuardianRecoveryScreen } from '../screens/guardian/AuthScreens';
import { DashboardScreen } from '../screens/guardian/DashboardScreen';
import { ChildrenScreen } from '../screens/guardian/ChildrenScreen';
import { ChildDetailScreen } from '../screens/guardian/ChildDetailScreen';
import { ChildEditorScreen } from '../screens/guardian/ChildEditorScreen';
import { ControlsScreen } from '../screens/guardian/ControlsScreen';
import { MirrorScreen } from '../screens/guardian/MirrorScreen';
import { SubscriptionScreen } from '../screens/guardian/SubscriptionScreen';
import { GuardianSettingsScreen, ChangePasswordScreen } from '../screens/guardian/SettingsScreen';
import { StepUpScreen } from '../screens/guardian/StepUpScreen';
import { PlayerLoginScreen, PlayerOtpScreen } from '../screens/player/PlayerLoginScreen';
import { PlayerHomeScreen } from '../screens/player/PlayerHomeScreen';
import { GamesScreen } from '../screens/player/GamesScreen';
import { GameDetailScreen } from '../screens/player/GameDetailScreen';
import { GamePlayScreen } from '../screens/player/GamePlayScreen';
import { CraftLibraryScreen } from '../screens/player/CraftLibraryScreen';
import { CraftDetailScreen } from '../screens/player/CraftDetailScreen';
import { FactsScreen } from '../screens/player/FactsScreen';
import { FactDetailScreen } from '../screens/player/FactDetailScreen';
import { ProgressScreen } from '../screens/player/ProgressScreen';
import { AdultGateScreen } from '../screens/player/AdultGateScreen';

const GuardianTab = createBottomTabNavigator<GuardianTabParamList>();
const PlayerTab = createBottomTabNavigator<PlayerTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function GuardianTabs() {
  useLanguage();
  const TABS: Record<keyof GuardianTabParamList, TabSpec> = {
    Dashboard: { icon: 'home', label: t('tabs.dashboard') },
    Children: { icon: 'users', label: t('tabs.children') },
    Plan: { icon: 'creditCard', label: t('tabs.subscription') },
    Settings: { icon: 'settings', label: t('tabs.settings') },
  };
  return (
    <ThemeMode mode="guardian">
      <GuardianTab.Navigator tabBar={(props) => <FloatingTabBar {...props} specs={TABS} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
        <GuardianTab.Screen name="Dashboard" component={DashboardScreen} />
        <GuardianTab.Screen name="Children" component={ChildrenScreen} />
        <GuardianTab.Screen name="Plan" component={SubscriptionScreen} />
        <GuardianTab.Screen name="Settings" component={GuardianSettingsScreen} />
      </GuardianTab.Navigator>
    </ThemeMode>
  );
}

function PlayerTabs() {
  useLanguage();
  const TABS: Record<keyof PlayerTabParamList, TabSpec> = {
    Home: { icon: 'home', label: t('tabs.home') },
    Games: { icon: 'puzzle', label: t('tabs.games') },
    Craft: { icon: 'scissors', label: t('tabs.craft') },
    Facts: { icon: 'lightbulb', label: t('tabs.facts') },
    Progress: { icon: 'trophy', label: t('tabs.progress') },
  };
  return (
    <PlayerTab.Navigator tabBar={(props) => <FloatingTabBar {...props} specs={TABS} playful />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}>
      <PlayerTab.Screen name="Home" component={PlayerHomeScreen} />
      <PlayerTab.Screen name="Games" component={GamesScreen} />
      <PlayerTab.Screen name="Craft" component={CraftLibraryScreen} />
      <PlayerTab.Screen name="Facts" component={FactsScreen} />
      <PlayerTab.Screen name="Progress" component={ProgressScreen} />
    </PlayerTab.Navigator>
  );
}

// Guardian screens outside the tabs render in the guardian identity. The
// wrapped types are created once, here: creating them inside a render would
// give React a new component type every time and remount the screen.
const guardian = <P extends object>(Component: React.ComponentType<P>) =>
  function GuardianWrapped(props: P) {
    return (
      <ThemeMode mode="guardian">
        <Component {...props} />
      </ThemeMode>
    );
  };
const GRegister = guardian(GuardianRegisterScreen);
const GLogin = guardian(GuardianLoginScreen);
const GOtp = guardian(GuardianOtpScreen);
const GRecovery = guardian(GuardianRecoveryScreen);
const GChildDetail = guardian(ChildDetailScreen);
const GChildEditor = guardian(ChildEditorScreen);
const GControls = guardian(ControlsScreen);
const GMirror = guardian(MirrorScreen);
const GSubscription = guardian(SubscriptionScreen);
const GChangePassword = guardian(ChangePasswordScreen);
const GStepUp = guardian(StepUpScreen);

export function RootNavigator() {
  const { colors, isDark } = useTheme();
  const { settings, loading } = useSettings();
  const g = useGuardian();
  const p = usePlayer();
  const { console: active } = useConsole();
  useEffect(() => {
    if (settings.language) setLanguage(settings.language);
  }, [settings.language]);
  const language = useLanguage();
  const navState = useRef<NavigationState | undefined>(undefined);
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: colors.background, card: colors.surfaceRaised, text: colors.text, border: colors.border, primary: colors.primary },
  };
  const navRef = useNavigationContainerRef<RootStackParamList>();
  const lastRoute = useRef<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  // The first screen depends on which sessions exist and which console was last used.
  const initialRoute: keyof RootStackParamList =
    g.status === 'loading' || p.status === 'loading'
      ? 'Welcome'
      : active === 'player' && p.status === 'signedIn'
        ? 'PlayerConsole'
        : active === 'guardian' && g.status === 'signedIn'
          ? 'GuardianConsole'
          : p.status === 'signedIn'
            ? 'PlayerConsole'
            : g.status === 'signedIn'
              ? 'GuardianConsole'
              : 'Welcome';

  useEffect(() => {
    if (!ready && g.status !== 'loading' && p.status !== 'loading' && !loading) setReady(true);
  }, [g.status, p.status, loading, ready]);

  // Being signed out (revoked, deleted) returns to Welcome.
  useEffect(() => {
    if (!ready || !navRef.isReady()) return;
    const route = navRef.getCurrentRoute()?.name;
    const inGuardian = ['GuardianConsole', 'ChildDetail', 'ChildEditor', 'Controls', 'Mirror', 'Subscription', 'ChangePassword', 'StepUp'].includes(route ?? '');
    const inPlayer = ['PlayerConsole', 'GameDetail', 'GamePlay', 'CraftDetail', 'FactDetail', 'AdultGate'].includes(route ?? '');
    if (inGuardian && g.status === 'signedOut') navRef.reset({ index: 0, routes: [{ name: p.status === 'signedIn' ? 'PlayerConsole' : 'Welcome' }] });
    if (inPlayer && p.status === 'signedOut') navRef.reset({ index: 0, routes: [{ name: g.status === 'signedIn' ? 'GuardianConsole' : 'Welcome' }] });
  }, [g.status, p.status, ready, navRef]);

  if (!ready) return null;

  const onRouteChange = () => {
    const name = navRef.getCurrentRoute()?.name;
    if (name && name !== lastRoute.current) {
      lastRoute.current = name;
      track('screen_view', { screen: name });
    }
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
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="GuardianRegister" component={GRegister} />
          <Stack.Screen name="GuardianLogin" component={GLogin} />
          <Stack.Screen name="GuardianOtp" component={GOtp} />
          <Stack.Screen name="GuardianRecovery" component={GRecovery} />
          <Stack.Screen name="GuardianConsole" component={GuardianTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="ChildDetail" component={GChildDetail} />
          <Stack.Screen name="ChildEditor" component={GChildEditor} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Controls" component={GControls} />
          <Stack.Screen name="Mirror" component={GMirror} />
          <Stack.Screen name="Subscription" component={GSubscription} />
          <Stack.Screen name="ChangePassword" component={GChangePassword} options={{ presentation: 'modal' }} />
          <Stack.Screen name="StepUp" component={GStepUp} options={{ presentation: 'modal' }} />
          <Stack.Screen name="PlayerLogin" component={PlayerLoginScreen} />
          <Stack.Screen name="PlayerOtp" component={PlayerOtpScreen} />
          <Stack.Screen name="PlayerConsole" component={PlayerTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="GamePlay" component={GamePlayScreen} options={{ gestureEnabled: false, animation: 'fade', orientation: 'portrait' }} />
          <Stack.Screen name="CraftDetail" component={CraftDetailScreen} />
          <Stack.Screen name="FactDetail" component={FactDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="AdultGate" component={AdultGateScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Legal" component={LegalScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
