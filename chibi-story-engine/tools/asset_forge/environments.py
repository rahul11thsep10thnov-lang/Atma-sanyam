"""Procedural layered environments. Each layer is one transparent image with a depth (parallax) and a draw order.

Layers are authored in stage coordinates (1920x1080, y up) on a canvas that extends past the frame
(x -400..2320, y -200..1280) so the camera can pan, track and push in without showing an edge.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from .svg import Art, darken, lighten, mix

X0, Y0, LW, LH = -400, -200, 2720, 1480      # layer canvas in stage space
RECT = [X0, Y0, LW, LH]
TILE = 680                                    # width of one repeat of scrolling water texture


class Layer(Art):
    """An Art canvas addressed in stage coordinates (y up)."""

    def __init__(self, extra_width: int = 0) -> None:
        super().__init__(LW + extra_width, LH)

    @staticmethod
    def X(x: float) -> float:
        return x - X0

    @staticmethod
    def Y(y: float) -> float:
        return LH + Y0 - y

    def pts(self, points: list[tuple[float, float]]) -> str:
        return " ".join(f"{self.X(x):.1f},{self.Y(y):.1f}" for x, y in points)

    def blob(self, points: list[tuple[float, float]], fill, stroke=None, sw=5, opacity=1.0, closed=True) -> None:
        """Smooth closed shape through points (Catmull-Rom converted to cubic Béziers)."""
        p = [(self.X(x), self.Y(y)) for x, y in points]
        n = len(p)
        d = f"M {p[0][0]:.1f} {p[0][1]:.1f}"
        for i in range(n if closed else n - 1):
            p0, p1, p2, p3 = p[(i - 1) % n], p[i], p[(i + 1) % n], p[(i + 2) % n]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f" C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
        self.path(d + (" Z" if closed else ""), fill, stroke, sw, opacity)

    def band(self, top: list[tuple[float, float]], fill, stroke=None, sw=5, opacity=1.0, bottom: float = Y0 - 20) -> None:
        """Everything below a smooth top edge that runs from the left margin to the right margin."""
        p = [(self.X(x), self.Y(y)) for x, y in top]
        d = f"M {p[0][0]:.1f} {self.Y(bottom):.1f} L {p[0][0]:.1f} {p[0][1]:.1f}"
        for i in range(len(p) - 1):
            p0, p1, p2, p3 = p[max(i - 1, 0)], p[i], p[i + 1], p[min(i + 2, len(p) - 1)]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f" C {c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
        d += f" L {p[-1][0]:.1f} {self.Y(bottom):.1f} Z"
        self.path(d, fill, stroke, sw, opacity)

    def disc(self, x, y, r, fill, stroke=None, sw=5, opacity=1.0, ry=None):
        self.ellipse(self.X(x), self.Y(y), r, ry or r, fill, stroke, sw, opacity)


# ------------------------------------------------------------ ingredients
def sky(top: str, bottom: str, sun: tuple[float, float] | None = (1500, 900), clouds: int = 6, seed: int = 1) -> Layer:
    a = Layer()
    a.rect(0, 0, LW, LH, a.linear([(0, top), (1, bottom)]))
    if sun:
        a.defs.append('<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff7c8" stop-opacity="0.95"/>'
                      '<stop offset="1" stop-color="#fff7c8" stop-opacity="0"/></radialGradient>')
        a.disc(sun[0], sun[1], 260, "url(#sun)")
        a.disc(sun[0], sun[1], 70, "#fff3a8")
    rng = random.Random(seed)
    for _ in range(clouds):
        x, y, s = rng.uniform(X0, X0 + LW), rng.uniform(640, 1150), rng.uniform(0.7, 1.4)
        for dx, dy, r in ((-70, 0, 50), (0, 18, 66), (72, 2, 52), (30, -18, 48), (-34, -14, 44)):
            a.disc(x + dx * s, y + dy * s, r * s, "#ffffff", opacity=0.85)
    return a


def hills(colour: str, base: float, amp: float, seed: int, wavelength: float = 700) -> Layer:
    a = Layer()
    rng = random.Random(seed)
    phase = rng.uniform(0, 6.28)
    top = [(x, base + amp * (0.6 * math.sin(x / wavelength * 6.28 + phase) + 0.4 * math.sin(x / (wavelength * 0.37) * 6.28 + phase * 2)))
           for x in range(X0, X0 + LW + 1, 80)]
    a.band(top, a.linear([(0, lighten(colour, 0.12)), (1, colour)]))
    return a


def tree_line(colour: str, base: float, seed: int, height: float = 190, trunks: bool = True) -> Layer:
    a = Layer()
    rng = random.Random(seed)
    a.band([(x, base + 14 * math.sin(x / 190)) for x in range(X0, X0 + LW + 1, 60)], darken(colour, 0.12))
    x = X0 - 60
    while x < X0 + LW + 80:
        h, r = rng.uniform(0.7, 1.15) * height, rng.uniform(70, 120)
        shade = mix(colour, lighten(colour, 0.25), rng.random())
        if trunks:
            a.rect(a.X(x) - 9, a.Y(base + h * 0.7), 18, h * 0.7, darken("#7a5230", 0.1))
        for dx, dy, k in ((0, 0, 1.0), (-r * 0.6, -r * 0.3, 0.75), (r * 0.6, -r * 0.25, 0.78), (0, r * 0.5, 0.7)):
            a.disc(x + dx, base + h + dy, r * k, shade)
        x += rng.uniform(110, 200)
    return a


def water_body(top_y: float, surface: str, deep: str, edge: list[tuple[float, float]] | None = None) -> Layer:
    a = Layer()
    top = edge or [(x, top_y + 6 * math.sin(x / 120)) for x in range(X0, X0 + LW + 1, 60)]
    a.band(top, a.linear([(0, surface), (1, deep)]))
    a.band([(x, y - 16) for x, y in top], "#ffffff", opacity=0.12)
    return a


def ripples(y_min: float, y_max: float, seed: int, count: int = 26, colour: str = "#ffffff", opacity: float = 0.5) -> Layer:
    """Wavy highlights that repeat every TILE pixels, so the layer can scroll forever."""
    a = Layer(extra_width=TILE)
    rng = random.Random(seed)
    for _ in range(count):
        x, y, w = rng.uniform(0, TILE), rng.uniform(y_min, y_max), rng.uniform(60, 150)
        k = 0.55 + 0.45 * (1 - (y - y_min) / max(1.0, y_max - y_min))       # nearer = bigger
        for rep in range(-1, (LW + TILE) // TILE + 1):
            cx = a.X(X0) + x + rep * TILE
            a.path(f"M {cx:.1f} {a.Y(y):.1f} q {w * k / 4:.1f} {-9 * k:.1f} {w * k / 2:.1f} 0 t {w * k / 2:.1f} 0", None, colour, 5 * k, opacity)
    return a


def water_front(top_y: float, colour: str, opacity: float = 0.55) -> Layer:
    a = Layer()
    top = [(x, top_y + 7 * math.sin(x / 95)) for x in range(X0, X0 + LW + 1, 50)]
    a.band(top, a.linear([(0, lighten(colour, 0.25)), (1, colour)], opacity=[opacity * 0.8, opacity + 0.25]))
    a.band([(x, y) for x, y in top], None, "#ffffff", 5, 0.5, bottom=Y0 - 400)
    return a


def ground(top: list[tuple[float, float]], grass: str, soil: str = "#8a6238", tufts: int = 40, seed: int = 3) -> Layer:
    a = Layer()
    a.band([(x, y - 30) for x, y in top], a.linear([(0, soil), (1, darken(soil, 0.25))]))
    a.band(top, a.linear([(0, lighten(grass, 0.18)), (0.25, grass), (1, darken(grass, 0.12))]), darken(grass, 0.45), 5)
    rng = random.Random(seed)
    xs = [p[0] for p in top]
    for _ in range(tufts):
        x = rng.uniform(min(xs), max(xs))
        ytop = _interp(top, x)
        y = rng.uniform(Y0, ytop - 30)
        _tuft(a, x, y, 16 + 10 * (1 - (y - Y0) / max(1.0, ytop - Y0)), darken(grass, 0.2))
    return a


def _interp(points: list[tuple[float, float]], x: float) -> float:
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / max(1e-6, x1 - x0)
    return points[-1][1]


def _tuft(a: Layer, x: float, y: float, s: float, colour: str) -> None:
    for dx, lean in ((-0.5, -0.5), (0, 0), (0.5, 0.5)):
        a.path(f"M {a.X(x + dx * s):.1f} {a.Y(y):.1f} q {lean * s:.1f} {-s:.1f} {lean * s * 1.6:.1f} {-s * 1.5:.1f}", None, colour, 4)


def reeds(seed: int, sides: tuple[str, ...] = ("left", "right"), colour: str = "#3f8a3c") -> Layer:
    a = Layer()
    rng = random.Random(seed)
    spans = {"left": (X0, 260), "right": (1660, X0 + LW), "all": (X0, X0 + LW)}
    for side in sides:
        lo, hi = spans[side]
        for _ in range(int((hi - lo) / 26)):
            x, h, lean = rng.uniform(lo, hi), rng.uniform(150, 330), rng.uniform(-60, 60)
            c = mix(colour, darken(colour, 0.3), rng.random())
            a.path(f"M {a.X(x):.1f} {a.Y(Y0 - 10):.1f} Q {a.X(x + lean * 0.3):.1f} {a.Y(Y0 + h * 0.6):.1f} {a.X(x + lean):.1f} {a.Y(Y0 + h):.1f}",
                   None, c, rng.uniform(8, 15))
    return a


def foliage(a: Layer, cx: float, cy: float, r: float, colour: str, seed: int, berries: str | None = None, n: int = 11) -> None:
    rng = random.Random(seed)
    o = darken(colour, 0.5)
    blobs = [(cx + rng.uniform(-r, r), cy + rng.uniform(-r * 0.55, r * 0.55), rng.uniform(0.38, 0.6) * r) for _ in range(n)]
    for x, y, rr in blobs:
        a.disc(x, y, rr, None, o, 9)
    for x, y, rr in blobs:
        a.disc(x, y, rr, mix(colour, lighten(colour, 0.22), rng.random()))
    for x, y, rr in blobs[::2]:
        a.disc(x - rr * 0.25, y + rr * 0.25, rr * 0.45, lighten(colour, 0.3), opacity=0.5)
    if berries:
        for _ in range(n):
            x, y = cx + rng.uniform(-r * 0.9, r * 0.9), cy + rng.uniform(-r * 0.5, r * 0.4)
            for dx, dy in ((0, 0), (13, -9), (-11, -11), (3, -22)):
                a.disc(x + dx, y + dy, 9, berries, darken(berries, 0.5), 2)
                a.disc(x + dx - 3, y + dy + 3, 2.5, "#ffffff", opacity=0.7)


def jamun_tree_trunk() -> Layer:
    """Trunk on the left bank with a long branch reaching out over the river."""
    a = Layer()
    bark, o = "#8a5a33", "#4a2c17"
    a.blob([(250, 150), (300, 420), (330, 700), (300, 1000), (420, 1000), (430, 720), (455, 600), (470, 420), (540, 150)], a.shaded(bark), o, 7)
    a.blob([(440, 540), (600, 520), (800, 512), (960, 520), (968, 494), (800, 472), (600, 468), (450, 470)], a.shaded(bark), o, 7)
    a.blob([(330, 760), (200, 880), (120, 1000), (170, 1010), (260, 900), (360, 820)], a.shaded(bark), o, 7)
    for y in (240, 330, 610, 820):
        a.path(f"M {a.X(330):.0f} {a.Y(y):.0f} q 40 -14 80 0", None, darken(bark, 0.3), 5)
    return a


def rock(a: Layer, points: list[tuple[float, float]], colour: str = "#8d8f98") -> None:
    a.blob(points, a.shaded(colour), darken(colour, 0.5), 7)


_RECTS: dict[str, list[float]] = {}


def _save(layer: Art, path: Path, scale: float = 1.0) -> None:
    """Render a layer and crop it to what is painted (vertically only for wide scrolling layers)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    im = layer.render(scale)
    box = im.getbbox() or (0, 0, im.width, im.height)
    if layer.w > LW:
        box = (0, box[1], im.width, box[3])
    pad = 2
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad))
    im.crop(box).save(path, optimize=True)
    _RECTS[path.stem] = [X0 + box[0] / scale, Y0 + LH - box[3] / scale, (box[2] - box[0]) / scale, (box[3] - box[1]) / scale]


