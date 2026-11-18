"""Environment construction kit: turns a layer recipe into SVG masters, runtime PNG layers and an environment manifest.

A recipe is a list of layer dicts (built with the `L_*` helpers) plus anchors. Items inside a layer are either explicit
`(component, x, y, scale)` placements or generators (`scatter`, `row`). Everything is drawn with the vector components
in `components_*`; the special builders here (sky, ground, water, walls, floors, effects) cover what components do not.
"""
from __future__ import annotations

import io
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from PIL import Image

from .components_all import load
from .environments import LH, LW, TILE, X0, Y0, reeds, ripples, water_body, water_front
from .kit import REGISTRY, V, find_box, ol, save_master, stage_rect
from .svg import Art, darken, lighten, mix

load()
OFF_L, OFF_R = -430.0, 2350.0
FLOOR = 330.0                                    # default horizon / floor line (stage y)


# ------------------------------------------------------------------------------------------ item helpers
def At(cid: str, x: float, y: float, s: float = 1.0, **kw) -> tuple:
    return ("at", cid, x, y, s, kw)


def Scatter(ids: list[str] | str, n: int, xr=(-300, 2220), yr=(FLOOR, FLOOR), sr=(0.8, 1.2), seed: int = 0, **kw) -> tuple:
    return ("scatter", ids if isinstance(ids, list) else [ids], n, xr, yr, sr, seed, kw)


def Row(cid: str, x0: float, x1: float, step: float, y: float, s: float = 1.0, jitter: float = 0.0, ids: list[str] | None = None, seed: int = 0, **kw) -> tuple:
    return ("row", ids or [cid], x0, x1, step, y, s, jitter, seed, kw)


def Glow(x: float, y: float, r: float, colour: str, op: float = 0.5) -> tuple:
    return ("glow", x, y, r, colour, op)


def Shape(kind: str, *args, **kw) -> tuple:
    return ("shape", kind, args, kw)


def _items(v: V, items: list, k: float, seed: int) -> None:
    """Draw a list of items. `k` > 1 re-composes the scene closer: bigger things, fewer of them, spread about the centre."""
    rng = random.Random(seed)
    for it in items:
        kind = it[0]
        if kind == "at":
            _, cid, x, y, s, kw = it
            REGISTRY[cid].render(v, 960 + (x - 960) * (1 + (k - 1) * 0.55), y, s * k, seed=int(x * 7 + y), **kw)
        elif kind == "scatter":
            _, ids, n, xr, yr, sr, sd, kw = it
            r2 = random.Random(sd * 1009 + seed)
            n = max(1, int(round(n / (1 + (k - 1) * 1.1)))) if k > 1 else n
            pts = sorted(((r2.uniform(*xr), r2.uniform(*yr), r2.uniform(*sr), ids[r2.randrange(len(ids))]) for _ in range(n)), key=lambda p: -p[1])
            for x, y, s, cid in pts:
                REGISTRY[cid].render(v, 960 + (x - 960) * (1 + (k - 1) * 0.55), y, s * k, seed=int(x * 3 + y), **kw)
        elif kind == "row":
            _, ids, x0, x1, step, y, s, jit, sd, kw = it
            r2 = random.Random(sd * 77 + seed)
            x = x0
            while x <= x1:
                cid = ids[r2.randrange(len(ids))]
                REGISTRY[cid].render(v, 960 + (x + r2.uniform(-jit, jit) - 960) * (1 + (k - 1) * 0.55), y + r2.uniform(-jit, jit) * 0.3,
                                     s * k * r2.uniform(0.9, 1.1), seed=int(x), **kw)
                x += step * (1 + (k - 1) * 0.8)
        elif kind == "glow":
            _, x, y, r, c, op = it
            v.glow(x, y, r * k, c, op)
        elif kind == "shape":
            _, name, args, kw = it
            SHAPES[name](v, k, rng, *args, **kw)


# --------------------------------------------------------------------------------------- special shapes
def sh_rect(v, k, rng, x, y, w, h, fill, stroke=None, sw=5, rx=0, op=1.0):
    v.R(x, y, w, h, fill, stroke, sw, rx, op)


def sh_ellipse(v, k, rng, x, y, rx, ry, fill, stroke=None, sw=5, op=1.0):
    v.E(x, y, rx, ry, fill, stroke, sw, op)


def sh_poly(v, k, rng, pts, fill, stroke=None, sw=5, op=1.0):
    v.P(pts, fill, stroke, sw, op)


def sh_blob(v, k, rng, pts, fill, stroke=None, sw=5, op=1.0):
    v.S(pts, fill, stroke, sw, op)


def sh_line(v, k, rng, pts, col, sw=5, op=1.0, smooth=True):
    v.L(pts, col, sw, op, smooth)


def sh_carpet(v, k, rng, x0, x1, y_top, y_bot, col="#a8322a", trim="#e6b93c"):
    """A carpet runner in rough perspective (narrow at the top, wide at the bottom)."""
    v.P([(x0 + (x1 - x0) * 0.2, y_top), (x0 + (x1 - x0) * 0.8, y_top), (x1, y_bot), (x0, y_bot)], v.G([(0, darken(col, 0.15)), (1, col)]), ol(col), 5)
    v.P([(x0 + (x1 - x0) * 0.26, y_top - 2), (x0 + (x1 - x0) * 0.74, y_top - 2), (x1 - (x1 - x0) * 0.06, y_bot + 2), (x0 + (x1 - x0) * 0.06, y_bot + 2)], None, trim, 5)
    for i in range(1, 6):
        t = i / 6
        yy = y_top + (y_bot - y_top) * t
        half = ((x1 - x0) * (0.3 + 0.2 * t))
        v.L([(960 - half, yy), (960 + half, yy)], mix(col, trim, 0.4), 3, 0.5, smooth=False)


def sh_pillar(v, k, rng, x, y, h, w=72, col="#f2e6cc", capital=True, ornate=False):
    v.R(x - w * 0.62, y, w * 1.24, 30, v.shaded(darken(col, 0.06)), ol(col), 4, rx=5)
    v.R(x - w / 2, y + 30, w, h - 60, v.G([(0, lighten(col, 0.18)), (0.5, col), (1, darken(col, 0.12))], False), ol(col), 5, rx=6)
    for dx in (-0.22, 0.0, 0.22):
        v.L([(x + dx * w, y + 40), (x + dx * w, y + h - 44)], darken(col, 0.18), 3, 0.5, smooth=False)
    if capital:
        v.R(x - w * 0.7, y + h - 34, w * 1.4, 34, v.shaded(darken(col, 0.06)), ol(col), 4, rx=6)
    if ornate:
        for i in range(5):
            v.E(x, y + 80 + i * (h - 160) / 4, w * 0.18, w * 0.12, fill="#e6b93c", stroke=ol("#e6b93c"), sw=2)


