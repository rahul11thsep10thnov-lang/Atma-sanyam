# FOCUS API

Express 5 + TypeScript + Drizzle ORM on PostgreSQL. Serves the mobile app (`/v1`) and the
admin console (`/admin/v1`). Full endpoint list: [../docs/API.md](../docs/API.md).

```bash
cp .env.example .env        # set DATABASE_URL
npm install
npm run db:migrate          # apply SQL migrations + sync roles/permissions
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='Long-Unique-Pass1' npm run seed:admin
npm run seed:content        # category tree (--with-samples adds placeholder DRAFT images)
npm run dev                 # http://localhost:4000
```

| Script | What it does |
|---|---|
| `npm run dev` | Watch mode |
| `npm test` | Integration tests against a real Postgres (`TEST_DATABASE_URL`, default `postgres://focus:focus-local-dev@localhost:5432/focus_test`). The test database is wiped on each run. |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run db:generate` | After editing `src/database/schema.ts`, generate a new SQL migration |
| `npm run db:migrate` (`:prod`) | Apply migrations |
| `npm run seed:admin` (`:prod`) | Create the first Super Admin from env vars (`--reset-password` to reset) |
| `npm run seed:content` (`:prod`) | Create the category tree |
| `npm run cleanup` (`:prod`) | Delete expired sessions/codes and old analytics (run daily) |

Local email testing: set `MAIL_DEV_LOG=true` to print reset codes to the console
(ignored when `NODE_ENV=production`).