def _layer(lid, ltype, order, parallax, cover=False, motion=None, extra_w=0, tint="background", cover_x=False):
    return {"id": lid, "type": ltype, "file": f"layers/{lid}.png", "rect": _RECTS[lid], "parallax": parallax,
            "order": order, "cover": cover, "cover_horizontal": cover_x, "motion": motion or [], "tint_group": tint}


def _scroll(speed: float) -> dict:
    return {"type": "scroll", "speed": speed, "amplitude": TILE}


def _manifest(eid, name, description, tags, aliases, layers, anchors, roles, habitats, ambience="river_ambience_001"):
    return {"id": eid, "asset_type": "environment", "name": name, "description": description, "tags": tags, "aliases": aliases,
            "stage": [1920, 1080], "camera_bounds": [X0, Y0, X0 + LW, Y0 + LH], "layers": layers, "anchors": anchors, "default_anchor_by_role": roles,
            "lighting_presets": ["day", "morning", "sunset", "night", "overcast"],
            "compatibility": {"habitats": habitats, "style": "premium_chibi_anime", "ambience": ambience}}


OFF_L, OFF_R = -430, 2350


# ---------------------------------------------------------- environments
def forest_river(out: Path) -> dict:
    """Riverbank with a jamun tree whose branch reaches over the water."""
    bank = [(X0, 330), (300, 322), (640, 300), (860, 250), (1010, 150), (1090, 20), (1130, -220)]
    drawings = {
        "sky": (sky("#6ec3f5", "#d9f2ff"), 0.5),
        "far_hills": (hills("#8ccf9a", 520, 60, 4), 0.5),
        "far_trees": (tree_line("#4f9a55", 430, 7), 1.0),
        "river": (water_body(400, "#7fd6e8", "#2f8fc4"), 0.5),
        "ripples_far": (ripples(250, 390, 11, 22, opacity=0.4), 1.0),
        "ripples_near": (ripples(40, 240, 12, 20, opacity=0.5), 1.0),
        "bank": (ground(bank, "#7cc35a", seed=5), 1.0),
        "tree": (jamun_tree_trunk(), 1.0),
        "water_front": (water_front(118, "#3b9fd0"), 0.5),
        "reeds": (reeds(21), 1.0),
    }
    back = Layer()
    foliage(back, 360, 930, 330, "#3f9447", 31, n=16)
    foliage(back, 760, 790, 210, "#4aa550", 32, berries="#4b2a78", n=10)
    drawings["canopy_back"] = (back, 1.0)
    for i, (cx, cy, r, seed) in enumerate(((250, 760, 150, 41), (640, 690, 120, 42), (930, 640, 105, 43))):
        leaf = Layer()
        foliage(leaf, cx, cy, r, "#57b35a", seed, berries="#4b2a78", n=8)
        drawings[f"leaves_{i}"] = (leaf, 1.0)
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)

    def sway(pivot, amp, period, phase):
        return [{"type": "sway", "amplitude": amp, "period": period, "phase": phase, "pivot": pivot, "wind_scaled": True}]

    layers = [
        _layer("sky", "background", 0, 0.12, cover=True),
        _layer("far_hills", "far", 1, 0.3),
        _layer("far_trees", "middle", 2, 0.55),
        _layer("river", "middle", 10, 1.0, cover_x=True),
        _layer("ripples_far", "middle", 12, 1.0, motion=[_scroll(26)], extra_w=TILE),
        _layer("ripples_near", "middle", 14, 1.0, motion=[_scroll(-38), {"type": "bob", "amplitude": 3, "period": 3.2}], extra_w=TILE),
        _layer("bank", "middle", 40, 1.0),
        _layer("canopy_back", "middle", 50, 1.0, motion=sway([420, 700], 0.6, 5.5, 0.0)),
        _layer("tree", "middle", 60, 1.0),
        _layer("leaves_0", "middle", 70, 1.0, motion=sway([330, 820], 1.6, 3.6, 0.4)),
        _layer("leaves_1", "middle", 71, 1.0, motion=sway([600, 560], 2.0, 3.1, 1.7)),
        _layer("leaves_2", "middle", 72, 1.0, motion=sway([900, 540], 2.4, 2.8, 2.9)),
        _layer("water_front", "foreground", 130, 1.0, motion=[{"type": "bob", "amplitude": 4, "period": 2.6}]),
        _layer("reeds", "foreground", 800, 1.3, motion=sway([960, -200], 0.8, 4.2, 0.0)),
    ]
    water = ["water"]
    anchors = {
        "tree_branch": {"x": 760, "y": 512, "order": 100, "features": ["tree", "seat"], "description": "on the branch over the river"},
        "riverbank": {"x": 560, "y": 300, "order": 100, "features": ["ground"], "description": "grass beside the tree"},
        "river_near": {"x": 1330, "y": 58, "order": 120, "features": water, "description": "in the water below the branch"},
        "river_far": {"x": 1720, "y": 66, "order": 119, "scale": 0.9, "features": water},
        "offstage_river_right": {"x": OFF_R, "y": 58, "order": 120, "features": ["offstage", *water]},
        "offstage_bank_left": {"x": OFF_L, "y": 310, "order": 100, "features": ["offstage", "ground"]},
    }
    return _manifest("forest_river_001", "Riverbank with a jamun tree",
                     "A sunny riverbank at the edge of a forest. A large jamun tree leans over the water.",
                     ["river", "tree", "jamun", "forest"], ["नदी किनारा", "जामुन का पेड़", "riverbank", "jamun tree"], layers, anchors,
                     {"arboreal": ["tree_branch"], "aquatic": ["river_near", "river_far"], "ground": ["riverbank"]},
                     ["arboreal", "aquatic", "ground"])


