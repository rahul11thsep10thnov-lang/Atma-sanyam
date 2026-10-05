# Operations — backups, alerts and uptime

The safety net has three parts. Set all three up before launch; together they
take about 30 minutes.

| Part | What it does | Where it runs | You need |
|---|---|---|---|
| **Backups** | Every night: `pg_dump` → AES-256 encrypted → **restored into a scratch database to prove it works** → kept 30 days (+ optional offsite copy) | GitHub Actions, `.github/workflows/db-backup.yml` | 2 repository secrets |
| **Alerts** | Messages the team the moment the API has a server error, crashes, cannot reach the database, a generation job fails, or a payment signature does not verify | Inside the API (and the worker) | 1–2 environment variables on the API |
| **Uptime** | Every 10 minutes checks the website, the API (including its database) and the console; alerts when one goes down, hourly while it stays down, and when it is back | GitHub Actions, `.github/workflows/uptime.yml` | 1 repository variable |

> Scheduled GitHub workflows run only from the repository's **default branch**
> (merge to `main` first). In a public repository GitHub pauses schedules
> after 60 days without commits and e-mails you; re-enable them under
> *Actions* if that happens.

---

## 1. Alert channel (do this first)

Pick one or both.

**Slack** — api.slack.com/apps → *Create New App* → *Incoming Webhooks* → on →
*Add New Webhook to Workspace* → choose a channel → copy the
`https://hooks.slack.com/services/…` URL.

**Discord** — channel settings → *Integrations* → *Webhooks* → *New Webhook* →
*Copy Webhook URL* (`https://discord.com/api/webhooks/…`).

**Telegram** — talk to **@BotFather** → `/newbot` → copy the bot token. Add the
bot to your team group (or send it a message), then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` (group ids
start with `-100`).

Put the values in **two places**:

1. **On the API** (Render → policeexams-api → Environment; locally
   `backend/.env`): `ALERT_WEBHOOK_URL` and/or `TELEGRAM_BOT_TOKEN` +
   `TELEGRAM_CHAT_ID`. Restart the API.
2. **In GitHub** (repository → Settings → Secrets and variables → Actions →
   *Secrets*): the same names, for the backup and uptime workflows.

Check it: Console → **Settings** → **Alerts** shows which channels are on;
**Send test alert** posts a message and reports per channel whether it was
delivered.

### What sends an alert

| Event | Meaning | First thing to do |
|---|---|---|
| Server error (500) on an API request | A request failed unexpectedly. The message has the method, path and a request id | Search the API logs for the `requestId` |
| The API / worker could not start | Bad configuration or the database is unreachable at start-up | Read the message; check the latest environment change and deploy log |
| The API process crashed | Uncaught exception or unhandled rejection; the host restarts it | Logs around the time; usually a bug to fix |
| Database is not answering the health check | `/api/health/deep` could not run `select 1` within 3 s | Database provider status page; connection limits |
| A question-generation job failed | Every batch of a job failed (AI key, quota, refusals) | Console → Generate Questions → the job → batch errors |
| Generation worker cannot read its queue / a batch crashed | The worker is unhealthy | Restart the API/worker; check database |
| A payment signature did not verify | Someone sent a Razorpay confirmation that did not match. One-offs can be a tampered request; several in a row mean the key secret is wrong | Compare `RAZORPAY_KEY_SECRET` with the Razorpay dashboard; check the order in Razorpay |
| Razorpay refused to create an order | The Razorpay API answered with an error | Razorpay dashboard / key status |
| A Razorpay webhook had an invalid signature | `RAZORPAY_WEBHOOK_SECRET` differs from the secret in Razorpay → Webhooks, or someone is posting fake webhooks | Re-copy the secret on both sides |
| Razorpay reported a payment for an unknown order / an amount that does not match — plan NOT activated | The webhook named an order this server never created, or the paid amount differs from the order | Look the order up in Razorpay; grant the plan by hand (Users) only after checking the payment |
| Nightly backup FAILED (from GitHub) | The dump, encryption or restore check failed | Open the linked run; see §2 |
| URL is DOWN / STILL DOWN / back up (from GitHub) | Uptime check | §3 |

Repeats of the same kind are grouped: the first goes out at once, further ones
within `ALERT_MIN_INTERVAL_SECONDS` (default 600) are counted and sent as one
"+N more" message; at most `ALERT_MAX_PER_HOUR` (default 30) messages an hour.
Messages contain only technical fields (event, path, request id, job id,
error text) — never user ids, e-mails, phone numbers, tokens or request
bodies. A failing alert channel never affects users.

---

## 2. Database backups

### Set up

Repository → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `BACKUP_DATABASE_URL` | A connection string the backup can use (below) |
| `BACKUP_PASSPHRASE` | A long random passphrase: `openssl rand -base64 32`. **Also store it in your password manager — without it no backup can be opened.** |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | Optional offsite copy to AWS S3, Cloudflare R2 (endpoint `https://<account>.r2.cloudflarestorage.com`) or Backblaze B2 |

Optional *variable* `BACKUP_RETENTION_DAYS` (default 30; GitHub allows up to
90 for public repositories).

**Which connection string.**

