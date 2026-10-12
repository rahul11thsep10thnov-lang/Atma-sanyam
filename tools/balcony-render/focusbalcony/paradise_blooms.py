"""Blooms and lush bushes for the Paradise Garden.

The generic shrub reads as twigs with a few dots when it flowers; these
builders make the flower the hero, the way the reference garden paints
it: cupped roses, recurved lily trumpets, marigold pompoms, daisies with
real discs, open hibiscus with its column, spikes of lavender, closed
buds before the bloom. Every bloom is built from petals (curved blades
from geo.leaf) around an axis, so it lights and silhouettes like a
flower at every angle."""
import math
from dataclasses import dataclass, field

import bmesh
from mathutils import Matrix, Vector

from . import materials as M
from . import plant_materials as PM
from .common import Rng, mesh_object
from .geo import Builder, curve_points, frame_at, leaf, shape_heart, shape_lanceolate, shape_ovate, tube
from .trees import _flower_mat, _leaf_cluster

UP = Vector((0, 0, 1))


@dataclass
class Bloom:
    kind: str  # rose, pompom, daisy, open5, star, trumpet, cup, spike, lotus, bract, orchid, iris, daffodil, spathe
    radius: float
    color: tuple
    centre: tuple = (0.95, 0.8, 0.3)
    disc: tuple | None = None  # disc colour for daisies / sunflowers
    petals: int = 0  # 0 = the kind's default
    extra: dict = field(default_factory=dict)


def _basis(axis):
    axis = axis.normalized()
    x = axis.orthogonal().normalized()
    y = axis.cross(x).normalized()
    return axis, x, y


def _dir(axis, x, y, az, elev):
    radial = x * math.cos(az) + y * math.sin(az)
    return (radial * math.cos(elev) + axis * math.sin(elev)).normalized()


def petal(b, mat, origin, direction, up, length, width, rng, shape=shape_ovate, fold=0.3, arch=0.0, twist=0.0, wave=0.0, nu=3, nv=5):
    fr = frame_at(origin, direction, up)
    leaf(b, mat, fr, length, width, shape, nu=nu, nv=nv, fold=fold, arch=arch, twist=twist, wave=wave, var=rng.random())


def dome(b, mat, origin, axis, r, h, rings=4, seg=14, var=0.5):
    """A shallow dome: flower discs, seed pods, centres."""
    axis, x, y = _basis(axis)
    pts, uvs = [], []
    for j in range(rings + 1):
        t = j / rings
        rr = r * math.sin(t * math.pi / 2)
        zz = h * math.cos(t * math.pi / 2)
        row, urow = [], []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            row.append(origin + axis * zz + (x * math.cos(a) + y * math.sin(a)) * max(rr, 1e-5))
            urow.append((i / seg, 0.1))
        pts.append(row)
        uvs.append(urow)
    rows = b.grid(pts, uvs, mat, var, closed_u=True)
    bmesh.ops.remove_doubles(b.bm, verts=rows[0], dist=1e-6)


def bud(b, mat, origin, axis, length, width, rng):
    """A closed bud: petals wrapped tight into a teardrop."""
    axis, x, y = _basis(axis)
    k = 4
    for i in range(k):
        az = 2 * math.pi * i / k + rng.uniform(-0.2, 0.2)
        d = _dir(axis, x, y, az, math.radians(84))
        petal(b, mat, origin, d, axis, length, width, rng, shape=shape_ovate, fold=0.7, arch=-0.35, twist=0.35)


