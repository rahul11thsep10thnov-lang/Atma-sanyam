# Deployment guide

## What runs

One process: the FastAPI app, which also runs the render job worker and serves the built dashboard. PostgreSQL holds
metadata. A data directory holds the asset library, generated audio and renders.

## With Docker Compose

```bash
cat > .env <<'ENV'
POSTGRES_PASSWORD=<long random string>
CSAE_JWT_SECRET=<python -c "import secrets; print(secrets.token_urlsafe(48))">
ENV
docker compose up -d --build
docker compose exec -e CSAE_USER_PASSWORD='<password>' app python -m backend.cli create-user you@example.com --role admin
```

The app listens on port 8000 (dashboard at `/`, API docs at `/api/docs`). On first start the container copies the
shipped asset library into the `data` volume and applies migrations. Put a TLS-terminating reverse proxy in front.

`Dockerfile` and `docker-compose.yml` have not been built in the environment this project was developed in (no Docker
daemon was available); treat the first build as a test.

## Without containers

```bash
bash scripts/setup_dev.sh                         # packages, venv, database role
cd frontend && npm ci && npm run build && cd ..
export CSAE_ENV=production CSAE_JWT_SECRET=... CSAE_DATABASE_URL=postgresql+psycopg://user:pass@host/db
export CSAE_DATA_ROOT=/srv/csae CSAE_FRONTEND_DIST=$PWD/frontend/dist
alembic upgrade head
python -m backend.cli serve --host 0.0.0.0 --port 8000
```

## Configuration (environment)

| Variable | Default | Meaning |
|---|---|---|
| `CSAE_ENV` | development | anything else requires `CSAE_JWT_SECRET` |
| `CSAE_DATABASE_URL` | local dev database | SQLAlchemy URL (`postgresql+psycopg://…`) |
| `CSAE_JWT_SECRET` | none | token signing key |
| `CSAE_TOKEN_TTL_MINUTES` | 720 | session length |
| `CSAE_DATA_ROOT`, `CSAE_ASSET_LIBRARY` | project folder | where assets and renders live |
| `CSAE_FRONTEND_DIST` | none | built dashboard to serve |
| `CSAE_CORS_ORIGINS` | `http://localhost:5173` | only needed when the dashboard is served elsewhere |
| `CSAE_VOICE_PROVIDER` | espeak | `espeak`, `sarvam` (needs `CSAE_SARVAM_API_KEY`), `tone` (tests) |
| `CSAE_LLM_PROVIDER` | none | `anthropic` enables LLM story analysis (credentials from the Anthropic SDK's usual sources) |
| `CSAE_MAX_UPLOAD_BYTES` | 26214400 | upload limit |
| `CSAE_RENDER_TIMEOUT_SECONDS`, `CSAE_RENDER_RETRIES` | 3600, 1 | per-scene limits |

## Backups

```bash
scripts/backup.sh /backups                                   # database dump + asset library + stories, with checksums
CSAE_DATABASE_URL=<empty database> scripts/restore.sh /backups/csae_<stamp> --files-to /srv/csae
```

Renders are not backed up: they can be regenerated from stories and assets. Restore is tested in
`tests/acceptance/test_phase11_hardening.py`.

## Operations

- **Sizing:** rendering uses every core; one render job at a time per machine is the intended load. 1080p costs about
  one CPU-second-per-core per frame on 4 cores. 8 GB RAM is ample.
- **Restarts:** a job that was rendering is marked `interrupted`; `POST /render-jobs/{id}/resume` continues it and
  reuses finished scenes and frames.
- **Logs:** JSON lines on stderr (request log, audit events, job errors). Per-scene worker logs under `renders/jobs/`.
- **Disk:** `renders/temporary` only holds work in progress; `renders/scenes` is a cache and may be pruned at any time.
- **Scaling out:** `JobRunner.execute(job_id)` is the unit of work; a Celery or other queue worker can call it
  unchanged once more than one render machine is justified. Shared storage for `CSAE_DATA_ROOT` is then required.
- **Security checklist:** set a strong `CSAE_JWT_SECRET`; serve over HTTPS; keep the database private; create named
  users with the least role that fits; review `audit_log`.