def sh_throne(v, k, rng, x, y, s=1.0, col="#e6b93c", cushion="#a8322a"):
    s *= k ** 0.5
    v.R(x - 120 * s, y, 240 * s, 40 * s, v.shaded(darken(col, 0.1)), ol(col), 5, rx=6)
    v.R(x - 100 * s, y + 40 * s, 200 * s, 50 * s, v.shaded(cushion), ol(cushion), 5, rx=10)
    v.S([(x - 110 * s, y + 40 * s), (x - 120 * s, y + 300 * s), (x - 60 * s, y + 420 * s), (x, y + 470 * s), (x + 60 * s, y + 420 * s), (x + 120 * s, y + 300 * s), (x + 110 * s, y + 40 * s)],
        v.shaded(col), ol(col), 6)
    v.S([(x - 70 * s, y + 90 * s), (x - 76 * s, y + 290 * s), (x, y + 380 * s), (x + 76 * s, y + 290 * s), (x + 70 * s, y + 90 * s)], v.shaded(cushion), ol(cushion), 4)
    for dx in (-1, 1):
        v.R(x + dx * 118 * s - 16 * s, y + 90 * s, 32 * s, 12 * s, v.shaded(col), ol(col), 3, rx=5)
        v.E(x + dx * 120 * s, y + 320 * s, 20 * s, fill="#d83a58", stroke=ol("#d83a58"), sw=3)
    v.E(x, y + 440 * s, 16 * s, fill="#3aa8d8", stroke=ol("#3aa8d8"), sw=3)


def sh_table(v, k, rng, x, y, w=420, h=130, col="#8a5a33", cloth=None):
    k2 = k ** 0.5
    w, h = w * k2, h * k2
    v.R(x - w / 2, y + h - 22, w, 22, v.shaded(col), ol(col), 5, rx=6)
    if cloth:
        v.R(x - w / 2 - 8, y + h - 30, w + 16, 14, cloth, ol(cloth), 3)
    for dx in (-0.44, 0.44):
        v.R(x + dx * w - 12, y, 24, h - 22, v.shaded(darken(col, 0.1)), ol(col), 4)


def sh_bed(v, k, rng, x, y, w=420, col="#8a5a33", sheet="#e8d8c0"):
    k2 = k ** 0.5
    w *= k2
    v.R(x - w / 2, y, w, 46 * k2, v.shaded(col), ol(col), 5, rx=6)
    v.R(x - w / 2 + 10, y + 46 * k2, w - 20, 54 * k2, v.shaded(sheet), ol(sheet, 0.3), 4, rx=14)
    v.R(x - w / 2 + 14, y + 90 * k2, 100 * k2, 36 * k2, v.shaded("#f8f0e0"), ol("#d8c8a8"), 3, rx=14)
    v.R(x - w / 2 - 14, y, 22 * k2, 180 * k2, v.shaded(col), ol(col), 4, rx=6)
    v.R(x + w / 2 - 8, y, 22 * k2, 130 * k2, v.shaded(col), ol(col), 4, rx=6)


def sh_shelf(v, k, rng, x, y, w=360, h=420, col="#8a5a33", goods=("#c0392b", "#3a6ad8", "#e8b030", "#3aa85a")):
    k2 = k ** 0.5
    w, h = w * k2, h * k2
    v.R(x - w / 2, y, w, h, v.shaded(col), ol(col), 5, rx=5)
    for r_ in range(4):
        yy = y + 16 + r_ * (h - 24) / 4
        v.R(x - w / 2 + 8, yy, w - 16, 10, darken(col, 0.2), None, 0)
        for j in range(int(w / 56)):
            c = goods[(r_ + j) % len(goods)]
            v.R(x - w / 2 + 16 + j * 56, yy + 10, 40, 30 + (j * r_) % 3 * 8, v.shaded(c), ol(c), 3, rx=5)


def sh_rugs(v, k, rng, x, y, w=600, h=40, col="#a8322a"):
    v.E(x, y, w * k / 2, h * k / 2, fill=v.shaded(col), stroke=ol(col), sw=4)
    v.E(x, y, w * k * 0.38, h * k * 0.34, stroke="#e6b93c", sw=4, op=0.9)


def sh_haystack(v, k, rng, x, y, s=1.0):
    s *= k
    v.S([(x - 130 * s, y), (x - 120 * s, y + 110 * s), (x - 50 * s, y + 190 * s), (x, y + 200 * s), (x + 50 * s, y + 190 * s), (x + 120 * s, y + 110 * s), (x + 130 * s, y)], v.shaded("#e8c860"), ol("#c0a040"), 5)
    for i in range(10):
        v.L([(x + rng.uniform(-100, 100) * s, y + rng.uniform(10, 120) * s), (x + rng.uniform(-110, 110) * s, y + rng.uniform(60, 180) * s)], "#c0a040", 3, 0.6, smooth=False)


def sh_pot(v, k, rng, x, y, s=1.0, col="#c9783c"):
    s *= k
    v.S([(x - 40 * s, y), (x - 62 * s, y + 60 * s), (x - 40 * s, y + 120 * s), (x - 24 * s, y + 138 * s), (x + 24 * s, y + 138 * s), (x + 40 * s, y + 120 * s), (x + 62 * s, y + 60 * s), (x + 40 * s, y)],
        v.shaded(col), ol(col), 5)
    v.E(x, y + 138 * s, 30 * s, 10 * s, fill=darken(col, 0.3), stroke=ol(col), sw=3)
    v.L([(x - 50 * s, y + 70 * s), (x + 50 * s, y + 70 * s)], "#f0d8a0", 4, 0.8)


