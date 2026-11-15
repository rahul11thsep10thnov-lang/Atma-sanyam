"""Engine error hierarchy. Every error carries a stable code and structured details."""
from __future__ import annotations

from typing import Any


class EngineError(Exception):
    code = "engine_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {"code": self.code, "message": self.message, "details": self.details}


class ValidationFailed(EngineError):
    """Structured data did not satisfy a schema or a cross-reference rule."""

    code = "validation_failed"

    def __init__(self, message: str, issues: list[dict[str, Any]] | None = None) -> None:
        super().__init__(message, details={"issues": issues or []})
        self.issues = issues or []


class AssetNotFound(EngineError):
    code = "asset_not_found"


class AssetIntegrityError(EngineError):
    code = "asset_integrity_error"


class IncompatibleAsset(EngineError):
    code = "incompatible_asset"


class RigError(EngineError):
    code = "rig_error"


class AnimationError(EngineError):
    code = "animation_error"


class TransitionError(AnimationError):
    code = "incompatible_transition"


class AudioError(EngineError):
    code = "audio_error"


class ProviderUnavailable(EngineError):
    """An optional external capability (LLM, voice service) is not configured."""

    code = "provider_unavailable"


class RenderError(EngineError):
    code = "render_error"

    def __init__(self, message: str, *, recoverable: bool = False, details: dict[str, Any] | None = None) -> None:
        super().__init__(message, details=details)
        self.recoverable = recoverable


class RenderCancelled(RenderError):
    code = "render_cancelled"


class UnsafePath(EngineError):
    code = "unsafe_path"
