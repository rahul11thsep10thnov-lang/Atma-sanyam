# LoJi API

Express 5 + TypeScript + Drizzle ORM on PostgreSQL, with a WebSocket hub for live child
status and game mirroring. Serves the app (`/v1`, guardian and player tokens) and the admin
console (`/admin/v1`). Full endpoint list: [../docs/API.md](../docs/API.md).

```bash
cp .env.example .env        # set DATABASE_URL; SMS_PROVIDER=console and BILLING_SANDBOX=true for local use
npm install
npm run db:migrate          # apply SQL migrations + sync roles/permissions
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='Long-Unique-Pass1' npm run seed:admin
npm run dev                 # http://localhost:4000 — seeds the catalogue on start, prints OTP codes to this terminal
```

| Script | What it does |
|---|---|
| `npm run dev` | Watch mode |
| `npm test` | Integration tests against a real Postgres (`TEST_DATABASE_URL`, default `postgres://focus:focus-local-dev@localhost:5432/focus_test`). The test database is wiped per test file. |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run db:generate` | After editing `src/database/schema.ts`, generate a new SQL migration |
| `npm run db:migrate` (`:prod`) | Apply migrations |
| `npm run seed:admin` (`:prod`) | Create the first Super Admin from env vars (`--reset-password` to reset) |
| `npm run seed:catalogue` (`:prod`) | Insert missing brackets, categories, games, craft tutorials, fact sources and facts (also runs on server start) |
| `npm run seed:content` (`:prod`) | Image-library category tree (optional illustrations for facts) |
| `npm run cleanup` (`:prod`) | Expired sessions/codes, stale game sessions, deletion requests past cooling-off, retention (run daily) |
| `node --experimental-strip-types scripts/gen-origami.ts` | Regenerate `src/catalogue/origamiDiagrams.ts` from the app's fold models |

Tests cover: admin auth and RBAC, guardian registration/login/OTP/step-up/recovery/deletion,
household and parental-control enforcement, player sessions and limits, the fact and craft
libraries, subscriptions (state machine, Google Play and Razorpay verification, webhooks,
sandbox, admin actions), real-time mirroring over WebSocket, and the cleanup job.
