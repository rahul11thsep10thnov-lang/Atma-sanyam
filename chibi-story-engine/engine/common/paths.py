"""Filesystem layout and safe path handling. Nothing here reads global state."""
from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path

from .errors import UnsafePath

PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_\-]{0,63}$")


@dataclass(frozen=True)
class EnginePaths:
    """Every directory the engine may read or write."""

    asset_library: Path
    stories: Path
    renders: Path
    cache: Path

    @classmethod
    def under(cls, root: Path) -> "EnginePaths":
        root = Path(root)
        return cls(root / "asset_library", root / "stories", root / "renders", root / "renders" / "cache")

    @classmethod
    def default(cls) -> "EnginePaths":
        root = Path(os.environ.get("CSAE_DATA_ROOT", PROJECT_ROOT))
        paths = cls.under(root)
        lib = os.environ.get("CSAE_ASSET_LIBRARY")
        return cls(Path(lib) if lib else paths.asset_library, paths.stories, paths.renders, paths.cache)

    def ensure(self) -> "EnginePaths":
        for p in (self.asset_library, self.stories, self.renders, self.cache):
            p.mkdir(parents=True, exist_ok=True)
        for sub in ("previews", "scenes", "final", "temporary"):
            (self.renders / sub).mkdir(parents=True, exist_ok=True)
        return self


def is_valid_id(value: str) -> bool:
    return bool(_ID_RE.match(value))


def require_id(value: str, what: str = "id") -> str:
    if not is_valid_id(value):
        raise UnsafePath(f"Invalid {what} {value!r}: use lowercase letters, digits, '_' or '-'")
    return value


def safe_join(root: Path, *parts: str) -> Path:
    """Join `parts` under `root`, refusing anything that would escape it."""
    root = Path(root).resolve()
    candidate = root.joinpath(*parts).resolve()
    if candidate != root and root not in candidate.parents:
        raise UnsafePath(f"Path escapes its storage directory: {'/'.join(parts)}")
    return candidate


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
