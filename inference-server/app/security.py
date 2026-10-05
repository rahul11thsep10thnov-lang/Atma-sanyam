import hashlib
import hmac
import threading
import time
from collections import OrderedDict

# Must match backend/src/studio/localai/http/InferenceClient.ts:
#   X-Atma-Signature = hex(HMAC-SHA256(secret, f"{timestamp}.{jobId}.{sha256hex(body)}"))


def sign_body(secret: str, timestamp: str, job_id: str, body: bytes) -> str:
    digest = hashlib.sha256(body).hexdigest()
    return hmac.new(secret.encode(), f"{timestamp}.{job_id}.{digest}".encode(), hashlib.sha256).hexdigest()


def check_bearer(header: str | None, api_key: str) -> bool:
    if not header or not header.startswith("Bearer "):
        return False
    return hmac.compare_digest(header[7:].encode(), api_key.encode())


def verify_signature(secret: str, timestamp: str | None, job_id: str | None, signature: str | None, body: bytes, now: float | None = None, max_skew: int = 300) -> bool:
    if not timestamp or not job_id or not signature:
        return False
    try:
        ts = int(timestamp)
    except ValueError:
        return False
    if abs((time.time() if now is None else now) - ts) > max_skew:
        return False
    expected = sign_body(secret, timestamp, job_id, body)
    return hmac.compare_digest(expected.encode(), signature.lower().encode())


class ReplayCache:
    """Remembers signatures inside the skew window; a signed request is accepted once."""

    def __init__(self, ttl_seconds: int, max_entries: int = 100_000):
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self._seen: OrderedDict[str, float] = OrderedDict()
        self._lock = threading.Lock()

    def add(self, signature: str, now: float | None = None) -> bool:
        t = time.time() if now is None else now
        with self._lock:
            while self._seen:
                oldest, expires = next(iter(self._seen.items()))
                if expires > t and len(self._seen) < self.max_entries:
                    break
                self._seen.pop(oldest)
            if signature in self._seen:
                return False
            self._seen[signature] = t + self.ttl
            return True
