// Lightweight, privacy-conscious product analytics. Events are queued on the
// device (surviving restarts and offline periods) and sent in small batches.
// Nothing is sent if the person turns "Share usage analytics" off, or if no
// server is configured.
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBackendConfigured } from '../config/env';
import { apiRequest } from './apiClient';
import { appVersion, platform } from './appInfo';
import { getInstallId } from './installId';

export type AnalyticsEvent = {
  name: string;
  screen?: string;
  contentId?: string;
  properties?: Record<string, string | number | boolean | null>;
  occurredAt: string;
};

const QUEUE_KEY = 'focus.analyticsQueue.v1';
const MAX_QUEUE = 200;
const BATCH = 50;

let queue: AnalyticsEvent[] = [];
let enabled = true;
let started = false;
let flushing = false;

async function persist() {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => undefined);
}

export function setAnalyticsEnabled(value: boolean) {
  enabled = value;
  if (!value) {
    queue = [];
    void persist();
  }
}

export function track(name: string, extra: Omit<AnalyticsEvent, 'name' | 'occurredAt'> = {}) {
  if (!enabled || !isBackendConfigured) return;
  queue.push({ name, occurredAt: new Date().toISOString(), ...extra });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  void persist();
  if (queue.length >= 20) void flush();
}

export async function flush(): Promise<void> {
  if (flushing || !enabled || !isBackendConfigured || queue.length === 0) return;
  flushing = true;
  try {
    const installId = await getInstallId();
    while (queue.length > 0) {
      const batch = queue.slice(0, BATCH);
      await apiRequest('/v1/events', {
        method: 'POST',
        body: { installId, platform, appVersion, events: batch },
        timeoutMs: 10_000,
      });
      queue = queue.slice(batch.length);
      await persist();
    }
  } catch {
    // Offline or server error: keep the queue and retry on the next flush.
  } finally {
    flushing = false;
  }
}

export async function startAnalytics() {
  if (started || !isBackendConfigured) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) queue = [...(JSON.parse(raw) as AnalyticsEvent[]), ...queue].slice(-MAX_QUEUE);
  } catch {
    queue = [];
  }
  setInterval(() => void flush(), 30_000);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') void flush();
  });
}

export function trackError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error);
  track('error', { properties: { message: message.slice(0, 300), context: context ?? null } });
}