def sh_chest(v, k, rng, x, y, s=1.0):
    s *= k
    v.R(x - 90 * s, y, 180 * s, 80 * s, v.shaded("#8a5a33"), ol("#8a5a33"), 5, rx=6)
    v.S([(x - 90 * s, y + 80 * s), (x - 80 * s, y + 130 * s), (x, y + 150 * s), (x + 80 * s, y + 130 * s), (x + 90 * s, y + 80 * s)], v.shaded("#9a6a3a"), ol("#8a5a33"), 5)
    v.R(x - 94 * s, y + 70 * s, 188 * s, 12 * s, "#e6b93c", None, 0)
    v.R(x - 12 * s, y + 52 * s, 24 * s, 34 * s, v.shaded("#e6b93c"), ol("#e6b93c"), 3, rx=4)


def sh_coins(v, k, rng, x, y, s=1.0, n=40):
    s *= k
    for _ in range(n):
        v.E(x + rng.uniform(-170, 170) * s, y + rng.uniform(0, 70) * s * (1 - abs(0)), 17 * s, 9 * s, fill=v.shaded("#f2c230"), stroke=ol("#f2c230"), sw=2)
    for _ in range(5):
        c = ["#d83a58", "#3aa8d8", "#3aa85a"][rng.randrange(3)]
        v.E(x + rng.uniform(-120, 120) * s, y + rng.uniform(10, 70) * s, 11 * s, fill=v.shaded(c), stroke=ol(c), sw=2)


def sh_banner(v, k, rng, x, y, w=120, h=300, col="#c0392b", trim="#e6b93c"):
    v.L([(x - w / 2 - 20, y + h + 20), (x + w / 2 + 20, y + h + 20)], "#7a5a3a", 8, smooth=False)
    v.P([(x - w / 2, y + h + 14), (x + w / 2, y + h + 14), (x + w / 2, y + 20), (x, y), (x - w / 2, y + 20)], v.shaded(col), ol(col), 4)
    v.E(x, y + h * 0.58, w * 0.22, fill=trim, stroke=ol(trim), sw=3)
    v.L([(x - w * 0.4, y + 44), (x + w * 0.4, y + 44)], trim, 4, smooth=False)


def sh_statue(v, k, rng, x, y, s=1.0, col="#c8c0a8"):
    s *= k
    v.R(x - 70 * s, y, 140 * s, 60 * s, v.shaded(darken(col, 0.1)), ol(col), 5, rx=5)
    v.S([(x - 44 * s, y + 60 * s), (x - 52 * s, y + 200 * s), (x - 30 * s, y + 300 * s), (x + 30 * s, y + 300 * s), (x + 52 * s, y + 200 * s), (x + 44 * s, y + 60 * s)], v.shaded(col), ol(col), 5)
    v.E(x, y + 340 * s, 32 * s, 38 * s, fill=v.shaded(col), stroke=ol(col), sw=5)
    for dx in (-1, 1):
        v.L([(x + dx * 50 * s, y + 250 * s), (x + dx * 90 * s, y + 180 * s)], col, 18 * s)


def sh_arch(v, k, rng, x, y, w=300, h=420, col="#f0e0b8", dark="#2a1c24"):
    """A deep arched alcove or doorway in a wall."""
    v.S([(x - w / 2, y), (x - w / 2, y + h * 0.66), (x, y + h), (x + w / 2, y + h * 0.66), (x + w / 2, y)], dark, ol(col), 7)
    v.S([(x - w / 2 - 18, y), (x - w / 2 - 18, y + h * 0.68), (x, y + h + 20), (x + w / 2 + 18, y + h * 0.68), (x + w / 2 + 18, y)], None, col, 14)


def sh_window_light(v, k, rng, x, y, w=140, h=240, col="#9ad0f0"):
    v.S([(x - w / 2, y), (x - w / 2, y + h * 0.66), (x, y + h), (x + w / 2, y + h * 0.66), (x + w / 2, y)], v.G([(0, lighten(col, 0.5)), (1, col)]), "#e6d6b0", 8)
    v.L([(x, y), (x, y + h)], "#e6d6b0", 5, smooth=False)
    v.L([(x - w / 2, y + h * 0.45), (x + w / 2, y + h * 0.45)], "#e6d6b0", 5, smooth=False)


def sh_stars(v, k, rng, n, y0=500, y1=1260, big=True):
    for _ in range(n):
        x, y = rng.uniform(X0, X0 + LW), rng.uniform(y0, y1)
        r = rng.uniform(1.6, 4.2 if big else 2.4)
        v.E(x, y, r, fill="#ffffff", op=rng.uniform(0.5, 1.0))


def sh_moon(v, k, rng, x, y, r=90, col="#fdf8e0"):
    v.glow(x, y, r * 3.2, "#cfe0ff", 0.5)
    v.E(x, y, r, fill=v.radial("#ffffff", col), stroke=darken(col, 0.1), sw=3)
    for cx, cy, cr in ((-0.3, 0.2, 0.2), (0.25, -0.15, 0.15), (0.1, 0.38, 0.1)):
        v.E(x + cx * r, y + cy * r, cr * r, fill=darken(col, 0.08), op=0.6)


def sh_sun(v, k, rng, x, y, r=70, col="#fff3a8", glow="#fff7c8"):
    v.glow(x, y, r * 4.2, glow, 0.8)
    v.E(x, y, r, fill=col)


def sh_shafts(v, k, rng, xs, top=1260, bottom=330, w=120, col="#fff3c0", op=0.16):
    for x in xs:
        v.P([(x - w * 0.4, top), (x + w * 0.4, top), (x + w * 1.1 + 60, bottom), (x - w * 0.5 + 60, bottom)], col, None, 0, op)


def sh_mist(v, k, rng, y, n=7, col="#e8f0f0", op=0.38, w=900, h=200):
    for _ in range(n):
        x = rng.uniform(X0, X0 + LW)
        v.E(x, y + rng.uniform(-30, 30), w * rng.uniform(0.6, 1.1) / 2, h * rng.uniform(0.6, 1.0) / 2, fill=col, op=op * rng.uniform(0.6, 1.0))


def sh_fireflies(v, k, rng, n=26, y0=240, y1=620, col="#e8ff7a"):
    for _ in range(n):
        x, y = rng.uniform(0, 1920), rng.uniform(y0, y1)
        v.glow(x, y, rng.uniform(16, 34), col, 0.9)
        v.E(x, y, 3.2, fill="#ffffe0")


