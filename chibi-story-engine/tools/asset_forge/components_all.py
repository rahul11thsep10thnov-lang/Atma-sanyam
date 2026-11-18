"""Registers every vector component and exports them as library assets (SVG master + PNG + manifest)."""
from __future__ import annotations

from . import components_built, components_nature
from .kit import REGISTRY, V, by_kind

_done = False


def load() -> dict:
    global _done
    if not _done:
        components_nature.register_all()
        components_built.register_all()
        _done = True
    return REGISTRY


KIND_TARGETS = {"tree": 30, "bush": 20, "flower": 20, "grass": 15, "rock": 20, "cloud": 12, "mountain": 10, "water": 15,
                "building": 30, "opening": 20, "barrier": 15, "lamp": 15}


def draw_standalone(cid: str, seed: int = 0) -> V:
    """A component alone on its own canvas, base point at stage (960, 0)."""
    v = V()
    REGISTRY[cid].render(v, 960.0, 0.0, 1.0, seed=seed)
    return v
