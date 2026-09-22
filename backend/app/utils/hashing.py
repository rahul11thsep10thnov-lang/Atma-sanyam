"""Content-hash helpers used for caching (build spec section 33) and for
content-addressed cache keys that never embed raw sensitive text
(docs/PRIVACY.md "Cache privacy")."""
import hashlib
import json
from typing import Any


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_json(payload: Any) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return sha256_text(canonical)


def voice_cache_key(voice_id: str, model_id: str, settings: dict, text: str) -> str:
    """Cache key for AudioAsset reuse: same voice_id + same settings + same
    narration text => reuse existing audio (build spec section 18)."""
    return sha256_json({"voice_id": voice_id, "model_id": model_id, "settings": settings, "text": text})
