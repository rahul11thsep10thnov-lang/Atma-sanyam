// Shared app types. Server shapes mirror backend/src/routes/public/*.

export type AgeBracket = 'A' | 'B' | 'C' | 'D';

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  phoneMasked: string;
  email: string | null;
  status: 'active' | 'deactivated' | 'deleted_pending';
  termsVersion: string;
  createdAt: string;
}

export interface Entitlement {
  active: boolean;
  status: string;
  validUntil: string | null;
  /** Any entitling subscription removes ads; derived by the server. */
  adFree?: boolean;
}

export interface Child {
  id: string;
  displayName: string;
  avatarId: string;
  age: number;
  ageBracket: AgeBracket;
  bracketOverride: AgeBracket | null;
  effectiveBracket: AgeBracket;
  bracketName: string;
  playerId: string;
  playerOtpRequired: boolean;
  status: 'active' | 'paused' | 'removed';
  lastActiveAt: string | null;
  createdAt: string;
}

export interface PlayWindow {
  days: number[];
  start: string;
  end: string;
}

export interface ParentalControls {
  dailyLimitMinutes: number;
  sessionLimitMinutes: number;
  playWindows: PlayWindow[];
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  timezone: string;
  blockedCategories: string[];
  blockedGames: string[];
  allowedBrackets: AgeBracket[];
  soundEnabled: boolean;
  narrationEnabled: boolean;
  favouritesEnabled: boolean;
  mirroringEnabled: boolean;
  newDeviceApproval: boolean;
  // Learning academy, rankings and rewards.
  curriculumFramework: CurriculumFramework | null;
  curriculumBoard: string | null;
  schoolGrade: string | null;
  learningGoals: { subject: string; lessonsPerWeek: number }[];
  blockedSubjects: string[];
  rankingsEnabled: boolean;
  rewardShopEnabled: boolean;
  coinDailyCap: number | null;
  reducedMotion: boolean;
  updatedAt: string;
}

export type CurriculumFramework = 'ncert' | 'cbse' | 'cisce' | 'state' | 'ib_pyp' | 'ib_myp';

export interface LiveStatus {
  online: boolean;
  currentSession: {
    id: string;
    gameId: string;
    gameName: string;
    difficulty: string;
    startedAt: string;
    durationSeconds: number;
    lastActivityAt: string;
    paused: boolean;
    mirrorAvailable: boolean;
  } | null;
  lastActivityAt: string | null;
}

export interface DashboardChild {
  child: Child;
  live: LiveStatus;
  today: { day: string; minutes: number; limitMinutes: number };
  week: { days: { day: string; minutes: number; sessions: number }[]; totalMinutes: number };
  progress: { gamesPlayed: number; completions: number; stars: number; achievements: number };
  recent: { gameId: string; gameName: string; startedAt: string; endedAt: string | null; outcome: string; score: number | null; durationSeconds: number }[];
  mirroringEnabled: boolean;
}

export interface Dashboard {
  entitlement: Entitlement;
  children: DashboardChild[];
  activePlayers: number;
}

export interface GameDifficulty {
  key: string;
  label: string;
  brackets?: AgeBracket[];
}

export interface GameProgressSummary {
  plays: number;
  completions: number;
  bestScore: number | null;
  bestTimeSeconds: number | null;
  stars: number;
  highestDifficulty: string | null;
  lastPlayedAt: string | null;
  tutorialCompletedAt?: string | null;
}

export interface CatalogueGame {
  id: string;
  name: string;
  tagline: string;
  description: string;
  instructions: string;
  categoryId: string | null;
  brackets: AgeBracket[];
  difficulties: GameDifficulty[];
  skills: string[];
  contentRating: string;
  estimatedMinutes: number;
  offlineCapable: boolean;
  accessibility: Record<string, unknown>;
  translations: Record<string, { name?: string; tagline?: string; instructions?: string }>;
  favourite: boolean;
  progress: GameProgressSummary | null;
  /** Has a leaderboard (a server scoring rule). */
  competitive?: boolean;
}

