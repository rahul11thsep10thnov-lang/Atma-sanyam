"""Small SVG drawing kit used by the forge, rasterised with CairoSVG."""
from __future__ import annotations

import io
from pathlib import Path

import cairosvg
from PIL import Image


def _rgb(hex_colour: str) -> tuple[int, int, int]:
    h = hex_colour.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _hex(rgb: tuple[float, float, float]) -> str:
    return "#" + "".join(f"{int(min(255, max(0, round(c)))):02x}" for c in rgb)


def darken(colour: str, amount: float) -> str:
    return _hex(tuple(c * (1 - amount) for c in _rgb(colour)))


def lighten(colour: str, amount: float) -> str:
    return _hex(tuple(c + (255 - c) * amount for c in _rgb(colour)))


def mix(a: str, b: str, t: float) -> str:
    ra, rb = _rgb(a), _rgb(b)
    return _hex(tuple(x + (y - x) * t for x, y in zip(ra, rb)))


class Art:
    """Accumulates SVG elements and gradients for one image."""

    def __init__(self, width: int, height: int) -> None:
        self.w, self.h = width, height
        self.defs: list[str] = []
        self.items: list[str] = []
        self._n = 0

    def _id(self) -> str:
        self._n += 1
        return f"g{self._n}"

    def radial(self, inner: str, outer: str, cx: float = 0.38, cy: float = 0.3, r: float = 0.9) -> str:
        gid = self._id()
        self.defs.append(f'<radialGradient id="{gid}" cx="{cx}" cy="{cy}" r="{r}"><stop offset="0" stop-color="{inner}"/>'
                         f'<stop offset="1" stop-color="{outer}"/></radialGradient>')
        return f"url(#{gid})"

    def linear(self, stops: list[tuple[float, str]], vertical: bool = True, opacity: list[float] | None = None) -> str:
        gid = self._id()
        x2, y2 = (0, 1) if vertical else (1, 0)
        body = "".join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{opacity[i]}"' if opacity else "") + "/>"
                       for i, (o, c) in enumerate(stops))
        self.defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{body}</linearGradient>')
        return f"url(#{gid})"

    def shaded(self, colour: str) -> str:
        return self.radial(lighten(colour, 0.22), darken(colour, 0.1))

    @staticmethod
    def _style(fill: str | None, stroke: str | None, sw: float, opacity: float, extra: str = "") -> str:
        s = f' fill="{fill or "none"}"'
        if stroke:
            s += f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"'
        if opacity != 1:
            s += f' opacity="{opacity}"'
        return s + (" " + extra if extra else "")

    def ellipse(self, cx, cy, rx, ry, fill=None, stroke=None, sw=6, opacity=1.0, rotate=0.0):
        t = f'transform="rotate({rotate} {cx} {cy})"' if rotate else ""
        self.items.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{self._style(fill, stroke, sw, opacity, t)}/>')

    def circle(self, cx, cy, r, fill=None, stroke=None, sw=6, opacity=1.0):
        self.ellipse(cx, cy, r, r, fill, stroke, sw, opacity)

    def rect(self, x, y, w, h, fill=None, stroke=None, sw=6, rx=0.0, opacity=1.0, rotate=0.0):
        t = f'transform="rotate({rotate} {x + w / 2} {y + h / 2})"' if rotate else ""
        self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"{self._style(fill, stroke, sw, opacity, t)}/>')

    def path(self, d, fill=None, stroke=None, sw=6, opacity=1.0, extra=""):
        self.items.append(f'<path d="{d}"{self._style(fill, stroke, sw, opacity, extra)}/>')

    def poly(self, points, fill=None, stroke=None, sw=6, opacity=1.0):
        pts = " ".join(f"{x},{y}" for x, y in points)
        self.items.append(f'<polygon points="{pts}"{self._style(fill, stroke, sw, opacity)}/>')

    def raw(self, svg: str) -> None:
        self.items.append(svg)

    def svg(self) -> str:
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}">'
                f'<defs>{"".join(self.defs)}</defs>{"".join(self.items)}</svg>')

    def render(self, scale: float = 1.0) -> Image.Image:
        png = cairosvg.svg2png(bytestring=self.svg().encode("utf-8"), output_width=int(self.w * scale), output_height=int(self.h * scale))
        return Image.open(io.BytesIO(png)).convert("RGBA")


def save_cropped(art: Art, path: Path, pad: int = 3) -> tuple[list[float], list[float]]:
    """Render, crop to the painted area, save. Returns (origin, size) on the art's canvas."""
    im = art.render()
    box = im.getbbox()
    if box is None:
        raise ValueError(f"nothing was drawn for {path.name}")
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    path.parent.mkdir(parents=True, exist_ok=True)
    im.crop(box).save(path, optimize=True)
    return [float(box[0]), float(box[1])], [float(box[2] - box[0]), float(box[3] - box[1])]