def bloom(b, spec: Bloom, mats, origin, axis, rng, scale=1.0):
    """Builds one open flower of `spec` at `origin`, facing `axis`."""
    r = spec.radius * scale
    pm, cm = mats["petal"], mats.get("centre")
    axis, x, y = _basis(axis)
    k = spec.kind
    rot = rng.uniform(0, 6.28)
    if k == "rose":
        layers = [(5, 18, 1.0, 0.95, 0.45, 0.5), (5, 38, 0.86, 0.9, 0.55, 0.1), (5, 58, 0.7, 0.85, 0.7, -0.25), (5, 72, 0.55, 0.8, 0.8, -0.45), (4, 82, 0.4, 0.75, 0.9, -0.6)]
        for li, (n, el, ln, wd, fold, arch) in enumerate(layers):
            for i in range(n):
                az = rot + 2 * math.pi * i / n + li * 0.62 + rng.uniform(-0.15, 0.15)
                d = _dir(axis, x, y, az, math.radians(el + rng.uniform(-6, 6)))
                petal(b, pm, origin + axis * r * 0.05 * li, d, axis, r * ln, r * wd, rng, fold=fold, arch=arch, wave=0.05)
    elif k == "pompom":
        rows = spec.extra.get("rows", 7)
        n = spec.petals or 13
        frill = spec.extra.get("frill", 0.15)
        for li in range(rows):
            t = li / (rows - 1)
            el = 6 + 80 * t
            for i in range(n):
                az = rot + 2 * math.pi * i / n + li * 0.41
                d = _dir(axis, x, y, az, math.radians(el + rng.uniform(-5, 5)))
                ln = r * (1.0 - 0.55 * t)
                petal(b, pm, origin + axis * r * 0.12 * t, d, axis, ln, ln * spec.extra.get("w", 0.5), rng, fold=0.35, arch=0.15 - 0.4 * t, wave=frill)
    elif k == "daisy":
        n = spec.petals or 20
        for row in range(2):
            for i in range(n):
                az = rot + 2 * math.pi * (i + 0.5 * row) / n
                d = _dir(axis, x, y, az, math.radians(spec.extra.get("elev", 6) + 8 * row + rng.uniform(-4, 4)))
                ln = r * (1.0 - 0.12 * row)
                petal(b, pm, origin + axis * 0.002 * row, d, axis, ln, ln * spec.extra.get("w", 0.24), rng, shape=shape_lanceolate, fold=0.15, arch=0.18, nu=2, nv=4)
        rc = r * spec.extra.get("disc_r", 0.3)
        dome(b, cm, origin - axis * 0.002, axis, rc, rc * 0.45)
    elif k == "open5":
        n = spec.petals or 5
        el = spec.extra.get("elev", 24)
        for i in range(n):
            az = rot + 2 * math.pi * i / n
            d = _dir(axis, x, y, az, math.radians(el + rng.uniform(-5, 5)))
            petal(b, pm, origin, d, axis, r, r * spec.extra.get("w", 0.95), rng, fold=0.18, arch=spec.extra.get("arch", 0.3), wave=spec.extra.get("wave", 0.2), nu=4, nv=6)
        if spec.extra.get("column"):
            pts = curve_points(origin, (axis + x * 0.15).normalized(), r * 1.15, Vector((0, 0, 0)), 4)
            tube(b, cm, pts, [r * 0.035, r * 0.03, r * 0.028, r * 0.025, r * 0.04], segments=6)
            dome(b, cm, pts[-1], axis, r * 0.07, r * 0.07)
        else:
            dome(b, cm, origin + axis * 0.002, axis, r * 0.16, r * 0.08)
    elif k == "star":
        n = spec.petals or 5
        for i in range(n):
            az = rot + 2 * math.pi * i / n
            d = _dir(axis, x, y, az, math.radians(spec.extra.get("elev", 10)))
            petal(b, pm, origin, d, axis, r, r * spec.extra.get("w", 0.5), rng, shape=shape_ovate, fold=0.1, arch=0.15, twist=0.35)
        dome(b, cm, origin, axis, r * 0.12, r * 0.06)
    elif k == "trumpet":
        # six tepals in two whorls: they leave the throat along the axis, then recurve
        for whorl in range(2):
            for i in range(3):
                az = rot + 2 * math.pi * i / 3 + whorl * math.pi / 3
                d = _dir(axis, x, y, az, math.radians(52 + rng.uniform(-5, 5)))
                petal(b, pm, origin + axis * 0.003 * whorl, d, axis, r * (1.25 - 0.08 * whorl), r * (0.42 + 0.06 * whorl), rng,
                      shape=shape_lanceolate, fold=0.3, arch=1.05 + rng.uniform(-0.1, 0.1), wave=0.12, nu=4, nv=8)
        # stamens: thin filaments with dark anthers, and the pistil
        anther = mats["anther"]
        for i in range(6):
            az = rot + 2 * math.pi * i / 6 + 0.3
            d = _dir(axis, x, y, az, math.radians(68))
            pts = curve_points(origin, d, r * 0.85, -axis * 0.15, 3)
            tube(b, cm, pts, [r * 0.012] * 4, segments=4)
            tube(b, anther, [pts[-1] - d * r * 0.05, pts[-1] + d * r * 0.05], [r * 0.03, r * 0.03], segments=5)
    elif k == "cup":
        n = spec.petals or 6
        for i in range(n):
            az = rot + 2 * math.pi * i / n + (0.5 if i % 2 else 0)
            d = _dir(axis, x, y, az, math.radians(76 + rng.uniform(-4, 4)))
            petal(b, pm, origin + axis * 0.002 * (i % 2), d, axis, r * 1.3, r * 0.8, rng, fold=0.55, arch=-0.18, nu=4, nv=6)
    elif k == "lotus":
        layers = [(8, 30, 1.0), (8, 52, 0.88), (6, 72, 0.72)]
        for li, (n, el, ln) in enumerate(layers):
            for i in range(n):
                az = rot + 2 * math.pi * i / n + li * 0.4
                d = _dir(axis, x, y, az, math.radians(el + rng.uniform(-5, 5)))
                petal(b, pm, origin + axis * r * 0.04 * li, d, axis, r * ln, r * ln * 0.48, rng, shape=shape_lanceolate, fold=0.45, arch=-0.12, nu=3, nv=6)
        dome(b, cm, origin + axis * r * 0.1, axis, r * 0.2, r * 0.12)
    elif k == "bract":
        # bougainvillea: papery bracts in threes, several to a cluster
        for c in range(spec.extra.get("cluster", 4)):
            ax = (axis + x * rng.uniform(-0.7, 0.7) + y * rng.uniform(-0.7, 0.7)).normalized()
            o = origin + (x * rng.uniform(-1, 1) + y * rng.uniform(-1, 1)) * r * 0.8
            a2, x2, y2 = _basis(ax)
            for i in range(3):
                d = _dir(a2, x2, y2, rot + 2 * math.pi * i / 3, math.radians(40))
                petal(b, pm, o, d, a2, r * 0.7, r * 0.6, rng, shape=shape_heart, fold=0.3, arch=0.1)
    elif k == "orchid":
        for i in range(5):
            az = rot + 2 * math.pi * i / 5
            d = _dir(axis, x, y, az, math.radians(4))
            petal(b, pm, origin, d, axis, r * (0.9 if i % 2 else 1.0), r * (0.7 if i % 2 else 0.45), rng, fold=0.1, arch=0.1)
        d = _dir(axis, x, y, rot - math.pi / 2, math.radians(-20))
        petal(b, cm, origin, d, axis, r * 0.6, r * 0.55, rng, shape=shape_heart, fold=0.6, arch=0.4, wave=0.3)
    elif k == "iris":
        for i in range(3):
            az = rot + 2 * math.pi * i / 3
            petal(b, pm, origin, _dir(axis, x, y, az, math.radians(10)), axis, r * 1.1, r * 0.55, rng, fold=0.3, arch=0.9, wave=0.2)
            petal(b, pm, origin, _dir(axis, x, y, az + math.pi / 3, math.radians(72)), axis, r * 0.95, r * 0.5, rng, fold=0.4, arch=-0.3, wave=0.25)
        dome(b, cm, origin, axis, r * 0.12, r * 0.05)
    elif k == "daffodil":
        for i in range(6):
            az = rot + 2 * math.pi * i / 6
            petal(b, pm, origin, _dir(axis, x, y, az, math.radians(12)), axis, r, r * 0.55, rng, fold=0.15, arch=0.1)
        pts = [origin + axis * r * t for t in (0.0, 0.2, 0.4, 0.55)]
        tube(b, cm, pts, [r * 0.14, r * 0.2, r * 0.27, r * 0.33], segments=12)
    elif k == "spathe":
        d = _dir(axis, x, y, rot, math.radians(spec.extra.get("elev", 70)))
        petal(b, pm, origin, d, axis, r * 1.2, r * 0.75, rng, shape=spec.extra.get("shape", shape_ovate), fold=0.35, arch=-0.15, nu=4, nv=6)
        pts = curve_points(origin, (axis + d * 0.25).normalized(), r * 0.65, Vector((0, 0, 0)), 3)
        tube(b, cm, pts, [r * 0.06, r * 0.06, r * 0.055, r * 0.04], segments=6)
    elif k == "spike":
        L = r * spec.extra.get("length", 4.0)
        whorls = spec.extra.get("whorls", 10)
        for wi in range(whorls):
            t = wi / max(1, whorls - 1)
            o = origin + axis * L * t
            n = 5
            for i in range(n):
                az = rot + 2 * math.pi * i / n + wi * 0.7
                d = _dir(axis, x, y, az, math.radians(25))
                ln = r * (0.55 - 0.25 * t)
                petal(b, pm, o, d, axis, ln, ln * 0.7, rng, fold=0.5, arch=-0.2, nu=2, nv=2)
    else:
        raise ValueError(k)


