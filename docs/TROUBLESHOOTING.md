# Troubleshooting

**"Voice generation failed. Check your ElevenLabs connection or retry the
scene."**
Your `ELEVENLABS_API_KEY` or `ELEVENLABS_VOICE_ID` is missing/invalid, or
`MOCK_VOICE=false` but ElevenLabs returned a non-2xx response. Check
`/voices` in the dashboard, or set `MOCK_VOICE=true` to keep developing.

**PDF extraction reports low text quality**
The PDF is likely scanned/image-only. `PdfExtractor` raises
`ExtractionQualityError` rather than silently producing near-empty text.
OCR is not implemented in the MVP; convert the PDF to text/DOCX first.

**`alembic upgrade head` fails to connect**
Check `DATABASE_URL` in `.env` and that `docker compose up -d` succeeded
(`docker compose ps`). For sandboxed testing without a Postgres server, use
`sqlite:///./storage/dev.db`.

**Celery worker doesn't pick up jobs**
Confirm `REDIS_URL`/`CELERY_BROKER_URL` match a running Redis
(`redis-cli ping`), and that the worker was started with the right `-Q`
queue names (see `docs/BATCH_PROCESSING.md`).

**Render fails with "remotion: command not found"**
Run `npm install` inside `/renderer` first; `RenderService` invokes
`npx remotion` from that directory.

**Render fails with an FFmpeg error**
Confirm `ffmpeg -version` works on the host/container running the worker.
`MediaProcessingService` surfaces FFmpeg's stderr in the job's error field.

**"You are about to generate 500 videos" won't proceed**
The batch safety gate is blocking on one of: source validation, missing API
keys, insufficient storage estimate, or a missing preview approval. The
`POST /batches/{id}/start` response lists which check failed.

**`npm audit` reports a critical Next.js advisory in `/frontend`**
`next@14.2.x` (the version this project was scaffolded against) is affected
by a Next.js Image Optimization API advisory that is only fully patched in
`next@16.3.5+`. This app does not use `next/image` or serve AVIF files, so
the app itself does not exercise the vulnerable code path, but before a
production deployment you should upgrade to a patched Next.js major version
(this will require re-testing the App Router pages, since Next 15+ made
route params asynchronous) rather than staying on 14.x indefinitely.

**A deleted lesson still shows a download link**
Downloads always go through `GET /assets/{id}/download`, which checks
`exists()` against the current storage/DB state on every request — if you
still see a stale link in the UI, refresh; the endpoint itself will 404 for
deleted assets even from a cached page.