def river_open(out: Path) -> dict:
    """The middle of a wide river, both banks far away."""
    drawings = {
        "sky": (sky("#62b8f0", "#dff4ff", sun=(420, 930), seed=5), 0.5),
        "far_hills": (hills("#93d2a4", 640, 46, 9), 0.5),
        "far_bank": (tree_line("#4c9a58", 560, 17, height=120), 1.0),
        "river": (water_body(545, "#86dcec", "#2a86be"), 0.5),
        "ripples_far": (ripples(330, 530, 51, 30, opacity=0.4), 1.0),
        "ripples_near": (ripples(30, 320, 52, 26, opacity=0.5), 1.0),
        "water_front": (water_front(205, "#3b9fd0"), 0.5),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True),
        _layer("far_hills", "far", 1, 0.28),
        _layer("far_bank", "middle", 2, 0.5),
        _layer("river", "middle", 10, 1.0, cover_x=True),
        _layer("ripples_far", "middle", 12, 1.0, motion=[_scroll(34)], extra_w=TILE),
        _layer("ripples_near", "middle", 14, 1.0, motion=[_scroll(-52), {"type": "bob", "amplitude": 4, "period": 3.0}], extra_w=TILE),
        _layer("water_front", "foreground", 130, 1.0, motion=[{"type": "bob", "amplitude": 5, "period": 2.4}]),
    ]
    anchors = {
        "river_mid": {"x": 960, "y": 140, "order": 120, "features": ["water", "mid_water"]},
        "river_mid_far": {"x": 1500, "y": 150, "order": 119, "scale": 0.9, "features": ["water"]},
        "offstage_left": {"x": OFF_L, "y": 140, "order": 120, "features": ["offstage", "water"]},
        "offstage_right": {"x": OFF_R, "y": 140, "order": 120, "features": ["offstage", "water"]},
    }
    return _manifest("river_open_001", "Middle of the river", "Open water in the middle of a wide river; the banks are far away.",
                     ["river", "river_mid"], ["नदी के बीच", "mid river"], layers, anchors,
                     {"aquatic": ["river_mid", "river_mid_far"]}, ["aquatic"])


