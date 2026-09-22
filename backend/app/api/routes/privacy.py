from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_app_settings, get_current_user, get_db, get_storage
from app.core.config import Settings
from app.core.errors import AppError
from app.models.lesson import Lesson
from app.models.privacy import DeletionJob
from app.models.settings import ProjectSetting
from app.models.user import User
from app.models.voice import AudioAsset, VoiceProfile
from app.schemas.privacy import DeleteAllRequest, RetentionSettings
from app.services.privacy.privacy_service import LessonNotFoundError, PrivacyService
from app.services.storage.base import StorageService

router = APIRouter(prefix="/privacy", tags=["privacy"])

CONFIRMATION_PHRASE = "DELETE MY PROJECT DATA"


@router.get("/settings")
def get_privacy_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(
        select(ProjectSetting).where(ProjectSetting.owner_id == user.id, ProjectSetting.key == "retention")
    ).scalar_one_or_none()
    if row is None:
        return RetentionSettings().model_dump()
    return row.value


@router.put("/settings")
def update_privacy_settings(
    payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    settings = RetentionSettings.model_validate(payload)
    row = db.execute(
        select(ProjectSetting).where(ProjectSetting.owner_id == user.id, ProjectSetting.key == "retention")
    ).scalar_one_or_none()
    if row is None:
        row = ProjectSetting(owner_id=user.id, key="retention", value=settings.model_dump())
        db.add(row)
    else:
        row.value = settings.model_dump()
    db.commit()
    return settings.model_dump()


@router.get("/storage")
def get_storage_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    return PrivacyService(db, storage).storage_breakdown(user.id)


@router.post("/export")
def export_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    job = DeletionJob(owner_id=user.id, kind="export", status="PROCESSING")
    db.add(job)
    db.flush()

    export_path = storage.build_path("tmp", f"export_{user.id}_{job.id}.zip")
    Path(export_path).parent.mkdir(parents=True, exist_ok=True)
    PrivacyService(db, storage).export_project_data(user.id, export_path)

    job.status = "COMPLETED"
    job.result_path = export_path
    db.commit()
    return {"id": job.id, "status": job.status}


@router.get("/export/{export_id}")
def get_export(export_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.execute(
        select(DeletionJob).where(DeletionJob.id == export_id, DeletionJob.owner_id == user.id)
    ).scalar_one_or_none()
    if job is None:
        raise AppError("EXPORT_NOT_FOUND", "Export job not found.", status_code=404)
    return {"id": job.id, "status": job.status, "result_path": job.result_path if job.status == "COMPLETED" else None}


@router.post("/delete-lesson/{lesson_id}")
def delete_lesson(
    lesson_id: str,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    svc = PrivacyService(db, storage)
    if not payload.get("confirm"):
        try:
            manifest = svc.build_delete_manifest(user.id, lesson_id)
        except LessonNotFoundError as exc:
            raise AppError("LESSON_NOT_FOUND", "Lesson not found.", status_code=404) from exc
        return {"requires_confirmation": True, "manifest": manifest.model_dump()}
    try:
        counts = svc.delete_lesson_cascade(user.id, lesson_id)
    except LessonNotFoundError as exc:
        raise AppError("LESSON_NOT_FOUND", "Lesson not found.", status_code=404) from exc
    return {"deleted": True, "counts": counts}


@router.post("/delete-asset/{asset_id}")
def delete_asset(
    asset_id: str,
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    asset_type = payload.get("asset_type", "audio")
    deleted = PrivacyService(db, storage).delete_asset(user.id, asset_type, asset_id)
    if not deleted:
        raise AppError("ASSET_NOT_FOUND", "Asset not found.", status_code=404)
    return {"deleted": True}


@router.post("/delete-all")
def delete_all(
    payload: DeleteAllRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage),
):
    if payload.confirmation_phrase != CONFIRMATION_PHRASE:
        raise AppError(
            "CONFIRMATION_PHRASE_MISMATCH",
            f"Type exactly '{CONFIRMATION_PHRASE}' to confirm deleting all project data.",
        )
    lessons = db.execute(select(Lesson).where(Lesson.owner_id == user.id)).scalars().all()
    job = DeletionJob(owner_id=user.id, kind="delete_all", status="PROCESSING", total_items=len(lessons))
    db.add(job)
    db.flush()

    svc = PrivacyService(db, storage)
    processed = 0
    for lesson in lessons:
        svc.delete_lesson_cascade(user.id, lesson.id)
        processed += 1

    job.processed_items = processed
    job.status = "COMPLETED"
    db.commit()
    return {"id": job.id, "status": job.status, "processed_items": processed}


@router.post("/disconnect-voice")
def disconnect_voice(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.execute(select(VoiceProfile).where(VoiceProfile.owner_id == user.id)).scalar_one_or_none()
    if profile is None:
        return {"disconnected": True}
    profile.voice_id = ""
    profile.enabled = False
    profile.connected_at = ""
    db.commit()
    return {"disconnected": True}


@router.get("/deletion-status/{job_id}")
def deletion_status(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.execute(
        select(DeletionJob).where(DeletionJob.id == job_id, DeletionJob.owner_id == user.id)
    ).scalar_one_or_none()
    if job is None:
        raise AppError("JOB_NOT_FOUND", "Deletion job not found.", status_code=404)
    return {
        "id": job.id,
        "status": job.status,
        "total_items": job.total_items,
        "processed_items": job.processed_items,
    }
