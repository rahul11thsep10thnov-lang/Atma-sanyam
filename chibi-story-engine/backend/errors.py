"""One error shape for every endpoint: {"error": {"code", "message", "details"}}."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from engine.common.errors import (AssetNotFound, EngineError, IncompatibleAsset, ProviderUnavailable, UnsafePath,
                                  ValidationFailed)

log = logging.getLogger("csae.api")


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details or {}


def not_found(what: str, ident: Any) -> ApiError:
    return ApiError(404, "not_found", f"{what} not found", {"id": str(ident)})


def _body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


_ENGINE_STATUS: list[tuple[type[EngineError], int]] = [
    (ValidationFailed, 422), (AssetNotFound, 404), (IncompatibleAsset, 409), (UnsafePath, 400), (ProviderUnavailable, 503),
]


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=exc.status)

    @app.exception_handler(EngineError)
    async def _engine(_: Request, exc: EngineError) -> JSONResponse:
        status = next((s for cls, s in _ENGINE_STATUS if isinstance(exc, cls)), 400)
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=status)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        issues = [{"path": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]), "message": e["msg"], "type": e["type"]}
                  for e in exc.errors()]
        return JSONResponse(_body("validation_failed", "Request is invalid", {"issues": issues}), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = {401: "unauthenticated", 403: "forbidden", 404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        return JSONResponse(_body(code, str(exc.detail)), status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(IntegrityError)
    async def _integrity(_: Request, exc: IntegrityError) -> JSONResponse:
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        log.info("integrity_error", extra={"constraint": constraint})
        return JSONResponse(_body("conflict", "The change conflicts with existing data", {"constraint": constraint}), status_code=409)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        log.exception("unhandled_error", extra={"path": request.url.path})
        return JSONResponse(_body("internal_error", "Unexpected server error"), status_code=500)