- **Supabase**: Project Settings → Database → Connection string → **Session
  pooler** (port 5432, host `aws-…pooler.supabase.com`, user
  `postgres.<project-ref>`). GitHub's runners have no IPv6, so the direct
  `db.<ref>.supabase.co` host does not work; the *transaction* pooler (6543)
  does not work with `pg_dump`.
- **Neon**: the connection string *without* `-pooler` in the host.
- Recommended: a read-only role for backups, created once as the database
  owner (on Supabase the pooler user is then `backup_reader.<project-ref>`):

  ```sql
  create role backup_reader login password '<long random password>';
  grant usage on schema public, drizzle to backup_reader;
  grant select on all tables in schema public, drizzle to backup_reader;
  grant select on all sequences in schema public, drizzle to backup_reader;
  -- tables added by future migrations
  alter default privileges in schema public grant select on tables to backup_reader;
  alter default privileges in schema public grant select on sequences to backup_reader;
  alter default privileges in schema drizzle grant select on tables to backup_reader;
  ```

Then **Actions → Database backup → Run workflow** once. The run summary
lists the file, its SHA-256 and the row counts of the restored copy (exams,
questions, options, mock tests, users, attempts, subscriptions, admins, audit
log, migrations). If those numbers look right, the backup works.

### What each run does

1. `pg_dump` (PostgreSQL 17 client) of the `public` and `drizzle` schemas —
   every table the app uses plus the migration history.
2. Encrypts it with gpg AES-256; the unencrypted dump is shredded.
3. **Restore check**: decrypts the encrypted file again and restores it into
   an empty PostgreSQL 17, then counts rows in the core tables. A missing
   table, an unreadable file or a wrong passphrase fails the run (and alerts).
4. Uploads `policeexams-db-<date>.pgc.gpg` as the run's artifact and, if set,
   to `s3://<bucket>/policeexams/`.

Artifacts can be downloaded by anyone with read access to the repository;
the file is useless without the passphrase. For a second copy outside GitHub,
configure the S3 secrets. Supabase/Neon's own backups (paid plans, point-in-
time recovery) are a good extra layer, not a replacement.

### Restore (runbook)

Use a PostgreSQL **17** client (`brew install postgresql@17`,
`apt install postgresql-client-17`, or prefix commands with
`docker run --rm -it -v "$PWD:/w" -w /w postgres:17`).

1. Actions → *Database backup* → pick the run → download the artifact →
   unzip → `policeexams-db-<date>.pgc.gpg` (or fetch it from your bucket).
2. Decrypt (asks for the passphrase):

   ```bash
   gpg --output backup.pgc --decrypt policeexams-db-<date>.pgc.gpg
   ```

3. **Safest: restore into a new, empty database**, check it, then switch
   the API to it.

   ```bash
   psql "$NEW_DATABASE_URL" -c 'drop schema if exists public cascade'
   pg_restore --no-owner --no-privileges --dbname "$NEW_DATABASE_URL" backup.pgc
   psql "$NEW_DATABASE_URL" -c 'select count(*) from questions'
   ```

   Set `DATABASE_URL` on the API to the new database and redeploy. The API
   applies any migrations newer than the backup on start.

4. Overwriting the live database instead: stop the API (and worker) first,
   then run step 3 against the live URL. Everything written after the backup
   is lost — prefer step 3.

5. Only need a few rows back (e.g. a deleted test)? Restore into a scratch
   database as in step 3 and copy the rows across, or print one table:
   `pg_restore --data-only --table mock_tests --file mock_tests.sql backup.pgc`.

After a restore, delete the decrypted `backup.pgc`.

---

## 3. Uptime checks

Repository → Settings → Secrets and variables → Actions → **Variables** →
`UPTIME_URLS`, comma-separated, for example:

```
https://policeexams.in,https://api.policeexams.in/api/health/deep,https://admin.policeexams.in/login
```

Every 10 minutes each URL is fetched (two tries, 25 s each); any 2xx/3xx is
up. A URL that goes down alerts once, again every hour while it stays down,
and once more when it recovers, with the downtime. Run it by hand under
*Actions → Uptime check → Run workflow*.

GitHub can delay scheduled runs by 5–15 minutes at busy times. For
minute-level monitoring also add a free external monitor (UptimeRobot, Better
Stack, Freshping…) on `https://<api>/api/health/deep`, alerting to the same
channel.

### Health endpoints

| Endpoint | Use | Answers |
|---|---|---|
| `GET /api/health` | Liveness, used by Render's health check | `200 {status: "ok"}` whenever the process runs |
| `GET /api/health/deep` | Uptime monitors | `200` when the database answers `select 1` within 3 s, else `503 {status: "down"}` **and an alert**. Shows only `ok` flags, latency and uptime — no configuration |

---

## 4. Monthly drill (15 minutes)

- [ ] Console → Settings → Alerts → **Send test alert**; it arrives.
- [ ] Actions → *Database backup*: last 30 runs green; open the latest summary
      and check the row counts grew as expected.
- [ ] Download one backup and restore it into a scratch database (§2 Restore,
      step 3). Delete the scratch database afterwards.
- [ ] Actions → *Uptime check*: runs are happening; no unexplained outages.
- [ ] The passphrase is still in the password manager and someone other than
      you knows where.
