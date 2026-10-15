# Subscriptions: Google Play Billing, Razorpay and the entitlement model

LoJi sells **one monthly family plan** (`SUBSCRIPTION_PRODUCT_ID`, default `loji_monthly`,
`SUBSCRIPTION_PRICE_INR` for display). Access is granted only after the server has verified a
purchase with the provider. The app never decides on its own that a family is entitled.

## The model

```
never_subscribed → pending → active ⇄ grace / billing_retry → expired
                              active → cancelled (entitled until currentPeriodEnd) → expired
                              active → revoked  (refund / chargeback / admin: ends now)
                              active → paused   (Google Play pause: not entitled)
```

- `subscriptions` rows hold the provider's view (`provider`, `providerRef`, `status`,
  `currentPeriodEnd`, `cancelAtPeriodEnd`, `revokedAt`, raw `lastPayload`).
- `entitlements` (one per guardian) is derived by `recomputeEntitlement`
  (`backend/src/services/entitlementService.ts`): the longest-lasting entitling subscription
  wins; `validUntil` is the period end (+3 days for grace/billing retry without a
  provider-supplied expiry).
- `requireEntitlement` middleware guards every content route with **402 `subscription_required`**;
  the app shows the Plan screen when it sees 402. The Player Console also honours a cached
  entitlement only until its `validUntil` (offline cannot outlive a lapsed plan).
- `billing_events` records every verification, webhook and admin action with a `dedupe_key`
  so repeated deliveries are harmless.

## Google Play (Android)

Client: `src/billing/playBilling.ts` wraps `expo-iap` (lazily required; Expo Go and the web
fall back gracefully). The guardian taps *Subscribe with Google Play*, the Play sheet opens,
and the resulting `purchaseToken` is sent to `POST /v1/guardian/subscription/google/verify`.

Server: `backend/src/services/billing/googlePlay.ts` signs a JWT with the service account,
calls `purchases.subscriptionsv2.get`, maps `subscriptionState` to our statuses, acknowledges
the purchase if needed, binds the token to the guardian (a token already bound to another
household is refused), and stores the subscription.

Setup:

1. Play Console → your app → *Monetise* → *Subscriptions* → create `loji_monthly` with a
   monthly base plan (INR price). Activate it.
2. Google Cloud → create a service account; Play Console → *Users and permissions* → invite its
   email with **View financial data** and **Manage orders and subscriptions** on the app.
   Download the JSON key.
3. API env: `GOOGLE_PLAY_PACKAGE_NAME=com.atmasanyam.loji`,
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<raw JSON or base64>`.
4. **Real-time developer notifications**: Google Cloud → Pub/Sub → topic `loji-rtdn` → *push*
   subscription with endpoint `https://api.your-domain.com/v1/webhooks/google-play?token=<GOOGLE_PLAY_RTDN_TOKEN>`
   (a long random string you also set on the API). Play Console → *Monetise* → *Monetisation
   setup* → enter the topic name. The webhook re-verifies the purchase with the Developer API,
   so renewals, grace, holds, cancellations, pauses, revocations and expiries all land without
   the app being open.
5. Add `com.android.vending.BILLING` (already in `app.json`) and upload a build to a testing
   track; add licence testers so purchases are free during testing.

The app's *Manage subscription* button opens Google Play's subscription page; cancellation
and refunds follow Google's policy (refunds trigger `revoked` through RTDN).

## Razorpay (website)

Client: `src/billing/razorpayWeb.ts` loads Razorpay Checkout on the web only.
`POST /razorpay/create` makes a Razorpay subscription on `RAZORPAY_PLAN_ID`; the checkout
returns `razorpay_payment_id`, `razorpay_subscription_id`, `razorpay_signature`, which
`POST /razorpay/confirm` verifies with HMAC-SHA256 (`payment_id|subscription_id` with the key
secret) before fetching the subscription from Razorpay.

Setup: Razorpay dashboard → *Subscriptions* → create a monthly plan (note its `plan_...` id) →
API keys → set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID`; Webhooks → add
`https://api.your-domain.com/v1/webhooks/razorpay` with a secret (`RAZORPAY_WEBHOOK_SECRET`) and
the events `subscription.activated`, `subscription.charged`, `subscription.pending`,
`subscription.halted`, `subscription.cancelled`, `subscription.completed`, `subscription.paused`,
`subscription.resumed`.

## Sandbox (development and tests only)

`BILLING_SANDBOX=true` (ignored when `NODE_ENV=production`) enables `POST /sandbox/activate`
and `POST /sandbox/transition {status}` so the whole state machine can be exercised without a
provider; the Plan screen shows *Activate test subscription* outside production builds.

## iOS

Purchases are made on Android or the website; the plan then works on every device the
guardian signs in on, and the iOS Plan screen says so. Selling the subscription **inside** the
iOS app would require StoreKit (App Store in-app purchase) which is not implemented.

## Testing

- `backend/tests/subscription.test.ts`: state machine, 402 enforcement, Google and Razorpay
  verification paths with fake providers, webhook idempotency and signatures, sandbox transitions,
  restore, admin revoke/extend.
- Manual: Play Console licence testers with the test card; Razorpay test mode keys.
