// Pure mapping from engine progress events to the API's strict event shape (RN-free, unit tested).
import type { ProgressEvent as ApiEvent, ProgressPayload } from './client';
import type { ProgressEvent as EngineEvent } from '../engines/sync';

const KIND: Record<string, ApiEvent['kind']> = { 'lesson.completed': 'lesson', 'story.read': 'story', 'badge.earned': 'activity', 'assignment.completed': 'assignment', 'mastery.updated': 'assessment' };

/** Engine events carry free-form payloads; the API accepts only a fixed set of keys. */
export function toApiEvent(e: EngineEvent): ApiEvent {
  const p = e.payload;
  const payload: ProgressPayload = {};
  if (typeof p.concept === 'string') payload.concept = p.concept;
  if (typeof p.score === 'number') payload.result = Math.max(0, Math.min(1, p.score));
  const contentId = String(p.lessonId ?? p.storyId ?? p.badgeId ?? p.assignmentId ?? p.concept ?? e.type).slice(0, 120);
  return { clientId: e.clientId.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 80), kind: KIND[e.type] ?? 'activity', contentId, payload, occurredAt: new Date(e.at).toISOString() };
}

