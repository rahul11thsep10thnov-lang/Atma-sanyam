"""Project settings (build spec section 48): AI / Voice / Video / Whiteboard
/ Storage / Batch / Language, stored as ProjectSetting rows keyed by
`key`. Voice settings intentionally never accept a raw voice_id from an
unauthenticated caller — build spec section 36."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.settings import ProjectSetting
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])

VALID_KEYS = {"ai", "voice", "video", "whiteboard", "storage", "batch", "language"}


@router.get("/{key}")
def get_setting(key: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(
        select(ProjectSetting).where(ProjectSetting.owner_id == user.id, ProjectSetting.key == key)
    ).scalar_one_or_none()
    return row.value if row else {}


@router.put("/{key}")
def update_setting(key: str, payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(
        select(ProjectSetting).where(ProjectSetting.owner_id == user.id, ProjectSetting.key == key)
    ).scalar_one_or_none()
    if row is None:
        row = ProjectSetting(owner_id=user.id, key=key, value=payload)
        db.add(row)
    else:
        row.value = payload
    db.commit()
    return row.value
