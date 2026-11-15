"""Reusable camera moves. A preset turns a shot (duration, optional target) into one CameraState per frame."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ..animation.easing import ease, interpolate
from ..common.errors import ValidationFailed
from ..schema.story import CameraSpec, Easing
from .projection import MAX_ZOOM, MIN_ZOOM, REST_X, REST_Y, STAGE_H, CameraState


@dataclass(frozen=True)
class Target:
    """What a preset frames: a point per frame (stage pixels) and the subject's height."""

    track: list[tuple[float, float]]
    height: float = 420.0

    def at(self, frame: int) -> tuple[float, float]:
        return self.track[min(frame, len(self.track) - 1)]


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _fit_zoom(target: Target | None, fill: float) -> float:
    """Zoom at which the subject's height takes `fill` of the frame height."""
    if target is None:
        return 1.6
    return min(2.6, max(1.15, fill * STAGE_H / max(target.height, 1.0)))


def _static(x: float, y: float, z0: float, z1: float, n: int, easing: Easing = Easing.ease_in_out) -> list[CameraState]:
    return [CameraState(x, y, _lerp(z0, z1, ease(easing, i / max(n - 1, 1)))) for i in range(n)]


def establishing_wide(n, fps, target, p):
    return _static(REST_X, REST_Y, 1.0, float(p.get("end_zoom", 1.04)), n)


def slow_push_in(n, fps, target, p):
    tx, ty = target.at(0) if target else (REST_X, REST_Y)
    z1 = float(p.get("end_zoom", 1.3))
    return [CameraState(_lerp(REST_X, _lerp(REST_X, tx, 0.6), e), _lerp(REST_Y, _lerp(REST_Y, ty, 0.6), e), _lerp(1.0, z1, e))
            for e in (ease(Easing.ease_in_out, i / max(n - 1, 1)) for i in range(n))]


def slow_pull_out(n, fps, target, p):
    tx, ty = target.at(0) if target else (REST_X, REST_Y)
    z0 = float(p.get("start_zoom", 1.35))
    return [CameraState(_lerp(_lerp(REST_X, tx, 0.5), REST_X, e), _lerp(_lerp(REST_Y, ty, 0.5), REST_Y, e), _lerp(z0, 1.0, e))
            for e in (ease(Easing.ease_in_out, i / max(n - 1, 1)) for i in range(n))]


def horizontal_pan(n, fps, target, p):
    d, z = float(p.get("distance", 320.0)), float(p.get("zoom", 1.2))
    sign = -1.0 if p.get("direction", "right") == "left" else 1.0
    return [CameraState(REST_X + sign * d * (ease(Easing.ease_in_out, i / max(n - 1, 1)) - 0.5), REST_Y, z) for i in range(n)]


def vertical_pan(n, fps, target, p):
    d, z = float(p.get("distance", 160.0)), float(p.get("zoom", 1.2))
    sign = -1.0 if p.get("direction", "up") == "down" else 1.0
    return [CameraState(REST_X, REST_Y + sign * d * (ease(Easing.ease_in_out, i / max(n - 1, 1)) - 0.5), z) for i in range(n)]


def parallax_drift(n, fps, target, p):
    d, z = float(p.get("distance", 200.0)), float(p.get("zoom", 1.12))
    return [CameraState(REST_X + d * (i / max(n - 1, 1) - 0.5), REST_Y, z) for i in range(n)]


def _follow(n: int, target: Target | None, zoom: float, stiffness: float) -> list[CameraState]:
    if target is None:
        return _static(REST_X, REST_Y, zoom, zoom, n)
    x, y = target.at(0)
    out = []
    for i in range(n):
        tx, ty = target.at(i)
        x += (tx - x) * stiffness
        y += (ty - y) * stiffness
        out.append(CameraState(x, y, zoom))
    return out


def tracking_shot(n, fps, target, p):
    return _follow(n, target, float(p.get("zoom", 1.3)), min(1.0, 6.0 / fps))


def action_follow(n, fps, target, p):
    return _follow(n, target, float(p.get("zoom", 1.45)), min(1.0, 3.5 / fps))


def character_closeup(n, fps, target, p):
    z = float(p.get("zoom", _fit_zoom(target, 0.62)))
    tx, ty = target.at(0) if target else (REST_X, REST_Y)
    return _static(tx, ty, z, z * 1.05, n)


def reaction_closeup(n, fps, target, p):
    z = float(p.get("zoom", _fit_zoom(target, 0.78)))
    tx, ty = target.at(0) if target else (REST_X, REST_Y)
    settle = max(2, int(0.45 * fps))
    return [CameraState(tx, ty, _lerp(z * 0.8, z, ease(Easing.overshoot, min(1.0, i / settle)))) for i in range(n)]


def dramatic_reveal(n, fps, target, p):
    z0 = float(p.get("start_zoom", _fit_zoom(target, 0.9)))
    tx, ty = target.at(0) if target else (REST_X, REST_Y)
    hold = int(n * 0.3)
    out = []
    for i in range(n):
        e = 0.0 if i < hold else ease(Easing.ease_in_out, (i - hold) / max(n - hold - 1, 1))
        out.append(CameraState(_lerp(tx, REST_X, e), _lerp(ty, REST_Y, e), _lerp(z0, 1.05, e)))
    return out


Preset = Callable[[int, int, "Target | None", dict], list[CameraState]]
CAMERA_PRESETS: dict[str, Preset] = {
    "establishing_wide": establishing_wide, "slow_push_in": slow_push_in, "slow_pull_out": slow_pull_out,
    "horizontal_pan": horizontal_pan, "vertical_pan": vertical_pan, "tracking_shot": tracking_shot,
    "character_closeup": character_closeup, "reaction_closeup": reaction_closeup, "dramatic_reveal": dramatic_reveal,
    "action_follow": action_follow, "parallax_drift": parallax_drift,
}


def evaluate_camera(spec: CameraSpec, n_frames: int, fps: int, target: Target | None = None) -> list[CameraState]:
    """One camera state per frame, from explicit keyframes if given, otherwise from the preset."""
    if n_frames <= 0:
        return []
    if spec.keyframes:
        xs = [(k.t, k.x, k.easing) for k in spec.keyframes]
        ys = [(k.t, k.y, k.easing) for k in spec.keyframes]
        zs = [(k.t, k.zoom, k.easing) for k in spec.keyframes]
        return [CameraState(interpolate(xs, i / fps), interpolate(ys, i / fps), interpolate(zs, i / fps)) for i in range(n_frames)]
    preset = CAMERA_PRESETS.get(spec.preset)
    if preset is None:
        raise ValidationFailed(f"Unknown camera preset '{spec.preset}'",
                               [{"path": "camera.preset", "message": f"choose one of: {', '.join(sorted(CAMERA_PRESETS))}"}])
    states = preset(n_frames, fps, target, dict(spec.params))
    return [CameraState(s.x, s.y, min(MAX_ZOOM, max(MIN_ZOOM, s.zoom))) for s in states]