def sh_bats(v, k, rng, n=7, y0=700, y1=1040):
    for _ in range(n):
        x, y, s = rng.uniform(100, 1800), rng.uniform(y0, y1), rng.uniform(0.7, 1.3)
        v.S([(x - 40 * s, y), (x - 24 * s, y + 14 * s), (x, y - 6 * s), (x + 24 * s, y + 14 * s), (x + 40 * s, y), (x + 22 * s, y + 24 * s), (x, y + 8 * s), (x - 22 * s, y + 24 * s)], "#1a1220", None, 0)


def sh_ghost(v, k, rng, x, y, s=1.0, col="#e8f4ff"):
    s *= k
    v.glow(x, y + 120 * s, 210 * s, "#bfe0ff", 0.4)
    v.S([(x - 60 * s, y), (x - 70 * s, y + 130 * s), (x - 50 * s, y + 220 * s), (x, y + 250 * s), (x + 50 * s, y + 220 * s), (x + 70 * s, y + 130 * s), (x + 60 * s, y), (x + 36 * s, y + 24 * s),
         (x + 12 * s, y), (x - 12 * s, y + 24 * s), (x - 36 * s, y)], col, "#9ab8d8", 4, 0.72)
    v.E(x - 20 * s, y + 160 * s, 10 * s, 14 * s, fill="#1a2030")
    v.E(x + 20 * s, y + 160 * s, 10 * s, 14 * s, fill="#1a2030")
    v.E(x, y + 120 * s, 12 * s, 16 * s, fill="#1a2030")


def sh_eyes(v, k, rng, n=6, y0=280, y1=520):
    for _ in range(n):
        x, y = rng.uniform(100, 1800), rng.uniform(y0, y1)
        for dx in (-14, 14):
            v.glow(x + dx, y, 20, "#ffe040", 0.8)
            v.E(x + dx, y, 6, 8, fill="#ffe860")


def sh_cobweb(v, k, rng, x, y, r=170):
    for i in range(8):
        a = i * math.pi / 8 + math.pi
        v.L([(x, y), (x + math.cos(a) * r, y + math.sin(a) * r)], "#e8e8f0", 2, 0.8, smooth=False)
    for rr in (0.3, 0.55, 0.8):
        pts = [(x + math.cos(i * math.pi / 8 + math.pi) * r * rr, y + math.sin(i * math.pi / 8 + math.pi) * r * rr) for i in range(9)]
        v.L(pts, "#e8e8f0", 2, 0.8, smooth=True)


def sh_tombstone(v, k, rng, x, y, s=1.0, col="#8a8a90"):
    s *= k
    v.S([(x - 50 * s, y), (x - 50 * s, y + 130 * s), (x - 30 * s, y + 175 * s), (x + 30 * s, y + 175 * s), (x + 50 * s, y + 130 * s), (x + 50 * s, y)], v.shaded(col), ol(col), 5)
    v.L([(x, y + 90 * s), (x, y + 150 * s)], darken(col, 0.4), 5, smooth=False)
    v.L([(x - 20 * s, y + 126 * s), (x + 20 * s, y + 126 * s)], darken(col, 0.4), 5, smooth=False)


def sh_crystals(v, k, rng, x, y, s=1.0, col="#8ad6f0", n=5):
    s *= k
    for i in range(n):
        cx = x + (i - n / 2) * 40 * s
        hh = rng.uniform(100, 240) * s
        v.P([(cx - 18 * s, y), (cx - 8 * s, y + hh), (cx + 8 * s, y + hh * 1.05), (cx + 18 * s, y)], v.shaded(col), ol(col), 3)
    v.glow(x, y + 100 * s, 200 * s, col, 0.4)


def sh_path(v, k, rng, pts, col="#d8b888", w=220):
    """A winding path made of overlapping discs along a polyline, widening towards the viewer."""
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        for t in [j / 8 for j in range(9)]:
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            rr = w * (0.6 + 0.8 * (1 - (y - FLOOR + 200) / 600))
            v.E(x, y, max(40, rr), max(14, rr * 0.2), fill=col, op=1.0)


def sh_water_surface(v, k, rng, y_top, y_bot, c1="#7fd6e8", c2="#2f8fc4"):
    v.R(X0, y_bot, LW, y_top - y_bot, v.G([(0, c1), (1, c2)]), None, 0)


def sh_wave_lines(v, k, rng, y0, y1, n=40, col="#ffffff", op=0.45):
    for _ in range(n):
        x, y, w = rng.uniform(X0, X0 + LW), rng.uniform(y0, y1), rng.uniform(70, 190)
        v.L([(x, y), (x + w * 0.25, y + 8), (x + w * 0.5, y), (x + w * 0.75, y + 8), (x + w, y)], col, 4, op)


def sh_light_pool(v, k, rng, x, y, rx=260, ry=40, col="#fff0b0", op=0.3):
    v.E(x, y, rx, ry, fill=col, op=op)


SHAPES = {"rect": sh_rect, "ellipse": sh_ellipse, "poly": sh_poly, "blob": sh_blob, "line": sh_line, "carpet": sh_carpet, "pillar": sh_pillar,
          "throne": sh_throne, "table": sh_table, "bed": sh_bed, "shelf": sh_shelf, "rugs": sh_rugs, "haystack": sh_haystack, "pot": sh_pot,
          "chest": sh_chest, "coins": sh_coins, "banner": sh_banner, "statue": sh_statue, "arch": sh_arch, "window_light": sh_window_light,
          "stars": sh_stars, "moon": sh_moon, "sun": sh_sun, "shafts": sh_shafts, "mist": sh_mist, "fireflies": sh_fireflies, "bats": sh_bats,
          "ghost": sh_ghost, "eyes": sh_eyes, "cobweb": sh_cobweb, "tombstone": sh_tombstone, "crystals": sh_crystals, "path": sh_path,
          "water_surface": sh_water_surface, "wave_lines": sh_wave_lines, "light_pool": sh_light_pool}


