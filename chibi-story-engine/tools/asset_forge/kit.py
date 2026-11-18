"""Vector design system: the conventions every illustration follows, and the helpers that apply them.

Design rules (see docs/VECTOR_DESIGN_SYSTEM.md):
- Every filled shape gets an outline that is its own colour darkened by 55 %; far things use thinner outlines.
- Shading is one soft radial highlight per object (`shade`), never hard cel bands, so assets sit together.
- Shapes are rounded and organic; corners are softened with `rx` or smooth blobs.
- Vegetation uses the palette keys leaf / leaf2 / leaf3 so seasons and moods swap colours without redrawing.
- Environments are authored on a 2720 x 1480 canvas in stage coordinates (x right, y up, 1920 x 1080 frame at x 0..1920, y 0..1080).
- A human-sized character is about 430 stage pixels tall; doors are about 480.

Every master is an SVG; the runtime PNG is rasterised from that same SVG, cropped to what is painted. The SVG's
viewBox is cropped to the same box, so the two images line up exactly.
"""
from __future__ import annotations

import io
import math
import random
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

import cairosvg
from PIL import Image

from .environments import LH, LW, X0, Y0, Layer
from .svg import Art, darken, lighten, mix

STAGE_W, STAGE_H = 1920, 1080
OUTLINE_DARKEN = 0.55
SNAP = 10                       # crop boxes are snapped to multiples of this (canvas px) so any PNG scale stays integral


def ol(colour: str, amount: float = OUTLINE_DARKEN) -> str:
    return darken(colour, amount)


class V(Layer):
    """A Layer addressed purely in stage coordinates (x right, y up)."""

    def __init__(self, extra_width: int = 0) -> None:
        super().__init__(extra_width)
        self._gc: dict = {}

    def shaded(self, colour: str) -> str:            # one gradient definition per colour, reused by every shape (keeps SVGs small)
        key = ("shaded", colour)
        if key not in self._gc:
            self._gc[key] = super().shaded(colour)
        return self._gc[key]

    def linear(self, stops, vertical=True, opacity=None):
        key = ("lin", tuple(stops), vertical, tuple(opacity) if opacity else None)
        if key not in self._gc:
            self._gc[key] = super().linear(stops, vertical, opacity)
        return self._gc[key]

    def radial(self, inner, outer, cx=0.38, cy=0.3, r=0.9):
        key = ("rad", inner, outer, cx, cy, r)
        if key not in self._gc:
            self._gc[key] = super().radial(inner, outer, cx, cy, r)
        return self._gc[key]

    def R(self, x, y, w, h, fill=None, stroke=None, sw=5, rx=0.0, op=1.0, rot=0.0):
        """Rectangle with its bottom-left corner at (x, y)."""
        self.rect(self.X(x), self.Y(y + h), w, h, fill, stroke, sw, rx, op, rot)

    def E(self, cx, cy, rx, ry=None, fill=None, stroke=None, sw=5, op=1.0, rot=0.0):
        self.ellipse(self.X(cx), self.Y(cy), rx, ry if ry is not None else rx, fill, stroke, sw, op, rot)

    def P(self, pts, fill=None, stroke=None, sw=5, op=1.0):
        self.poly([(self.X(x), self.Y(y)) for x, y in pts], fill, stroke, sw, op)

    def S(self, pts, fill=None, stroke=None, sw=5, op=1.0):
        """Smooth closed blob through the points."""
        self.blob(pts, fill, stroke, sw, op, True)

    def L(self, pts, stroke, sw=5, op=1.0, smooth=True):
        """An open line through the points (smooth or straight)."""
        if smooth and len(pts) > 2:
            self.blob(pts, None, stroke, sw, op, False)
        else:
            d = "M " + " L ".join(f"{self.X(x):.1f} {self.Y(y):.1f}" for x, y in pts)
            self.path(d, None, stroke, sw, op)

    def D(self, d, fill=None, stroke=None, sw=5, op=1.0):
        """A raw path in stage coordinates; `d` uses the commands M L Q C Z with absolute stage numbers."""
        def conv(m: re.Match) -> str:
            return m.group(0)
        tokens = re.findall(r"[MLQCZ]|-?\d+\.?\d*", d)
        out, i, cmd, n = [], 0, "", 0
        while i < len(tokens):
            t = tokens[i]
            if t in "MLQCZ":
                cmd = t
                out.append(t)
                i += 1
                continue
            x, y = float(tokens[i]), float(tokens[i + 1])
            out.append(f"{self.X(x):.1f} {self.Y(y):.1f}")
            i += 2
            n += 1
        self.path(" ".join(out), fill, stroke, sw, op)

    def G(self, stops, vertical=True, opacity=None):
        return self.linear(stops, vertical, opacity)

    def glow(self, cx, cy, r, colour, op=0.8):
        """A soft round glow (radial gradient to transparent)."""
        gid = self._id()
        self.defs.append(f'<radialGradient id="{gid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="{colour}" stop-opacity="{op}"/>'
                         f'<stop offset="1" stop-color="{colour}" stop-opacity="0"/></radialGradient>')
        self.ellipse(self.X(cx), self.Y(cy), r, r, f"url(#{gid})")


