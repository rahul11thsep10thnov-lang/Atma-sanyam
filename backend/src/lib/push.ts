// Minimal Expo Push API client (https://docs.expo.dev/push-notifications/sending-notifications/).
// Expo relays to APNs/FCM, so the backend never holds Apple/Google push keys —
// those are uploaded once to EAS (`eas credentials`).

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushTicket {
  token: string;
  ok: boolean;
  // Set when Expo reports the token is dead so the caller can prune it.
  deviceNotRegistered?: boolean;
  error?: string;
}

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushTicket[]>;
}

export const EXPO_PUSH_TOKEN_RE = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const CHUNK = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export function createExpoPushSender(opts: { url: string; accessToken?: string }): PushSender {
  return {
    async send(messages) {
      const results: PushTicket[] = [];
      for (let i = 0; i < messages.length; i += CHUNK) {
        const chunk = messages.slice(i, i + CHUNK);
        try {
          const res = await fetch(opts.url, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              ...(opts.accessToken ? { Authorization: `Bearer ${opts.accessToken}` } : {}),
            },
            body: JSON.stringify(chunk.map((m) => ({ ...m, sound: 'default' }))),
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) {
            const reason = `Expo push API responded ${res.status}`;
            chunk.forEach((m) => results.push({ token: m.to, ok: false, error: reason }));
            continue;
          }
          const payload = (await res.json()) as { data?: ExpoTicket[] };
          chunk.forEach((m, idx) => {
            const t = payload.data?.[idx];
            if (t?.status === 'ok') {
              results.push({ token: m.to, ok: true });
            } else {
              results.push({
                token: m.to,
                ok: false,
                deviceNotRegistered: t?.details?.error === 'DeviceNotRegistered',
                error: t?.details?.error ?? t?.message ?? 'Unknown push error',
              });
            }
          });
        } catch (err) {
          const reason = err instanceof Error ? err.message : 'Network error';
          chunk.forEach((m) => results.push({ token: m.to, ok: false, error: reason }));
        }
      }
      return results;
    },
  };
}
