# Security Audit

Scope: what changed in this work, plus the existing controls it relies on. This is an engineering review, not a penetration test.

## Entitlement is decided on the server only

| Control | Where |
|---|---|
| Free quota (2 full + 2 subject-wise by default) and paid plan checked at **start**, inside the start transaction, under a per-user advisory lock | `enrollmentService.assertCanStart`, `attemptService.startAttempt` |
| The question paper of a live test is served only to a signed-in user who has started it | `GET /api/mock-tests/:id` |
| Answer keys and explanations are never sent before submission; scores are computed on the server, and client score fields are ignored | `getMockTest(includeAnswers:false)`, `finalizeLocked` |
| The browser's `localStorage` holds only the session token, a random device id, the in-progress answer copy and the progress outbox. None of it grants access | Website |

## Guest free-quota protection

Problem: a guest account is free, so clearing browser storage gave new free tests.

| Signal | How it is used | Stored as |
|---|---|---|
| Device: random id from the browser (`X-Device-Id`) | Guest accounts on one device share the free quota × `deviceMultiplier` (default 1) | HMAC-SHA256 (server secret), truncated |
| Network: IPv4 /24 or IPv6 /48 prefix + user-agent | Shared Wi-Fi gets a higher limit: free quota × `networkMultiplier` (default 3) | HMAC-SHA256, truncated |

- New guests are limited per device (5 per day) and per network (30 per hour); over the limit → `429 login_required`.
- Over a shared quota → `403 login_required`. The website shows a free sign-in prompt (Google / mobile OTP), and tests already started are never blocked.
- Signed-in accounts are counted per account only. Tests started while subscribed do not count.
- Policy: Admin → Settings → Access policy (switch, window days, multipliers, creation limits), with a 7-day report.
- Raw IPs and device ids are never stored or logged. The HMAC key is `ABUSE_HASH_SECRET`, or a random key kept in `app_settings`. **Set `ABUSE_HASH_SECRET` in production**, so rotating it is a deliberate act.

Limits, stated plainly:
- A determined user can still change network and browser, or use private windows on mobile data. This raises the cost of farming; it does not make it impossible. A free sign-in (one per Google account or phone number) is the real boundary.
- Carrier-grade NAT can make many users share one network prefix; the network limit is set 3× higher for this reason and is adjustable.

## Integrity

Race-free start and submit, a single locked finalisation, versioned autosave, the late-submission rule, and the answer-key snapshot. See [BackendReliabilitySpecification.md](BackendReliabilitySpecification.md).

## Progress data

Events are validated with a strict schema (discriminated union, size limits). Each id is applied once. Practice points are bounded: 1–20 per event and 100 events per user per UTC day. Points and streak never unlock content.

## Admin

- New endpoints use the existing permission model: `questions:read` / `questions:write` / `settings:write`.
- Bulk edit rejects unknown fields (strict schema) and cannot change status.
- Revisions are append-only.
- Edits, restores, bulk edits and policy changes are written to the audit log.

## Transport and headers

- CORS allows only the configured origins and the headers `Content-Type`, `Authorization` and `X-Device-Id` (the last was added in this work, with a regression test).
- Helmet headers are unchanged.
- Rate limits:
  - All `/api` traffic: 1200 per minute **per IP**, high enough for a classroom sharing one IP. A made-up token cannot buy a fresh budget.
  - Per **session** (routes that need a valid session): start/submit 30 per minute, autosave 240 per minute, progress uploads 60 per minute.
  - Sign-ins and guest creation as before, plus the guest limits above.
  - Before this change, all student traffic was counted per IP (300 per minute), which autosave would have exhausted for students sharing an IP.
  - The in-memory store is correct for one API instance; use a shared store (e.g. Redis) if the API is scaled out.

## Logging and privacy

Logs and alerts carry event names, ids, counts and scopes. Passwords, tokens, payment secrets, raw IPs, device ids, emails and phone numbers are not logged. The abuse report shows 8-character hash prefixes only.

## Open items

| Item | Note |
|---|---|
| `ABUSE_HASH_SECRET` not set by default | Works with an auto-generated key in the database; set the env var in Render |
| A finished attempt keeps access to its paper | Intended (review); the result already contains it |
| Admin console is not covered by a separate WAF / IP allowlist | As before; relies on strong passwords and rate limits |
| No automated dependency audit in CI | Run `npm audit` before releases |