# ---------------------------------------------------------------------------------------------- skies
SKY_COLOURS = {
    "day": ("#6ec3f5", "#d9f2ff"), "morning": ("#86c4ee", "#ffe6c4"), "dawn": ("#7a86cc", "#ffc9a2"), "noon": ("#4fb0f0", "#d0eeff"),
    "evening": ("#6a8ad8", "#ffd6a2"), "sunset": ("#4a5ab0", "#ffa870"), "dusk": ("#2a2a6a", "#e0708a"), "night": ("#0a0f2e", "#2a3a6c"),
    "overcast": ("#8e9aaa", "#d4dae2"), "storm": ("#343e52", "#7a8698"), "desert": ("#3f9ee0", "#fff0c8"), "magic": ("#2a1a5a", "#e07ac0"),
    "mist": ("#b8c4cc", "#eef2f4"), "underwater": ("#124c8a", "#5ad0e8"), "cave": ("#0c0a12", "#241c2e"), "haunted": ("#1a1030", "#5a3a6a"),
    "spring": ("#7ccaf2", "#f0f8ff"), "snow": ("#a8b8cc", "#eef4fa"), "golden": ("#5aa0e0", "#ffe0a0"),
}
CLOUD_FOR = {"day": ["cloud-cumulus-1", "cloud-cumulus-2", "cloud-cumulus-3"], "morning": ["cloud-cumulus-1", "cloud-puff"], "noon": ["cloud-cumulus-2", "cloud-cumulus-3"],
             "evening": ["cloud-sunset", "cloud-sunset-streak"], "sunset": ["cloud-sunset", "cloud-sunset-streak"], "dawn": ["cloud-sunset", "cloud-cirrus"],
             "dusk": ["cloud-sunset", "cloud-night"], "night": ["cloud-night"], "overcast": ["cloud-stratus", "cloud-cumulus-2"], "storm": ["cloud-storm", "cloud-thunderhead"],
             "desert": ["cloud-cirrus"], "magic": ["cloud-sunset", "cloud-night"], "mist": ["cloud-stratus", "cloud-mist-band"], "spring": ["cloud-cumulus-1", "cloud-cumulus-3"],
             "snow": ["cloud-stratus"], "golden": ["cloud-sunset-streak"], "haunted": ["cloud-night", "cloud-storm"]}


def build_sky(kind: str, seed: int = 1, clouds: int = 5, sun: tuple | None = None, moon: tuple | None = None, stars: int = 0, glow_y: float = 380) -> V:
    top, bottom = SKY_COLOURS[kind]
    v = V()
    v.R(X0, Y0, LW, LH, v.G([(0, top), (0.74, bottom), (1, bottom)]), None, 0)
    rng = random.Random(seed)
    if stars:
        sh_stars(v, 1, rng, stars)
    if sun:
        sh_sun(v, 1, rng, *sun)
    if moon:
        sh_moon(v, 1, rng, *moon)
    ids = CLOUD_FOR.get(kind, ["cloud-cumulus-1"])
    for _ in range(clouds if kind not in ("cave",) else 0):
        REGISTRY[ids[rng.randrange(len(ids))]].render(v, rng.uniform(X0 + 100, X0 + LW - 100), rng.uniform(640, 1150), rng.uniform(0.8, 1.5), seed=rng.randrange(999))
    return v


# --------------------------------------------------------------------------------------------- grounds
GROUND = {
    "grass": ("#84c463", "#5f9a45", "#4a7a38"), "meadow": ("#8fd06a", "#62a048", "#4a7a38"), "dirt": ("#c9a070", "#9a7248", "#6a4a2a"), "sand": ("#ecd29a", "#d4b070", "#b8905a"),
    "stone": ("#a8a49c", "#7a766e", "#4a4640"), "marble": ("#f4ecdc", "#d8cbb0", "#a89a7a"), "wood": ("#b88a58", "#8a5a33", "#5a3a1a"), "cobble": ("#a09a90", "#767068", "#4a4640"),
    "snow": ("#f6f9ff", "#cddaeb", "#9ab0c8"), "mud": ("#8a6a48", "#6a4a30", "#3a2a1a"), "moss": ("#6aa85a", "#4a8444", "#2a5a2a"), "dark": ("#4a4450", "#2a2430", "#14101a"),
    "tile": ("#e8d8b8", "#c8b088", "#8a7048"), "forest": ("#6aa850", "#467a38", "#2f5a28"), "autumn": ("#c8a050", "#9a7a38", "#6a5020"), "rock": ("#9a9488", "#6a645a", "#3a3630"),
    "haunted": ("#4a3f58", "#2c2438", "#18101f"), "wet": ("#7a9a6a", "#4a6a4a", "#2a3a2a"), "path": ("#d8b888", "#b09060", "#7a5a38"),
}


def _interp(points, x):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            t = (x - x0) / max(1e-6, x1 - x0)
            t = t * t * (3 - 2 * t)
            return y0 + (y1 - y0) * t
    return points[0][1] if x < points[0][0] else points[-1][1]


def build_ground(kind: str, top: float = FLOOR, amp: float = 8.0, seed: int = 1, tex: bool = True, tilt: float = 0.0, wavelength: float = 260.0,
                 profile=None) -> V:
    c1, c2, edge = GROUND[kind]
    v = V()
    rng = random.Random(seed)
    if profile:
        pts = sorted(profile)
        prof = [(x, _interp(pts, x) + amp * 0.5 * math.sin(x / wavelength + seed)) for x in range(X0, X0 + LW + 1, 80)]
        top = max(y for _, y in prof)
    else:
        prof = [(x, top + amp * math.sin(x / wavelength + seed) + tilt * (x - 960) / 960) for x in range(X0, X0 + LW + 1, 80)]
    v.band(prof, v.G([(0, lighten(c1, 0.12)), (0.2, c1), (1, c2)]), ol(c2, 0.5), 5)
    if not tex:
        return v
    if kind in ("grass", "meadow", "forest", "moss", "wet"):
        for _ in range(70):
            x = rng.uniform(X0, X0 + LW)
            y = rng.uniform(Y0 + 30, top - 30)
            s = 0.6 + 0.9 * (1 - (y - Y0) / (top - Y0 + 1)) * 1.0
            REGISTRY["grass-tuft"].render(v, x, y, s * 0.8, seed=int(x), pal={"leaf": darken(c2, 0.1)})
    elif kind in ("dirt", "path", "mud", "autumn"):
        for _ in range(60):
            x, y = rng.uniform(X0, X0 + LW), rng.uniform(Y0 + 20, top - 24)
            v.E(x, y, rng.uniform(8, 26), rng.uniform(3, 8), fill=darken(c1, 0.12), op=0.45)
        for _ in range(16):
            REGISTRY["grass-pebbles"].render(v, rng.uniform(X0, X0 + LW), rng.uniform(Y0 + 30, top - 30), rng.uniform(0.3, 0.7), seed=_)
    elif kind == "sand":
        for _ in range(26):
            x, y = rng.uniform(X0, X0 + LW), rng.uniform(Y0 + 40, top - 20)
            v.L([(x, y), (x + 90, y + 10), (x + 190, y)], darken(c1, 0.14), 4, 0.6)
    elif kind in ("stone", "cobble", "marble", "tile", "rock", "dark", "haunted"):
        rows = 9
        for r_ in range(rows):
            t = r_ / rows
            y0 = top - (top - Y0) * (1 - (1 - t) ** 1.6)
            v.L([(X0, y0), (X0 + LW, y0)], darken(c2, 0.2), 3 + 3 * t, 0.55, smooth=False)
            step = 70 + 110 * t
            off = (r_ % 2) * step / 2
            xx = X0 + off
            while xx < X0 + LW:
                y1 = top - (top - Y0) * (1 - (1 - (r_ + 1) / rows) ** 1.6)
                v.L([(xx, y0), (xx - (xx - 960) * 0.06 * (1 / rows) * 3, y1)], darken(c2, 0.2), 2 + 2 * t, 0.45, smooth=False)
                xx += step
    elif kind == "wood":
        for r_ in range(10):
            y = top - (r_ + 1) * (top - Y0) / 10
            v.L([(X0, y), (X0 + LW, y)], darken(c2, 0.25), 3, 0.6, smooth=False)
            for _ in range(9):
                xx = rng.uniform(X0, X0 + LW)
                v.L([(xx, y), (xx + rng.uniform(40, 90), y + (top - Y0) / 10 * 0.8)], darken(c1, 0.2), 2, 0.4, smooth=False)
    elif kind == "snow":
        for _ in range(26):
            v.E(rng.uniform(X0, X0 + LW), rng.uniform(Y0 + 30, top - 30), rng.uniform(60, 160), rng.uniform(8, 20), fill="#b8cce0", op=0.45)
    return v