def crocodile_home(out: Path) -> dict:
    """A rocky cave on the far side of the river where the crocodiles live."""
    rocks = Layer()
    rock(rocks, [(520, 300), (470, 560), (620, 820), (900, 900), (1250, 880), (1480, 700), (1520, 420), (1440, 300)], "#8b8fa0")
    rocks.blob([(700, 300), (690, 520), (800, 690), (1000, 730), (1210, 680), (1300, 520), (1290, 300)], "#2a2f45", "#1d2133", 7)
    rock(rocks, [(1500, 290), (1520, 440), (1640, 520), (1790, 470), (1830, 290)], "#9a9eae")
    rock(rocks, [(190, 290), (170, 420), (290, 500), (420, 430), (450, 290)], "#9a9eae")
    foliage(rocks, 980, 930, 240, "#3f9447", 61, n=12)
    foliage(rocks, 320, 520, 90, "#57b35a", 62, n=6)
    shore = [(X0, 318), (300, 310), (900, 300), (1500, 312), (X0 + LW, 320)]
    drawings = {
        "sky": (sky("#f7b267", "#ffe9c2", sun=(1650, 760), clouds=4, seed=8), 0.5),
        "far_hills": (hills("#b89ac2", 560, 70, 14), 0.5),
        "far_trees": (tree_line("#5b8f5e", 440, 27), 1.0),
        "shore": (ground(shore, "#86b85c", soil="#7d6a4f", tufts=10, seed=9), 1.0),
        "cave": (rocks, 1.0),
        "river": (water_body(300, "#7fd0de", "#2b7fb3"), 0.5),
        "ripples_near": (ripples(30, 280, 71, 24, opacity=0.5), 1.0),
        "water_front": (water_front(150, "#3792c4"), 0.5),
        "reeds": (reeds(81, ("left", "right"), "#4c8f45"), 1.0),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True),
        _layer("far_hills", "far", 1, 0.3),
        _layer("far_trees", "middle", 2, 0.55),
        _layer("shore", "middle", 8, 1.0, cover_x=True),
        _layer("cave", "middle", 9, 1.0),
        _layer("river", "middle", 10, 1.0),
        _layer("ripples_near", "middle", 14, 1.0, motion=[_scroll(-30), {"type": "bob", "amplitude": 3, "period": 3.4}], extra_w=TILE),
        _layer("water_front", "foreground", 130, 1.0, motion=[{"type": "bob", "amplitude": 4, "period": 2.8}]),
        _layer("reeds", "foreground", 800, 1.3, motion=[{"type": "sway", "amplitude": 0.8, "period": 4.4, "pivot": [960, -200], "wind_scaled": True}]),
    ]
    anchors = {
        "home_left": {"x": 660, "y": 88, "order": 120, "features": ["water", "home"]},
        "home_right": {"x": 1340, "y": 88, "order": 121, "features": ["water", "home"]},
        "offstage_left": {"x": OFF_L, "y": 88, "order": 120, "features": ["offstage", "water"]},
        "offstage_right": {"x": OFF_R, "y": 88, "order": 120, "features": ["offstage", "water"]},
    }
    return _manifest("crocodile_home_001", "Crocodile home", "A cave among rocks on the riverside at dusk: the crocodiles' home.",
                     ["home", "cave", "river"], ["मगरमच्छ का घर", "crocodile home"], layers, anchors,
                     {"aquatic": ["home_left", "home_right"]}, ["aquatic"])


