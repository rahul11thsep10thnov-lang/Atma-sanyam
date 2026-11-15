from __future__ import annotations

from sqlalchemy.orm import Session

from ..errors import ApiError
from ..models import User
from ..repositories import UserRepo
from ..security import create_token, hash_password, verify_password
from ..settings import Settings
from . import audit

# Verified against when the e-mail is unknown, so both failure paths cost the same.
_DUMMY_HASH = hash_password("not-a-real-password")


def create_user(session: Session, email: str, password: str, role: str, actor: User | None = None) -> User:
    repo = UserRepo(session)
    if repo.by_email(email):
        raise ApiError(409, "conflict", "A user with this e-mail already exists")
    user = repo.add(User(email=email.lower(), password_hash=hash_password(password), role=role))
    audit.record(session, actor.id if actor else None, "user.created", "user", user.id, role=role)
    return user


def login(session: Session, settings: Settings, email: str, password: str) -> tuple[User, str]:
    user = UserRepo(session).by_email(email)
    ok = verify_password(password, user.password_hash if user else _DUMMY_HASH)
    if not user or not ok or not user.is_active:
        raise ApiError(401, "invalid_credentials", "E-mail or password is incorrect")
    return user, create_token(settings.secret(), str(user.id), user.role, settings.token_ttl_minutes)
