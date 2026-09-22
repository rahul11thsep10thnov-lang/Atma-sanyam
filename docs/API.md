# API Reference

Base URL: `http://localhost:8000/api`. All endpoints require the
`Authorization: Bearer <token>` header (see `docs/SETUP.md`); every response
is scoped to the authenticated user's own data (`owner_id`).

## Lessons

| Method | Path | Description |
|---|---|---|
| POST | `/lessons/upload` | Upload a TXT/PDF/DOCX file, creates a Lesson (status `UPLOADED`) |
| POST | `/lessons` | Create a Lesson from pasted text |
| GET | `/lessons` | List the caller's lessons |
| GET | `/lessons/{id}` | Get one lesson with nested analysis/example/plan/scenes |
| POST | `/lessons/{id}/analyze` | Run `LessonAnalysisService` |
| POST | `/lessons/{id}/transform` | Run `ExampleTransformationService` + verification |
| POST | `/lessons/{id}/generate-script` | Run `TeachingPlanService` |
| POST | `/lessons/{id}/generate-audio` | Run `VoiceService` per scene (cached) |
| POST | `/lessons/{id}/preview` | Render a 20-30s preview |
| POST | `/lessons/{id}/render` | Full render via `RenderService` |
| POST | `/lessons/{id}/quality-check` | Run `QualityControlService` |
| POST | `/lessons/{id}/approve` | Mark `COMPLETED` |
| GET | `/lessons/{id}/video` | Redirect/stream final MP4 via `assets` download |

## Batches

`POST /batches`, `GET /batches`, `GET /batches/{id}`,
`POST /batches/{id}/start` (see `docs/BATCH_PROCESSING.md` for the
confirmation payload), `POST /batches/{id}/pause`,
`POST /batches/{id}/cancel`.

## Voices

`GET /voices` — the configured `VoiceProfile` (id, provider, connected
date, status — never the API key).
`POST /voices/test` — `{ "text": "..." }` -> generates a short clip with the
fixed `ELEVENLABS_VOICE_ID`.

## Assets

`GET /assets/{asset_id}/download` — authenticated, ownership-checked
download of any stored asset (source file, audio, video, thumbnail). Never
expose raw storage paths to the client.

## Privacy

See `docs/PRIVACY.md` for `/privacy/*` endpoints.

## Errors

All errors follow:

```json
{ "error": { "code": "VOICE_GENERATION_FAILED",
             "message": "Voice generation failed. Check your ElevenLabs connection or retry the scene." } }
```

Messages are written to be actionable without leaking secrets (build spec
section 41/18).
