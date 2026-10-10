"""The museum wall: one bay of a white, carved, curved gallery, rendered as a
phone-sized plate. The jigsaw hangs in the square niche in the middle; the
app draws it there (its rectangle is written to walls.json).

A bay: a square niche with an egg-and-dart frame and rosette corners, a
carved cartouche with a shell and garlands above it, an acanthus frieze and
dentil cornice, fluted columns either side, carved dado panels, and in
front of each column a marble pedestal with a glass vitrine holding an
artefact. A rope barrier in front of the niche, an alarm unit on the wall.
Everything is built flat (wall at y = 0, room at y < 0) and then bent onto
a circle, so the gallery is curved.

    python render_museum.py [--samples 96] [--scale 1.0] [--only a,b,c] [--out DIR]

Carvings are relief geometry made from height maps drawn here with numpy.
"""
import argparse, json, math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection, box, cylinder
from focusbalcony.nodes import Tree
from focusbalcony.scene import configure_render

ap = argparse.ArgumentParser()
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--scale", type=float, default=1.0, help="resolution scale (0.33 for previews)")
ap.add_argument("--only", default="")
ap.add_argument("--out", default="")
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(args.out) if args.out else ROOT / "assets" / "museum"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 2340
R = 5.0              # radius of the gallery wall (metres)
NICHE = (0.70, 1.15, 2.55)   # half width, bottom, top
COL_X = 1.10
VIT_X, VIT_Y = 1.13, -0.85

VARIANTS = {
    "a": ("amphora", "bust"),
    "b": ("bust", "urn"),
    "c": ("urn", "amphora"),
}

# ---------------------------------------------------------------------------
# height maps


class HM:
    def __init__(self, w, h):
        self.a = np.zeros((h, w), np.float32)
        self.w, self.h = w, h

    def dome(self, cx, cy, r, h=1.0, sharp=0.5):
        if r <= 0.4:
            return
        x0, x1 = max(0, int(cx - r - 1)), min(self.w, int(cx + r + 2))
        y0, y1 = max(0, int(cy - r - 1)), min(self.h, int(cy + r + 2))
        if x0 >= x1 or y0 >= y1:
            return
        ys, xs = np.mgrid[y0:y1, x0:x1]
        d2 = ((xs - cx) ** 2 + (ys - cy) ** 2) / (r * r)
        v = h * np.clip(1 - d2, 0, 1) ** sharp
        win = self.a[y0:y1, x0:x1]
        np.maximum(win, v, out=win)

    def ellipse(self, cx, cy, rx, ry, h=1.0, sharp=0.5):
        x0, x1 = max(0, int(cx - rx - 1)), min(self.w, int(cx + rx + 2))
        y0, y1 = max(0, int(cy - ry - 1)), min(self.h, int(cy + ry + 2))
        ys, xs = np.mgrid[y0:y1, x0:x1]
        d2 = ((xs - cx) / rx) ** 2 + ((ys - cy) / ry) ** 2
        v = h * np.clip(1 - d2, 0, 1) ** sharp
        win = self.a[y0:y1, x0:x1]
        np.maximum(win, v, out=win)

    def stroke(self, pts, r0, r1=None, h0=1.0, h1=None):
        r1 = r0 if r1 is None else r1
        h1 = h0 if h1 is None else h1
        pts = np.asarray(pts, float)
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        L = seg.sum()
        if L == 0:
            return
        cum = np.concatenate([[0], np.cumsum(seg)])
        s = 0.0
        while s <= L:
            t = s / L
            r = r0 + (r1 - r0) * t
            i = min(len(seg) - 1, np.searchsorted(cum, s, side="right") - 1)
            f = (s - cum[i]) / seg[i] if seg[i] else 0
            p = pts[i] + (pts[i + 1] - pts[i]) * f
            self.dome(p[0], p[1], r, h0 + (h1 - h0) * t)
            s += max(0.8, r * 0.3)

    def spiral(self, cx, cy, r, turns, a0, direction, w0, w1, h=1.0):
        n = int(60 * turns) + 2
        t = np.linspace(0, 1, n)
        ang = a0 + direction * t * turns * 2 * math.pi
        rad = r * (1 - 0.82 * t)
        pts = np.stack([cx + rad * np.cos(ang), cy + rad * np.sin(ang)], 1)
        self.stroke(pts, w0, w1, h, h * 0.85)
        self.dome(pts[-1][0], pts[-1][1], w1 * 1.8, h)

    def leaf(self, x, y, angle, length, width, h=0.8, curl=0.25, lobes=5):
        d = np.array([math.cos(angle), math.sin(angle)])
        n = np.array([-d[1], d[0]])
        steps = max(8, int(length / 2))
        for k in range(steps + 1):
            s = k / steps
            c = np.array([x, y]) + d * length * s + n * curl * length * s * s
            wv = width * math.sin(math.pi * min(1, s * 1.08)) ** 0.75 * (0.72 + 0.28 * abs(math.sin(lobes * math.pi * s)))
            self.dome(c[0], c[1], max(1.0, wv), h * (0.55 + 0.45 * math.sin(math.pi * s)))
            self.dome(c[0], c[1], max(1.0, width * 0.16), h * (0.62 + 0.45 * math.sin(math.pi * s)))

    def rosette(self, cx, cy, r, h=1.0, petals=8):
        for i in range(petals):
            a = i * 2 * math.pi / petals
            self.leaf(cx, cy, a, r, r * 0.42, h * 0.8, curl=0.0, lobes=3)
        self.dome(cx, cy, r * 0.3, h)

    def blur(self, sigma=1.5):
        k = int(sigma * 3)
        x = np.arange(-k, k + 1)
        g = np.exp(-x * x / (2 * sigma * sigma))
        g /= g.sum()
        a = np.apply_along_axis(lambda m: np.convolve(m, g, "same"), 1, self.a)
        self.a = np.apply_along_axis(lambda m: np.convolve(m, g, "same"), 0, a).astype(np.float32)
        return self


