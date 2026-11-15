"""Easing curves and keyframe interpolation shared by animation clips and the camera."""
from __future__ import annotations

import math
from collections.abc import Sequence

from ..schema.story import Easing


def ease(kind: Easing | str, t: float) -> float:
    """Map linear progress t in [0, 1] to eased progress."""
    t = min(1.0, max(0.0, t))
    kind = Easing(kind)
    if kind is Easing.linear:
        return t
    if kind is Easing.ease_in:
        return t * t
    if kind is Easing.ease_out:
        return 1.0 - (1.0 - t) ** 2
    if kind is Easing.ease_in_out:
        return 0.5 - 0.5 * math.cos(math.pi * t)
    if kind is Easing.step:
        return 0.0 if t < 1.0 else 1.0
    if kind is Easing.bounce:
        # settle with two decaying rebounds
        return 1.0 - abs(math.cos(t * math.pi * 2.5)) * (1.0 - t) ** 2
    if kind is Easing.overshoot:
        s = 1.70158
        u = t - 1.0
        return u * u * ((s + 1.0) * u + s) + 1.0
    return t


def interpolate(keys: Sequence[tuple[float, float, Easing | str]], t: float) -> float:
    """Value at time t of keyframes (time, value, easing-into-this-key). Holds before the first and after the last key."""
    if not keys:
        return 0.0
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0, _), (t1, v1, e1) in zip(keys, keys[1:]):
        if t <= t1:
            span = t1 - t0
            return v1 if span <= 0 else v0 + (v1 - v0) * ease(e1, (t - t0) / span)
    return keys[-1][1]
