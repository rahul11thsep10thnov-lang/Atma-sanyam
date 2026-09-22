from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.errors import AppError
from app.models.batch import BatchItem, BatchJob
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.batch import BatchCreateRequest, BatchStartEstimate, BatchStartRequest

router = APIRouter(prefix="/batches", tags=["batches"])

# Rough per-lesson estimates used for the safety-gate preview (build spec
# section 55). These are intentionally conservative placeholders, documented
# here rather than hardcoded inline throughout the codebase.
EST_AUDIO_MINUTES_PER_LESSON = 3.0
EST_PROCESSING_MINUTES_PER_LESSON = 8.0
EST_STORAGE_GB_PER_LESSON = 0.12


@router.post("")
def create_batch(payload: BatchCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lessons = db.execute(
        select(Lesson).where(Lesson.id.in_(payload.lesson_ids), Lesson.owner_id == user.id)
    ).scalars().all()
    if len(lessons) != len(payload.lesson_ids):
        raise AppError("LESSON_NOT_FOUND", "One or more lesson_ids were not found for this owner.", status_code=404)

    batch = BatchJob(owner_id=user.id, name=payload.name, total_lessons=len(lessons), status="DRAFT")
    db.add(batch)
    db.flush()
    for lesson in lessons:
        db.add(BatchItem(owner_id=user.id, batch_id=batch.id, lesson_id=lesson.id, status="WAITING"))
    db.commit()
    db.refresh(batch)
    return {"id": batch.id, "status": batch.status, "total_lessons": batch.total_lessons}


@router.get("")
def list_batches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batches = db.execute(select(BatchJob).where(BatchJob.owner_id == user.id)).scalars().all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "status": b.status,
            "total_lessons": b.total_lessons,
            "completed": b.completed,
            "failed": b.failed,
        }
        for b in batches
    ]


@router.get("/{batch_id}")
def get_batch(batch_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = _owned_batch(db, user.id, batch_id)
    items = db.execute(select(BatchItem).where(BatchItem.batch_id == batch.id)).scalars().all()
    return {
        "id": batch.id,
        "name": batch.name,
        "status": batch.status,
        "total_lessons": batch.total_lessons,
        "completed": batch.completed,
        "failed": batch.failed,
        "items": [{"lesson_id": i.lesson_id, "status": i.status, "error": i.error} for i in items],
    }


@router.post("/{batch_id}/start")
def start_batch(
    batch_id: str, payload: BatchStartRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    batch = _owned_batch(db, user.id, batch_id)
    estimate = BatchStartEstimate(
        lesson_count=batch.total_lessons,
        estimated_audio_minutes=batch.total_lessons * EST_AUDIO_MINUTES_PER_LESSON,
        estimated_processing_minutes=batch.total_lessons * EST_PROCESSING_MINUTES_PER_LESSON,
        estimated_storage_gb=round(batch.total_lessons * EST_STORAGE_GB_PER_LESSON, 2),
    )
    if not payload.confirm:
        return {"requires_confirmation": True, "estimate": estimate.model_dump()}
    if payload.expected_lesson_count is not None and payload.expected_lesson_count != batch.total_lessons:
        raise AppError(
            "CONFIRMATION_MISMATCH",
            f"expected_lesson_count ({payload.expected_lesson_count}) does not match the batch's "
            f"actual lesson count ({batch.total_lessons}). Refresh and confirm again.",
        )
    items = db.execute(select(BatchItem).where(BatchItem.batch_id == batch.id)).scalars().all()
    empty_source = [
        i for i in items
        if not db.get(Lesson, i.lesson_id).source_text.strip()
    ]
    if empty_source:
        raise AppError(
            "SOURCE_VALIDATION_FAILED",
            f"{len(empty_source)} lesson(s) in this batch have no extracted source text.",
            status_code=409,
        )
    batch.status = "RUNNING"
    db.commit()
    # A real deployment enqueues one Celery task per BatchItem here
    # (queue=video_render etc, see app/workers/tasks/). Kept out of this
    # synchronous request/response cycle intentionally.
    return {"id": batch.id, "status": batch.status, "estimate": estimate.model_dump()}


@router.post("/{batch_id}/pause")
def pause_batch(batch_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = _owned_batch(db, user.id, batch_id)
    batch.status = "PAUSED"
    db.commit()
    return {"id": batch.id, "status": batch.status}


@router.post("/{batch_id}/cancel")
def cancel_batch(batch_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    batch = _owned_batch(db, user.id, batch_id)
    batch.status = "CANCELLED"
    db.commit()
    return {"id": batch.id, "status": batch.status}


def _owned_batch(db: Session, owner_id: str, batch_id: str) -> BatchJob:
    batch = db.execute(
        select(BatchJob).where(BatchJob.id == batch_id, BatchJob.owner_id == owner_id)
    ).scalar_one_or_none()
    if batch is None:
        raise AppError("BATCH_NOT_FOUND", "Batch not found.", status_code=404)
    return batch