def frieze_map(w=2400, h=280, period=600):
    m = HM(w, h)
    mid, amp = h / 2, h * 0.2
    xs = np.arange(-period, w + period, 2.0)
    m.stroke(np.stack([xs, mid + amp * np.sin(2 * math.pi * xs / period)], 1), 8, 8, 0.6)
    for k in range(-1, w // period + 2):
        for half, sgn in ((0.25, 1), (0.75, -1)):
            x0 = k * period + half * period
            y0 = mid + sgn * amp
            cx, cy = x0 + period * 0.2, mid - sgn * h * 0.12
            # branch from the stem into a spiral, ending in a flower
            m.stroke([(x0 - period * 0.1, mid + sgn * amp * 0.9), (x0 + period * 0.02, mid - sgn * h * 0.05), (cx - 40, cy - sgn * 30)], 6, 5, 0.55)
            m.spiral(cx, cy, h * 0.22, 1.4, math.pi * (1.0 if sgn > 0 else 0.0), sgn, 5, 3, 0.6)
            m.rosette(cx, cy, 16, 0.75, 6)
            # acanthus leaves along the stem
            for j, (dx, ang) in enumerate(((-0.18, -0.5), (0.05, 0.35), (0.12, -0.9))):
                lx = x0 + dx * period
                m.leaf(lx, mid + sgn * amp * math.cos(2 * math.pi * dx), ang * sgn + (math.pi if j == 2 else 0), period * 0.16, h * 0.08, 0.5, curl=0.35 * sgn)
            m.leaf(cx - 10, cy + sgn * 20, -sgn * 0.3 + math.pi * 0.5 * sgn, period * 0.12, h * 0.07, 0.48, curl=-0.4)
    # beaded and filleted borders
    for x in range(0, w, 22):
        m.dome(x + 11, 13, 9, 0.7)
        m.dome(x + 11, h - 13, 9, 0.7)
    m.stroke([(0, 28), (w, 28)], 4, 4, 0.45)
    m.stroke([(0, h - 28), (w, h - 28)], 4, 4, 0.45)
    return m.blur(1.3).a


def cartouche_map(w=1300, h=700):
    m = HM(w, h)
    cx, cy = w / 2, h * 0.56
    rx, ry = 150, 200
    # the field and its rims
    t = np.linspace(0, 2 * math.pi, 400)
    m.ellipse(cx, cy, rx, ry, 0.38, sharp=0.25)
    m.stroke(np.stack([cx + rx * np.cos(t), cy + ry * np.sin(t)], 1), 15, 15, 0.85)
    m.stroke(np.stack([cx + (rx - 26) * np.cos(t), cy + (ry - 26) * np.sin(t)], 1), 5, 5, 0.6)
    # the shell above
    sx, sy = cx, cy - ry - 10
    for a in np.linspace(-math.pi * 0.92, -math.pi * 0.08, 13):
        m.stroke([(sx, sy), (sx + 125 * math.cos(a), sy + 105 * math.sin(a))], 10, 5, 0.75, 0.6)
    t = np.linspace(-math.pi, 0, 120)
    m.stroke(np.stack([sx + 132 * np.cos(t), sy + 112 * np.sin(t)], 1), 7, 7, 0.7)
    # C-scrolls at the sides, curling outwards
    for sgn in (-1, 1):
        m.spiral(cx + sgn * (rx + 55), cy - ry * 0.45, 48, 1.3, 0 if sgn < 0 else math.pi, -sgn, 13, 6, 0.85)
        m.spiral(cx + sgn * (rx + 40), cy + ry * 0.62, 40, 1.2, 0 if sgn < 0 else math.pi, sgn, 11, 5, 0.8)
        m.stroke([(cx + sgn * (rx + 8), cy - ry * 0.3), (cx + sgn * (rx + 30), cy), (cx + sgn * (rx + 14), cy + ry * 0.45)], 11, 9, 0.75)
        # garland: a swag of leaves and fruit from the scroll outwards, and a hanging tail
        xs = np.linspace(cx + sgn * (rx + 95), cx + sgn * (w / 2 - 40), 26)
        u = (xs - xs[0]) / (xs[-1] - xs[0])
        ys = cy - ry * 0.55 + 140 * np.sin(math.pi * u) ** 1.3 - 40 * u
        for i, (x, y) in enumerate(zip(xs, ys)):
            rr = 26 * (0.65 + 0.35 * math.sin(math.pi * u[i]))
            m.dome(x, y, rr, 0.7, 0.6)
            m.leaf(x, y, -math.pi / 2 + sgn * 0.8 * (i % 2 * 2 - 1), rr * 1.5, rr * 0.5, 0.62, curl=0.3)
        m.stroke([(xs[-1], ys[-1]), (xs[-1] + sgn * 6, ys[-1] + 120)], 8, 5, 0.55)
        for k in range(4):
            m.leaf(xs[-1] + sgn * 4, ys[-1] + 30 + k * 26, math.pi / 2 + sgn * (0.6 if k % 2 else -0.6), 34, 11, 0.55, 0.2)
    # acanthus at the foot
    for a in (-2.2, -1.75, -1.4):
        for sgn in (-1, 1):
            m.leaf(cx + sgn * 20, cy + ry - 10, math.pi - a if sgn < 0 else a, 120, 30, 0.7, curl=0.35 * sgn)
    m.leaf(cx, cy + ry - 5, math.pi / 2, 70, 28, 0.75, curl=0)
    return m.blur(1.4).a


def capital_map(w=400, h=300):
    m = HM(w, h)
    for x in (70, 200, 330):
        m.leaf(x, h - 5, -math.pi / 2, 160, 42, 0.8, curl=0.18 * (1 if x > 200 else -1 if x < 200 else 0), lobes=7)
    for x in (135, 265):
        m.leaf(x, h - 60, -math.pi / 2, 150, 36, 0.9, curl=0.2 * (1 if x > 200 else -1), lobes=7)
    for sgn, x in ((-1, 52), (1, 348)):
        m.spiral(x, 62, 40, 1.4, 0 if sgn > 0 else math.pi, sgn, 10, 5, 1.0)
        m.stroke([(200, 45), (x, 30)], 8, 9, 0.85)
    m.rosette(200, 55, 26, 0.95, 6)
    return m.blur(1.0).a


def rosette_map(s=220):
    m = HM(s, s)
    m.rosette(s / 2, s / 2, s * 0.42, 1.0, 8)
    m.rosette(s / 2, s / 2, s * 0.22, 1.1, 8)
    t = np.linspace(0, 2 * math.pi, 200)
    m.stroke(np.stack([s / 2 + s * 0.47 * np.cos(t), s / 2 + s * 0.47 * np.sin(t)], 1), 3, 3, 0.5)
    return m.blur(1.0).a


def eggdart_map(length=1600, h=64):
    m = HM(length, h)
    for x in range(0, length, 40):
        m.ellipse(x + 20, h / 2, 13, 20, 1.0, 0.45)
        t = np.linspace(math.pi * 0.05, math.pi * 0.95, 30)
        m.stroke(np.stack([x + 20 + 17 * np.cos(t), h / 2 - 4 + 24 * np.sin(t)], 1), 3, 3, 0.65)
        m.stroke([(x, 8), (x, h - 14)], 3, 1, 0.6, 0.4)
    m.stroke([(0, 4), (length, 4)], 3, 3, 0.6)
    return m.blur(0.8).a


def panel_map(w=900, h=380):
    m = HM(w, h)
    m.rosette(w / 2, h / 2, 70, 1.0, 8)
    for sgn in (-1, 1):
        m.spiral(w / 2 + sgn * 210, h / 2, 60, 1.3, 0 if sgn < 0 else math.pi, sgn, 9, 4, 0.75)
        m.stroke([(w / 2 + sgn * 80, h / 2), (w / 2 + sgn * 150, h / 2 - 30), (w / 2 + sgn * 210, h / 2 - 60)], 7, 6, 0.6)
        for k in range(3):
            m.leaf(w / 2 + sgn * (95 + k * 40), h / 2 + 8, (math.pi if sgn < 0 else 0) + sgn * 0.5, 50, 15, 0.55, 0.2)
    t = np.linspace(0, 1, 2)
    for inset in (14, 30):
        m.stroke([(inset, inset), (w - inset, inset), (w - inset, h - inset), (inset, h - inset), (inset, inset)], 5 if inset == 14 else 3, None, 0.7 if inset == 14 else 0.5)
    return m.blur(1.0).a


# ---------------------------------------------------------------------------
# materials


def marble(name="marble_white", base=(0.80, 0.785, 0.75), vein=(0.55, 0.55, 0.56), rough=0.32, veins=0.35, scale=1.4):
    t = Tree(name)
    co = t.coords("Object")
    warp = t.noise(co, scale=scale, detail=6, roughness=0.6, distortion=1.5)
    wave = t.node("ShaderNodeTexWave", {"Vector": (warp, "Color"), "Scale": 2.2, "Distortion": 9.0, "Detail": 8, "Detail Scale": 1.5})
    v = t.map_range((wave, "Fac"), 0.0, 0.08, veins, 0.0)
    fine = t.noise(co, scale=60, detail=6)
    col = t.mix_color(t.map_range(fine, 0.3, 0.7, 0, 0.12), base, tuple(c * 0.93 for c in base))
    col = t.mix_color(v, col, vein)
    bump = t.bump((fine, "Fac"), strength=0.02, distance=0.002)
    return t.surface(t.principled(col, rough, bump, Subsurface_Weight=0.08, Subsurface_Radius=(0.4, 0.3, 0.2)))


def stucco(name="stucco", base=(0.82, 0.80, 0.765), rough=0.62):
    t = Tree(name)
    co = t.coords("Object")
    n = t.noise(co, scale=40, detail=8, roughness=0.6)
    big = t.noise(co, scale=1.5, detail=3)
    col = t.mix_color(t.map_range(big, 0.35, 0.65, 0, 0.12), base, tuple(c * 0.94 for c in base))
    bump = t.bump((n, "Fac"), strength=0.03, distance=0.003)
    return t.surface(t.principled(col, rough, bump))


def floor_marble():
    t = Tree("floor_marble")
    co = t.coords("Object")
    # 0.9 m slabs with fine joints
    tile = t.node("ShaderNodeTexBrick", {"Vector": co, "Scale": 1.0 / 0.9, "Mortar Size": 0.0025, "Mortar Smooth": 0.3, "Bias": 0.0,
                                         "Color1": (0.80, 0.79, 0.76), "Color2": (0.76, 0.75, 0.72), "Mortar": (0.42, 0.41, 0.39)},
                  offset=0.0, squash=1.0)
    warp = t.noise(co, scale=0.9, detail=6, roughness=0.6, distortion=1.8)
    wave = t.node("ShaderNodeTexWave", {"Vector": (warp, "Color"), "Scale": 1.6, "Distortion": 10.0, "Detail": 8})
    v = t.map_range((wave, "Fac"), 0.0, 0.07, 0.45, 0.0)
    col = t.mix_color(v, (tile, "Color"), (0.5, 0.5, 0.52))
    bump = t.bump(t.math("SUBTRACT", 1.0, (tile, "Fac")), strength=0.25, distance=0.002)
    return t.surface(t.principled(col, 0.09, bump))


def brass():
    t = Tree("brass")
    co = t.coords("Object")
    n = t.noise(co, scale=30, detail=4)
    return t.surface(t.principled((0.78, 0.56, 0.26), t.map_range(n, 0.3, 0.7, 0.18, 0.3), None, Metallic=1.0))


def bronze():
    t = Tree("bronze_patina")
    co = t.coords("Object")
    n = t.noise(co, scale=8, detail=6, roughness=0.6)
    col = t.mix_color(t.map_range(n, 0.45, 0.62, 0, 1), (0.42, 0.24, 0.10), (0.20, 0.30, 0.22))
    return t.surface(t.principled(col, 0.34, None, Metallic=0.85))


def terracotta_urn():
    t = Tree("urn_terracotta")
    co = t.coords("Object")
    # bands of black glaze round a red body, as on a Greek pot
    bands = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 2.8, "Distortion": 0.0}, wave_type="BANDS", bands_direction="Z")
    b = t.map_range((bands, "Fac"), 0.62, 0.66, 0, 1)
    col = t.mix_color(b, (0.36, 0.11, 0.035), (0.015, 0.012, 0.01))
    return t.surface(t.principled(col, 0.38))


