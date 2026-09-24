# AI Whiteboard Teacher Studio

Turns uploaded teaching material (TXT / PDF / DOCX / pasted text) into
faceless, whiteboard-style educational videos: a fixed AI teacher voice, an
independently-worded explanation with a freshly generated (and
independently verified) example, and a progressively-drawn whiteboard —
rendered to MP4, at batch scale.

See `docs/ARCHITECTURE.md` for the full system design and the specific
decisions made where the original spec was ambiguous.

## Implementation status

Phases 1–10 of the build spec (project scaffolding through an end-to-end
mock-mode render) are implemented and covered by a passing automated test
that renders a real MP4. Phases 11–12 (real LLM / voice integration) are
implemented behind `MOCK_AI=false` / `MOCK_VOICE=false`. Quality control,
batch generation (with the safety-gate confirmation flow), and the full
privacy/retention/export system (spec's second, privacy-focused half) are
implemented and tested. Production hardening (phase 15 — real cloud
storage backend, real auth, load testing) is scaffolded (`StorageService`
abstraction, `docs/PRIVACY.md`, `docs/TROUBLESHOOTING.md`) but not built
out further, per the MVP-first instruction in the build spec.

Two voice backends are supported (`VOICE_PROVIDER`), documented in
`docs/ELEVENLABS.md` (paid, hosted) and `docs/CHATTERBOX.md` (free,
self-hosted, no per-minute cost — added after the initial build).

What that means concretely:

- **Working and tested:** upload/paste → text extraction → lesson analysis
  → example generation + independent calculation verification → teaching
  plan (narration + whiteboard actions) → mock or real voice generation
  (cached) → timing → real Remotion render → FFmpeg post-processing
  (thumbnail, SRT/VTT subtitles) → quality control → dashboard UI for all
  of the above → privacy dashboard (retention settings, storage breakdown,
  export, cascade delete, delete-all) → ownership scoping (a user cannot
  reach another user's lesson).
- **`ChatterboxVoiceService` (free, self-hosted voice):** its HTTP contract
  (`/tts`, `/upload_reference`) was verified end-to-end in this environment
  against a stand-in server implementing the real Chatterbox-TTS-Server API
  shape — upload-clone, test-voice, and a full 5-scene lesson all generated
  audio through it correctly. The actual Chatterbox model itself was not
  run here (no GPU/model download in this sandbox) — that part depends on
  you standing up the real server per `docs/CHATTERBOX.md`.
- **Implemented, not live-tested here:** `AnthropicProvider` (real LLM) and
  `ElevenLabsVoiceService` (real TTS) — both are fully coded and isolated
  behind the same interfaces the mock implementations satisfy, so flipping
  `MOCK_AI`/`MOCK_VOICE` to `false` with real keys in `.env` is the only
  change needed.
- **Not built:** Celery workers are configured with separate queues and
  retry/backoff policy (`docs/BATCH_PROCESSING.md`), and batch API routes
  enforce the safety-gate confirmation flow, but a batch's `start` endpoint
  does not yet enqueue the per-lesson Celery tasks (see the comment in
  `app/api/routes/batches.py`) — the single-lesson pipeline is run
  synchronously today. Wiring that dispatch is the main remaining piece
  before 500+ video batches genuinely run unattended.

## Quickstart (mock mode, no API keys required)

```bash
cp .env.example .env          # MOCK_AI=true, MOCK_VOICE=true by default
docker compose up -d          # postgres + redis (optional for a first look — see below)

cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pytest                        # runs the full test suite, including a real MP4 render
uvicorn app.main:app --reload

# in another terminal
cd frontend
cp .env.example .env.local    # then fill BACKEND_API_TOKEN — see below
npm install
npm run dev
```

To get a `BACKEND_API_TOKEN` for local development, start the backend and
call `GET /api/dev/local-token` (only available when `ENVIRONMENT=development`,
the default) — this returns the single local user's bearer token.

`DATABASE_URL` defaults to a SQLite file under `storage/` so the whole
pipeline (including tests) works without a running Postgres server; point
it at the Postgres started by `docker compose up -d` for anything beyond a
first look (see `docs/ARCHITECTURE.md`).

## Full documentation

- `docs/ARCHITECTURE.md` — system design, layering, and documented decisions
- `docs/SETUP.md` — full local dev setup (backend, worker, frontend, renderer)
- `docs/ELEVENLABS.md` — connecting your own ElevenLabs voice clone
- `docs/CHATTERBOX.md` — free, self-hosted voice alternative (no per-minute cost)
- `docs/VIDEO_RENDERING.md` — the Remotion whiteboard engine and FFmpeg pipeline
- `docs/BATCH_PROCESSING.md` — batch safety gate and Celery queue design
- `docs/API.md` — REST API reference
- `docs/TROUBLESHOOTING.md` — common errors and fixes
- `docs/PRIVACY.md` — data categories, retention, deletion, export, logging

## Project layout

```
/backend    FastAPI + SQLAlchemy + Celery — all business/AI/voice logic
/frontend   Next.js dashboard — talks only to /backend, never to ElevenLabs/LLM
/renderer   Remotion project — pure function of (lesson JSON, audio) -> MP4
/shared     Generated JSON Schema for the Teaching Plan contract
/storage    Local filesystem storage root (uploads, audio, video, thumbnails)
/docs       Documentation set listed above
```

## Running the tests

```bash
cd backend && source .venv/bin/activate && pytest -v
```

The suite includes an end-to-end test
(`tests/test_e2e_pipeline.py::test_full_pipeline_produces_playable_mp4`)
that runs the real pipeline — mock AI, mock voice, real timing engine, real
Remotion CLI subprocess — and asserts a playable MP4 with subtitles comes
out the other end.
