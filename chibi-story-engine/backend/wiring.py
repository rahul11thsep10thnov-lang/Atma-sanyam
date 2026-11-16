"""Attach the engine, the asset mirror, the render worker and (when built) the dashboard to the app."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .deps import AppContext
from .services.engine import EngineHub, sync_library
from .workers.runner import JobRunner

log = logging.getLogger("csae.app")


def wire(app: FastAPI, ctx: AppContext) -> None:
    hub = EngineHub.create(ctx.settings, ctx.paths)
    jobs = JobRunner(ctx.db, hub, ctx.settings.render_workers)
    ctx.services.update(hub=hub, jobs=jobs)

    def startup(c: AppContext) -> None:
        try:
            with c.db.transaction() as session:
                counts = sync_library(session, hub.library)
            log.info("library_synced", extra=counts)
        except Exception:
            log.exception("library_sync_failed")
        jobs.start()

    app.state.startup_hooks.append(startup)
    app.state.shutdown_hooks.append(lambda c: jobs.stop())

    dist = ctx.settings.frontend_dist
    if dist and (dist / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="dashboard-assets")

        @app.get("/{path:path}", include_in_schema=False)
        def dashboard(path: str):
            if path.startswith("api/"):
                from .errors import ApiError
                raise ApiError(404, "not_found", "Not Found")
            candidate = dist / path
            return FileResponse(candidate if path and candidate.is_file() and dist in candidate.resolve().parents else dist / "index.html")