def glass():
    t = Tree("vitrine_glass")
    return t.surface(t.principled((0.97, 0.99, 0.985), 0.0, None, Transmission_Weight=1.0, IOR=1.5))


def velvet():
    t = Tree("velvet_rope")
    return t.surface(t.principled((0.30, 0.02, 0.025), 0.75, None, Sheen_Weight=0.8, Sheen_Tint=(0.8, 0.3, 0.3)))


def emit(color, strength, name):
    t = Tree(name)
    return t.surface(t.node("ShaderNodeEmission", {"Color": color, "Strength": strength}))


def matte(color, rough, name):
    t = Tree(name)
    return t.surface(t.principled(color, rough))


# ---------------------------------------------------------------------------
# geometry


def relief(name, hm, x0, x1, z0, z1, y, depth, mat, col, res=0.004, flip_v=True):
    """A vertical relief panel facing the room (-y): height map hm (rows top→bottom)."""
    nx = max(2, int(round((x1 - x0) / res)))
    nz = max(2, int(round((z1 - z0) / res)))
    hh, ww = hm.shape
    xs = np.linspace(0, 1, nx + 1)
    zs = np.linspace(0, 1, nz + 1)
    U, V = np.meshgrid(xs, zs)
    px = np.clip((U * (ww - 1)).astype(int), 0, ww - 1)
    py = np.clip(((1 - V) * (hh - 1)).astype(int), 0, hh - 1)
    hgt = hm[py, px]
    X = x0 + U * (x1 - x0)
    Z = z0 + V * (z1 - z0)
    Y = y - depth * hgt
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1)
    idx = np.arange((nx + 1) * (nz + 1)).reshape(nz + 1, nx + 1)
    a, b, c, d = idx[:-1, :-1].ravel(), idx[:-1, 1:].ravel(), idx[1:, 1:].ravel(), idx[1:, :-1].ravel()
    faces = np.stack([a, b, c, d], 1)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces.tolist())
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob


