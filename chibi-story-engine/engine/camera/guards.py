"""Keeps camera moves honest: no looking past the edge of a covering layer, characters stay in frame."""
from __future__ import annotations

from dataclasses import dataclass

from .projection import MAX_ZOOM, REST_X, REST_Y, STAGE_H, STAGE_W, CameraState, depth_factor, project, visible_rect


@dataclass(frozen=True)
class CoverLayer:
    """A layer that must fill the frame: its rectangle in apparent stage pixels and its parallax."""

    id: str
    left: float
    bottom: float
    right: float
    top: float
    parallax: float


def min_zoom_for(layers: list[CoverLayer]) -> float:
    """Smallest zoom at which every covering layer can still fill the frame."""
    need = 0.0
    for layer in layers:
        for extent, frame in ((layer.right - layer.left, STAGE_W), (layer.top - layer.bottom, STAGE_H)):
            k_max = extent / (frame * layer.parallax)          # largest depth factor the layer can cover
            inv_zoom = k_max - 1.0 / layer.parallax + 1.0
            need = max(need, 1.0 / inv_zoom if inv_zoom > 0 else MAX_ZOOM)
    return need


def constrain(cam: CameraState, layers: list[CoverLayer]) -> CameraState:
    """Nearest camera state that shows no area outside any covering layer."""
    if not layers:
        return cam
    zoom = min(MAX_ZOOM, max(cam.zoom, min_zoom_for(layers) + 1e-6))
    lo_x, hi_x, lo_y, hi_y = -1e9, 1e9, -1e9, 1e9
    for layer in layers:
        p = layer.parallax
        k = depth_factor(zoom, p)
        half_w, half_h = STAGE_W / 2 * k * p, STAGE_H / 2 * k * p
        lo_x = max(lo_x, REST_X + (layer.left + half_w - REST_X) / p)
        hi_x = min(hi_x, REST_X + (layer.right - half_w - REST_X) / p)
        lo_y = max(lo_y, REST_Y + (layer.bottom + half_h - REST_Y) / p)
        hi_y = min(hi_y, REST_Y + (layer.top - half_h - REST_Y) / p)
    x = (lo_x + hi_x) / 2 if lo_x > hi_x else min(hi_x, max(lo_x, cam.x))
    y = (lo_y + hi_y) / 2 if lo_y > hi_y else min(hi_y, max(lo_y, cam.y))
    return CameraState(x, y, zoom)


def uncovered(cam: CameraState, layers: list[CoverLayer], tolerance: float = 0.5) -> list[str]:
    """Ids of covering layers whose edge would be visible with this camera."""
    out = []
    for layer in layers:
        left, bottom, right, top = visible_rect(layer.parallax, cam)
        if left < layer.left - tolerance or right > layer.right + tolerance or bottom < layer.bottom - tolerance or top > layer.top + tolerance:
            out.append(layer.id)
    return out


def frame_fraction(bounds: tuple[float, float, float, float], cam: CameraState, parallax: float = 1.0) -> float:
    """Share of a stage-space box (min x, min y, max x, max y) that falls inside the frame."""
    x0, y0 = project(bounds[0], bounds[1], parallax, cam)
    x1, y1 = project(bounds[2], bounds[3], parallax, cam)
    area = max(1e-6, (x1 - x0) * (y1 - y0))
    ix = max(0.0, min(x1, STAGE_W) - max(x0, 0.0))
    iy = max(0.0, min(y1, STAGE_H) - max(y0, 0.0))
    return ix * iy / area
