"""Simple local auth (build spec: "Simple local authentication initially").
Swapping in real session/JWT auth later only requires changing this file —
callers everywhere else just depend on `get_current_user`.

Every route handler MUST use `current_user.id` to scope queries
(`owner_id = current_user.id`), never trust an owner/user id supplied by
the client body/query string (build spec section 20/21).
"""
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.models.user import User
from app.services.storage.base import StorageService
from app.services.storage.factory import get_storage_service

_bearer = HTTPBearer(auto_error=False)


def get_app_settings() -> Settings:
    return get_settings()


def get_storage(settings: Settings = Depends(get_app_settings)) -> StorageService:
    return get_storage_service(settings)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")
    user = db.query(User).filter(User.api_token == credentials.credentials).first()
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")
    return user