# ---------------------------------------------------------------------------------------------- walls
WALLS = {
    "palace": ("#f1e2bc", "#e0c88c", "#c0392b"), "stone": ("#a8a49c", "#8a867e", "#5a5650"), "wood": ("#b08050", "#8a5a33", "#5a3a1a"), "mud": ("#d4ac78", "#b88a58", "#8a5a33"),
    "cave": ("#4a4254", "#2c2638", "#14101c"), "temple": ("#e8b868", "#c8884a", "#a8322a"), "marble": ("#f6f0e2", "#e0d4b8", "#b09a68"), "haunted": ("#3a3048", "#241c30", "#100a18"),
    "white": ("#fbf6ea", "#e8dcc0", "#c0583a"), "brick": ("#c0654a", "#9a4a34", "#6a2e20"), "blue": ("#9ab8e0", "#7a98c8", "#4a6aa0"), "green": ("#a8c898", "#88a878", "#587a4a"),
    "royal": ("#7a2e48", "#5a2038", "#e6b93c"), "dark": ("#3c3844", "#26222e", "#14101a"), "crystal": ("#3a3a5a", "#26264a", "#8ad6f0"),
}


def build_wall(kind: str, floor_y: float = FLOOR, seed: int = 1, panels: int = 0, dado: bool = True, ceil: float = 1280.0) -> V:
    c1, c2, trim = WALLS[kind]
    v = V()
    rng = random.Random(seed)
    v.R(X0, floor_y - 10, LW, ceil - floor_y + 12, v.G([(0, lighten(c1, 0.1)), (0.6, c1), (1, c2)]), None, 0)
    if kind in ("cave", "crystal"):                       # irregular rock face, domed roof with stalactites
        for _ in range(150):
            cx, cy = rng.uniform(X0, X0 + LW), rng.uniform(floor_y, ceil)
            rx, ry = rng.uniform(60, 220), rng.uniform(30, 110)
            col = mix(c1, c2, rng.random())
            v.S([(cx - rx, cy), (cx - rx * 0.5, cy + ry), (cx + rx * 0.4, cy + ry * 0.9), (cx + rx, cy), (cx + rx * 0.3, cy - ry * 0.8), (cx - rx * 0.6, cy - ry * 0.7)], col, darken(col, 0.25), 2, rng.uniform(0.35, 0.8))
        for _ in range(22):
            cx, cy = rng.uniform(X0, X0 + LW), rng.uniform(floor_y + 40, ceil - 200)
            v.L([(cx, cy), (cx + rng.uniform(-60, 60), cy + rng.uniform(40, 130)), (cx + rng.uniform(-90, 90), cy + rng.uniform(150, 260))], darken(c2, 0.35), 3, 0.5)
        pts = [(X0 - 10, ceil + 10)]
        x = X0 - 10
        while x < X0 + LW + 40:
            pts.append((x, ceil - rng.uniform(260, 420)))
            x += rng.uniform(60, 130)
            pts.append((x, ceil - rng.uniform(160, 240)))
            x += rng.uniform(30, 70)
        pts.append((X0 + LW + 10, ceil + 10))
        v.P(pts, v.G([(0, c2), (1, darken(c2, 0.45))]), darken(c2, 0.5), 4)
    elif kind in ("stone", "haunted", "dark"):
        for r_ in range(int((ceil - floor_y) / 80)):
            y = floor_y + r_ * 80
            off = (r_ % 2) * 70
            x = X0 + off
            while x < X0 + LW:
                w = rng.uniform(110, 200)
                v.R(x + 3, y + 3, w - 6, 74, v.G([(0, lighten(c1, 0.06)), (1, c2)]), darken(c2, 0.3), 3, 10, rng.uniform(0.5, 0.9))
                x += w
    elif kind in ("brick",):
        for r_ in range(int((ceil - floor_y) / 40)):
            y = floor_y + r_ * 40
            for j in range(int(LW / 110) + 1):
                v.R(X0 + j * 110 + (r_ % 2) * 55, y, 106, 36, mix(c1, c2, rng.random()), darken(c2, 0.3), 2)
    elif kind in ("wood",):
        for j in range(int(LW / 90)):
            v.R(X0 + j * 90, floor_y, 88, ceil - floor_y, mix(c1, c2, rng.random() * 0.7), darken(c2, 0.35), 3)
    elif kind in ("mud",):
        for _ in range(40):
            v.E(rng.uniform(X0, X0 + LW), rng.uniform(floor_y, ceil - 100), rng.uniform(30, 120), rng.uniform(10, 40), fill=darken(c1, 0.1), op=0.35)
    else:
        for j in range(int(LW / 220) + 1):                   # soft vertical panels
            v.R(X0 + j * 220 + 8, floor_y + 150, 204, 620, None, mix(c1, c2, 0.5), 5, 14)
    if dado and kind not in ("cave", "crystal"):
        v.R(X0, floor_y - 10, LW, 150, v.G([(0, darken(c2, 0.1)), (1, c2)]), None, 0)
        v.R(X0, floor_y + 138, LW, 18, v.shaded(trim), ol(trim), 3)
    if kind not in ("cave", "crystal"):
        v.R(X0, ceil - 140, LW, 140, v.G([(0, c2), (1, darken(c2, 0.2))]), None, 0)
        v.R(X0, ceil - 150, LW, 14, v.shaded(trim), ol(trim), 3)
    if kind in ("palace", "temple", "royal", "marble"):
        for j in range(int(LW / 160) + 1):
            v.E(X0 + j * 160 + 80, floor_y + 80, 16, 24, fill=trim, stroke=ol(trim), sw=2, op=0.85)
    return v