def big_tree(a: Layer, x: float, base: float, height: float, seed: int, colour: str = "#3f9447") -> None:
    bark = "#8a5a33"
    a.blob([(x - 60, base), (x - 34, base + height * 0.5), (x - 40, base + height), (x + 40, base + height), (x + 34, base + height * 0.5), (x + 70, base)],
           a.shaded(bark), "#4a2c17", 7)
    foliage(a, x, base + height + 110, 250, colour, seed, n=14)


def stone_ring(a: Layer, cx: float, base: float, width: float, height: float, front: bool, liquid: str | None = None,
               stone: str = "#a9a59c") -> None:
    """A round wall (well or vat) drawn in two halves so a character can drop in between them."""
    o = darken(stone, 0.5)
    rx, ry = width / 2, width * 0.16
    top = base + height
    if not front:
        a.disc(cx, top, rx, a.shaded(darken(stone, 0.18)), o, 7, ry=ry)                  # the far rim
        a.disc(cx, top - 6, rx - 26, liquid or "#1f2a3a", None, ry=ry - 12)               # what is inside
    else:
        a.blob([(cx - rx, top), (cx - rx, base + 14), (cx - rx * 0.6, base - ry * 0.7), (cx, base - ry), (cx + rx * 0.6, base - ry * 0.7),
                (cx + rx, base + 14), (cx + rx, top), (cx + rx * 0.6, top - ry * 0.8), (cx, top - ry), (cx - rx * 0.6, top - ry * 0.8)],
               a.shaded(stone), o, 7)
        for row in range(1, int(height // 46)):
            y = base + row * 46
            a.path(f"M {a.X(cx - rx + 8):.0f} {a.Y(y):.0f} Q {a.X(cx):.0f} {a.Y(y - ry * 1.6):.0f} {a.X(cx + rx - 8):.0f} {a.Y(y):.0f}", None, darken(stone, 0.25), 4)


def hut(a: Layer, x: float, base: float, w: float, h: float, wall: str = "#e8c79a", roof: str = "#b9783c", door: bool = True) -> None:
    a.rect(a.X(x - w / 2), a.Y(base + h), w, h, a.shaded(wall), darken(wall, 0.5), 6, rx=8)
    a.poly([(a.X(x - w / 2 - 40), a.Y(base + h - 6)), (a.X(x), a.Y(base + h + h * 0.62)), (a.X(x + w / 2 + 40), a.Y(base + h - 6))], a.shaded(roof), darken(roof, 0.5), 7)
    for i in range(1, 5):
        a.path(f"M {a.X(x - w / 2 - 40 + i * 30):.0f} {a.Y(base + h + i * 8):.0f} L {a.X(x):.0f} {a.Y(base + h + h * 0.6):.0f}", None, darken(roof, 0.25), 3, 0.6)
    if door:
        a.rect(a.X(x - w * 0.12), a.Y(base + h * 0.62), w * 0.24, h * 0.62, "#6b4226", "#3b2414", 5, rx=6)
    a.rect(a.X(x + w * 0.22), a.Y(base + h * 0.7), w * 0.16, h * 0.22, "#5b7fa6", "#3b2414", 5, rx=4)


def flat_ground(grass: str, top: float = 330, seed: int = 3, soil: str = "#8a6238", tufts: int = 60) -> Layer:
    return ground([(x, top + 10 * math.sin(x / 260)) for x in range(X0, X0 + LW + 1, 80)], grass, soil, tufts, seed)


def _ground_anchors(names: dict[str, tuple[float, float, list[str]]], y: float = 215) -> dict:
    out = {name: {"x": x, "y": yy, "order": 100, "features": feats} for name, (x, yy, feats) in names.items()}
    out["offstage_left"] = {"x": OFF_L, "y": y, "order": 100, "features": ["offstage", "ground"]}
    out["offstage_right"] = {"x": OFF_R, "y": y, "order": 100, "features": ["offstage", "ground"]}
    return out


def forest_well(out: Path) -> dict:
    """A forest clearing with a rocky den on the left and an old stone well on the right."""
    den = Layer()
    rock(den, [(-80, 300), (-120, 560), (40, 760), (300, 800), (520, 640), (560, 300)], "#8f8a80")
    den.blob([(120, 300), (110, 480), (200, 610), (330, 610), (410, 480), (400, 300)], "#2c2620", "#1c1814", 7)
    trees = Layer()
    big_tree(trees, 820, 300, 330, 71)
    big_tree(trees, 2050, 300, 380, 72, "#4aa550")
    back, front = Layer(), Layer()
    stone_ring(back, 1500, 190, 330, 170, False, "#3e7fa8")
    stone_ring(front, 1500, 190, 330, 170, True)
    posts = Layer()
    for x in (1360, 1640):
        posts.rect(posts.X(x - 12), posts.Y(620), 24, 270, "#7a5230", "#3b2414", 5, rx=5)
    posts.rect(posts.X(1340), posts.Y(640), 320, 28, "#8a5a33", "#3b2414", 5, rx=8)
    drawings = {
        "sky": (sky("#74c6f2", "#e3f6ff", sun=(1250, 940), seed=12), 0.5),
        "far_hills": (hills("#9fd3a6", 560, 70, 31), 0.5),
        "far_trees": (tree_line("#4f9a55", 440, 33, height=230), 1.0),
        "ground": (flat_ground("#84c463", 330, 34), 1.0),
        "den": (den, 1.0), "trees": (trees, 1.0), "well_posts": (posts, 1.0), "well_back": (back, 1.0), "well_front": (front, 1.0),
        "bushes": (reeds(35, ("left", "right"), "#3f8a3c"), 1.0),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    sway = [{"type": "sway", "amplitude": 0.7, "period": 5.0, "pivot": [1400, 300], "wind_scaled": True}]
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True), _layer("far_hills", "far", 1, 0.3), _layer("far_trees", "middle", 2, 0.55),
        _layer("ground", "middle", 10, 1.0, cover_x=True), _layer("den", "middle", 30, 1.0), _layer("trees", "middle", 40, 1.0, motion=sway),
        _layer("well_posts", "middle", 60, 1.0), _layer("well_back", "middle", 62, 1.0),
        _layer("well_front", "foreground", 130, 1.0),
        _layer("bushes", "foreground", 800, 1.3, motion=[{"type": "sway", "amplitude": 0.8, "period": 4.0, "pivot": [960, -200], "wind_scaled": True}]),
    ]
    anchors = _ground_anchors({
        "den": (430, 225, ["ground", "cave"]), "clearing": (900, 205, ["ground"]),
        "well_side_left": (1150, 200, ["ground", "well_side"]), "well_side_far": (1850, 215, ["ground", "well_side"]),
    })
    anchors["well"] = {"x": 1500, "y": 150, "order": 110, "features": ["well", "pit"], "description": "inside the well, behind its front wall"}
    return _manifest("forest_well_001", "Forest clearing with an old well", "A sunny clearing deep in the forest: a rocky den, tall trees and a stone well.",
                     ["forest", "well", "cave"], ["जंगल", "कुआँ", "forest clearing", "well"], layers, anchors,
                     {"ground": ["den", "clearing", "well_side_left"]}, ["ground"], ambience="forest_ambience_001")


def village(out: Path) -> dict:
    """A village lane with huts and a dyer's vat of indigo."""
    huts = Layer()
    hut(huts, 300, 320, 420, 300)
    hut(huts, 960, 330, 380, 270, "#efd6ae", "#a8662e")
    hut(huts, 1980, 320, 440, 310, "#e2bd8c")
    line = Layer()
    for x in (1150, 1420):
        line.rect(line.X(x - 8), line.Y(640), 16, 330, "#7a5230", "#3b2414", 4, rx=4)
    line.path(f"M {line.X(1150):.0f} {line.Y(630):.0f} Q {line.X(1285):.0f} {line.Y(590):.0f} {line.X(1420):.0f} {line.Y(630):.0f}", None, "#5a4630", 4)
    for x, c in ((1200, "#3f6fd8"), (1270, "#e8eef8"), (1345, "#3f6fd8")):
        line.rect(line.X(x - 26), line.Y(612), 52, 120, c, darken(c, 0.5), 4, rx=4)
    back, front = Layer(), Layer()
    stone_ring(back, 1560, 185, 360, 150, False, "#2f5fd0", stone="#b98a5a")
    stone_ring(front, 1560, 185, 360, 150, True, stone="#b98a5a")
    front.path(f"M {front.X(1420):.0f} {front.Y(330):.0f} q 10 40 0 70", None, "#2f5fd0", 9)          # a drip of dye
    drawings = {
        "sky": (sky("#7fc8f0", "#fde9c9", sun=(300, 900), seed=21), 0.5),
        "far_hills": (hills("#b7d9a4", 540, 50, 41), 0.5),
        "far_trees": (tree_line("#5a9a58", 430, 43, height=170), 1.0),
        "ground": (flat_ground("#d9b98a", 330, 44, soil="#a8845a", tufts=14), 1.0),
        "huts": (huts, 1.0), "clothes_line": (line, 1.0), "vat_back": (back, 1.0), "vat_front": (front, 1.0),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True), _layer("far_hills", "far", 1, 0.3), _layer("far_trees", "middle", 2, 0.55),
        _layer("ground", "middle", 10, 1.0, cover_x=True), _layer("huts", "middle", 30, 1.0), _layer("clothes_line", "middle", 40, 1.0),
        _layer("vat_back", "middle", 62, 1.0), _layer("vat_front", "foreground", 130, 1.0),
    ]
    anchors = _ground_anchors({"lane": (640, 205, ["ground"]), "lane_far": (1050, 215, ["ground"]), "vat_side": (1180, 200, ["ground", "vat_side"])})
    anchors["vat"] = {"x": 1560, "y": 150, "order": 110, "features": ["vat", "pit"], "description": "inside the dye vat"}
    return _manifest("village_001", "Village lane with a dyer's vat", "A quiet village lane: mud huts, washing on a line and a big vat of indigo dye.",
                     ["village", "home", "market"], ["गाँव", "village"], layers, anchors, {"ground": ["lane", "vat_side", "lane_far"]}, ["ground"],
                     ambience="forest_ambience_001")


