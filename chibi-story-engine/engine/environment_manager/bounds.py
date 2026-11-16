"""What the camera must keep covered in an environment."""
from __future__ import annotations

from ..camera.guards import CoverLayer
from ..schema.assets import EnvironmentManifest


def cover_layers(env: EnvironmentManifest) -> list[CoverLayer]:
    """Guards for the camera: the painted world on the stage plane, plus any layer marked as covering."""
    out: list[CoverLayer] = []
    if env.camera_bounds is not None:
        left, bottom, right, top = env.camera_bounds
        out.append(CoverLayer("stage", left, bottom, right, top, 1.0, True))
    for layer in env.layers:
        if layer.cover or layer.cover_horizontal:
            margin = max((m.amplitude for m in layer.motion if m.type == "scroll"), default=0.0)   # the spare tile of a scrolling layer
            x, y, w, h = layer.rect
            out.append(CoverLayer(layer.id, x, y, x + w - margin, y + h, layer.parallax, layer.cover))
    return out
