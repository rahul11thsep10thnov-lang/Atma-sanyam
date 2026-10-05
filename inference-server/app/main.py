"""Internal GPU inference API (reference implementation).

Protocol (client: backend/src/studio/localai/http/InferenceClient.ts):

  GET  /v1/health                       Authorization: Bearer <INFERENCE_API_KEY>
  POST /v1/{image-generation|segmentation|depth|inpainting|i2v}
       Authorization: Bearer <INFERENCE_API_KEY>
       X-Atma-Job-Id, X-Atma-Timestamp, X-Atma-Signature (HMAC-SHA256, see security.py)
       body {jobId, model, inputs: {name: base64}, params: {...}}
    →  {outputs: {name: base64}, model, modelVersion, durationMs, gpuWorkerId, metadata}

Status codes the client relies on: 401/403 = configuration error (not
retried), 400/404/409/413 = rejected (not retried), 429/500/503 = retried.
"""
import asyncio
import base64
import binascii
import json
import logging
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from .config import ConfigError, Settings, load_settings
from .handlers import Registry, gpu_info
from .imaging import BadInput
from .security import ReplayCache, check_bearer, verify_signature

TASKS = ("image-generation", "segmentation", "depth", "inpainting", "i2v")
log = logging.getLogger("atma.inference")


def create_app(settings: Settings | None = None, registry: Registry | None = None) -> FastAPI:
    settings = settings or load_settings()
    registry = registry or Registry(settings)
    replay = ReplayCache(settings.max_skew_seconds * 2)
    gpu_lock = asyncio.Semaphore(settings.slots)
    state = {"pending": 0}

    # No interactive docs: this API is internal and should expose nothing unauthenticated.
    app = FastAPI(title="Atma inference", docs_url=None, redoc_url=None, openapi_url=None)

    def require_bearer(request: Request) -> None:
        if not check_bearer(request.headers.get("authorization"), settings.api_key):
            raise HTTPException(401, "unauthorized")

    async def read_body(request: Request) -> bytes:
        declared = request.headers.get("content-length")
        if declared and declared.isdigit() and int(declared) > settings.max_body_bytes:
            raise HTTPException(413, "request too large")
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > settings.max_body_bytes:
                raise HTTPException(413, "request too large")
            chunks.append(chunk)
        return b"".join(chunks)

    @app.get("/v1/health")
    async def health(request: Request):
        require_bearer(request)
        return {"models": [s["model"] for s in registry.supported()], "tasks": registry.supported(), "loaded": registry.loaded(), "gpu": gpu_info(), "busy": state["pending"], "slots": settings.slots, "workerId": settings.worker_id or None}

    @app.post("/v1/{task}")
    async def run(task: str, request: Request):
        require_bearer(request)
        if task not in TASKS:
            raise HTTPException(404, "unknown task")
        body = await read_body(request)
        job_id = request.headers.get("x-atma-job-id")
        signature = request.headers.get("x-atma-signature")
        if not verify_signature(settings.signing_secret, request.headers.get("x-atma-timestamp"), job_id, signature, body, max_skew=settings.max_skew_seconds):
            raise HTTPException(401, "invalid or expired signature")
        if not replay.add(signature or ""):
            raise HTTPException(409, "replayed request")
        try:
            payload = json.loads(body)
        except ValueError:
            raise HTTPException(400, "body is not JSON")
        if not isinstance(payload, dict) or payload.get("jobId") != job_id:
            raise HTTPException(401, "job id does not match signature")
        model = payload.get("model")
        if not isinstance(model, str) or not registry.knows(task, model):
            raise HTTPException(400, f"model is not enabled for {task} on this server")
        raw_inputs, params = payload.get("inputs") or {}, payload.get("params") or {}
        if not isinstance(raw_inputs, dict) or not isinstance(params, dict):
            raise HTTPException(400, "inputs and params must be objects")
        try:
            inputs = {k: base64.b64decode(v, validate=True) for k, v in raw_inputs.items() if isinstance(v, str)}
        except (binascii.Error, ValueError):
            raise HTTPException(400, "inputs must be base64")

        if state["pending"] >= settings.slots + settings.max_waiting:
            raise HTTPException(429, "busy")
        state["pending"] += 1
        started = time.monotonic()
        try:
            async with gpu_lock:
                handler = await run_in_threadpool(registry.get, task, model)
                result = await run_in_threadpool(handler.run, inputs, params)
        except BadInput as exc:
            raise HTTPException(400, str(exc))
        except ConfigError as exc:
            log.error("model %s not loadable: %s", model, exc)
            raise HTTPException(503, f"model not available: {exc}")
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001 — report as retryable; never echo inputs
            oom = type(exc).__name__ == "OutOfMemoryError"
            log.exception("job %s (%s/%s) failed", job_id, task, model)
            raise HTTPException(503 if oom else 500, "GPU out of memory" if oom else "inference failed")
        finally:
            state["pending"] -= 1
        duration_ms = int((time.monotonic() - started) * 1000)
        log.info("job %s %s/%s done in %d ms", job_id, task, model, duration_ms)
        return JSONResponse(
            {
                "outputs": {k: base64.b64encode(v).decode() for k, v in result.outputs.items()},
                "model": model,
                "modelVersion": result.model_version,
                "durationMs": duration_ms,
                "gpuWorkerId": settings.worker_id or None,
                "metadata": result.metadata,
            }
        )

    return app


def app_factory() -> FastAPI:  # uvicorn --factory app.main:app_factory
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    return create_app()
