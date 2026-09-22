# Setup

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)
- FFmpeg on `PATH`

## 1. Clone and configure

```bash
cp .env.example .env
```

Leave `MOCK_AI=true` and `MOCK_VOICE=true` to run the entire pipeline without
any paid API keys. See `docs/ELEVENLABS.md` to switch on real voice
generation, and set `LLM_PROVIDER`/`LLM_API_KEY` to switch on real LLM calls.

## 2. Start stateful dependencies

```bash
docker compose up -d
```

This starts Postgres on `5432` and Redis on `6379` matching the defaults in
`.env.example`. If Docker isn't available in your environment, point
`DATABASE_URL` at any reachable Postgres instance, or at
`sqlite:///./storage/dev.db` for local testing only (see
`docs/ARCHITECTURE.md`).

## 3. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs.

## 4. Worker

```bash
cd backend
source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

## 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at http://localhost:3000.

## 6. Renderer (standalone)

```bash
cd renderer
npm install
npm run render
# equivalent to:
# npx remotion render src/index.ts WhiteboardLesson out/demo_average_speed.mp4 --props=sample-input/demo_average_speed.json
```

This is normally invoked by the backend's `RenderService`, but can be run
directly for renderer development.

## 7. Run the demo end-to-end

With the backend venv active:

```bash
cd backend
pytest tests/test_e2e_pipeline.py -v
```

This exercises the full pipeline in mock mode and produces
`renderer/out/demo_average_speed.mp4`.

## Running all backend tests

```bash
cd backend
pytest -v
```
