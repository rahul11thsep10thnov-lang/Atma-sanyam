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


ENVIRONMENTS = [forest_river, river_open, crocodile_home]
