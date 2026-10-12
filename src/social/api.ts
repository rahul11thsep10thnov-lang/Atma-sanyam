// The social endpoints, typed. See docs/API.md → Friends.
import { apiRequest } from '../services/apiClient';

export interface Profile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarId: string | null;
}

export interface Presence {
  online: boolean;
  focusing: boolean;
  inGroup: boolean;
  lastSeenAt: string | null;
}

export interface Friend extends Profile {
  presence: Presence;
  weekMinutes: number;
  /** They have more verified focus time than me this week: the V-sign. */
  leadsMe: boolean;
}

export interface PendingRequest extends Profile {
  requestId: string;
  createdAt: string;
}

export interface FriendsPayload {
  friends: Friend[];
  incoming: PendingRequest[];
  sent: PendingRequest[];
  myWeekMinutes: number;
  focusingCount: number;
}

export type Relation = 'none' | 'friends' | 'requested' | 'incoming' | 'blocked';
export interface SearchResult extends Profile {
  relation: Relation;
  requestId: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export const social = {
  friends: () => apiRequest<FriendsPayload>('/v1/friends'),
  search: (q: string) => apiRequest<{ items: SearchResult[] }>('/v1/people/search', { query: { q } }),
  sendRequest: (userId: string) => apiRequest<{ requestId: string; status: 'pending' | 'accepted' }>('/v1/friends/requests', { method: 'POST', body: { userId } }),
  accept: (requestId: string) => apiRequest<{ requestId: string }>(`/v1/friends/requests/${requestId}/accept`, { method: 'POST' }),
  decline: (requestId: string) => apiRequest<{ requestId: string }>(`/v1/friends/requests/${requestId}/decline`, { method: 'POST' }),
  cancel: (requestId: string) => apiRequest<void>(`/v1/friends/requests/${requestId}`, { method: 'DELETE' }),
  unfriend: (userId: string) => apiRequest<void>(`/v1/friends/${userId}`, { method: 'DELETE' }),
  block: (userId: string) => apiRequest<void>(`/v1/people/${userId}/block`, { method: 'POST' }),
  unblock: (userId: string) => apiRequest<void>(`/v1/people/${userId}/block`, { method: 'DELETE' }),
  blocked: () => apiRequest<{ items: Profile[] }>('/v1/people/blocked'),
  poke: (userId: string, key: string) => apiRequest<{ pokeId: string; delivered: 'live' | 'notification'; repeated: boolean }>('/v1/pokes', { method: 'POST', body: { userId, key } }),
  notifications: (before?: string) => apiRequest<{ items: AppNotification[]; nextCursor: string | null; unread: number }>('/v1/notifications', { query: { before } }),
  markRead: (ids: string[] | 'all') => apiRequest<{ unread: number }>('/v1/notifications/read', { method: 'POST', body: ids === 'all' ? { all: true } : { ids } }),
  startFocus: (clientSessionId: string, plannedMinutes: number) =>
    apiRequest<{ sessionId: string; startedAt: string; outcome: string }>('/v1/focus/sessions', { method: 'POST', body: { clientSessionId, plannedMinutes, kind: 'solo' } }),
  heartbeat: (sessionId: string) => apiRequest<void>(`/v1/focus/sessions/${sessionId}/heartbeat`, { method: 'POST' }),
  finishFocus: (sessionId: string, outcome: 'completed' | 'failed') =>
    apiRequest<{ sessionId: string; outcome: string; verifiedMinutes: number; rejected?: boolean }>(`/v1/focus/sessions/${sessionId}/finish`, { method: 'POST', body: { outcome } }),
  abandonFocus: (sessionId: string) => apiRequest<void>(`/v1/focus/sessions/${sessionId}/abandon`, { method: 'POST' }),
};