def bloom_mats(name, spec: Bloom):
    pm = _flower_mat(f"{name}_petal", spec.color, spec.centre)
    if spec.kind in ("daisy", "lotus") and spec.disc:
        cm = M.matte(spec.disc, 0.6, f"{name}_disc")
    elif spec.kind in ("open5", "trumpet", "spathe", "daffodil", "orchid", "star", "iris"):
        cm = _flower_mat(f"{name}_centre", spec.extra.get("centre_color", spec.centre), spec.extra.get("centre_color", spec.centre))
    else:
        cm = M.matte(spec.disc or (0.8, 0.6, 0.15), 0.6, f"{name}_disc")
    return {"petal": pm, "centre": cm, "anther": M.matte((0.35, 0.12, 0.04), 0.7, f"{name}_anther")}


# ---- lush shrubs ----------------------------------------------------------------------

def lush_shrub(col, root, *, seed, radius, height, leaf_size, leaf_mat, density, bloom_spec: Bloom | None, bloom_amount, buds, name,
               upright=False, leaflets=2, core=True, bloom_scale=1.0, stems_per_m2=320, stem_color=(0.12, 0.1, 0.045)):
    """A full, leafy bush: radiating woody stems clothed in leaves all the way
    along, a dark inner core so it never reads as twigs, and blooms at the
    stem tips (with buds when it is still coming into flower)."""
    rng = Rng(seed)
    b = Builder()
    leaves = Builder()
    stem_mat = PM.stem(f"{name}_stem", stem_color, 0.6)
    n = max(10, int(stems_per_m2 * math.pi * radius * radius * density))
    mats = bloom_mats(name, bloom_spec) if bloom_spec else None
    tips = []
    # young and slender plants have slender stems
    sk = max(0.3, min(1.0, height / 0.5)) * (0.55 if upright else 1.0)
    for i in range(n):
        a = rng.uniform(0, 2 * math.pi)
        rr = radius * math.sqrt(rng.random()) * 0.92
        top = Vector((math.cos(a) * rr, math.sin(a) * rr, 0))
        h = height * math.sqrt(max(0.08, 1 - (rr / radius) ** 2)) * rng.uniform(0.75, 1.0)
        if upright:
            h = height * rng.uniform(0.7, 1.0)
        top.z = h
        base = Vector((top.x * 0.25, top.y * 0.25, 0))
        pts = curve_points(base, (top - base).normalized(), (top - base).length, Vector((0, 0, 0)), n=3)
        tube(b, stem_mat, pts, [r_ * sk for r_ in (0.006, 0.005, 0.0035, 0.0025)], segments=5, var=rng.random())
        d = (top - base).normalized()
        steps = 6
        for k in range(steps):
            t = 0.3 + 0.7 * k / steps
            p = base.lerp(top, t)
            _leaf_cluster(leaves, leaf_mat, p, (d + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.25))).normalized(), leaf_size, rng, n=leaflets)
        tips.append((top, d))
    if core and radius > 0.12:
        # a dark heart, clothed in leaves all over, so the bush reads full from every side
        cr, ch = radius * 0.7, height * (0.38 if upright else 0.62)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1.0)
        for v in bm.verts:
            v.co = Vector((v.co.x * cr, v.co.y * cr, max(0.0, v.co.z) * ch))
        o = mesh_object(f"{name}_core", bm, M.matte((0.008, 0.016, 0.005), 1.0, "shrub_core"), col, smooth=True)
        o.parent = root
        area = 2 * math.pi * cr * max(cr, ch)
        for i in range(int(area * 2600 * density)):
            az = rng.uniform(0, 2 * math.pi)
            el = math.asin(rng.uniform(0.0, 1.0))
            nrm = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el)))
            p = Vector((nrm.x * cr, nrm.y * cr, nrm.z * ch)) * rng.uniform(0.96, 1.04)
            _leaf_cluster(leaves, leaf_mat, p, (nrm + Vector((0, 0, 0.3))).normalized(), max(leaf_size, 0.028), rng, n=1)
    if bloom_spec and (bloom_amount > 0 or buds > 0):
        for i in range(len(tips) - 1, 0, -1):
            j = int(rng.random() * (i + 1))
            tips[i], tips[j] = tips[j], tips[i]
        nb = int(len(tips) * bloom_amount * bloom_spec.extra.get("per_tip", 0.55))
        nbud = int(len(tips) * buds * 0.3)
        for j, (top, d) in enumerate(tips[: nb + nbud]):
            ax = (d * 0.5 + UP + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4) - 0.3, 0))).normalized()
            if j < nb:
                bloom(leaves, bloom_spec, mats, top + ax * 0.01, ax, rng, bloom_scale * rng.uniform(0.85, 1.1))
            else:
                bud(leaves, mats["petal"], top, ax, bloom_spec.radius * 0.55, bloom_spec.radius * 0.35, rng)
    wood = b.finish(f"{name}_stems", col)
    wood.parent = root
    fol = leaves.finish(f"{name}_leaves", col)
    fol.parent = root
    return root


