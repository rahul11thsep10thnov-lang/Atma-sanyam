// Typed calls for the Player Console content (facts, crafts, quiz).
import { apiRequest } from '../services/apiClient';
import type { Craft, Fact } from '../types';
import type { Lesson, LessonSummary, LearningCatalogue, LearningReport, ProgressSaveResult, Section } from '../learning/types';

export interface CoinAward {
  awarded: number;
  balance: number;
  duplicate: boolean;
  capped: boolean;
}

export interface RewardItem {
  key: string;
  name: string;
  description: string;
  kind: string;
  emoji: string;
  color: string;
  visual: Record<string, unknown>;
  price: number;
  premiumOnly: boolean;
  owned: boolean;
  affordable: boolean;
  locked: boolean;
}

export interface Wallet {
  balance: number;
  earnedToday: number;
  dailyCap: number | null;
  shopEnabled: boolean;
  equipped: Record<string, string>;
  transactions: { id: number; amount: number; balanceAfter: number; reason: string; refType: string | null; refId: string | null; note: string | null; createdAt: string }[];
  items: RewardItem[];
  values: Record<string, number | boolean>;
}

export interface DailyChallenge {
  day: string;
  gameId: string;
  gameName: string;
  difficulty: string;
  reward: number;
  completed: boolean;
  completedAt: string | null;
}

export interface RankingsOverview {
  enabled: boolean;
  reason: string | null;
  settings: { minPlayedForBoard: number; showBracketFilter: boolean; showImprovement: boolean; boardSize: number };
  games: { gameId: string; name: string; kind: string; rule: string }[];
  mine: { gameId: string; rating: number | null; points: number; played: number; wins: number }[];
}

export interface LeaderboardRow {
  rank: number;
  childId: string;
  displayName: string;
  avatarId: string;
  bracket: string;
  points: number;
  rating: number | null;
  played: number;
  wins: number;
  winRate: number | null;
  improvement: number;
  isMe: boolean;
}

export interface Leaderboard {
  gameId: string;
  window: 'week' | 'month' | 'all';
  bracket: string | null;
  rule: string;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
}

export interface FactCategory {
  key: string;
  name: string;
  icon: string;
  color: string;
}

export const playerApi = {
  factCategories: () => apiRequest<FactCategory[]>('/v1/player/facts/categories', { as: 'player' }),
  facts: (category?: string, limit = 50, offset = 0) => apiRequest<{ total: number; facts: Fact[] }>('/v1/player/facts', { as: 'player', query: { category, limit, offset } }),
  dailyFact: () => apiRequest<Fact>('/v1/player/facts/daily', { as: 'player' }),
  randomFact: () => apiRequest<Fact>('/v1/player/facts/random', { as: 'player' }),
  factHistory: () => apiRequest<Fact[]>('/v1/player/facts/history', { as: 'player' }),
  fact: (id: string) => apiRequest<Fact>(`/v1/player/facts/${id}`, { as: 'player' }),
  viewFact: (id: string) => apiRequest<{ newAchievements: string[] }>(`/v1/player/facts/${id}/view`, { method: 'POST', as: 'player' }),
  favouriteFact: (id: string, favourite: boolean) => apiRequest(`/v1/player/facts/${id}/favourite`, { method: 'PUT', as: 'player', body: { favourite } }),
  answerQuiz: (questionId: string, chosenIndex: number) => apiRequest<{ correct: boolean; correctIndex: number; explanation: string; newAchievements: string[] }>('/v1/player/quiz/answer', { method: 'POST', as: 'player', body: { questionId, chosenIndex } }),
  quizHistory: () => apiRequest<{ id: string; factId: string; headline: string; question: string; correct: boolean; createdAt: string }[]>('/v1/player/quiz/history', { as: 'player' }),
  craft: (id: string) => apiRequest<Craft>(`/v1/player/crafts/${id}`, { as: 'player' }),
  saveCraftProgress: (id: string, body: { stepsDone: number; checklistDone?: boolean[]; completed?: boolean }) => apiRequest<{ newAchievements: string[]; coins?: CoinAward | null }>(`/v1/player/crafts/${id}/progress`, { method: 'PUT', as: 'player', body }),
  // ---- learning academy
  learningCatalogue: () => apiRequest<LearningCatalogue>('/v1/player/learning/catalogue', { as: 'player' }),
  lessons: (q: { section?: Section; subject?: string; age?: number | 'all'; difficulty?: string; topic?: string }) => apiRequest<{ myAge: number; age: number | 'all'; lessons: LessonSummary[] }>('/v1/player/learning/lessons', { as: 'player', query: q }),
  lesson: (id: string) => apiRequest<Lesson>(`/v1/player/learning/lessons/${id}`, { as: 'player' }),
  saveLessonProgress: (id: string, body: { stepsDone: number; activitiesCorrect?: number; activitiesTotal?: number; quizScore?: number; quizTotal?: number; timeSeconds?: number; selectedAge?: number; completed?: boolean }) => apiRequest<ProgressSaveResult>(`/v1/player/learning/lessons/${id}/progress`, { method: 'PUT', as: 'player', body }),
  learningReport: () => apiRequest<LearningReport>('/v1/player/learning/report', { as: 'player' }),
  // ---- coins, rewards, rankings, challenges
  wallet: () => apiRequest<Wallet>('/v1/player/coins', { as: 'player' }),
  purchase: (itemKey: string, idempotencyKey: string) => apiRequest<{ item: RewardItem; balance: number; duplicate: boolean }>('/v1/player/coins/purchase', { method: 'POST', as: 'player', body: { itemKey, idempotencyKey } }),
  equip: (kind: string, itemKey: string | null) => apiRequest<{ equipped: Record<string, string> }>('/v1/player/rewards/equip', { method: 'PUT', as: 'player', body: { kind, itemKey } }),
  rankings: () => apiRequest<RankingsOverview>('/v1/player/rankings', { as: 'player' }),
  leaderboard: (gameId: string, window: 'week' | 'month' | 'all', bracket?: string) => apiRequest<Leaderboard>(`/v1/player/rankings/${gameId}`, { as: 'player', query: { window, bracket } }),
  dailyChallenge: () => apiRequest<DailyChallenge>('/v1/player/daily-challenge', { as: 'player' }),
  tutorialComplete: (gameId: string) => apiRequest<{ tutorialCompletedAt: string; coins: CoinAward; newAchievements: string[] }>(`/v1/player/games/${gameId}/tutorial-complete`, { method: 'POST', as: 'player' }),
};
