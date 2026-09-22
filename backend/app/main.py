from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import assets, batches, dev, lessons, privacy, settings, voices
from app.core.bootstrap import ensure_default_voice_profile, ensure_local_user
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.errors import AppError, app_error_handler
from app.core.logging import configure_logging

configure_logging()
settings_obj = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    db = SessionLocal()
    try:
        user = ensure_local_user(db)
        ensure_default_voice_profile(db, user.id, settings_obj)
    finally:
        db.close()
    yield


app = FastAPI(title="AI Whiteboard Teacher Studio API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_obj.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)

app.include_router(lessons.router, prefix="/api")
app.include_router(batches.router, prefix="/api")
app.include_router(voices.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(privacy.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(dev.router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
