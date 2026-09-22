# Batch Processing

## Model

- `BatchJob`: a named collection of lessons to process (`total_lessons`,
  `completed`, `failed`, `status`).
- `BatchItem`: one lesson within a batch (`status`, `error`, `started_at`,
  `completed_at`), statuses `WAITING / PROCESSING / COMPLETED / FAILED /
  RETRYING`.

## Safety gate before large batches

`POST /api/batches/{id}/start` refuses to start unless:

1. Every lesson in the batch has passed source validation (text extracted
   successfully).
2. If `MOCK_AI=false`/`MOCK_VOICE=false`, the relevant API keys are present
   and a live credential check has succeeded (`GET /api/voices` returns a
   voice, LLM provider responds to a lightweight ping).
3. Available storage (via `StorageService.get_metadata`/disk check) exceeds
   an estimated requirement (`estimated_audio_minutes * ~1MB/min +
   estimated_video_minutes * ~15MB/min`).
4. A preview has been generated and approved for at least one lesson in the
   batch (or the caller explicitly overrides this for a batch of previously
   approved lessons).
5. The caller has explicitly confirmed, echoing back the lesson count, e.g.
   `{"confirm": true, "expected_lesson_count": 500}`.

The API responds with an estimate object before requiring confirmation:

```json
{
  "lesson_count": 500,
  "estimated_audio_minutes": 1500,
  "estimated_processing_minutes": 4200,
  "estimated_storage_gb": 62.5
}
```

## Queues

Celery is configured with separate queues so a batch of 500 video renders
never starves lesson analysis or voice generation for other work:

```
lesson_analysis
example_generation
voice_generation
video_render
quality_check
```

`celery -A app.workers.celery_app worker -Q lesson_analysis,example_generation --concurrency=4`
`celery -A app.workers.celery_app worker -Q video_render --concurrency=1`

Retries use exponential backoff (`autoretry_for`, `retry_backoff=True`,
capped `max_retries`) and a job is marked permanently `FAILED` (not retried
forever) once it exceeds the cap or the error is classified as non-retryable
(e.g. malformed source document).

## Batch UI

`/batches` lists batches with progress (`247 / 500 completed`), and
`/batches/{id}` shows the per-lesson item table with status/error, plus
Start/Pause/Cancel controls.