def scapes(col, root, *, spec: Bloom, name, count, blooms_per, buds_per, height, rng, spread=0.06, lean=0.18, face_out=0.8):
    """Flower stalks rising from a clump (lilies, tulips, daffodils, iris,
    lotus): each carries its open blooms near the top on short pedicels,
    facing outward, and its buds above them."""
    b = Builder()
    stem = PM.stem(f"{name}_scape")
    mats = bloom_mats(name, spec)
    for s in range(count):
        a = rng.uniform(0, 6.28) if count > 1 else 0.3
        basep = Vector((math.cos(a) * spread * rng.random(), math.sin(a) * spread * rng.random(), 0))
        hh = height * rng.uniform(0.85, 1.05)
        dirv = Vector((math.cos(a) * lean, math.sin(a) * lean, 1)).normalized()
        pts = curve_points(basep, dirv, hh, Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, 0)), 6)
        tube(b, stem, pts, [0.007, 0.0065, 0.006, 0.0055, 0.005, 0.0045, 0.004], segments=6)
        top = pts[-1]
        for k in range(blooms_per):
            # blooms turn toward the viewer (the camera looks from -Y), as a gardener would plant them
            az = -math.pi / 2 + (k - (blooms_per - 1) / 2) * 0.95 + rng.uniform(-0.45, 0.45)
            out = Vector((math.cos(az), math.sin(az), 0))
            ped = top - dirv * (hh * 0.05 * k) + out * spec.radius * 0.35
            tube(b, stem, [top - dirv * (hh * 0.05 * k), ped], [0.003, 0.003], segments=4)
            ax = (out * face_out + UP * (1.2 - face_out)).normalized()
            bloom(b, spec, mats, ped, ax, rng, rng.uniform(0.9, 1.05))
        for k in range(buds_per):
            ax = (dirv + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), 0.2))).normalized()
            bud(b, mats["petal"], top + dirv * 0.01 * k, ax, spec.radius * 0.7, spec.radius * 0.3, rng)
    o = b.finish(f"{name}_scapes", col)
    o.parent = root
    return o
