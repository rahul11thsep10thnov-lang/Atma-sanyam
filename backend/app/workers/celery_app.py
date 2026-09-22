"""Celery app with separate queues (build spec section 26) so an expensive
video render never blocks lesson analysis/voice generation for other
lessons. Retries use exponential backoff and are capped so permanently
invalid input doesn't retry forever."""
from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "whiteboard_studio",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_routes={
        "app.workers.tasks.analysis_tasks.*": {"queue": "lesson_analysis"},
        "app.workers.tasks.transform_tasks.*": {"queue": "example_generation"},
        "app.workers.tasks.voice_tasks.*": {"queue": "voice_generation"},
        "app.workers.tasks.render_tasks.*": {"queue": "video_render"},
        "app.workers.tasks.quality_tasks.*": {"queue": "quality_check"},
        "app.workers.tasks.retention_tasks.*": {"queue": "retention"},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_retry_delay=10,
    beat_schedule={
        "daily-retention-sweep": {
            "task": "app.workers.tasks.retention_tasks.run_retention_sweep",
            "schedule": 86400.0,
        },
    },
)

celery_app.autodiscover_tasks(
    [
        "app.workers.tasks.analysis_tasks",
        "app.workers.tasks.transform_tasks",
        "app.workers.tasks.voice_tasks",
        "app.workers.tasks.render_tasks",
        "app.workers.tasks.quality_tasks",
        "app.workers.tasks.retention_tasks",
    ],
    force=True,
)
