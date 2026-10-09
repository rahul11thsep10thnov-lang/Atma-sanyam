# Deployment

This is a standard Next.js 16 app with a PostgreSQL database — no
custom infrastructure required. See `ENVIRONMENT_VARIABLES.md` for
every variable referenced below.

## 1. Provision a PostgreSQL database

Any managed Postgres works (Neon, Supabase, RDS, Render). The schema
was developed and migrated against local PostgreSQL 16; anything 14+
should be compatible. Grab the connection string and set it as
`DATABASE_URL` — most managed providers require `?sslmode=require`
appended.

## 2. Provision object storage (optional, but required for the document system to work in production)

Any S3-compatible provider: AWS S3, Cloudflare R2, Supabase Storage,
Backblaze B2, MinIO. Create a bucket, generate an access key pair, and
set the 5 `STORAGE_*` variables. **If you skip this in production, the
app throws at startup rather than silently writing uploaded PDFs to
local disk** — local disk doesn't survive a redeploy and isn't shared
across serverless instances, so this is deliberate, not a bug to work
around.

## 3. Set environment variables on your host

At minimum: `DATABASE_URL`, `NEXTAUTH_SECRET` (generate with `openssl
rand -base64 32`), `NEXTAUTH_URL` (your production URL, no trailing
slash), `NEXT_PUBLIC_SITE_URL` (same value, used for SEO metadata), and
the 5 `STORAGE_*` variables if you completed step 2. See
`ENVIRONMENT_VARIABLES.md` for the full table, including what's
optional and what's not wired up yet.

## 4. Run migrations against production

```bash
npm run db:migrate:deploy
```

This runs `prisma migrate deploy` — applies every migration in
`prisma/migrations/` in order, without generating a new one or
prompting interactively (unlike `db:migrate`, which is for local
development only). Run this as a one-off step in your deploy pipeline
*before* the new app version starts serving traffic, not from inside
the running app.

The `20261009120000_source_registry` migration (source registry, notice
sections) only adds columns, tables, enum values and indexes, and backfills
`canonicalUrl` / `nextCheckAt` / `sections` for existing rows. Its
`down.sql` rolls it back by hand if ever needed (PostgreSQL cannot remove
enum values, so the two new notice types and `ATOM` remain, unused). After
migrating, run `npm run seed:sources` once to load the registry — every new
source arrives disabled and awaiting approval (see `SOURCES.md`).

## 5. Build and start

```bash
npm run build
npm run start
```

`npm install` already runs `prisma generate` via the `postinstall`
script, so a normal CI/deploy pipeline (`npm install && npm run build`)
needs no extra step for that.

## 6. Create the first admin account

```bash
ADMIN_BOOTSTRAP_EMAIL=you@example.org \
ADMIN_BOOTSTRAP_PASSWORD='a-long-strong-passw0rd' \
ADMIN_BOOTSTRAP_NAME='Your Name' \
npm run seed:admin
```

Run this once, against the production database, then remove those 3
variables from your environment — they're only read by this one-off
script (`prisma/seedAdmin.ts`), never by the running app. It creates a
single `SUPER_ADMIN`; create every other admin account from inside the
CMS itself (`/admin/users` once that page exists — currently a
placeholder in the sidebar) or directly via Prisma Studio (`npm run
db:studio`) in the meantime.

## Recommended host: Vercel

Matches the spec's own recommendation and is what this app was built
against (Next.js 16, Turbopack, App Router route handlers, Server
Actions). Any Node 20+ host that can run `next build`/`next start`
works too — there's nothing Vercel-specific in the app code itself.

On Vercel specifically:

- Set environment variables under Project → Settings → Environment
  Variables, split by environment (Production/Preview/Development) so
  preview deployments don't share a database or storage bucket with
  production.
- Run `npm run db:migrate:deploy` as a Vercel deploy hook or a manual
  step before promoting a deployment to production — Vercel doesn't run
  it automatically.
- `NEXTAUTH_URL` should be your custom domain, not the
  Vercel-assigned `*.vercel.app` URL, once you've attached one.

## What's NOT set up yet

- **CI**: no `exam-portal` job in `.github/workflows/ci.yml` yet — see
  `DEVELOPMENT_STATUS.md`'s running "Known follow-ups" list. Until
  then, run `npm run typecheck && npm run lint && npm run test && npm
  run build` locally before every deploy.
- **A real AI extraction provider**: `AI_EXTRACTION_PROVIDER` only
  supports `mock` today (see `ENVIRONMENT_VARIABLES.md`).
- **Real notification channels**: only the on-site WEBSITE channel
  actually sends; EMAIL/PUSH/TELEGRAM/WHATSAPP/ANDROID all record an
  honest `FAILED` delivery until a real provider is implemented.
