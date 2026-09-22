"""Local-development-only convenience endpoint. Returns the single local
user's bearer token so the frontend dev server can bootstrap
BACKEND_API_TOKEN without a manual DB lookup. Gated on
ENVIRONMENT=development so it can never be reached in a production
deployment (build spec: simple local auth initially, ready for proper auth
later — see docs/ARCHITECTURE.md)."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from fastapi import Depends

from app.api.deps import get_app_settings, get_db
from app.core.bootstrap import ensure_local_user
from app.core.config import Settings

router = APIRouter(prefix="/dev", tags=["dev"])


@router.get("/local-token")
def get_local_token(db: Session = Depends(get_db), settings: Settings = Depends(get_app_settings)):
    if settings.environment != "development":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Not available outside development.")
    user = ensure_local_user(db)
    return {"token": user.api_token}
