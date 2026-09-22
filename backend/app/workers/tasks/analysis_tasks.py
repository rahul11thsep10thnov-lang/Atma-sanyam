from app.core.config import get_settings
from app.core.logging import get_logger, safe_extra
from app.models.lesson import Lesson
from app.services import pipeline
from app.workers.celery_app import celery_app
from app.workers.tasks._helpers import task_db

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
)
def run_lesson_analysis(self, lesson_id: str) -> str:
    settings = get_settings()
    with task_db() as db:
        lesson = db.get(Lesson, lesson_id)
        if lesson is None:
            logger.error("Lesson not found", extra=safe_extra(lesson_id=lesson_id, stage="analysis"))
            return "not_found"
        logger.info("Starting analysis", extra=safe_extra(lesson_id=lesson_id, stage="analysis", status="started"))
        analysis = pipeline.run_analysis(db, settings, lesson)
        logger.info("Analysis complete", extra=safe_extra(lesson_id=lesson_id, stage="analysis", status="done"))
        return analysis.id
