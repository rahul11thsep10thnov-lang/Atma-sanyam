"""Structured, privacy-safe logging.

Only whitelisted fields are ever emitted (build spec section 42 / docs/PRIVACY.md
"Logging"). Never pass full document/narration text or credentials as `extra`.
"""
import logging
import sys
from typing import Any

ALLOWED_EXTRA_KEYS = {
    "job_id",
    "lesson_id",
    "scene_id",
    "batch_id",
    "asset_id",
    "stage",
    "status",
    "duration_ms",
    "error_code",
    "owner_id",
    "queue",
}


class AllowlistFilter(logging.Filter):
    """Drops any extra logging field not in ALLOWED_EXTRA_KEYS so a stray
    `logger.info(..., extra={"source_text": full_document})` never leaks
    full lesson content into logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        for key in list(record.__dict__.keys()):
            if key not in ALLOWED_EXTRA_KEYS and key.startswith("_scrub_"):
                delattr(record, key)
        return True


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s level=%(levelname)s logger=%(name)s msg=%(message)s"
        )
    )
    handler.addFilter(AllowlistFilter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def safe_extra(**kwargs: Any) -> dict[str, Any]:
    """Build a logging `extra` dict restricted to allowlisted operational
    fields. Silently drops anything else so callers can't accidentally leak
    lesson content by passing kwargs through."""
    return {k: v for k, v in kwargs.items() if k in ALLOWED_EXTRA_KEYS}