def farm_field(out: Path) -> dict:
    """Ploughed fields at the edge of a village."""
    field = Layer()
    field.band([(x, 330 + 8 * math.sin(x / 300)) for x in range(X0, X0 + LW + 1, 80)], field.linear([(0, "#b98a52"), (1, "#8a6238")]), "#5a3d18", 5)
    for i in range(9):
        y = 300 - i * 34
        field.path(f"M {field.X(X0):.0f} {field.Y(y):.0f} Q {field.X(960):.0f} {field.Y(y - 26):.0f} {field.X(X0 + LW):.0f} {field.Y(y):.0f}", None, "#6f4c22", 5, 0.55)
    rng = random.Random(55)
    for _ in range(90):
        _tuft(field, rng.uniform(X0, X0 + LW), rng.uniform(-150, 290), 22, "#5fae4e")
    far = Layer()
    hut(far, 1650, 420, 260, 190)
    hut(far, 1980, 425, 220, 170, "#efd6ae", "#a8662e")
    big_tree(far, 380, 400, 300, 56)
    crow = Layer()
    crow.rect(crow.X(1240), crow.Y(600), 18, 300, "#7a5230", "#3b2414", 4)
    crow.rect(crow.X(1150), crow.Y(540), 200, 16, "#7a5230", "#3b2414", 4)
    crow.rect(crow.X(1195), crow.Y(545), 110, 140, "#c0392b", "#6a1f16", 5, rx=10)
    crow.disc(1249, 640, 44, "#f2d9a0", "#7a5a2a", 5)
    crow.poly([(crow.X(1195), crow.Y(672)), (crow.X(1249), crow.Y(740)), (crow.X(1303), crow.Y(672))], "#d8a23a", "#7a5a2a", 5)
    drawings = {
        "sky": (sky("#7ecbf5", "#e9f8ff", sun=(1500, 920), seed=31), 0.5),
        "far_hills": (hills("#a8d79f", 560, 60, 51), 0.5),
        "far_trees": (tree_line("#5a9f5a", 450, 53, height=150), 1.0),
        "village_edge": (far, 1.0), "field": (field, 1.0), "scarecrow": (crow, 1.0),
        "crops": (reeds(57, ("left", "right"), "#6fae3f"), 1.0),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True), _layer("far_hills", "far", 1, 0.3), _layer("far_trees", "middle", 2, 0.55),
        _layer("village_edge", "middle", 6, 0.8), _layer("field", "middle", 10, 1.0, cover_x=True),
        _layer("scarecrow", "middle", 40, 1.0, motion=[{"type": "sway", "amplitude": 1.2, "period": 3.4, "pivot": [1249, 300], "wind_scaled": True}]),
        _layer("crops", "foreground", 800, 1.3, motion=[{"type": "sway", "amplitude": 1.0, "period": 3.6, "pivot": [960, -200], "wind_scaled": True}]),
    ]
    anchors = _ground_anchors({"field_middle": (820, 210, ["ground", "field"]), "field_right": (1500, 215, ["ground"])})
    return _manifest("farm_field_001", "Farm field", "Ploughed fields with a scarecrow at the edge of a village.", ["field", "village"],
                     ["खेत", "field", "farm"], layers, anchors, {"ground": ["field_middle", "field_right"]}, ["ground"], ambience="forest_ambience_001")


