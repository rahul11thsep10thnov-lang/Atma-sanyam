from app.core.config import get_settings
from app.core.logging import get_logger, safe_extra
from app.services.retention.retention_service import RetentionService
from app.services.storage.factory import get_storage_service
from app.workers.celery_app import celery_app
from app.workers.tasks._helpers import task_db

logger = get_logger(__name__)


@celery_app.task
def run_retention_sweep() -> dict:
    settings = get_settings()
    storage = get_storage_service(settings)
    with task_db() as db:
        service = RetentionService(db, storage, settings)
        counts = service.run_daily_sweep()
        logger.info("Retention sweep complete", extra=safe_extra(stage="retention", status="done"))
        return counts
