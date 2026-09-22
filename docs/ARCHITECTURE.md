# Architecture

## Overview

AI Whiteboard Teacher Studio converts uploaded teaching material into faceless
whiteboard lesson videos with a consistent, fixed AI voice. The system is
split into six independently testable layers, connected only through
well-defined data contracts:

```
CONTENT GENERATION  ->  VOICE GENERATION  ->  VISUAL GENERATION  ->  TIMING  ->  RENDERING  ->  STORAGE
```

No single function or module is allowed to span more than one of these
layers. This is enforced by directory structure (`backend/app/services/*`)
and by the fact that the renderer (`/renderer`) contains **zero** AI logic:
it only consumes a validated "Teaching Plan JSON" document and produces an
MP4.

## Monorepo layout

```
/backend    FastAPI + SQLAlchemy + Celery application (all AI/business logic)
/frontend   Next.js dashboard (talks to /backend only, never to ElevenLabs/LLM directly)
/renderer   Remotion project; pure function of (lesson JSON, audio files) -> MP4
/shared     Cross-language contracts (JSON Schema for the Teaching Plan)
/storage    Local filesystem storage root (dev). Swappable for S3/R2 later.
/docs       This documentation set
```

## Pipeline stages

Each stage in section 6 of the build spec is implemented as its own service
class, orchestrated by Celery tasks so any stage can fail/retry/scale
independently:

| Stage | Service | Queue |
|---|---|---|
| Extract text | `services/extraction/*Extractor` | inline (fast, sync) |
| Analyze lesson | `LessonAnalysisService` | `lesson_analysis` |
| Generate examples | `ExampleTransformationService` + `CalculationVerificationService` | `example_generation` |
| Generate teaching plan / narration / board actions | `TeachingPlanService` | `lesson_analysis` |
| Generate voice | `VoiceService` (Mock/ElevenLabs) via `VoiceManager` | `voice_generation` |
| Calculate timings | `TimingService` | inline (fast, deterministic) |
| Render video | `RenderService` (shells out to Remotion CLI) | `video_render` |
| Quality check | `QualityControlService` | `quality_check` |

Separate Celery queues mean an expensive video render never blocks a cheap
lesson analysis job for a different lesson (build spec section 26).

## Why the renderer has no AI logic

The Teaching Plan JSON (see `shared/schema/teaching_plan.schema.json` and
`backend/app/schemas/lesson.py`) is the **only** contract between the Python
backend and the Remotion renderer. This means:

- The renderer is deterministic and can be unit tested with fixed JSON input.
- The renderer can be reused for source-video-based lessons later without any
  change, because it never knows where the JSON came from.
- AI provider changes (swapping LLM/voice vendors) never touch renderer code.

## Voice architecture

See `docs/ELEVENLABS.md`. In short: one `ELEVENLABS_VOICE_ID` configured
once in `.env`, used for every video. The app never creates new voice clones
and never lets the browser choose a voice ID.

## Data model

See `backend/app/models/`. All user-owned tables carry `owner_id` and all
queries are scoped by it (build spec section 21) even though the MVP ships
with a single local user, so multi-tenant support later requires no data
migration of trust boundaries.

## Storage abstraction

`StorageService` (`backend/app/services/storage/base.py`) exposes
`upload/download/exists/delete/list/get_metadata`. `LocalStorageService` is
the only implementation shipped; S3/R2 implementations can be added without
touching any calling code because nothing outside `services/storage/`
touches a raw filesystem path.

## Decisions made where the spec was ambiguous

- **Database for local sandboxed testing**: PostgreSQL is the documented and
  `docker-compose`-provided database. Where a PostgreSQL server binary isn't
  available in a given sandbox (as in the environment this project was first
  built in), `DATABASE_URL` can point at SQLite (`sqlite:///./storage/dev.db`)
  purely for running the test suite; all SQL is written through SQLAlchemy
  Core/ORM so this requires no code changes. Production deployments must use
  the Postgres URL.
- **Cross-language schema sync**: rather than building a JSON-Schema-to-
  TypeScript/Pydantic codegen pipeline (out of scope for the MVP), the
  Teaching Plan contract is defined once as Pydantic models
  (`backend/app/schemas/lesson.py`), and mirrored by hand as TypeScript types
  in `renderer/src/types.ts` and `frontend/types/lesson.ts`. The Pydantic
  models are the source of truth; `shared/schema/teaching_plan.schema.json`
  is generated from them (`python -m app.schemas.export_schema`) and is what
  a future codegen step would consume.
- **Rendering invocation**: the backend's `RenderService` shells out to the
  Remotion CLI (`npx remotion render`) as a subprocess rather than embedding
  a Node runtime inside the Python process. This keeps the render layer
  fully decoupled and independently scalable/containerizable.
- **Auth**: MVP ships a single local user created on first run (`local@studio`)
  with a static bearer token, so `owner_id` scoping is real and testable from
  day one without building full session/JWT auth. Swapping in real auth later
  only touches `backend/app/api/deps.py`.
- **PDF quality detection**: if extracted PDF text is emptier than a
  heuristic threshold (e.g. scanned/image-only PDF), the extractor raises
  `ExtractionQualityError` with an actionable message rather than silently
  returning near-empty text.

## Implementation phases actually completed in this build

See the top-level `README.md` "Implementation status" section for exactly
which of the 15 build-spec phases are implemented, mocked, or scaffolded.
