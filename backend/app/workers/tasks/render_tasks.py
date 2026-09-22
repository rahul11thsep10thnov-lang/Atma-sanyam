from sqlalchemy import select

from app.core.config import get_settings
from app.core.logging import get_logger, safe_extra
from app.models.lesson import Lesson, TeachingPlan
from app.models.voice import AudioAsset
from app.services import pipeline
from app.services.render.render_service import RenderError
from app.services.storage.factory import get_storage_service
from app.workers.celery_app import celery_app
from app.workers.tasks._helpers import task_db

logger = get_logger(__name__)


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=2,  # renders are expensive; don't hammer on failure
)
def run_video_render(self, lesson_id: str, kind: str = "final") -> str:
    settings = get_settings()
    storage = get_storage_service(settings)
    with task_db() as db:
        lesson = db.get(Lesson, lesson_id)
        plan = db.execute(
            select(TeachingPlan).where(TeachingPlan.lesson_id == lesson_id).order_by(TeachingPlan.version.desc())
        ).scalars().first()
        if lesson is None or plan is None:
            logger.error("Missing prerequisites", extra=safe_extra(lesson_id=lesson_id, stage="render"))
            return "prerequisites_missing"

        audio_paths, audio_durations = {}, {}
        for scene in sorted(plan.scenes, key=lambda s: s.order_index):
            asset = db.execute(
                select(AudioAsset).where(AudioAsset.scene_id == scene.id).order_by(AudioAsset.created_at.desc())
            ).scalars().first()
            if asset is not None:
                audio_paths[scene.scene_key] = asset.audio_path
                audio_durations[scene.scene_key] = asset.duration_ms

        logger.info("Rendering", extra=safe_extra(lesson_id=lesson_id, stage="render", status="started", queue="video_render"))
        try:
            video_asset, job = pipeline.run_render(
                db, settings, storage, lesson, plan, audio_paths, audio_durations, kind=kind
            )
        except RenderError:
            logger.error("Render failed", extra=safe_extra(lesson_id=lesson_id, stage="render", status="failed"))
            raise
        logger.info("Render complete", extra=safe_extra(lesson_id=lesson_id, stage="render", status="done"))
        return video_asset.id