def fluted_shaft(name, cx, cy, r, z0, z1, flutes, mat, col):
    seg = flutes * 12
    rings = 2
    verts, faces = [], []
    for k in range(rings):
        z = z0 + (z1 - z0) * k / (rings - 1)
        for i in range(seg):
            a = 2 * math.pi * i / seg
            groove = max(0.0, math.cos(flutes * a)) ** 0.6
            rr = r * (1 - 0.07 * groove)
            verts.append((cx + rr * math.cos(a), cy + rr * math.sin(a), z))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob


def lathe(name, profile, cx, cy, z0, mat, col, seg=64):
    """profile: [(radius, height)] bottom → top."""
    verts, faces = [], []
    for k, (r, z) in enumerate(profile):
        for i in range(seg):
            a = 2 * math.pi * i / seg
            verts.append((cx + r * math.cos(a), cy + r * math.sin(a), z0 + z))
    for k in range(len(profile) - 1):
        for i in range(seg):
            j = (i + 1) % seg
            faces.append((k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i))
    faces.append(tuple(range(seg - 1, -1, -1)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    return ob


def _ellipsoid(name, c, r, mat, col, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1.0, location=c)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = r
    for c0 in ob.users_collection:
        c0.objects.unlink(ob)
    col.objects.link(ob)
    ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


def bust(cx, cy, z0, mat, col):
    """A small classical bust: socle, chest and shoulders, neck, head with hair and nose."""
    lathe("bust_socle", [(0.045, 0), (0.05, 0.01), (0.035, 0.03), (0.03, 0.05), (0.05, 0.06), (0.0, 0.06)], cx, cy, z0, mat, col, seg=40)
    _ellipsoid("bust_chest", (cx, cy, z0 + 0.12), (0.11, 0.06, 0.07), mat, col)
    _ellipsoid("bust_chest2", (cx, cy - 0.005, z0 + 0.09), (0.08, 0.05, 0.05), mat, col)
    cylinder("bust_neck", 0.03, 0.08, (cx, cy, z0 + 0.20), mat, col, verts=24)
    _ellipsoid("bust_head", (cx, cy - 0.005, z0 + 0.27), (0.048, 0.056, 0.064), mat, col)
    _ellipsoid("bust_hair", (cx, cy + 0.008, z0 + 0.295), (0.052, 0.056, 0.05), mat, col)
    _ellipsoid("bust_nose", (cx, cy - 0.058, z0 + 0.268), (0.008, 0.012, 0.016), mat, col, seg=12)
    _ellipsoid("bust_chin", (cx, cy - 0.04, z0 + 0.225), (0.022, 0.02, 0.018), mat, col, seg=12)


def rope(name, a, b, sag, radius, mat, col):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    sp = cu.splines.new("POLY")
    n = 24
    sp.points.add(n - 1)
    for i in range(n):
        t = i / (n - 1)
        p = Vector(a).lerp(Vector(b), t)
        p.z -= sag * 4 * t * (1 - t)
        sp.points[i].co = (p.x, p.y, p.z, 1)
    ob = bpy.data.objects.new(name, cu)
    ob.data.materials.append(mat)
    col.objects.link(ob)
    return ob


def bend(p):
    """Flat (x, y, z) → onto the circle of radius R centred at (0, -R)."""
    x, y, z = p
    rho = R + y
    th = x / R
    return (rho * math.sin(th), -R + rho * math.cos(th), z)


def finalize_bend(col):
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in list(col.all_objects):
        if ob.type not in {"MESH", "META", "CURVE"}:
            continue
        ev = ob.evaluated_get(dg)
        me = bpy.data.meshes.new_from_object(ev)
        mw = ob.matrix_world.copy()
        n = len(me.vertices)
        co = np.empty(n * 3, np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(n, 3)
        world = (np.asarray(mw)[:3, :3] @ co.T).T + np.asarray(mw)[:3, 3]
        x, y, z = world[:, 0], world[:, 1], world[:, 2]
        rho = R + y
        th = x / R
        out = np.stack([rho * np.sin(th), -R + rho * np.cos(th), z], 1).astype(np.float32)
        me.vertices.foreach_set("co", out.ravel())
        me.update()
        mats = [s.material for s in ob.material_slots]
        new = bpy.data.objects.new(ob.name + "_b", me)
        if not me.materials:
            for m in mats:
                me.materials.append(m)
        for c in ob.users_collection:
            c.objects.link(new)
        bpy.data.objects.remove(ob)
        # keep smooth shading from the source
        if new.data.polygons and not any(p.use_smooth for p in new.data.polygons[:1]):
            pass


# ---------------------------------------------------------------------------


def build(variant):
    clear_scene()
    col = collection("museum")
    white = marble()
    carve = marble("marble_carving", base=(0.83, 0.815, 0.78), rough=0.4, veins=0.12, scale=2.5)
    plaster = stucco()
    niche_mat = stucco("niche_plaster", base=(0.74, 0.715, 0.67), rough=0.75)
    grey = marble("marble_grey", base=(0.52, 0.51, 0.49), vein=(0.82, 0.81, 0.79), rough=0.25, veins=0.5, scale=1.8)

    nx, nz0, nz1 = NICHE
    # the wall, around the niche opening
    T = 0.4
    box("wall_l", (3.2 - nx, T, 5.2), (-(3.2 + nx) / 2, T / 2, 2.6), plaster, col)
    box("wall_r", (3.2 - nx, T, 5.2), ((3.2 + nx) / 2, T / 2, 2.6), plaster, col)
    box("wall_b", (2 * nx, T, nz0), (0, T / 2, nz0 / 2), plaster, col)
    box("wall_t", (2 * nx, T, 5.2 - nz1), (0, T / 2, (5.2 + nz1) / 2), plaster, col)
    # the niche: reveals and a smooth back where the picture hangs
    D = 0.10
    box("niche_back", (2 * nx, 0.02, nz1 - nz0), (0, D + 0.01, (nz0 + nz1) / 2), niche_mat, col)
    box("niche_rev_l", (0.02, D, nz1 - nz0), (-nx + 0.01, D / 2, (nz0 + nz1) / 2), niche_mat, col)
    box("niche_rev_r", (0.02, D, nz1 - nz0), (nx - 0.01, D / 2, (nz0 + nz1) / 2), niche_mat, col)
    box("niche_rev_t", (2 * nx, D, 0.02), (0, D / 2, nz1 - 0.01), niche_mat, col)
    box("niche_sill", (2 * nx + 0.04, D + 0.06, 0.04), (0, D / 2 - 0.03, nz0 - 0.02), white, col, bevel=0.006)

    # the frame round the niche: bead, egg-and-dart, a stepped band, rosette corners
    ed = eggdart_map()
    o0, o1 = nx + 0.012, nx + 0.085
    zc0, zc1 = nz0 - 0.085, nz1 + 0.085
    relief("ed_top", ed, -o0, o0, nz1 + 0.012, nz1 + 0.085, -0.004, 0.022, carve, col, res=0.003)
    relief("ed_bot", ed[::-1], -o0, o0, nz0 - 0.085, nz0 - 0.012, -0.004, 0.022, carve, col, res=0.003)
    edv = np.ascontiguousarray(np.rot90(ed))
    relief("ed_l", edv[:, ::-1], -o1, -o0, nz0 - 0.012, nz1 + 0.012, -0.004, 0.022, carve, col, res=0.003)
    relief("ed_r", edv, o0, o1, nz0 - 0.012, nz1 + 0.012, -0.004, 0.022, carve, col, res=0.003)
    for zz in (nz0 - 0.004, nz1 + 0.004):
        c = cylinder(f"bead_h{zz}", 0.012, 2 * nx + 0.02, (0, -0.012, zz), carve, col, verts=16)
        c.rotation_euler = (0, 90 * DEG, 0)
    for xx in (-nx - 0.004, nx + 0.004):
        cylinder(f"bead_v{xx}", 0.012, nz1 - nz0 + 0.02, (xx, -0.012, (nz0 + nz1) / 2), carve, col, verts=16)
    band = 0.07
    box("band_t", (2 * (o1 + band), 0.05, band), (0, -0.02, zc1 + band / 2), white, col, bevel=0.008)
    box("band_b", (2 * (o1 + band), 0.05, band), (0, -0.02, zc0 - band / 2), white, col, bevel=0.008)
    box("band_l", (band, 0.05, zc1 - zc0), (-o1 - band / 2, -0.02, (zc0 + zc1) / 2), white, col, bevel=0.008)
    box("band_r", (band, 0.05, zc1 - zc0), (o1 + band / 2, -0.02, (zc0 + zc1) / 2), white, col, bevel=0.008)
    ros = rosette_map()
    for sx in (-1, 1):
        for zz in (zc0 - band / 2, zc1 + band / 2):
            cx = sx * (o1 + band / 2)
            relief(f"ros_{sx}_{zz:.2f}", ros, cx - 0.075, cx + 0.075, zz - 0.075, zz + 0.075, -0.05, 0.03, carve, col, res=0.002)

    # the cartouche above
    cz0 = zc1 + band + 0.06
    relief("cartouche", cartouche_map(), -0.80, 0.80, cz0, cz0 + 0.86, -0.006, 0.10, carve, col, res=0.003)

    # entablature: architrave, acanthus frieze, dentil cornice
    ez = 3.78
    box("architrave", (6.4, 0.07, 0.12), (0, -0.035, ez + 0.06), white, col, bevel=0.01)
    box("architrave2", (6.4, 0.05, 0.05), (0, -0.07, ez + 0.145), white, col, bevel=0.008)
    relief("frieze", frieze_map(), -3.2, 3.2, ez + 0.17, ez + 0.62, -0.03, 0.07, carve, col, res=0.004)
    cz = ez + 0.62
    box("cornice1", (6.4, 0.10, 0.05), (0, -0.05, cz + 0.025), white, col, bevel=0.008)
    for k in range(-54, 55):
        box(f"dentil{k}", (0.035, 0.06, 0.06), (k * 0.058, -0.12, cz + 0.08), white, col, bevel=0.003)
    box("cornice2", (6.4, 0.20, 0.05), (0, -0.10, cz + 0.135), white, col, bevel=0.008)
    box("cornice3", (6.4, 0.26, 0.07), (0, -0.13, cz + 0.195), white, col, bevel=0.012)
    c = cylinder("cornice_ovolo", 0.04, 6.4, (0, -0.24, cz + 0.255), white, col, verts=24)
    c.rotation_euler = (0, 90 * DEG, 0)
    box("attic", (6.4, 0.05, 0.6), (0, 0.0, cz + 0.6), plaster, col)

    # coffered ceiling, curved with the wall
    cei = 5.05
    box("ceiling", (7, 2.6, 0.1), (0, -1.1, cei + 0.12), plaster, col)
    for i in range(-4, 5):
        box(f"beam_x{i}", (0.12, 2.4, 0.16), (i * 0.85, -1.1, cei - 0.01), white, col, bevel=0.01)
    for j in range(0, 3):
        box(f"beam_y{j}", (7.0, 0.12, 0.16), (0, -0.25 - j * 0.85, cei - 0.01), white, col, bevel=0.01)
    sky = emit((1.0, 0.98, 0.95), 1.2, "skylight")
    box("skylight", (1.6, 0.6, 0.02), (0, -1.5, cei + 0.06), sky, col)

    # columns either side of the niche
    cap = capital_map()
    for sx in (-1, 1):
        cx, cy = sx * COL_X, -0.10
        box(f"plinth{sx}", (0.42, 0.42, 0.22), (cx, cy, 0.11), white, col, bevel=0.01)
        cylinder(f"torus{sx}", 0.19, 0.06, (cx, cy, 0.25), white, col, verts=48, bevel=0.025)
        cylinder(f"torus2{sx}", 0.165, 0.05, (cx, cy, 0.31), white, col, verts=48, bevel=0.02)
        fluted_shaft(f"shaft{sx}", cx, cy, 0.145, 0.33, 3.27, 20, white, col)
        cylinder(f"astragal{sx}", 0.158, 0.035, (cx, cy, 3.29), white, col, verts=48, bevel=0.015)
        box(f"cap_core{sx}", (0.30, 0.30, 0.36), (cx, cy, 3.49), white, col)
        relief(f"cap_f{sx}", cap, cx - 0.21, cx + 0.21, 3.31, 3.68, cy - 0.15, 0.06, carve, col, res=0.003)
        box(f"abacus{sx}", (0.48, 0.48, 0.07), (cx, cy, 3.715), white, col, bevel=0.01)

    # dado: skirting, carved panels, rail
    box("skirting", (6.4, 0.05, 0.18), (0, -0.025, 0.09), marble("marble_skirt", base=(0.66, 0.65, 0.62), vein=(0.85, 0.84, 0.82), rough=0.25, veins=0.4, scale=1.8), col, bevel=0.006)
    box("dado_rail", (6.4, 0.06, 0.05), (0, -0.03, 0.93), white, col, bevel=0.01)
    c = cylinder("dado_bead", 0.016, 6.4, (0, -0.06, 0.9), white, col, verts=16)
    c.rotation_euler = (0, 90 * DEG, 0)
    pm = panel_map()
    relief("panel_mid", pm, -0.62, 0.62, 0.30, 0.82, -0.004, 0.05, carve, col, res=0.004)
    for sx in (-1, 1):
        relief(f"panel_out{sx}", pm, sx * 1.62 - 0.32, sx * 1.62 + 0.32, 0.30, 0.82, -0.004, 0.035, carve, col, res=0.006)

    # alarm unit on the wall, with its red light
    abody = matte((0.85, 0.85, 0.83), 0.35, "alarm_body")
    red = emit((1.0, 0.05, 0.03), 12.0, "alarm_led")
    box("alarm", (0.10, 0.04, 0.14), (0.86, -0.02, 0.56), abody, col, bevel=0.012)
    cylinder("alarm_grille", 0.03, 0.006, (0.86, -0.042, 0.585), matte((0.08, 0.08, 0.08), 0.6, "grille"), col, verts=24).rotation_euler = (90 * DEG, 0, 0)
    cylinder("alarm_led", 0.008, 0.008, (0.86, -0.043, 0.525), red, col, verts=16).rotation_euler = (90 * DEG, 0, 0)
    # a small sensor high in the corner
    box("sensor", (0.09, 0.06, 0.07), (-0.95, -0.04, 3.55), abody, col, bevel=0.01)
    cylinder("sensor_led", 0.006, 0.006, (-0.95, -0.071, 3.54), red, col, verts=12).rotation_euler = (90 * DEG, 0, 0)

    # pedestals and vitrines with artefacts
    gl, br = glass(), brass()
    arts = VARIANTS[variant]
    for sx, art in zip((-1, 1), arts):
        cx, cy = sx * VIT_X, VIT_Y
        box(f"ped_base{sx}", (0.52, 0.52, 0.08), (cx, cy, 0.04), grey, col, bevel=0.012)
        box(f"ped{sx}", (0.44, 0.44, 0.84), (cx, cy, 0.50), white, col, bevel=0.008)
        box(f"ped_cap{sx}", (0.52, 0.52, 0.06), (cx, cy, 0.95), grey, col, bevel=0.012)
        box(f"plaque{sx}", (0.14, 0.006, 0.06), (cx, cy - 0.223, 0.78), br, col, bevel=0.002)
        # the glass case
        gz0, gz1, gh = 0.98, 1.46, 0.20
        box(f"case_base{sx}", (0.44, 0.44, 0.03), (cx, cy, gz0 + 0.015), br, col, bevel=0.004)
        box(f"case_top{sx}", (0.44, 0.44, 0.02), (cx, cy, gz1 + 0.01), br, col, bevel=0.004)
        for gx, gy, sxz in ((0, -gh, (0.40, 0.008)), (0, gh, (0.40, 0.008)), (-gh, 0, (0.008, 0.40)), (gh, 0, (0.008, 0.40))):
            box(f"glass{sx}_{gx}_{gy}", (sxz[0], sxz[1], gz1 - gz0 - 0.03), (cx + gx, cy + gy, (gz0 + gz1) / 2), gl, col)
        for gx in (-gh, gh):
            for gy in (-gh, gh):
                box(f"edge{sx}_{gx}_{gy}", (0.012, 0.012, gz1 - gz0), (cx + gx, cy + gy, (gz0 + gz1) / 2), br, col)
        z0 = gz0 + 0.03
        if art == "amphora":
            prof = [(0.03, 0), (0.045, 0.01), (0.03, 0.03), (0.07, 0.09), (0.095, 0.17), (0.09, 0.24), (0.06, 0.29), (0.035, 0.32), (0.032, 0.36), (0.048, 0.375), (0.045, 0.385), (0.0, 0.385)]
            lathe(f"amphora{sx}", prof, cx, cy, z0, bronze(), col)
            for hs in (-1, 1):
                rope(f"handle{sx}{hs}", (cx + hs * 0.035, cy, z0 + 0.35), (cx + hs * 0.08, cy, z0 + 0.25), -0.05, 0.008, bronze(), col)
        elif art == "urn":
            prof = [(0.05, 0), (0.06, 0.012), (0.045, 0.03), (0.09, 0.08), (0.11, 0.15), (0.10, 0.22), (0.075, 0.27), (0.07, 0.29), (0.09, 0.31), (0.085, 0.32), (0.0, 0.32)]
            lathe(f"urn{sx}", prof, cx, cy, z0, terracotta_urn(), col)
        else:
            bust(cx, cy, z0, carve, col)

    # rope barrier in front of the niche
    vel = velvet()
    for sx in (-1, 1):
        x = sx * 0.62
        cylinder(f"post_base{sx}", 0.13, 0.025, (x, -1.05, 0.0125), br, col, verts=32, bevel=0.006)
        cylinder(f"post{sx}", 0.022, 0.9, (x, -1.05, 0.47), br, col, verts=24)
        cylinder(f"post_top{sx}", 0.04, 0.05, (x, -1.05, 0.93), br, col, verts=24, bevel=0.015)
    rope("rope", (-0.60, -1.05, 0.9), (0.60, -1.05, 0.9), 0.16, 0.017, vel, col)

    # floor
    box("floor", (7, 4.6, 0.1), (0, -2.1, -0.05), floor_marble(), col)

    finalize_bend(col)

    # ---- lights ------------------------------------------------------------
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.92, 0.9, 0.86, 1)
    bg.inputs["Strength"].default_value = 0.06
    bpy.context.scene.world = world

    def spot(name, at, target, energy, size_deg, blend=0.6, color=(1.0, 0.92, 0.82)):
        ld = bpy.data.lights.new(name, "SPOT")
        ld.energy = energy
        ld.spot_size = size_deg * DEG
        ld.spot_blend = blend
        ld.shadow_soft_size = 0.06
        ld.color = color
        ob = bpy.data.objects.new(name, ld)
        ob.location = at
        d = Vector(target) - Vector(at)
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.collection.objects.link(ob)

    def area(name, at, rot, energy, size, color=(1, 0.97, 0.93), shape="RECTANGLE", size_y=None):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.shape = shape
        ld.size = size
        if size_y:
            ld.size_y = size_y
        ld.color = color
        ob = bpy.data.objects.new(name, ld)
        ob.location = at
        ob.rotation_euler = rot
        bpy.context.scene.collection.objects.link(ob)

    niche_c = bend((0, 0.08, (nz0 + nz1) / 2))
    spot("spot_niche", (0, -2.0, 4.95), niche_c, 1300, 32, 0.45)
    for sx in (-1, 1):
        tgt = bend((sx * VIT_X, VIT_Y, 1.2))
        spot(f"spot_vit{sx}", (sx * 0.9, -2.6, 4.95), tgt, 220, 18, 0.5)
        p = bend((sx * VIT_X, VIT_Y, 1.43))
        area(f"case_light{sx}", p, (0, 0, 0), 6, 0.3)
        spot(f"spot_col{sx}", (sx * 0.4, -2.2, 4.95), bend((sx * COL_X, -0.1, 2.6)), 260, 26, 0.7)
    area("sky_fill", (0, -2.6, 4.9), (0, 0, 0), 110, 2.6, size_y=3.0, shape="RECTANGLE")
    area("front_fill", (0, -6.4, 2.2), (90 * DEG, 0, 0), 55, 6.0, size_y=3.0)
    area("cornice_wash", (0, -0.9, 4.75), (-20 * DEG, 0, 0), 160, 5.0, size_y=0.2)
    spot("spot_cartouche", (0, -1.0, 4.95), bend((0, 0, 3.15)), 420, 36, 0.6)

    # ---- camera -------------------------------------------------------------
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("cam")
    cd.lens_unit = "FOV"
    cd.sensor_fit = "VERTICAL"
    cd.angle_y = 68 * DEG
    cd.shift_y = 0.16
    cd.clip_start = 0.05
    cam = bpy.data.objects.new("cam", cd)
    cam.location = (0, -4.8, 1.6)
    cam.rotation_euler = (90 * DEG, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = W
    sc.render.resolution_y = H
    sc.render.resolution_percentage = int(round(args.scale * 100))
    return sc, cam


def project(sc, cam, p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return [round(v.x * W, 1), round((1 - v.y) * H, 1)]


def main():
    only = [o for o in args.only.split(",") if o] or list(VARIANTS)
    meta_path = OUT / "walls.json"
    meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    meta.update({"width": W, "height": H, "radius": R})
    meta.setdefault("walls", {})
    for v in only:
        sc, cam = build(v)
        configure_render(samples=args.samples, preview=args.scale < 0.6)
        sc.view_settings.exposure = 0.0
        tmp = OUT / f"_wall_{v}.png"
        sc.render.filepath = str(tmp)
        sc.render.image_settings.file_format = "PNG"
        bpy.ops.render.render(write_still=True)
        nx, nz0, nz1 = NICHE
        quad = [project(sc, cam, bend((x, 0.09, z))) for x, z in ((-nx, nz1), (nx, nz1), (nx, nz0), (-nx, nz0))]
        im = Image.open(tmp).convert("RGB")
        if im.size != (W, H):
            im = im.resize((W, H), Image.LANCZOS)
        im.save(OUT / f"wall_{v}.webp", quality=84, method=6)
        im.resize((W // 4, H // 4), Image.LANCZOS).save(OUT / f"wall_{v}_thumb.webp", quality=80)
        tmp.unlink()
        meta["walls"][v] = {"file": f"wall_{v}.webp", "thumb": f"wall_{v}_thumb.webp", "niche": quad, "artefacts": list(VARIANTS[v])}
        meta_path.write_text(json.dumps(meta, indent=1))
        print("rendered", v, quad, flush=True)


main()
