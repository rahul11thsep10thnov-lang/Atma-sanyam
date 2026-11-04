# Private cloud run (3–4 weeks, 15–20 sources)

Goal: the admin and a demo copy of the site are reachable from anywhere, day and night, behind a password, invisible to Google, with only a handful of important sources switched on. Nothing here has been run on a real host by the author — follow it step by step and report anything that differs.

## A. Accounts (30–45 minutes)
1. **GitHub** — you have it. The code is in `rahul11thsep10thnov-lang/Atma-sanyam`, branch `claude/govt-exam-portal-2a6yid`.
2. **Railway** (railway.app) — hosts the website, the worker and the database. Sign in with GitHub. Add a card (roughly $5–15 a month for this).
3. **Cloudflare R2** (or any S3 storage) — stores notice PDFs. Create a bucket and an access key. (Required in production.)

## B. Create the project on Railway
4. New Project → **Deploy from GitHub repo** → pick `Atma-sanyam`, branch `claude/govt-exam-portal-2a6yid`. In the service Settings set **Root Directory** to `exam-portal`.
5. **Add → Database → PostgreSQL.** Copy its connection string.
6. In the web service **Variables**, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Postgres connection string (Railway can reference it) |
| `NEXTAUTH_SECRET` | a long random text (32+ characters) |
| `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` | the Railway address, e.g. `https://xxxx.up.railway.app` (update after step 9 if you add a domain) |
| `SITE_ACCESS_PASSWORD` | the password for the demo site (the private gate) |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` | from Cloudflare R2 |
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` | your admin login (use a strong password) |
| `CRON_SECRET` | another long random text |
| `PAYMENT_PROVIDER` | leave unset for now (payments off in private phase) |

   Optional but recommended: `ANTHROPIC_API_KEY` (better extraction), `RESEND_API_KEY` + `ALERTS_FROM_EMAIL`.
7. Web service Settings:
   - Build command: `npm ci --legacy-peer-deps && npm run build`
   - Pre-deploy command: `npx prisma migrate deploy`
   - Start command: `npm run start`
8. Click **Deploy**. When it is green, open the generated address: the browser should ask for the password.
9. (Optional) Settings → Networking → add a custom domain such as `preview.yourdomain.in`, then update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL`.

## C. The always-on worker
10. In the same project: **New → GitHub repo** (same repo) → name it `worker`. Root Directory `exam-portal`. Give it the same Variables as the web service (Railway lets you share variables). Start command: `npm run pipeline:worker`. No public address needed.
11. Check its logs: it should print `[pipeline …]` lines every 15 minutes.

## D. One-time setup (from the web service's shell, or run locally against the Railway DB)
12. `npm run seed:admin` — creates your admin account.
13. `npm run seed:sources` — loads the 176 sources (all switched off).

## E. Switch on the starter sources
14. Log in at `/admin/login`. Go to **Automation → Sources**.
15. Run `npm run sources:verify -- --id <id>` or tick sources and press **Test (verify, max 25)** — this runs from the cloud server, which is what matters.
16. Approve then Enable only the ones that verified. Suggested first set (15–20):
    SSC · IBPS · SBI Careers · RBI Opportunities · RRB common portal (rrbapply) · RRB Patna · RRB Prayagraj · RRB Mumbai · India Post GDS · NTA (and UGC NET) · UP Police (UPPBPB) · UPPSC · UPSSSC · BPSC · BSSC · MPPSC · MPESB · RPSC · RSSB · Indian Army (joinindianarmy).
17. **UPSC** will probably show "blocked" — that is expected; do not enable it until you have another route.

## F. Daily routine for 3–4 weeks
- Morning and evening: **Automation → Review queue**; approve, correct or reject. Don't auto-publish anything yet.
- Check **Sources** for "needs attention" / "blocked" and fix or disable those.
- Weekly: add 3–5 more sources once the earlier ones behave. Note how many notices needed correction.

## G. When you are ready to go public
- Delete `SITE_ACCESS_PASSWORD` and redeploy. The site becomes public and indexable.
- Switch on payments (Razorpay), SMS (OTP) and email, test each once, then submit `sitemap.xml` to Google Search Console.
