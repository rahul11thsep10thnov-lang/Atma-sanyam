"""FastAPI application factory."""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from engine.common.logging import configure_logging

from .api.v1.router import api_router
from .db import Database
from .deps import AppContext
from .errors import install_error_handlers
from .settings import Settings, get_settings

log = logging.getLogger("csae.http")

DESCRIPTION = """Chibi Story Animation Engine API.

Authenticate with `POST /api/v1/auth/login`, then send `Authorization: Bearer <token>`.
Errors always look like `{"error": {"code", "message", "details"}}`.
Files are addressed by opaque media URLs; filesystem paths never appear in responses."""


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    settings.secret()  # fail fast on a missing signing key
    ctx = AppContext(settings=settings, db=Database(settings.database_url), paths=settings.paths())

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        for hook in app.state.startup_hooks:
            hook(ctx)
        yield
        for hook in app.state.shutdown_hooks:
            hook(ctx)
        ctx.db.dispose()

    app = FastAPI(title="Chibi Story Animation Engine", version="0.1.0", description=DESCRIPTION, lifespan=lifespan,
                  docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")
    app.state.ctx = ctx
    app.state.startup_hooks, app.state.shutdown_hooks = [], []
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
                       allow_methods=["*"], allow_headers=["*"])

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        log.info("request", extra={"request_id": request_id, "method": request.method, "path": request.url.path,
                                   "status": response.status_code, "ms": round((time.perf_counter() - started) * 1000, 1)})
        return response

    install_error_handlers(app)
    app.include_router(api_router)

    @app.get("/api/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    from .wiring import wire  # late import: optional subsystems register themselves here
    wire(app, ctx)
    return app
