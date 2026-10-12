// Tells the server about a focus session so friends see "focusing now" and
// the completed minutes count as verified. Everything is best effort: the
// session runs the same with no server, no account or no network.
import { isBackendConfigured } from '../config/env';
import { getAuthToken } from '../services/apiClient';
import { social } from './api';

const HEARTBEAT_MS = 60_000;

export interface FocusReport {
  finish: (outcome: 'completed' | 'failed') => void;
  stop: () => void;
}

export function reportFocusSession(clientSessionId: string, plannedMinutes: number): FocusReport {
  let sessionId: string | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let done = false;
  if (isBackendConfigured && getAuthToken()) {
    social
      .startFocus(clientSessionId, plannedMinutes)
      .then((res) => {
        if (done) {
          void social.abandonFocus(res.sessionId).catch(() => undefined);
          return;
        }
        sessionId = res.sessionId;
        timer = setInterval(() => void social.heartbeat(res.sessionId).catch(() => undefined), HEARTBEAT_MS);
      })
      .catch(() => undefined);
  }
  const stop = () => {
    done = true;
    if (timer) clearInterval(timer);
    timer = null;
  };
  return {
    finish: (outcome) => {
      const id = sessionId;
      stop();
      if (id) void social.finishFocus(id, outcome).catch(() => undefined);
    },
    stop,
  };
}
