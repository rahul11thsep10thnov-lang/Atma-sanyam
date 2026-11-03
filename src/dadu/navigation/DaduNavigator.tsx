// The DADU navigation tree: onboarding → tabs (World, Learn, Stories, Tests,
// Me) → world, lesson, story, parent screens. Little and Lap mode show three
// large icon-only tabs; Explorer mode shows five. The legacy Tame product is
// not nested here (it owns its own NavigationContainer); App.tsx switches to
// it when `legacyOpen` is set from Settings.
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DaduStackParamList, DaduTabParamList } from './types';
import { useDadu } from '../state/DaduContext';
import { ui } from '../i18n';
import { P, FONT } from '../ui/palette';
import { TabIcon } from './tabIcons';
import { LanguageScreen } from '../screens/onboarding/LanguageScreen';
import { ParentSetupScreen } from '../screens/onboarding/ParentSetupScreen';
import { ChildProfileScreen } from '../screens/onboarding/ChildProfileScreen';
import { ParentGateScreen } from '../screens/parent/ParentGateScreen';
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { SettingsScreen } from '../screens/parent/SettingsScreen';
import { WorldTab } from '../screens/world/WorldTab';
import { LocationScreen } from '../screens/world/LocationScreen';
import { ScreenTimeGuard } from '../screens/world/ScreenTimeGuard';
import { LearnTab } from '../screens/learn/LearnTab';
import { WorldHubScreen } from '../screens/learn/WorldHubScreen';
import { SectionScreen } from '../screens/learn/SectionScreen';
import { MeTab } from '../screens/me/MeTab';
import { AchievementsScreen } from '../screens/me/AchievementsScreen';
import { RenderPlayground } from '../render';
import { LessonScreen, StoryScreen, StoriesTab, TestsTab, AssignmentScreen, EchoScreen } from './learningScreens';
import { useSync } from '../api/sync';

const Stack = createNativeStackNavigator<DaduStackParamList>();
const Tab = createBottomTabNavigator<DaduTabParamList>();

const TAB_ICON: Record<keyof DaduTabParamList, 'world' | 'learn' | 'stories' | 'tests' | 'me'> = { World: 'world', Learn: 'learn', Stories: 'stories', Tests: 'tests', Me: 'me' };
const TAB_LABEL: Record<keyof DaduTabParamList, string> = { World: 'tabs.world', Learn: 'tabs.learn', Stories: 'tabs.stories', Tests: 'tabs.tests', Me: 'tabs.me' };

function DaduTabBar({ state, navigation }: BottomTabBarProps) {
  const { prefs, mode } = useDadu();
  const insets = useSafeAreaInsets();
  const little = mode !== 'explorer';
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const name = route.name as keyof DaduTabParamList;
        const active = state.index === i;
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={ui(TAB_LABEL[name], prefs)} testID={`tab-${TAB_ICON[name]}`}
            onPress={() => { if (!active) navigation.navigate(route.name); }}
            style={[s.tab, little && s.tabLittle, active && s.tabActive]}>
            <TabIcon name={TAB_ICON[name]} size={little ? 44 : 28} active={active} />
            {!little && <Text style={[s.tabText, active && { color: P.indigo }]}>{ui(TAB_LABEL[name], prefs)}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

function Tabs() {
  const { mode } = useDadu();
  const little = mode !== 'explorer';
  return (
    <ScreenTimeGuard>
      <Tab.Navigator tabBar={(p) => <DaduTabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: P.paper } }}>
        <Tab.Screen name="World" component={WorldTab} />
        <Tab.Screen name="Learn" component={LearnTab} />
        <Tab.Screen name="Stories" component={StoriesTab} />
        {!little && <Tab.Screen name="Tests" component={TestsTab} />}
        {!little && <Tab.Screen name="Me" component={MeTab} />}
      </Tab.Navigator>
    </ScreenTimeGuard>
  );
}

function PlaygroundScreen() {
  return <RenderPlayground />;
}

/** Route kept for the type list; opening it hands over to the legacy product (App.tsx switch). */
function LegacyTameScreen() {
  const { setLegacyOpen } = useDadu();
  useEffect(() => { setLegacyOpen(true); }, [setLegacyOpen]);
  return <View style={{ flex: 1, backgroundColor: P.paper }} />;
}

function SyncMount() { useSync(); return null; }

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: P.paper, card: P.card, text: P.ink, border: P.line, primary: P.indigo } };

export function DaduNavigator() {
  const { ready, profiles } = useDadu();
  if (!ready) return null;
  return (
    <NavigationContainer theme={theme}>
      <SyncMount />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: P.paper } }} initialRouteName={profiles.length ? 'Tabs' : 'Language'}>
        <Stack.Screen name="Language" component={LanguageScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="ParentSetup" component={ParentSetupScreen} />
        <Stack.Screen name="ChildProfile" component={ChildProfileScreen} />
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Location" component={LocationScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Lesson" component={LessonScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Activity" component={LocationScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Story" component={StoryScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Assignment" component={AssignmentScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Echo" component={EchoScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Section" component={SectionScreen} />
        <Stack.Screen name="WorldHub" component={WorldHubScreen} />
        <Stack.Screen name="Achievements" component={AchievementsScreen} />
        <Stack.Screen name="ParentGate" component={ParentGateScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Playground" component={PlaygroundScreen} />
        <Stack.Screen name="LegacyTame" component={LegacyTameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: P.card, borderTopWidth: 2, borderTopColor: P.line, paddingTop: 8, paddingHorizontal: 8 },
  tab: { alignItems: 'center', gap: 2, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 14, minWidth: 54 },
  tabLittle: { minWidth: 72, minHeight: 72, justifyContent: 'center' },
  tabActive: { backgroundColor: P.cream },
  tabText: { fontFamily: FONT.display, fontSize: 11, color: P.inkSoft },
});