def mansion(out: Path) -> dict:
    """The courtyard of a rich man's haveli."""
    house = Layer()
    wall, o = "#f3dcb0", "#7a5a2a"
    house.rect(house.X(120), house.Y(1010), 1680, 700, house.shaded(wall), o, 7, rx=10)
    house.rect(house.X(60), house.Y(1060), 1800, 70, house.shaded("#c0392b"), "#6a1f16", 7, rx=12)
    for x in range(170, 1800, 96):
        house.poly([(house.X(x), house.Y(1060)), (house.X(x + 30), house.Y(1110)), (house.X(x + 60), house.Y(1060))], "#d8a23a", "#7a5a2a", 4)
    for x in (300, 620, 1300, 1620):                                  # arched windows
        house.blob([(x - 60, 620), (x - 60, 800), (x, 880), (x + 60, 800), (x + 60, 620)], "#5b7fa6", o, 6)
        house.path(f"M {house.X(x):.0f} {house.Y(880):.0f} L {house.X(x):.0f} {house.Y(620):.0f}", None, o, 5)
    house.blob([(830, 310), (830, 700), (960, 820), (1090, 700), (1090, 310)], "#6b4226", "#3b2414", 7)      # the great door
    house.disc(1050, 520, 12, "#ffd84a", "#7a5a2a", 3)
    pillars = Layer()
    for x in (700, 1220):
        pillars.rect(pillars.X(x - 34), pillars.Y(900), 68, 600, pillars.shaded("#fbeed2"), o, 6, rx=10)
        pillars.rect(pillars.X(x - 52), pillars.Y(930), 104, 44, "#e6c98f", o, 5, rx=8)
        pillars.rect(pillars.X(x - 52), pillars.Y(330), 104, 40, "#e6c98f", o, 5, rx=8)
    floor = Layer()
    floor.band([(X0, 320), (X0 + LW, 320)], floor.linear([(0, "#e9d2a6"), (1, "#c9a877")]), o, 5)
    for i in range(1, 7):
        y = 320 - i * 70
        floor.path(f"M {floor.X(X0):.0f} {floor.Y(y):.0f} L {floor.X(X0 + LW):.0f} {floor.Y(y):.0f}", None, "#b0905e", 3, 0.6)
    pots = Layer()
    for x in (130, 1790):
        pots.blob([(x - 70, -60), (x - 90, 110), (x - 50, 190), (x + 50, 190), (x + 90, 110), (x + 70, -60)], pots.shaded("#b9623a"), "#5a2c16", 6)
        foliage(pots, x, 300, 120, "#3f9447", 60 + x, n=7)
    drawings = {
        "sky": (sky("#86cdf5", "#f3fbff", sun=None, clouds=5, seed=41), 0.5),
        "garden": (tree_line("#5a9f5a", 520, 61, height=260), 1.0),
        "house": (house, 1.0), "floor": (floor, 1.0), "pillars": (pillars, 1.0), "pots": (pots, 1.0),
    }
    for name, (art, scale) in drawings.items():
        _save(art, out / "layers" / f"{name}.png", scale)
    layers = [
        _layer("sky", "background", 0, 0.12, cover=True), _layer("garden", "middle", 2, 0.6), _layer("house", "middle", 6, 0.92),
        _layer("floor", "middle", 10, 1.0, cover_x=True), _layer("pillars", "middle", 30, 1.0),
        _layer("pots", "foreground", 800, 1.25, motion=[{"type": "sway", "amplitude": 0.5, "period": 4.5, "pivot": [960, -200], "wind_scaled": True}]),
    ]
    anchors = _ground_anchors({"doorway": (1080, 215, ["ground", "home"]), "courtyard": (700, 205, ["ground"]), "courtyard_far": (1450, 215, ["ground"])})
    return _manifest("mansion_001", "Courtyard of a haveli", "The paved courtyard of a wealthy landlord's house.", ["mansion", "home"],
                     ["हवेली", "mansion", "haveli"], layers, anchors, {"ground": ["doorway", "courtyard", "courtyard_far"]}, ["ground"],
                     ambience="forest_ambience_001")


ENVIRONMENTS = [forest_river, river_open, crocodile_home, forest_well, village, farm_field, mansion]
