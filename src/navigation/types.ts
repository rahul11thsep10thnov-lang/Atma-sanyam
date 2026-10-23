import { NavigatorScreenParams } from '@react-navigation/native';
import type { LegalDocId } from '../legal/documents';

export type GuardianTabParamList = {
  Dashboard: undefined;
  Children: undefined;
  Plan: undefined;
  Settings: undefined;
};

export type PlayerTabParamList = {
  Home: undefined;
  Games: { category?: string } | undefined;
  Learn: undefined;
  Facts: { category?: string } | undefined;
  Me: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  // guardian
  GuardianRegister: undefined;
  GuardianLogin: undefined;
  GuardianOtp: { purpose: 'register' | 'login' | 'recovery' | 'stepUp'; challengeId: string; phoneMasked: string; resendAfterSeconds: number; newPassword?: string; onDone?: () => void };
  GuardianRecovery: undefined;
  GuardianConsole: NavigatorScreenParams<GuardianTabParamList> | undefined;
  ChildDetail: { childId: string };
  ChildEditor: { childId?: string };
  Controls: { childId: string };
  ChildLearning: { childId: string };
  ChildRewards: { childId: string };
  Mirror: { childId: string };
  Subscription: undefined;
  ChangePassword: undefined;
  StepUp: { onDone: () => void } | undefined;
  // player
  PlayerLogin: { playerId?: string } | undefined;
  PlayerOtp: { challengeId: string; phoneMasked: string; childName: string; resendAfterSeconds: number };
  PlayerConsole: NavigatorScreenParams<PlayerTabParamList> | undefined;
  GameDetail: { gameId: string };
  GamePlay: { gameId: string; difficulty: string };
  CraftLibrary: undefined;
  CraftDetail: { craftId: string };
  FactDetail: { factId: string; fact?: unknown };
  // learning academy
  LearnSection: { section: 'study' | 'music' | 'sports' };
  Subject: { subject: string };
  Lesson: { lessonId: string; age?: number };
  // rankings and rewards
  Rankings: undefined;
  Leaderboard: { gameId: string };
  Rewards: undefined;
  AdultGate: { onPass: () => void } | undefined;
  // shared
  Legal: { doc: LegalDocId };
};
