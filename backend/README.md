# Atma Sanyam — Backend

REST API + AI news/video pipeline workers for the Atma Sanyam multilingual
family-news video platform. See [`ARCHITECTURE.md`](../ARCHITECTURE.md) at
the repo root for the full design.

## Quick start (development)

```bash
cp .env.example .env          # defaults work out of the box in mock/dev mode
docker compose up -d          # postgres + redis
npm install
npx prisma migrate dev        # creates schema
npx prisma db seed            # or: npx tsx prisma/seed.ts
npm run dev                   # API on http://localhost:4000
npm run worker:dev            # pipeline workers, in a separate terminal
```

With no API keys configured, every AI/TTS/video-render step falls back to a
deterministic offline implementation (`MockProvider`, `RuleBasedClassifier`,
`RuleBasedStoryExtractor`/`TemplateScriptGenerator`, `PassthroughTranslationService`,
`MockTtsProvider`, `MockVideoRenderer` unless ffmpeg is on PATH), so the
whole pipeline — ingest → classify → dedup → score → script → safety →
review → publish — runs end-to-end without any external service.

## Running the pipeline once, manually

The ingestion worker runs on a 15-minute schedule once `npm run worker` is
started, but for local testing you can drive stages directly:

```ts
import { prisma } from "./src/lib/prisma";
import { PipelineOrchestrator } from "./src/pipeline/PipelineOrchestrator";

const orchestrator = new PipelineOrchestrator(prisma);
await orchestrator.ingest();
// then classify / extractDedupAndScore / generateScript / approve / publishLanguage
```

## Tests

```bash
npm test
```

Covers: suitability/quality scoring (spec §2/§3/§13 — including the rule
that source-text *volume* alone must never substitute for missing
explanatory elements), rule-based classification, journalistic safety
linting (§10's allegation-vs-fact rule), content moderation (PII/minors),
duplicate-detection text similarity, and subtitle generation.

## Real providers

Set the corresponding env vars in `.env` to switch a module from its
offline fallback to a real provider — see `.env.example` for the full list
(`ANTHROPIC_API_KEY`, `NEWS_API_ORG_KEY`/`RSS_FEED_URLS`, `GOOGLE_TTS_API_KEY`
+ `TTS_PROVIDER=google-tts`, `STORAGE_*` for a real S3-compatible bucket).
Nothing outside each module's own factory function
(`getStoryExtractor`, `getScriptGenerator`, `getTranslationService`,
`getTtsProvider`, `getVideoRenderer`, `CompositeClassifier`) needs to
change.

Video rendering additionally requires `ffmpeg` on the worker host's PATH
and a TrueType font (e.g. `apt install ffmpeg fonts-dejavu-core`); without
it, `MockVideoRenderer` writes a JSON manifest instead of an actual video so
the rest of the pipeline stays testable.

## Admin API

`POST /api/v1/admin/auth/login` with an `AdminUser` row (create one via
Prisma Studio or a seed script with a bcrypt-hashed password) returns a
scoped admin JWT for `/api/v1/admin/*`.

## Video Studio

Design: [`../docs/VIDEO_STUDIO.md`](../docs/VIDEO_STUDIO.md). Code: `src/studio/`.

1. Run `npx prisma migrate deploy` and `npm run prisma:seed` once. The seed
   creates the 12 languages, the 8 base voices and the default provider settings.
2. Install FFmpeg and Noto fonts on the machine that runs the workers.
   On Ubuntu: `apt install ffmpeg fonts-noto-core`. On Windows: download FFmpeg,
   add its `bin` folder to PATH, and install the Noto Sans fonts for each
   script you publish in.
3. Start the API (`npm run dev`) and the workers (`npm run worker`). The workers
   run the news pipeline and the Studio queues `studio` and `studio-render`.
   Without Redis, set `STUDIO_INLINE_JOBS=true` and the API runs Studio jobs itself.
4. In the admin dashboard, open **Studio → New story**.

With no API keys, the Studio still produces real, correctly timed MP4s and
subtitles, but with placeholder art, silent placeholder voices and untranslated
text. QC flags all of these. Add the keys from `.env.example` (Video Studio
section) to get real output, then set each base voice's provider voice ID
on the **Voices** page.

Tests: `npm test` covers every Studio layer. `tests/studio.pipeline.test.ts`
runs the whole pipeline in-process against `DATABASE_URL` and skips itself
when no database is reachable.
