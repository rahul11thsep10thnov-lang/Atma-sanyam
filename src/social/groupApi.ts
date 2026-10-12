// Group focus endpoints, typed. See docs/API.md → Group focus.
import { apiRequest } from '../services/apiClient';
import type { Profile } from './api';

export type GroupStatus = 'lobby' | 'running' | 'ended' | 'cancelled';
export type ParticipantStatus = 'invited' | 'rejected' | 'approved' | 'ready' | 'join_requested' | 'active' | 'left_early' | 'completed' | 'disconnected';

export type GroupProposal =
  | { kind: 'plant'; speciesId: string; place?: 'garden' | 'balcony' }
  | { kind: 'remote'; imageId: string; uri: string; title?: string; category?: string; thumbnailUri?: string };

export interface GroupParticipant extends Profile {
  status: ParticipantStatus;
  isHost: boolean;
  note: string | null;
  startedAt: string | null;
  leftAt: string | null;
  rewardMinutes: number;
  penaltyCount: number;
}

export interface GroupSessionView {
  id: string;
  hostId: string;
  status: GroupStatus;
  proposal: GroupProposal;
  plannedMinutes: number;
  revision: number;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  membersAtStart: number;
  serverTime: string;
  me: GroupParticipant | null;
  participants: GroupParticipant[];
}

export interface GroupMessage {
  id: string;
  fromUserId: string;
  key: string;
  createdAt: string;
}

const base = '/v1/group/sessions';

export const group = {
  create: (proposal: GroupProposal, plannedMinutes: number, inviteeIds: string[]) => apiRequest<GroupSessionView>(base, { method: 'POST', body: { proposal, plannedMinutes, inviteeIds } }),
  mine: () => apiRequest<{ items: GroupSessionView[] }>(`${base}/mine`),
  joinable: () => apiRequest<{ items: GroupSessionView[] }>(`${base}/joinable`),
  get: (id: string) => apiRequest<GroupSessionView>(`${base}/${id}`),
  revise: (id: string, patch: { proposal?: GroupProposal; plannedMinutes?: number }) => apiRequest<GroupSessionView>(`${base}/${id}`, { method: 'PATCH', body: patch }),
  respond: (id: string, accept: boolean, note?: string) => apiRequest<GroupSessionView>(`${base}/${id}/respond`, { method: 'POST', body: { accept, ...(note ? { note } : {}) } }),
  ready: (id: string) => apiRequest<GroupSessionView>(`${base}/${id}/ready`, { method: 'POST' }),
  cancel: (id: string) => apiRequest<void>(`${base}/${id}/cancel`, { method: 'POST' }),
  leaveLobby: (id: string) => apiRequest<void>(`${base}/${id}/leave-lobby`, { method: 'POST' }),
  askToJoin: (id: string) => apiRequest<{ status: string }>(`${base}/${id}/join`, { method: 'POST' }),
  answerJoin: (id: string, userId: string, approve: boolean) => apiRequest<GroupSessionView | { status: string }>(`${base}/${id}/join-requests/${userId}`, { method: 'POST', body: { approve } }),
  heartbeat: (id: string) => apiRequest<void>(`${base}/${id}/heartbeat`, { method: 'POST' }),
  leave: (id: string) => apiRequest<{ status: ParticipantStatus; penaltyCount: number; rewardMinutes: number }>(`${base}/${id}/leave`, { method: 'POST' }),
  penaltyApplied: (id: string) => apiRequest<{ applied: boolean; penaltyCount: number }>(`${base}/${id}/penalty-applied`, { method: 'POST' }),
  finish: (id: string) => apiRequest<GroupSessionView>(`${base}/${id}/finish`, { method: 'POST' }),
  messages: (id: string) => apiRequest<{ items: GroupMessage[] }>(`${base}/${id}/messages`),
  say: (id: string, key: string) => apiRequest<GroupMessage>(`${base}/${id}/messages`, { method: 'POST', body: { key } }),
};

/** The ImageRef a proposal stands for (what the session screen shows). */
export function imageOfProposal(p: GroupProposal): import('../types').ImageRef {
  if (p.kind === 'plant') return { kind: 'plant', speciesId: p.speciesId, place: p.place };
  return { kind: 'remote', uri: p.uri, imageId: p.imageId, title: p.title ?? '', attributionText: null, category: p.category };
}