def build_beams(col: str = "#6a4a2a", y0: float = 990.0, n: int = 7) -> V:
    v = V()
    v.R(X0, y0 + 40, LW, 60, v.G([(0, darken(col, 0.1)), (1, col)]), ol(col), 5)
    for j in range(n):
        x = X0 + 160 + j * (LW - 320) / (n - 1)
        v.R(x - 26, y0 - 100, 52, 200, v.shaded(col), ol(col), 5, 6)
    return v


# ------------------------------------------------------------------------------------------ layer dicts
def L(lid: str, ltype: str, parallax: float, order: int, **kw) -> dict:
    return {"id": lid, "type": ltype, "parallax": parallax, "order": order, **kw}


def L_sky(kind: str = "day", seed: int = 1, **kw) -> dict:
    return L("sky", "background", 0.12, 0, cover=True, scale=0.4, special=("sky", kind, seed, kw))


def L_far(items: list, parallax: float = 0.3, lid: str = "far", order: int = 1, tint: str = "background", **kw) -> dict:
    return L(lid, "far", parallax, order, items=items, scale=0.55, tint=tint, **kw)


def L_mid(items: list, parallax: float = 0.55, lid: str = "mid_trees", order: int = 2, tint: str = "foliage", **kw) -> dict:
    return L(lid, "middle", parallax, order, items=items, scale=0.7, tint=tint, **kw)


def L_ground(kind: str, top: float = FLOOR, order: int = 10, seed: int = 1, amp: float = 8.0, **kw) -> dict:
    return L("ground", "middle", 1.0, order, cover_x=True, scale=0.9, special=("ground", kind, top, amp, seed, kw))


def L_wall(kind: str, order: int = 5, parallax: float = 0.94, seed: int = 1, floor_y: float = FLOOR, **kw) -> dict:
    return L("back_wall", "far", parallax, order, cover=True, scale=0.8, special=("wall", kind, floor_y, seed, kw))


def L_items(lid: str, items: list, order: int, parallax: float = 1.0, ltype: str = "middle", tint: str = "background", scale: float = 1.0, **kw) -> dict:
    return L(lid, ltype, parallax, order, items=items, tint=tint, scale=scale, **kw)


def L_fg(items: list, lid: str = "foreground", order: int = 800, parallax: float = 1.3, tint: str = "foliage", sway: float = 0.8, **kw) -> dict:
    motion = [{"type": "sway", "amplitude": sway, "period": 4.2, "pivot": [960.0, -200.0], "wind_scaled": True}] if sway else []
    return L(lid, "foreground", parallax, order, items=items, tint=tint, scale=1.0, motion=motion, **kw)


def L_fx(items: list, lid: str = "atmosphere", order: int = 920, parallax: float = 1.0, scare: int = 0, **kw) -> dict:
    return L(lid, "effects", parallax, order, items=items, tint="none", scale=0.6, scare=scare, **kw)


def SWAY(amp: float = 1.2, period: float = 4.0, pivot=(960.0, 300.0), phase: float = 0.0) -> list:
    return [{"type": "sway", "amplitude": amp, "period": period, "phase": phase, "pivot": list(pivot), "wind_scaled": True}]


def SCROLL(speed: float) -> dict:
    return {"type": "scroll", "speed": speed, "amplitude": TILE}


def BOB(amp: float = 4.0, period: float = 3.0) -> dict:
    return {"type": "bob", "amplitude": amp, "period": period}


# ------------------------------------------------------------------------------------------- anchors
def ground_anchors(y: float = 215.0, extra: dict | None = None, features=("ground",), centre: float = 960.0) -> dict:
    a = {
        "left": {"x": 560.0, "y": y, "order": 100, "features": list(features)},
        "center": {"x": centre, "y": y - 10, "order": 101, "features": list(features)},
        "right": {"x": 1380.0, "y": y, "order": 100, "features": list(features)},
        "far_left": {"x": 300.0, "y": y + 30, "order": 99, "scale": 0.92, "features": list(features)},
        "far_right": {"x": 1650.0, "y": y + 30, "order": 99, "scale": 0.92, "features": list(features)},
        "offstage_left": {"x": OFF_L, "y": y, "order": 100, "features": ["offstage", *features]},
        "offstage_right": {"x": OFF_R, "y": y, "order": 100, "features": ["offstage", *features]},
    }
    a.update(extra or {})
    return a


def water_anchors(y: float = 110.0, bank_y: float = 230.0, extra: dict | None = None) -> dict:
    a = {
        "water_left": {"x": 600.0, "y": y, "order": 120, "features": ["water"]},
        "water_center": {"x": 1000.0, "y": y - 8, "order": 121, "features": ["water"]},
        "water_right": {"x": 1400.0, "y": y, "order": 120, "features": ["water"]},
        "water_far": {"x": 1700.0, "y": y + 60, "order": 118, "scale": 0.88, "features": ["water"]},
        "bank_left": {"x": 330.0, "y": bank_y, "order": 100, "features": ["ground"]},
        "bank_right": {"x": 1620.0, "y": bank_y, "order": 100, "features": ["ground"]},
        "offstage_left": {"x": OFF_L, "y": y, "order": 120, "features": ["offstage", "water"]},
        "offstage_right": {"x": OFF_R, "y": y, "order": 120, "features": ["offstage", "water"]},
        "offstage_bank_left": {"x": OFF_L, "y": bank_y, "order": 100, "features": ["offstage", "ground"]},
    }
    a.update(extra or {})
    return a


