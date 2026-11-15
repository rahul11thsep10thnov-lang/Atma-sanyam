from __future__ import annotations

import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Annotated, Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from engine.common.paths import EnginePaths

from .db import Database
from .errors import ApiError
from .models import User
from .security import decode_token
from .settings import Settings


@dataclass
class AppContext:
    """Everything a request handler may need; built once in create_app, never global."""

    settings: Settings
    db: Database
    paths: EnginePaths
    services: dict[str, Any] = field(default_factory=dict)


def get_ctx(request: Request) -> AppContext:
    return request.app.state.ctx


def get_session(ctx: Annotated[AppContext, Depends(get_ctx)]) -> Iterator[Session]:
    session = ctx.db.session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


_bearer = HTTPBearer(auto_error=False)


def current_user(
    request: Request,
    ctx: Annotated[AppContext, Depends(get_ctx)],
    session: Annotated[Session, Depends(get_session)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    token = creds.credentials if creds else request.query_params.get("access_token")
    claims = decode_token(ctx.settings.secret(), token) if token else None
    if not claims:
        raise ApiError(401, "unauthenticated", "Sign in to use this endpoint")
    try:
        user = session.get(User, uuid.UUID(claims["sub"]))
    except (ValueError, KeyError):
        user = None
    if user is None or not user.is_active:
        raise ApiError(401, "unauthenticated", "This account is not available")
    return user


def require_role(*roles: str):
    """admin may do everything; otherwise the user's role must be listed."""

    def dep(user: Annotated[User, Depends(current_user)]) -> User:
        if user.role != "admin" and user.role not in roles:
            raise ApiError(403, "forbidden", f"This needs one of the roles: {', '.join(('admin',) + roles)}")
        return user

    return dep


Ctx = Annotated[AppContext, Depends(get_ctx)]
Db = Annotated[Session, Depends(get_session)]
AnyUser = Annotated[User, Depends(current_user)]
Producer = Annotated[User, Depends(require_role("producer"))]
Reviewer = Annotated[User, Depends(require_role("reviewer"))]
ProducerOrReviewer = Annotated[User, Depends(require_role("producer", "reviewer"))]
Admin = Annotated[User, Depends(require_role())]
