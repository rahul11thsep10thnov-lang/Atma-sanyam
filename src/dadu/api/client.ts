// Thin typed client for the DADU API (docs/dadu/18-api.md, implemented in
// backend/src/dadu). Reuses the existing apiClient (bearer token, timeouts,
// unauthorised handling). Every call is optional: with no server configured
// the app stays fully usable offline and these throw ApiError(0).
import { apiRequest } from '../../services/apiClient';
import type { ChildProfile, WorldState } from '../core/worldState';
import type { Lang } from '../core/content';

export interface Manifest {
  serverTime: string;
  languages: { id: Lang; coverage: number; ready: boolean }[];
  flags: Record<string, unknown>;
  packs: PackSummary[];
  content: { counts: Record<string, number> };
}
export interface PackSummary { id: string; kind: string; language: string | null; version: number; bytes: number; sha256: string; publishedAt: string | null }
export interface PackManifest extends PackSummary { manifest: { items: { id: string; version: number; sha256: string; kind: string }[] } }
export interface ServerChild extends ChildProfile { updatedAt: string }
/** Payload is strict on the server (backend/src/dadu/contracts.ts): only these keys are accepted. */
export interface ProgressPayload { concept?: string; result?: number; difficulty?: 'gentle' | 'steady' | 'stretch'; minutes?: number; durationSec?: number; level?: 'little' | 'explorer'; stars?: number; coins?: number }
export interface ProgressEvent { clientId: string; kind: 'lesson' | 'story' | 'activity' | 'assessment' | 'assignment'; contentId: string; payload: ProgressPayload; occurredAt: string }
/** Error codes the server uses for DADU routes. */
export type DaduErrorCode = 'consent_required' | 'child_limit' | 'version_conflict' | 'photo_consent_required' | 'workflow_invalid' | 'workflow_locked' | 'duplicate_asset' | 'asset_in_use';
export interface Consent { id: string; childId: string | null; kind: 'processing' | 'photos' | 'analytics'; version: string; grantedAt: string; withdrawnAt: string | null }
export interface ScreenRules { dailyMinutes: number | null; bedtime: string | null; breakEveryMinutes: number }
export interface ChildSummary {
  progressBySection: Record<string, { lessons: number; total: number }>;
  mastery: { mastered: number; practising: number; revise: number };
  screenTime: { day: string; minutes: number }[];
  storiesRead: number;
  assignmentsCompleted: number;
}

export const daduApi = {
  manifest: () => apiRequest<Manifest>('/v1/dadu/manifest', { auth: false }),
  children: {
    list: () => apiRequest<{ children: ServerChild[] }>('/v1/dadu/children'),
    create: (body: Omit<ChildProfile, 'id' | 'createdAt'>) => apiRequest<{ child: ServerChild }>('/v1/dadu/children', { method: 'POST', body }),
    update: (id: string, patch: Partial<ChildProfile>) => apiRequest<{ child: ServerChild }>(`/v1/dadu/children/${id}`, { method: 'PATCH', body: patch }),
    remove: (id: string) => apiRequest<void>(`/v1/dadu/children/${id}`, { method: 'DELETE' }),
    summary: (id: string) => apiRequest<ChildSummary>(`/v1/dadu/children/${id}/summary`),
  },
  consents: {
    list: () => apiRequest<{ consents: Consent[] }>('/v1/dadu/consents'),
    grant: (body: { childId: string | null; kind: Consent['kind']; version: string }) => apiRequest<{ consent: Consent }>('/v1/dadu/consents', { method: 'POST', body }),
    withdraw: (id: string) => apiRequest<{ consent: Consent }>(`/v1/dadu/consents/${id}/withdraw`, { method: 'POST' }),
  },
  world: {
    get: (childId: string) => apiRequest<{ state: WorldState; version: number }>(`/v1/dadu/children/${childId}/world`),
    /** 409 `version_conflict` returns the merged copy in `world`; callers adopt it (see sync.ts). */
    put: (childId: string, state: WorldState, version: number) => apiRequest<{ state: WorldState; version: number }>(`/v1/dadu/children/${childId}/world`, { method: 'PUT', body: { state, version } }),
  },
  progress: {
    push: (childId: string, events: ProgressEvent[]) => apiRequest<{ accepted: number; duplicates: number; mastery: unknown[] }>(`/v1/dadu/children/${childId}/progress`, { method: 'POST', body: { events } }),
    pull: (childId: string, since?: string | null) => apiRequest<{ events: ProgressEvent[]; cursor: string }>(`/v1/dadu/children/${childId}/progress`, { query: { since: since ?? undefined } }),
  },
  assignments: {
    complete: (childId: string, assignmentId: string, body: { note?: string; photoAssetId?: string }) => apiRequest<{ ok: true }>(`/v1/dadu/children/${childId}/assignments/${assignmentId}/complete`, { method: 'POST', body }),
  },
  screen: {
    getRules: (childId: string) => apiRequest<{ rules: ScreenRules }>(`/v1/dadu/children/${childId}/screen-rules`),
    putRules: (childId: string, rules: ScreenRules) => apiRequest<{ rules: ScreenRules }>(`/v1/dadu/children/${childId}/screen-rules`, { method: 'PUT', body: rules }),
    usage: (childId: string, days = 7) => apiRequest<{ days: { day: string; minutes: number }[] }>(`/v1/dadu/children/${childId}/screen-time`, { query: { days } }),
  },
  content: {
    list: (q: { kind?: string; section?: string; language?: string; since?: string; page?: number }) => apiRequest<{ items: unknown[]; total: number; page: number; pageSize: number }>('/v1/dadu/content', { query: q, auth: false }),
    get: (id: string) => apiRequest<{ item: unknown }>(`/v1/dadu/content/${id}`, { auth: false }),
    packs: () => apiRequest<{ packs: PackSummary[] }>('/v1/dadu/packs', { auth: false }),
    pack: (id: string) => apiRequest<PackManifest>(`/v1/dadu/packs/${id}`, { auth: false }),
  },
  deleteAllData: () => apiRequest<{ deleted: Record<string, number> }>('/v1/dadu/me/data', { method: 'DELETE' }),
};