# --------------------------------------------------------------------------------------------- compile
@dataclass
class EnvSpec:
    id: str                       # env-for-0001
    name: str
    category: str                 # FOR, PAL, ...
    subcategory: str
    description: str
    layers: list[dict]
    anchors: dict
    roles: dict                   # habitat -> anchors
    habitats: list[str]
    tags: list[str]
    aliases: list[str] = field(default_factory=list)
    stories: list[str] = field(default_factory=list)
    ambience: str | None = "forest_ambience_001"
    seed: int = 1
    composition: str = "wide"     # wide | medium | closeup
    group: str | None = None      # id of the wide version when this is a re-composition
    lighting: list[str] | None = None
    scare_levels: bool = False


def _draw_special(ld: dict, k: float, seed: int) -> V:
    sp = ld["special"]
    kind = sp[0]
    if kind == "sky":
        _, sk, sd, kw = sp
        return build_sky(sk, sd + seed, **kw)
    if kind == "ground":
        _, gk, top, amp, sd, kw = sp
        return build_ground(gk, top, amp, sd + seed, **kw)
    if kind == "wall":
        _, wk, fy, sd, kw = sp
        return build_wall(wk, fy, sd + seed, **kw)
    if kind == "water":
        _, a, b, top = sp
        art = water_body(top, a, b)
        return art
    raise ValueError(kind)


def compile_layer(ld: dict, k: float, seed: int) -> Art:
    if "art" in ld:
        return ld["art"]
    if "special" in ld:
        v = _draw_special(ld, k, seed)
        if ld.get("items"):
            _items(v, ld["items"], k, seed)
        return v
    v = V()
    _items(v, ld.get("items", []), k, seed)
    return v


def build_environment(spec: EnvSpec, out_dir: Path, k: float = 1.0, quick: bool = False) -> dict:
    """Draw every layer, write masters (SVG) and runtime PNGs, make a composite preview. Returns manifest data and file roles."""
    out_dir.mkdir(parents=True, exist_ok=True)
    layers_out, roles = [], {}
    frames: list[tuple[Image.Image, list[float], float, int]] = []
    for ld in spec.layers:
        art = compile_layer(ld, k, spec.seed)
        scale = ld.get("scale", 1.0) * (0.5 if quick else 1.0)
        box = find_box(art)
        if box is None:
            continue
        if art.w > LW:
            box = (0, box[1], art.w, box[3])
        svg_rel, png_rel = f"masters/{ld['id']}.svg", f"layers/{ld['id']}.png"
        box, size = save_master(art, out_dir / svg_rel, out_dir / png_rel, scale=scale, box=box, quantize=ld.get('quant', True))
        rect = stage_rect(box)
        entry = {"id": ld["id"], "type": ld["type"], "file": png_rel, "svg": svg_rel, "rect": rect, "parallax": ld["parallax"], "order": ld["order"],
                 "cover": ld.get("cover", False), "cover_horizontal": ld.get("cover_x", False), "motion": ld.get("motion", []),
                 "tint_group": ld.get("tint", "background"), "scare": ld.get("scare", 0)}
        layers_out.append(entry)
        roles[png_rel] = {"role": "layer"}
        roles[svg_rel] = {"role": "svg_master"}
        frames.append((Image.open(out_dir / png_rel).convert("RGBA"), rect, ld["parallax"], ld["order"]))
    # composite preview of the resting camera (what the first frame of a shot shows), at 960 x 540
    prev = Image.new("RGBA", (960, 540), (0, 0, 0, 255))
    for im, rect, par, order in sorted(frames, key=lambda f: (f[2], f[3])):
        x, y, w, h = rect
        px, py = (x - 960) / par + 960, (y + h - 540) / par + 540        # apparent top-left at rest is the authored position (no shift at rest)
        px, py = x, y + h
        dx, dy = int(round(x / 2)), int(round((1080 - (y + h)) / 2))
        tw, th = max(1, int(round(w / 2))), max(1, int(round(h / 2)))
        if dx > 960 or dy > 540 or dx + tw < 0 or dy + th < 0:
            continue
        prev.alpha_composite(im.resize((tw, th), Image.LANCZOS), (dx, dy)) if (dx >= 0 and dy >= 0) else _paste_clipped(prev, im.resize((tw, th), Image.LANCZOS), dx, dy)
    (out_dir / "previews").mkdir(exist_ok=True)
    prev.convert("RGB").save(out_dir / "previews" / "composite.jpg", quality=84)
    roles["previews/composite.jpg"] = {"role": "preview"}
    data = {
        "id": spec.id, "asset_type": "environment", "name": spec.name, "description": spec.description, "catalog_code": spec.id.upper(),
        "category": spec.category, "subcategory": spec.subcategory, "related_stories": spec.stories,
        "tags": sorted(set(spec.tags)), "aliases": [spec.id.upper(), *spec.aliases], "stage": [1920, 1080],
        "camera_bounds": [X0, Y0, X0 + LW, Y0 + LH], "layers": layers_out, "anchors": spec.anchors,
        "default_anchor_by_role": spec.roles,
        "lighting_presets": spec.lighting or ["day", "morning", "noon", "evening", "sunset", "night", "moonlight", "overcast"],
        "compatibility": {"habitats": spec.habitats, "style": "premium_chibi_anime", "ambience": spec.ambience, "composition": spec.composition,
                          "composition_group": spec.group or spec.id, "scare_levels": sorted({0, *[l["scare"] for l in layers_out]}),
                          "seasons": ["spring", "summer", "monsoon", "autumn", "winter"], "weather": ["clear", "cloudy", "rain", "fog", "storm", "snow"]},
        "licence": {"name": "CC0-1.0", "author": "Chibi Story Animation Engine (procedural vector art)", "source": "generated: tools/asset_forge", "notes": ""},
    }
    return {"data": data, "roles": roles}


def _paste_clipped(dst: Image.Image, src: Image.Image, dx: int, dy: int) -> None:
    x0, y0 = max(0, dx), max(0, dy)
    crop = src.crop((x0 - dx, y0 - dy, min(src.width, dst.width - dx), min(src.height, dst.height - dy)))
    if crop.width > 0 and crop.height > 0:
        dst.alpha_composite(crop, (x0, y0))
