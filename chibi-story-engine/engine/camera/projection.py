"""The 2.5D camera model, in plain numbers.

A layer with parallax p sits at distance D/p from the resting camera and is scaled by 1/p, so at rest it
looks exactly as authored and it shifts by p times any camera move. Zoom is a dolly towards the stage.
The same formulas place objects in Blender (see rendering/blender_worker.py), so what is checked here
is what gets rendered.
"""
from __future__ import annotations

from dataclasses import dataclass

STAGE_W, STAGE_H = 1920.0, 1080.0
REST_X, REST_Y = STAGE_W / 2, STAGE_H / 2
CAMERA_DISTANCE = 2400.0          # stage pixels from the resting camera to the character plane
LENS_MM, SENSOR_MM = 45.0, 36.0   # 36 * 2400 / 45 = 1920: the stage exactly fills the frame at rest
MIN_ZOOM, MAX_ZOOM = 0.5, 3.0


@dataclass(frozen=True)
class CameraState:
    x: float = REST_X
    y: float = REST_Y
    zoom: float = 1.0


def depth_factor(zoom: float, parallax: float) -> float:
    """How many stage pixels at a layer's depth one frame-width pixel covers."""
    return 1.0 / zoom + 1.0 / parallax - 1.0


def layer_world(ax: float, ay: float, parallax: float) -> tuple[float, float, float]:
    """World position (stage pixel units) of a point authored at apparent position (ax, ay) on a layer."""
    return REST_X + (ax - REST_X) / parallax, REST_Y + (ay - REST_Y) / parallax, -CAMERA_DISTANCE * (1.0 / parallax - 1.0)


def project(ax: float, ay: float, parallax: float, cam: CameraState) -> tuple[float, float]:
    """Apparent stage point -> frame coordinates in reference pixels (0..1920, 0..1080; y up)."""
    wx, wy, _ = layer_world(ax, ay, parallax)
    k = depth_factor(cam.zoom, parallax)
    return REST_X + (wx - cam.x) / k, REST_Y + (wy - cam.y) / k


def visible_rect(parallax: float, cam: CameraState) -> tuple[float, float, float, float]:
    """The part of a layer the camera sees, in that layer's apparent coordinates (left, bottom, right, top)."""
    k = depth_factor(cam.zoom, parallax)
    half_w, half_h = STAGE_W / 2 * k * parallax, STAGE_H / 2 * k * parallax
    cx = REST_X + (cam.x - REST_X) * parallax
    cy = REST_Y + (cam.y - REST_Y) * parallax
    return cx - half_w, cy - half_h, cx + half_w, cy + half_h
