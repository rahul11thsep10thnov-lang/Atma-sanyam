# Security and child-privacy checklist

LoJi is used by children aged 3–12 under a guardian's account. The design goals are: collect
as little as possible, never let a child reach anything a guardian did not allow, never trust
the device for money or limits, and make every admin action attributable.

Status: ✅ implemented and tested · ⚠️ implemented, needs a real account/review to confirm ·
☐ to do before launch.

## Data minimisation (DPDP Act 2023 / Google Play Families)

- ✅ Child profiles hold a **nickname**, **birth month** (no day), avatar id, bracket, PIN hash.
  No photo, email, phone, location, free-text chat or contacts.
- ✅ Guardian verifiable consent: registration requires an adult's name, mobile verified by OTP,
  and an explicit consent checkbox; the accepted `termsVersion` is stored.
- ✅ Analytics are first-party, coarse, keyed by install id; no advertising SDKs, no ad IDs, no
  third-party trackers in the app.
- ✅ Phone numbers are masked everywhere in the admin console; children appear only as counts
  and brackets.
- ✅ Live mirror relays the **game board state only**, with a visible indicator on the child's
  device; frames are never stored beyond a 5-second snapshot that is deleted when the session
  ends; `mirror_sessions` keeps only who watched and when.
- ✅ Retention: screen-time records `SCREEN_TIME_RETENTION_DAYS` (120), analytics events
  `EVENTS_RETENTION_DAYS`, OTP challenges 24 h, expired sessions removed daily (`npm run cleanup`).
- ✅ Right to erasure: guardian-initiated deletion with a cooling-off period
  (`DELETION_COOLING_OFF_DAYS`, default 7) and cancel; admin deletion; child profile removal with
  restore window. Data export (`/me/export`, per-child export) for portability.
- ☐ Legal review of the in-app Terms, Privacy, Deletion, Subscription & refund and Child safety
  texts (`src/legal/documents.ts`) by counsel familiar with the DPDP Act and Google Play's
  Families policy; set `EXPO_PUBLIC_PRIVACY_POLICY_URL`/`EXPO_PUBLIC_TERMS_URL` to hosted copies.
- ☐ Google Play **Data safety** form and **Families** declaration (target audience includes
  children; no ads; "Teacher Approved" optional) — see STORE_SUBMISSION.md.

## Authentication and sessions

- ✅ Guardian: password (scrypt, policy enforced) **and** OTP on every login; lockout after
  repeated failures; sessions are random opaque tokens hashed at rest, 30-day TTL, revocable
  individually or all at once.
- ✅ Step-up OTP (15-minute window) for password change, account deletion, data export, PIN
  reset.
- ✅ Player: Player ID + PIN (scrypt), optional guardian-phone OTP per child, optional new-device
  approval; player tokens cannot call guardian routes; PIN reset and "sign out everywhere"
  revoke player sessions.
- ✅ Adult gate (arithmetic) before a child's device can switch to the Guardian Console.
- ✅ Admin: separate table, roles with least-privilege permission sets, httpOnly cookie in the
  console, every mutation in `audit_logs`.
- ✅ OTPs: hashed, bound to challenge and purpose, 10-minute expiry, 5 attempts, cooldown and
  hourly caps, never logged.

## Payments

- ✅ No payment is ever "assumed": Google purchase tokens are verified with the Play Developer
  API; Razorpay checkouts are signature-verified then fetched from Razorpay; webhooks are
  authenticated (URL token / HMAC) and idempotent.
- ✅ Entitlement enforced server-side (402) on every content route and re-checked client-side;
  cached entitlements expire on `validUntil`.
- ✅ Sandbox billing and console SMS are refused in production by `env.ts`.
- ⚠️ Live Google Play and Razorpay flows need real accounts to confirm end to end.

## Transport and platform

- ✅ HTTPS/WSS only in production (hosts terminate TLS); CORS restricted to configured origins;
  `TRUST_PROXY` for correct client IPs.
- ✅ Helmet-style headers, JSON body limits, Zod validation on every input, parameterised
  queries through Drizzle (no string SQL with user input).
- ✅ Rate limits on login, OTP, recovery, registration, billing, heartbeats, webhooks, events.
- ✅ Secrets only in environment variables; `.env.example` files document them; nothing secret
  is committed. `EXPO_PUBLIC_*` values are public by design.
- ✅ Tokens stored in SecureStore on native (excluded from backups) and in `localStorage` on
  the web (same-origin only).
- ☐ Set up an uptime monitor on `/v1/health`, error reporting (e.g. Sentry) and log retention
  on the host.
- ☐ Rotate the Google service-account key and Razorpay secrets on a schedule; keep the RTDN
  token long and random.

## Content safety

- ✅ Facts cannot be published without a source, a fact-checker verification and a quiz
  question; changing the wording of a published fact returns it to draft.
- ✅ Crafts with hazardous materials must require adult supervision and show the warning before
  step 1; physical crafts are marked as real-world activities.
- ✅ Games ship with original emoji/SVG art; `assetLicense` is recorded per game for anything
  that changes.
- ✅ No user-generated content is shared between households (drawings stay on the device).

## Operational checklist before launch

1. `NODE_ENV=production`, real `DATABASE_URL`, `TRUST_PROXY=1`, `CORS_ORIGINS` = website origin.
2. `SMS_PROVIDER=msg91|twilio` with credentials; a test number for store review only.
3. Google Play: product, service account, RTDN topic and `GOOGLE_PLAY_*` vars; Razorpay keys and
   webhook secret for the website.
4. `BILLING_SANDBOX` unset; `OTP_TEST_NUMBERS_ALLOW_PRODUCTION` unset.
5. Schedule `cleanup` daily; back up the database.
6. Create the first Super Admin; create editor/fact-checker/support accounts with their own roles.
7. Review and publish the legal texts; complete the Play Data safety and Families forms.
