from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger, safe_extra
from app.models.lesson import Lesson, TeachingPlan
from app.models.voice import VoiceProfile
from app.services import pipeline
from app.services.storage.factory import get_storage_service
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
def run_voice_generation(self, lesson_id: str) -> dict:
    settings = get_settings()
    storage = get_storage_service(settings)
    with task_db() as db:
        lesson = db.get(Lesson, lesson_id)
        plan = db.execute(
            select(TeachingPlan).where(TeachingPlan.lesson_id == lesson_id).order_by(TeachingPlan.version.desc())
        ).scalars().first()
        profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == lesson.owner_id)).scalars().first()
        if lesson is None or plan is None or profile is None:
            logger.error("Missing prerequisites", extra=safe_extra(lesson_id=lesson_id, stage="voice"))
            return {}
        logger.info("Generating voice", extra=safe_extra(lesson_id=lesson_id, stage="voice", status="started"))
        paths = pipeline.run_generate_audio(db, settings, storage, lesson, plan, profile)
        logger.info("Voice generated", extra=safe_extra(lesson_id=lesson_id, stage="voice", status="done"))
        return paths
