from sqlalchemy import select

from app.core.logging import get_logger, safe_extra
from app.models.lesson import Lesson, TeachingPlan
from app.models.video import VideoAsset
from app.models.voice import AudioAsset
from app.services import pipeline
from app.workers.celery_app import celery_app
from app.workers.tasks._helpers import task_db

logger = get_logger(__name__)


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def run_quality_check(self, lesson_id: str) -> str:
    with task_db() as db:
        lesson = db.get(Lesson, lesson_id)
        plan = db.execute(
            select(TeachingPlan).where(TeachingPlan.lesson_id == lesson_id).order_by(TeachingPlan.version.desc())
        ).scalars().first()
        video = db.execute(
            select(VideoAsset).where(VideoAsset.lesson_id == lesson_id).order_by(VideoAsset.created_at.desc())
        ).scalars().first()
        if lesson is None or plan is None or video is None:
            logger.error("Missing prerequisites", extra=safe_extra(lesson_id=lesson_id, stage="quality_check"))
            return "prerequisites_missing"

        audio_durations = {}
        for scene in plan.scenes:
            asset = db.execute(
                select(AudioAsset).where(AudioAsset.scene_id == scene.id).order_by(AudioAsset.created_at.desc())
            ).scalars().first()
            if asset is not None:
                audio_durations[scene.scene_key] = asset.duration_ms

        report = pipeline.run_quality_check(db, lesson, plan, video, audio_durations)
        logger.info(
            "Quality check complete",
            extra=safe_extra(lesson_id=lesson_id, stage="quality_check", status=report.status),
        )
        return report.id
