# LoJi admin console

Next.js 16 (App Router). Talks to the LoJi API through a same-origin server-side proxy, so the
admin session token lives only in an httpOnly cookie. Permissions are enforced by the API
(roles: super_admin, admin, editor, fact_checker, support).

```bash
cp .env.example .env.local   # API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3000
```

Sign in with the Super Admin created by `npm run seed:admin` in `../backend`.

Pages: Dashboard · Guardians · Subscriptions · Games · Art & Craft · Did You Know? · Fact sources ·
Image library · Image categories · Feature flags & config · Notifications · Analytics ·
System health · Admins & roles · Audit log · My account.

Deploy on Vercel with **Root Directory = `admin`** and `API_URL` set (see ../docs/DEPLOYMENT.md).
