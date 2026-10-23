// Typed calls for the Guardian Console beyond the session itself.
import { apiRequest } from '../services/apiClient';
import type { Child, Dashboard, Entitlement, ParentalControls, SubscriptionInfo } from '../types';
import type { LearningReport } from '../learning/types';

export interface ChildRewards {
  coins: { balance: number; earnedToday: number; dailyCap: number; defaultDailyCap: number; shopEnabled: boolean; equipped: Record<string, string>; owned: { key: string; name: string; emoji: string; kind: string; price: number }[]; values: Record<string, number | boolean> };
  ledger: { id: number; amount: number; balanceAfter: number; reason: string; refType: string | null; refId: string | null; note: string | null; createdAt: string }[];
  rankings: { enabled: boolean; globallyEnabled: boolean; mine: { gameId: string; rating: number | null; points: number; played: number; wins: number; rule: string }[] };
  tutorials: { gameId: string; name: string; tutorialCompletedAt: string }[];
  lessonsCompleted: number;
  adFree: boolean;
  entitlement: Entitlement;
}

export interface ChildDetail {
  child: Child;
  controls: ParentalControls;
  live: Dashboard['children'][number]['live'];
  today: { day: string; minutes: number; limitMinutes: number };
  progress: { gamesPlayed: number; completions: number; stars: number; achievements: { key: string; earnedAt: string }[] };
}

export interface ChildActivity {
  sessions: { id: string; gameId: string; gameName: string; difficulty: string; startedAt: string; endedAt: string | null; outcome: string; score: number | null; durationSeconds: number }[];
  screenTime: { day: string; minutes: number; sessions: number }[];
}

export interface DeviceRow {
  id: string;
  label: string | null;
  platform: string;
  appVersion: string | null;
  childId: string | null;
  guardianId: string | null;
  approvedAt: string | null;
  lastSeenAt: string;
  isThisGuardian: boolean;
}

export const guardianApi = {
  dashboard: () => apiRequest<Dashboard>('/v1/guardian/dashboard'),
  children: () => apiRequest<Child[]>('/v1/guardian/children'),
  child: (id: string) => apiRequest<ChildDetail>(`/v1/guardian/children/${id}`),
  createChild: (body: { displayName: string; avatarId: string; birthMonth: string; pin: string; playerOtpRequired: boolean }) => apiRequest<Child>('/v1/guardian/children', { method: 'POST', body }),
  updateChild: (id: string, body: Partial<{ displayName: string; avatarId: string; birthMonth: string; bracketOverride: string | null; playerOtpRequired: boolean; status: 'active' | 'paused' }>) => apiRequest<Child>(`/v1/guardian/children/${id}`, { method: 'PATCH', body }),
  resetPin: (id: string, pin: string) => apiRequest(`/v1/guardian/children/${id}/pin`, { method: 'POST', body: { pin } }),
  revokeSessions: (id: string) => apiRequest(`/v1/guardian/children/${id}/revoke-sessions`, { method: 'POST' }),
  playerSession: (id: string, installId: string) => apiRequest<{ token: string; child: Child }>(`/v1/guardian/children/${id}/player-session`, { method: 'POST', body: { installId } }),
  removeChild: (id: string) => apiRequest<{ scheduledFor: string }>(`/v1/guardian/children/${id}`, { method: 'DELETE' }),
  restoreChild: (id: string) => apiRequest<Child>(`/v1/guardian/children/${id}/restore`, { method: 'POST' }),
  exportChild: (id: string) => apiRequest<Record<string, unknown>>(`/v1/guardian/children/${id}/export`),
  controls: (id: string) => apiRequest<ParentalControls>(`/v1/guardian/children/${id}/controls`),
  saveControls: (id: string, body: Partial<ParentalControls>) => apiRequest<ParentalControls>(`/v1/guardian/children/${id}/controls`, { method: 'PUT', body }),
  activity: (id: string, days = 30) => apiRequest<ChildActivity>(`/v1/guardian/children/${id}/activity`, { query: { days } }),
  learning: (id: string) => apiRequest<LearningReport>(`/v1/guardian/children/${id}/learning`),
  rewards: (id: string) => apiRequest<ChildRewards>(`/v1/guardian/children/${id}/rewards`),
  pauseSession: (id: string) => apiRequest<{ delivered: boolean }>(`/v1/guardian/children/${id}/session/pause`, { method: 'POST' }),
  resumeSession: (id: string) => apiRequest<{ delivered: boolean }>(`/v1/guardian/children/${id}/session/resume`, { method: 'POST' }),
  endSession: (id: string) => apiRequest<{ ended: number; delivered: boolean }>(`/v1/guardian/children/${id}/session/end`, { method: 'POST' }),
  devices: () => apiRequest<DeviceRow[]>('/v1/guardian/devices'),
  approveDevice: (id: string) => apiRequest(`/v1/guardian/devices/${id}/approve`, { method: 'POST' }),
  removeDevice: (id: string) => apiRequest(`/v1/guardian/devices/${id}`, { method: 'DELETE' }),
  subscription: () => apiRequest<SubscriptionInfo>('/v1/guardian/subscription'),
  verifyGooglePurchase: (purchaseToken: string, productId: string) => apiRequest<{ entitlement: SubscriptionInfo['entitlement']; status: string }>('/v1/guardian/subscription/google/verify', { method: 'POST', body: { purchaseToken, productId } }),
  razorpayCreate: () => apiRequest<{ subscriptionId: string; keyId: string; shortUrl: string | null; name: string; prefill: { contact: string; name: string } }>('/v1/guardian/subscription/razorpay/create', { method: 'POST' }),
  razorpayConfirm: (body: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => apiRequest<{ entitlement: SubscriptionInfo['entitlement'] }>('/v1/guardian/subscription/razorpay/confirm', { method: 'POST', body }),
  razorpayCancel: () => apiRequest<{ entitlement: SubscriptionInfo['entitlement'] }>('/v1/guardian/subscription/razorpay/cancel', { method: 'POST' }),
  restore: () => apiRequest<{ checked: number; entitlement: SubscriptionInfo['entitlement'] }>('/v1/guardian/subscription/restore', { method: 'POST' }),
  sandboxActivate: () => apiRequest<{ entitlement: SubscriptionInfo['entitlement'] }>('/v1/guardian/subscription/sandbox/activate', { method: 'POST', body: {} }),
  exportAccount: () => apiRequest<Record<string, unknown>>('/v1/guardian/me/export'),
};
