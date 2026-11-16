from __future__ import annotations

from fastapi import APIRouter

from . import auth, library, media, production, projects, stories

api_router = APIRouter(prefix="/api/v1")
for module in (auth, projects, stories, production, library, media):
    api_router.include_router(module.router)
