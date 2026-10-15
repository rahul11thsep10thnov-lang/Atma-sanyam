// Typed calls for the Player Console content (facts, crafts, quiz).
import { apiRequest } from '../services/apiClient';
import type { Craft, Fact } from '../types';

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
  saveCraftProgress: (id: string, body: { stepsDone: number; checklistDone?: boolean[]; completed?: boolean }) => apiRequest<{ newAchievements: string[] }>(`/v1/player/crafts/${id}/progress`, { method: 'PUT', as: 'player', body }),
};
