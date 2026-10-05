import json
import os
from dataclasses import dataclass, field

# Models whose published licence forbids commercial use. The backend's model
# registry already blocks them for production; the server refuses to serve
# them at all so a misconfigured allowlist cannot leak them into output.
NON_COMMERCIAL_MODELS = frozenset({"flux1-dev", "depth-anything-v2-large", "rmbg-2.0"})


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class ModelSource:
    repo: str
    revision: str | None = None


@dataclass(frozen=True)
class Settings:
    api_key: str
    signing_secret: str
    models: frozenset[str]
    max_body_bytes: int = 64 * 1024 * 1024
    max_skew_seconds: int = 300
    slots: int = 1
    max_waiting: int = 4
    worker_id: str = ""
    cpu_offload: bool = False
    sources: dict[str, ModelSource] = field(default_factory=dict)
    lama_torchscript_path: str = ""
    lama_sha256: str = ""


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name, "")
    return int(raw) if raw.strip() else default


def load_settings(environ: dict[str, str] | None = None) -> Settings:
    e = os.environ if environ is None else environ
    api_key = e.get("INFERENCE_API_KEY", "")
    secret = e.get("INFERENCE_SIGNING_SECRET", "")
    if len(api_key) < 24:
        raise ConfigError("INFERENCE_API_KEY must be set (at least 24 characters, e.g. `openssl rand -hex 24`)")
    if len(secret) < 32:
        raise ConfigError("INFERENCE_SIGNING_SECRET must be set (at least 32 characters, e.g. `openssl rand -hex 32`)")
    models = frozenset(m.strip() for m in e.get("INFERENCE_MODELS", "").split(",") if m.strip())
    blocked = models & NON_COMMERCIAL_MODELS
    if blocked:
        raise ConfigError(f"Refusing to serve non-commercial models: {', '.join(sorted(blocked))}")
    sources: dict[str, ModelSource] = {}
    raw_sources = e.get("INFERENCE_MODEL_SOURCES", "").strip()
    if raw_sources:
        try:
            for model_id, src in json.loads(raw_sources).items():
                sources[model_id] = ModelSource(repo=src["repo"], revision=src.get("revision"))
        except (ValueError, KeyError, TypeError, AttributeError) as exc:
            raise ConfigError(f"INFERENCE_MODEL_SOURCES is not valid JSON of {{modelId: {{repo, revision}}}}: {exc}") from exc
    return Settings(
        api_key=api_key,
        signing_secret=secret,
        models=models,
        max_body_bytes=_int("INFERENCE_MAX_BODY_MB", 64) * 1024 * 1024,
        max_skew_seconds=_int("INFERENCE_MAX_SKEW_SECONDS", 300),
        slots=max(1, _int("INFERENCE_SLOTS", 1)),
        max_waiting=max(0, _int("INFERENCE_MAX_WAITING", 4)),
        worker_id=e.get("GPU_WORKER_ID", ""),
        cpu_offload=e.get("INFERENCE_CPU_OFFLOAD", "false").lower() == "true",
        sources=sources,
        lama_torchscript_path=e.get("LAMA_TORCHSCRIPT_PATH", ""),
        lama_sha256=e.get("LAMA_SHA256", "").lower(),
    )