def shade(v: Art, colour: str) -> str:
    """The standard soft highlight fill for a colour."""
    return v.shaded(colour)


# ------------------------------------------------------------------------------------------- saving
def _crop_svg(svg: str, box: tuple[int, int, int, int]) -> str:
    """Re-frame an SVG to a box given in canvas pixels."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    head = re.match(r"<svg [^>]*>", svg).group(0)                      # type: ignore[union-attr]
    new_head = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{x0} {y0} {w} {h}">'
    return svg.replace(head, new_head, 1)


def find_box(art: Art, pad: int = 4) -> tuple[int, int, int, int] | None:
    """Bounding box of what is painted, in canvas pixels, snapped outwards to SNAP."""
    png = cairosvg.svg2png(bytestring=art.svg().encode("utf-8"), output_width=max(1, art.w // 5), output_height=max(1, art.h // 5))
    box = Image.open(io.BytesIO(png)).convert("RGBA").getbbox()
    if box is None:
        return None
    x0, y0, x1, y1 = (box[0] * 5 - pad - 5, box[1] * 5 - pad - 5, box[2] * 5 + pad + 5, box[3] * 5 + pad + 5)
    x0, y0 = max(0, x0 // SNAP * SNAP), max(0, y0 // SNAP * SNAP)
    x1, y1 = min(art.w, -(-x1 // SNAP) * SNAP), min(art.h, -(-y1 // SNAP) * SNAP)
    return x0, y0, x1, y1


def save_master(art: Art, svg_path: Path, png_path: Path, scale: float = 1.0, crop: bool = True,
                box: tuple[int, int, int, int] | None = None, quantize: bool = False) -> tuple[tuple[int, int, int, int], tuple[int, int]]:
    """Write the SVG master and the PNG rasterised from it. Returns (box in canvas px, PNG size).

    The SVG is cropped to the box, so SVG user units and PNG pixels differ only by `scale`.
    """
    svg = art.svg()
    if box is None:
        box = find_box(art) if crop else (0, 0, art.w, art.h)
    if box is None:
        raise ValueError(f"nothing was drawn for {png_path.name}")
    svg = _crop_svg(svg, box)
    w, h = box[2] - box[0], box[3] - box[1]
    pw, ph = max(1, round(w * scale)), max(1, round(h * scale))
    png = cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=pw, output_height=ph)
    svg_path.parent.mkdir(parents=True, exist_ok=True)
    png_path.parent.mkdir(parents=True, exist_ok=True)
    svg_path.write_text(svg, encoding="utf-8")
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    if quantize:
        im = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    im.save(png_path, optimize=True)
    return box, (pw, ph)


def stage_rect(box: tuple[int, int, int, int]) -> list[float]:
    """[x, y, w, h] in stage coordinates (y up) of a canvas-pixel box."""
    x0, y0, x1, y1 = box
    return [float(X0 + x0), float(Y0 + LH - y1), float(x1 - x0), float(y1 - y0)]


# --------------------------------------------------------------------------------------- components
Drawer = Callable[..., None]


@dataclass
class Component:
    id: str                    # e.g. tree-oak-round
    kind: str                  # tree, bush, flower, grass, rock, cloud, mountain, water, building, opening, barrier, lamp
    name: str
    draw: Drawer
    pal: dict[str, str] = field(default_factory=dict)
    params: dict = field(default_factory=dict)
    tags: list[str] = field(default_factory=list)

    def render(self, v: V, x: float, y: float, s: float = 1.0, seed: int = 0, pal: dict[str, str] | None = None, **over) -> None:
        """Draw onto `v` with the base point at stage (x, y)."""
        rng = random.Random(hash((self.id, seed)) & 0xFFFFFFFF)
        self.draw(v, x, y, s, rng, {**self.pal, **(pal or {})}, **{**self.params, **over})


REGISTRY: dict[str, Component] = {}


def register(_family: str, cid: str, name: str, draw: Drawer, pal: dict[str, str] | None = None, tags: list[str] | None = None, /, **params) -> Component:
    if cid in REGISTRY:
        raise ValueError(f"duplicate component id {cid}")
    comp = Component(cid, _family, name, draw, pal or {}, params, tags or [])
    REGISTRY[cid] = comp
    return comp


def by_kind(kind: str) -> list[Component]:
    return [c for c in REGISTRY.values() if c.kind == kind]


def get(cid: str) -> Component:
    return REGISTRY[cid]


# palettes shared by components and scenes
PAL = {
    "leaf": "#4aa550", "leaf2": "#3f9447", "leaf3": "#6bbf5c", "bark": "#8a5a33", "stone": "#a9a59c", "wood": "#9a6a3a",
    "cloth": "#c0392b", "gold": "#e6b93c", "sky": "#7ecbf5", "water": "#5fb8dc", "mud": "#c9a070", "sand": "#e8c98a",
}
SKIN = {"light": "#f2c9a0", "fair": "#e8b887", "wheat": "#d99a63", "tan": "#c98a55", "brown": "#a8693f", "dark": "#7a4a2a", "deep": "#5a3520"}
