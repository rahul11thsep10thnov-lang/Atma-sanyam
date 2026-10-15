// Store lifecycle notifications. Neither is trusted on its face: Google's
// Pub/Sub push is authenticated by a shared token in the URL and the
// purchase is re-fetched; Razorpay's webhook is checked against the webhook
// secret and the subscription is re-fetched. Both are idempotent.
import { Router, raw } from 'express';
import { z } from 'zod';
import type { createRateLimits } from '../../middleware/rateLimits.js';
import { applyVerifiedSubscription, findSubscriptionByRef } from '../../services/subscriptionService.js';
import type { AppDeps } from '../../types.js';

export function webhookRouter(deps: AppDeps, limits: ReturnType<typeof createRateLimits>) {
  const { db, env, billing } = deps;
  const r = Router();

  // Google Play RTDN: https://developer.android.com/google/play/billing/rtdn-reference
  r.post('/google-play', limits.webhook, async (req, res) => {
    if (!env.GOOGLE_PLAY_RTDN_TOKEN || req.query.token !== env.GOOGLE_PLAY_RTDN_TOKEN) {
      res.status(401).json({ error: { code: 'unauthorized', message: 'Bad token' } });
      return;
    }
    const body = z.object({ message: z.object({ data: z.string(), messageId: z.string().optional() }) }).safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: { code: 'bad_request', message: 'Not a Pub/Sub message' } });
      return;
    }
    let notification: { subscriptionNotification?: { purchaseToken: string; notificationType: number; subscriptionId?: string }; testNotification?: unknown } = {};
    try {
      notification = JSON.parse(Buffer.from(body.data.message.data, 'base64').toString('utf8'));
    } catch {
      res.status(400).json({ error: { code: 'bad_request', message: 'Malformed notification' } });
      return;
    }
    const sub = notification.subscriptionNotification;
    if (!sub || !billing.googlePlay) {
      // Test notifications and types we do not handle are acknowledged.
      res.status(204).end();
      return;
    }
    const known = await findSubscriptionByRef(db, 'google_play', sub.purchaseToken);
    if (!known) {
      // A purchase we have never seen: nothing to attach it to. The app will
      // call /subscription/google/verify when it opens.
      res.status(204).end();
      return;
    }
    try {
      const verified = await billing.googlePlay.verify(sub.purchaseToken);
      await applyVerifiedSubscription(db, known.guardianId, verified, `rtdn:${sub.notificationType}`, `gp:rtdn:${body.data.message.messageId ?? `${sub.purchaseToken}:${sub.notificationType}:${Date.now()}`}`);
      res.status(204).end();
    } catch (err) {
      console.error('[billing] RTDN verification failed:', err instanceof Error ? err.message : err);
      // 5xx makes Pub/Sub retry later.
      res.status(503).end();
    }
  });

  // Razorpay: https://razorpay.com/docs/webhooks/
  r.post('/razorpay', limits.webhook, raw({ type: '*/*', limit: '200kb' }), async (req, res) => {
    const signature = req.header('x-razorpay-signature') ?? '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (!billing.razorpay || !billing.razorpay.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: { code: 'unauthorized', message: 'Bad signature' } });
      return;
    }
    let event: { event?: string; payload?: { subscription?: { entity?: { id?: string } } } } = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      res.status(400).end();
      return;
    }
    const id = event.payload?.subscription?.entity?.id;
    if (!id) {
      res.status(204).end();
      return;
    }
    const known = await findSubscriptionByRef(db, 'razorpay', id);
    if (!known) {
      res.status(204).end();
      return;
    }
    try {
      const verified = await billing.razorpay.verify(id);
      await applyVerifiedSubscription(db, known.guardianId, verified, `webhook:${event.event ?? 'unknown'}`, `rz:wh:${req.header('x-razorpay-event-id') ?? `${id}:${event.event}:${Date.now()}`}`);
      res.status(204).end();
    } catch (err) {
      console.error('[billing] Razorpay webhook failed:', err instanceof Error ? err.message : err);
      res.status(503).end();
    }
  });

  return r;
}
