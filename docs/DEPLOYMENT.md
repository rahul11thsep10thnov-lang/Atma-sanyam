# Deployment

Recommended low-cost setup (all have free tiers to start):

| Piece | Host | Why |
|---|---|---|
| PostgreSQL | **Neon** (neon.tech) | Serverless Postgres, free tier, automatic backups/point-in-time restore |
| API (`backend/`) | **Render** (render.com) — or Railway / Fly.io, anything that runs a Dockerfile | HTTPS + custom domain included |
| Admin console (`admin/`) | **Vercel** (vercel.com) | Made for Next.js, free for small teams |
| Push notifications | **Expo Push Service** (via EAS) | No Apple/Google push keys on your server |
| Reset emails | **Resend** (resend.com) | Simple API, free tier |

Suggested domains: `api.your-domain.com` for the API, `admin.your-domain.com` for the console.
A domain is optional (hosts give you `*.onrender.com` / `*.vercel.app` URLs) but recommended.

---

## 1. Database (Neon)

1. Create a Neon project (region close to your users).
2. Copy the **connection string** (it looks like
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. That's your `DATABASE_URL`. Keep it secret; it only ever goes into the API host's env settings.

## 2. API (Render)

**Blueprint (fastest):** Render → *New* → *Blueprint* → pick this repo. It reads `render.yaml`,
creates the `focus-api` web service and a daily `focus-cleanup` cron job, and asks for the
secret values.

**Manual:** Render → *New* → *Web Service* → connect the repo, then:

- Runtime: **Docker**, Docker context `backend`, Dockerfile path `backend/Dockerfile`
- Health check path: `/v1/health`
- Instance: Starter (the free tier sleeps and makes the first request slow)
- Environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | from Neon |
| `TRUST_PROXY` | `1` |
| `RESEND_API_KEY` / `EMAIL_FROM` | from Resend (optional; enables "Forgot password?") |
| `EXPO_ACCESS_TOKEN` | optional, see *Push notifications* |

The container runs pending **migrations automatically** on every start, then the server.

**Create the first Super Admin** (once): Render → your service → *Shell*:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@your-domain.com \
ADMIN_BOOTSTRAP_PASSWORD='A-long-Unique-passw0rd' \
ADMIN_BOOTSTRAP_NAME='Your Name' \
node dist/database/seedAdmin.js

node dist/database/seedContent.js      # category tree: Religion › Shiva › Mahadev, Nature › …
```

Lost the password? Re-run the first command with `--reset-password`.

**Custom domain:** Settings → Custom Domains → `api.your-domain.com` (HTTPS is automatic).

**Daily cleanup** (if you didn't use the blueprint): *New* → *Cron Job*, same Docker settings,
schedule `30 3 * * *`, command `node dist/database/cleanup.js`, env `DATABASE_URL`.

Check: `https://api.your-domain.com/v1/health` → `{"ok":true,...}`.

## 3. Admin console (Vercel)

1. Vercel → *Add New Project* → import the repo.
2. **Root Directory: `admin`** (framework auto-detects Next.js).
3. Environment variable: `API_URL` = `https://api.your-domain.com` (no trailing slash).
4. Deploy, then add the domain `admin.your-domain.com`.
5. Sign in with the Super Admin you created. Add other admins under **Admins & roles**.

The console is `noindex` and every page requires a session; consider also restricting it by
IP/SSO at the host level if your plan allows (Vercel → Deployment Protection).

## 4. Mobile app environment variables (EAS)

The app reads **public** values at build time. Create them once per environment on expo.dev
(values are public URLs, never secrets):

```bash
npx eas-cli login
npx eas-cli init                         # links the project, writes extra.eas.projectId into app.json
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.your-domain.com --visibility plaintext
npx eas-cli env:create --environment preview    --name EXPO_PUBLIC_API_URL --value https://api.your-domain.com --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_PRIVACY_POLICY_URL --value https://your-domain.com/privacy --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_TERMS_URL --value https://your-domain.com/terms --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPPORT_EMAIL --value support@your-domain.com --visibility plaintext
# repeat the privacy/terms/support lines for --environment preview
```

The `preview` / `production` build profiles in `eas.json` pull the matching environment.
For local development put the same keys in `.env` (see `.env.example`).

## 5. Push notifications

1. `npx eas-cli init` (above) gives the app its EAS project ID — required for push tokens.
2. **Android:** create a Firebase project → add an Android app with package
   `com.atmasanyam.focus` → Project settings → Service accounts → *Generate new private key*.
   Upload it: `npx eas-cli credentials` → Android → production → *Google Service Account* →
   *Manage your Google Service Account Key for Push Notifications (FCM V1)*.
3. **iOS:** `npx eas-cli credentials` → iOS → *Push Notifications: Manage your Apple Push
   Notifications Key* → let EAS create it (needs your Apple Developer login).
4. Optional hardening: expo.dev → Account settings → Access tokens → create a token, set it as
   `EXPO_ACCESS_TOKEN` on the API, and enable *Enhanced Security for Push Notifications* in the
   project settings.
5. Push only works in installed builds (development/preview/production), **not Expo Go**.
   Test: install a preview build → Settings → *News & announcements* on → admin console →
   Notifications → send to "Everyone".

## 6. Email for password resets (Resend)

1. Create a Resend account, add and verify your domain (DNS records they show you).
2. Create an API key → set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `FOCUS <no-reply@your-domain.com>`)
   on the API and redeploy. "Forgot password?" appears in the app automatically.

## 7. Updating

- **API / admin:** push to `main` → Render and Vercel redeploy (migrations run on API start).
- **Database changes:** edit `backend/src/database/schema.ts` → `npm run db:generate` → commit the
  new SQL in `backend/drizzle/`.
- **App:** bump `version` in `app.json` for user-visible releases (build numbers auto-increment),
  build and submit (see STORE_SUBMISSION.md). Use the admin console's *App version & update
  notices* to nudge or require updates.

## Backups & monitoring (recommended)

- Neon keeps point-in-time history; for extra safety schedule a `pg_dump` to storage you control.
- Add an uptime monitor on `/v1/health` (e.g. Better Stack, UptimeRobot).
- App errors appear under **Analytics → App errors**. For full crash reporting with stack traces
  consider adding Sentry (`@sentry/react-native`) later — it needs its own account/DSN.