export interface PlayerMe {
  child: { id: string; displayName: string; avatarId: string; ageBracket: AgeBracket; effectiveBracket: AgeBracket; bracketName: string; playerId: string; age?: number; coins?: number; equippedRewards?: Record<string, string> };
  entitlement: Entitlement;
  /** subscriber: full access, no ads. ad_supported: playing with ads (admin flag). locked: needs the plan. */
  access?: 'subscriber' | 'ad_supported' | 'locked';
  controls: {
    soundEnabled: boolean;
    narrationEnabled: boolean;
    favouritesEnabled: boolean;
    mirroringEnabled: boolean;
    dailyLimitMinutes: number;
    sessionLimitMinutes: number;
    visibleBrackets: AgeBracket[];
    rankingsEnabled?: boolean;
    rewardShopEnabled?: boolean;
    reducedMotion?: boolean;
    blockedSubjects?: string[];
    curriculum?: { framework: CurriculumFramework | null; board: string | null; grade: string | null };
  };
  playtime: { allowed: true; usedMinutesToday: number; remainingSeconds: number; sessionLimitSeconds: number } | { allowed: false; usedMinutesToday: number; reason: string; message: string };
}

export interface CraftStep {
  title: string;
  text: string;
  diagram?: Record<string, unknown>;
  tip?: string;
  caution?: string;
}

export interface Craft {
  id: string;
  title: string;
  kind: 'origami' | 'paper_craft' | 'drawing' | 'digital';
  description: string;
  brackets: AgeBracket[];
  difficulty: number;
  estimatedMinutes: number;
  materials: string[];
  hazards: string[];
  adultSupervision: boolean;
  physical: boolean;
  stepCount: number;
  steps?: CraftStep[];
  finalPreview?: Record<string, unknown> | null;
  checklist?: string[];
  translations: Record<string, Record<string, unknown>>;
  progress: { stepsDone: number; checklistDone?: boolean[]; completedAt: string | null } | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface Fact {
  id: string;
  slug: string;
  category: string;
  headline: string;
  body: string;
  whyText: string;
  followUpQuestion: string;
  brackets: AgeBracket[];
  readingLevel: number;
  illustration: string;
  audioUrl: string | null;
  source: { title: string; publisher: string; url: string } | null;
  /** Where an ingested fact was taken from, and the credit its licence requires. */
  sourceUrl?: string | null;
  attributionText?: string | null;
  licenceName?: string | null;
  language?: string;
  questions: QuizQuestion[];
  translations: Record<string, Record<string, string>>;
  publishedAt: string | null;
  viewed?: boolean;
  favourite?: boolean;
  viewedAt?: string;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

export interface PlayerProgress {
  games: (GameProgressSummary & { gameId: string; data: Record<string, unknown>; version: number })[];
  achievements: Achievement[];
  crafts: { tutorialId: string; title: string; stepsDone: number; stepCount: number; completedAt: string | null }[];
  factsRead: number;
  quiz: { total: number; correct: number };
}

export interface SubscriptionInfo {
  entitlement: Entitlement;
  current: {
    id: string;
    provider: 'google_play' | 'razorpay' | 'sandbox';
    productId: string;
    status: string;
    autoRenewing: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
  } | null;
  history: unknown[];
  monthly: { productId: string; name: string; interval: string; priceInr: number; description: string };
  providers: { googlePlay: boolean; razorpay: { keyId: string } | null; sandbox: boolean };
  manage: { googlePlayUrl: string | null; supportEmail: string | null };
}

export interface AppSettings {
  soundEnabled: boolean;
  narrationEnabled: boolean;
  analyticsEnabled: boolean;
  pushEnabled: boolean;
  appearance?: 'system' | 'light' | 'dark';
  language?: 'en' | 'hi';
  reducedMotion?: boolean;
}
