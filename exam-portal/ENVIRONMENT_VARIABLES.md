# Environment variables

Every variable actually read by the app, cross-checked against the code
(not aspirational — if it's not listed here, nothing reads it). Copy
`.env.example` to `.env` for local development.

## Required in every environment

| Variable | Read by | Notes |
|---|---|---|
| `DATABASE_URL` | `src/lib/env.ts` | PostgreSQL connection string. Must start with `postgres://` or `postgresql://`. Include `?sslmode=require` for most managed providers in production. |
| `NEXTAUTH_SECRET` | `src/lib/env.ts` | Signs the admin session JWT. Must be 32+ characters. Generate with `openssl rand -base64 32`. **Rotating this invalidates every admin session immediately** — expect a forced re-login. |

## Required in production, optional in development

| Variable | Read by | Notes |
|---|---|---|
| `NEXTAUTH_URL` | `src/lib/env.ts`, NextAuth | The public URL this app is served from, no trailing slash (e.g. `https://exams.example.org`). NextAuth can infer it from the request in local dev, but production needs it set explicitly — an unset/wrong value breaks the OAuth-style redirect flow even though this app only uses credentials auth. |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` | `src/lib/documents/storage.ts` | All 5 together select the S3-compatible object storage adapter (works with AWS S3, Cloudflare R2, Supabase Storage, Backblaze B2, MinIO — anything speaking the S3 API). **If `NODE_ENV=production` and even one of these 5 is missing, the app throws at startup rather than silently falling back to local-disk storage** (which doesn't survive a redeploy and isn't shared across serverless instances). In development, omitting all 5 is fine — documents are written to `public/uploads/documents` instead. |

## Optional everywhere

| Variable | Read by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `src/lib/siteConfig.ts` | Public site URL used by the sitemap, `robots.txt`, canonical URLs, and JSON-LD. Defaults to `http://localhost:3000`. **Set this in production** — the default will otherwise leak into your sitemap and structured data. |
| `AI_EXTRACTION_PROVIDER` | `src/lib/ai/provider.ts` | Defaults to `mock` (a deterministic stub — no external calls, no cost, clearly-labeled placeholder output). Setting it to anything else throws immediately rather than silently using mock data, until a real provider is implemented in `provider.ts` and wired into `getAIProvider()`. There is currently no real provider implemented — see `DEVELOPMENT_STATUS.md`'s Phase 14 entry. |

## Not currently read by anything

These channels exist as `NotificationChannel` enum values and have a
`ChannelDispatcher` slot reserved for them (`src/lib/notifications/
dispatcher.ts`), but no environment variable is wired up yet because no
provider is implemented: EMAIL, PUSH, TELEGRAM, WHATSAPP, ANDROID. Every
notification's delivery on these channels is recorded `FAILED` with an
honest "channel not configured" reason — nothing you set today changes
that. Implementing a real provider for one of these is future work; add
its config variables here when that happens, not before.

## One-time seed scripts (not read by the running app)

| Variable | Read by | Notes |
|---|---|---|
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, `ADMIN_BOOTSTRAP_NAME` | `prisma/seedAdmin.ts` (`npm run seed:admin`) | Creates the first `SUPER_ADMIN` account. Only read by this one-off script, never by the Next.js app itself — remove them from your environment after running it once, they don't need to stay set. |

## Verifying your setup

`src/lib/env.ts` validates `DATABASE_URL` and `NEXTAUTH_SECRET` at
import time (the first request touches it) and throws a clear,
itemized error naming every missing/malformed variable — you don't
need to guess which one is wrong from a stack trace.
