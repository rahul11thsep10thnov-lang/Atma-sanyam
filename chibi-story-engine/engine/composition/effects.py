"""Visual effects as deterministic particle sprites. Each effect type is a small pure function."""
from __future__ import annotations

import hashlib
import math
import random
from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

EFFECT_ASSET = "particles_001"


@dataclass
class EffectContext:
    effect_id: str
    fps: int
    n_frames: int                               # frames in the shot
    start: int                                  # first active frame
    length: int                                 # active frames
    origin: list[tuple[float, float]]           # per shot frame: where the effect is (static or following)
    params: dict
    order: float

    def rng(self) -> random.Random:
        return random.Random(int(hashlib.sha256(self.effect_id.encode()).hexdigest()[:12], 16))


@dataclass
class Particle:
    sprite: str
    affine: np.ndarray
    opacity: np.ndarray
    parallax: float = 1.0
    order: float | None = None


def _blank(ctx: EffectContext) -> tuple[np.ndarray, np.ndarray]:
    return np.zeros((ctx.n_frames, 6)), np.zeros(ctx.n_frames)


def _place(affine: np.ndarray, f: int, cx: float, cy: float, w: float, h: float, angle: float = 0.0) -> None:
    """Centre a w x h sprite on (cx, cy), rotated by `angle` degrees."""
    r = math.radians(angle)
    c, s = math.cos(r), math.sin(r)
    a, b, cc, d = w * c, w * s, -h * s, h * c
    affine[f] = (a, b, cc, d, cx - (a + cc) / 2, cy - (b + d) / 2)


