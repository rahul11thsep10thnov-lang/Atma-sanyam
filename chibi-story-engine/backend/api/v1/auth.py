from __future__ import annotations

from fastapi import APIRouter

from ...deps import Admin, AnyUser, Ctx, Db
from ...schemas import LoginIn, TokenOut, UserCreate, UserOut
from ...services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut, summary="Exchange e-mail and password for a bearer token")
def login(body: LoginIn, ctx: Ctx, db: Db) -> TokenOut:
    user, token = auth.login(db, ctx.settings, body.email, body.password)
    return TokenOut(access_token=token, role=user.role, email=user.email)


@router.get("/me", response_model=UserOut)
def me(user: AnyUser) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/users", response_model=UserOut, status_code=201, summary="Create a user (admin only)")
def create_user(body: UserCreate, db: Db, admin: Admin) -> UserOut:
    return UserOut.model_validate(auth.create_user(db, body.email, body.password, body.role, admin))
