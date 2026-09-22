from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger, safe_extra
from app.models.lesson import Lesson, LessonAnalysis
from app.services import pipeline
from app.services.ai.example_transformation_service import ExampleRejectedError
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
def run_example_transformation(self, lesson_id: str) -> str:
    settings = get_settings()
    with task_db() as db:
        lesson = db.get(Lesson, lesson_id)
        analysis = db.execute(
            select(LessonAnalysis).where(LessonAnalysis.lesson_id == lesson_id).order_by(LessonAnalysis.version.desc())
        ).scalars().first()
        if lesson is None or analysis is None:
            logger.error("Missing prerequisites", extra=safe_extra(lesson_id=lesson_id, stage="transform"))
            return "prerequisites_missing"
        try:
            example = pipeline.run_transform(db, settings, lesson, analysis)
        except ExampleRejectedError:
            # Permanently unverifiable example for this source; don't retry
            # forever, surface as failed for a human to review.
            lesson.status = "FAILED"
            db.commit()
            logger.error("Example verification exhausted retries", extra=safe_extra(lesson_id=lesson_id, stage="transform", status="failed"))
            raise
        logger.info("Example transformed", extra=safe_extra(lesson_id=lesson_id, stage="transform", status="done"))
        return example.id