def splash(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    size = float(ctx.params.get("size", 1.0))
    for _ in range(int(ctx.params.get("count", 16))):
        affine, opacity = _blank(ctx)
        vx, vy = rng.uniform(-260, 260) * size, rng.uniform(380, 760) * size
        s = rng.uniform(16, 34) * size
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            ox, oy = ctx.origin[ctx.start]
            y = oy + vy * t - 0.5 * 1900 * t * t
            if y < oy - 10 and t > 0.1:
                continue
            _place(affine, f, ox + vx * t, y, s, s * 1.3, math.degrees(math.atan2(vx, vy - 1900 * t)) * -1)
            opacity[f] = max(0.0, 1.0 - i / ctx.length) ** 0.5
        out.append(Particle("droplet", affine, opacity))
    affine, opacity = _blank(ctx)
    for i in range(ctx.length):
        f = ctx.start + i
        if f >= ctx.n_frames:
            break
        k = i / max(ctx.length - 1, 1)
        ox, oy = ctx.origin[ctx.start]
        _place(affine, f, ox, oy, (120 + 320 * k) * size, (34 + 80 * k) * size)
        opacity[f] = 0.8 * (1 - k)
    out.append(Particle("ring", affine, opacity, order=ctx.order - 0.5))
    return out


def ripples(ctx: EffectContext) -> list[Particle]:
    out = []
    every = max(1, int(float(ctx.params.get("interval", 0.45)) * ctx.fps))
    life = int(1.3 * ctx.fps)
    for start in range(ctx.start, min(ctx.start + ctx.length, ctx.n_frames), every):
        affine, opacity = _blank(ctx)
        ox, oy = ctx.origin[start]
        for i in range(life):
            f = start + i
            if f >= ctx.n_frames:
                break
            k = i / life
            _place(affine, f, ox, oy + 6, 150 + 330 * k, 30 + 60 * k)
            opacity[f] = 0.65 * (1 - k)
        out.append(Particle("ring", affine, opacity, order=ctx.order - 0.5))
    return out


def falling_leaves(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    for _ in range(int(ctx.params.get("count", 9))):
        affine, opacity = _blank(ctx)
        x0, phase = rng.uniform(-100, 2020), rng.uniform(0, 6.28)
        speed, sway, size = rng.uniform(70, 130), rng.uniform(40, 110), rng.uniform(34, 60)
        offset, spin = rng.uniform(0, 1200), rng.uniform(-120, 120)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            y = 1180 - ((offset + speed * t) % 1300)
            _place(affine, f, x0 + sway * math.sin(phase + t * 1.4) + 30 * t, y, size, size * 0.6, spin * t + 30 * math.sin(phase + t * 2))
            opacity[f] = 0.9
        out.append(Particle("leaf", affine, opacity, parallax=1.2, order=900))
    return out


def sparkles(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    radius = float(ctx.params.get("radius", 170))
    for _ in range(int(ctx.params.get("count", 10))):
        affine, opacity = _blank(ctx)
        dx, dy = rng.uniform(-radius, radius), rng.uniform(-radius * 0.4, radius)
        phase, size = rng.uniform(0, 6.28), rng.uniform(26, 52)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            tw = 0.5 + 0.5 * math.sin(phase + t * 7)
            ox, oy = ctx.origin[f]
            _place(affine, f, ox + dx, oy + dy + 20 * t, size * (0.6 + 0.4 * tw), size * (0.6 + 0.4 * tw), 20 * t)
            opacity[f] = tw * min(1.0, (ctx.length - i) / (0.3 * ctx.fps))
        out.append(Particle("sparkle", affine, opacity))
    return out


def hearts(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    for n in range(int(ctx.params.get("count", 5))):
        affine, opacity = _blank(ctx)
        dx, delay, size = rng.uniform(-90, 90), n * 0.25, rng.uniform(40, 64)
        for i in range(ctx.length):
            f = ctx.start + i
            t = i / ctx.fps - delay
            if f >= ctx.n_frames or t < 0:
                continue
            ox, oy = ctx.origin[f]
            _place(affine, f, ox + dx + 18 * math.sin(t * 4 + n), oy + 110 * t, size, size)
            opacity[f] = max(0.0, 1.0 - t / 1.6)
        out.append(Particle("heart", affine, opacity))
    return out


def dust(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    for _ in range(int(ctx.params.get("count", 6))):
        affine, opacity = _blank(ctx)
        vx, size = rng.uniform(-140, 140), rng.uniform(50, 100)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            k = i / max(ctx.length - 1, 1)
            ox, oy = ctx.origin[ctx.start]
            _place(affine, f, ox + vx * k, oy + 30 * k, size * (0.6 + k), size * (0.6 + k))
            opacity[f] = 0.6 * (1 - k)
        out.append(Particle("puff", affine, opacity))
    return out


def rain(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    for _ in range(int(ctx.params.get("count", 60))):
        affine, opacity = _blank(ctx)
        x0, offset, speed, length = rng.uniform(-300, 2200), rng.uniform(0, 1400), rng.uniform(1500, 2100), rng.uniform(50, 90)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            y = 1250 - ((offset + speed * t) % 1450)
            _place(affine, f, x0 - 0.18 * (1250 - y), y, 5, length, -10)
            opacity[f] = 0.55
        out.append(Particle("streak", affine, opacity, parallax=1.3, order=950))
    return out


def fog(ctx: EffectContext) -> list[Particle]:
    """Slow banks of mist drifting across the lower half of the picture."""
    rng, out = ctx.rng(), []
    for _ in range(int(ctx.params.get("count", 9))):
        affine, opacity = _blank(ctx)
        x0, y0, size = rng.uniform(-300, 2200), rng.uniform(120, 620), rng.uniform(520, 980)
        drift, phase = rng.uniform(14, 40), rng.uniform(0, 6.28)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            _place(affine, f, x0 + drift * t + 30 * math.sin(phase + t * 0.4), y0 + 16 * math.sin(phase + t * 0.7), size, size * 0.34)
            opacity[f] = 0.26 + 0.1 * math.sin(phase + t * 0.5)
        out.append(Particle("puff", affine, opacity, parallax=1.15, order=930))
    return out


def snow(ctx: EffectContext) -> list[Particle]:
    rng, out = ctx.rng(), []
    for _ in range(int(ctx.params.get("count", 70))):
        affine, opacity = _blank(ctx)
        x0, offset, speed, size = rng.uniform(-200, 2120), rng.uniform(0, 1300), rng.uniform(70, 150), rng.uniform(12, 26)
        sway, phase = rng.uniform(20, 60), rng.uniform(0, 6.28)
        for i in range(ctx.length):
            f = ctx.start + i
            if f >= ctx.n_frames:
                break
            t = i / ctx.fps
            y = 1180 - ((offset + speed * t) % 1300)
            _place(affine, f, x0 + sway * math.sin(phase + t * 1.1), y, size, size)
            opacity[f] = 0.9
        out.append(Particle("puff", affine, opacity, parallax=1.2, order=940))
    return out


EFFECT_TYPES: dict[str, Callable[[EffectContext], list[Particle]]] = {
    "fog": fog, "snow": snow,
    "splash": splash, "ripples": ripples, "falling_leaves": falling_leaves, "sparkles": sparkles,
    "hearts": hearts, "dust": dust, "rain": rain,
}
EFFECT_SPRITES = {"fog": ["puff"], "snow": ["puff"], "splash": ["droplet", "ring"], "ripples": ["ring"], "falling_leaves": ["leaf"], "sparkles": ["sparkle"],
                  "hearts": ["heart"], "dust": ["puff"], "rain": ["streak"]}
