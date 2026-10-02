"""Plants, built leaf by leaf. Every builder returns a root Empty at the
pot's base centre (origin), so the renderer can drop it on any slot."""
import math
import bpy
from mathutils import Matrix, Vector

from . import plant_materials as PM
from .common import DEG, Rng, link
from .geo import (Builder, curve_points, disc, frame_at, lathe, leaf, shape_heart, shape_lanceolate,
                  shape_leaflet, shape_ovate, shape_sword, tube)


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


def _attach(obj, root):
    obj.parent = root


# ---- pots ---------------------------------------------------------------------

def pot(kind, height, radius, col, root, name="pot"):
    """kind: 'terracotta' (tapered with rolled rim), 'cylinder_glazed',
    'bowl'. Returns the soil height."""
    b = Builder()
    rng = Rng(int(height * 1000 + radius * 100))
    if kind == "terracotta":
        mat = PM.terracotta_pot()
        rb, rt, rim = radius * 0.72, radius, 0.06 * height + 0.012
        prof = [(0.0, 0.0), (rb - 0.01, 0.0), (rb, 0.006), (rt * 0.97, height - rim),
                (rt + 0.012, height - rim + 0.004), (rt + 0.014, height - 0.006), (rt + 0.006, height),
                (rt - 0.012, height - 0.002), (rt - 0.016, height - rim * 0.7), (rt * 0.92, height - rim - 0.02)]
        soil_z = height - rim - 0.03
    elif kind == "cylinder_glazed":
        mat = PM.glazed_pot("pot_ivory", (0.72, 0.68, 0.6))
        prof = [(0.0, 0.0), (radius - 0.02, 0.0), (radius, 0.02), (radius, height - 0.012), (radius - 0.006, height),
                (radius - 0.016, height - 0.004), (radius - 0.018, height - 0.05)]
        soil_z = height - 0.05
    elif kind == "cylinder_charcoal":
        mat = PM.glazed_pot("pot_charcoal", (0.05, 0.048, 0.045), 0.32)
        prof = [(0.0, 0.0), (radius - 0.02, 0.0), (radius, 0.02), (radius * 1.02, height - 0.012), (radius * 1.02 - 0.006, height),
                (radius * 1.02 - 0.016, height - 0.004), (radius - 0.018, height - 0.05)]
        soil_z = height - 0.05
    else:  # bowl (hanging)
        mat = PM.terracotta_pot("terracotta_bowl", (0.34, 0.13, 0.06))
        prof = [(0.0, 0.0), (radius * 0.45, 0.0), (radius * 0.85, height * 0.35), (radius, height * 0.8),
                (radius + 0.01, height), (radius - 0.008, height), (radius * 0.9, height * 0.75)]
        soil_z = height * 0.72
    lathe(b, mat, prof, 64)
    sr = (radius * 0.92 if kind != "bowl" else radius * 0.88)
    disc(b, PM.soil(), sr, soil_z, rings=7, segments=48, jitter=0.006, rng=rng)
    obj = b.finish(name, col)
    _attach(obj, root)
    return soil_z


# ---- snake plant ---------------------------------------------------------------

def snake_plant(col, seed=3, height=0.85, pot_kind="cylinder_glazed"):
    root = _root("snake_plant", col)
    rng = Rng(seed)
    pz = pot(pot_kind, 0.36, 0.17, col, root)
    b = Builder()
    mat = PM.leaf("snake_leaf", (0.018, 0.045, 0.02), (0.04, 0.075, 0.03), 0.38, 0.12, "snake",
                  margin=(0.42, 0.36, 0.06))
    n = 13
    for i in range(n):
        a = rng.uniform(0, 2 * math.pi)
        r = rng.uniform(0.0, 0.09)
        base = Vector((math.cos(a) * r, math.sin(a) * r, pz - 0.01))
        lean = rng.uniform(0.04, 0.32) * (0.6 + r * 5)
        fwd = Vector((math.cos(a) * lean, math.sin(a) * lean, 1.0)).normalized()
        f = frame_at(base, fwd, Vector((math.cos(a + 1.6), math.sin(a + 1.6), 0)))
        L = height * rng.uniform(0.55, 1.0)
        leaf(b, mat, f, L, rng.uniform(0.055, 0.085), shape_sword, nu=8, nv=18,
             fold=rng.uniform(0.15, 0.35), arch=rng.uniform(-0.15, 0.25), twist=rng.uniform(-0.6, 0.6),
             wave=0.08, wave_freq=7.0, var=rng.random())
    obj = b.finish("snake_leaves", col, thickness=0.004)
    _attach(obj, root)
    root["sway"] = {"amp": 0.25, "speed": 0.6}
    return root


# ---- areca palm ------------------------------------------------------------------

def areca_palm(col, seed=7, height=1.6):
    """Clump of yellow-green canes; each carries 1-2 arching fronds of
    narrow, drooping leaflets (real areca proportions: fronds 0.7-1.0 m,
    leaflets 0.2-0.35 m)."""
    root = _root("areca_palm", col)
    rng = Rng(seed)
    pz = pot("terracotta", 0.46, 0.24, col, root)
    b = Builder()
    cane = PM.stem("areca_cane", (0.17, 0.19, 0.055), 0.5)
    rachis_mat = PM.stem("areca_rachis", (0.11, 0.15, 0.04), 0.5)
    leaflet_mat = PM.leaf("areca_leaflet", (0.035, 0.08, 0.018), (0.085, 0.14, 0.03), 0.42, 0.38)
    ncanes = 9
    for k in range(ncanes):
        a = k * 2.39996 + rng.uniform(-0.3, 0.3)
        r = rng.uniform(0.02, 0.12)
        outward = Vector((math.cos(a), math.sin(a), 0))
        base = Vector((math.cos(a) * r, math.sin(a) * r, pz))
        h = height * rng.uniform(0.45, 0.8)
        lean = rng.uniform(0.05, 0.25)
        pts = curve_points(base, (Vector((0, 0, 1)) + outward * lean).normalized(), h * 0.55, outward * 0.12, 10)
        tube(b, cane, pts, [0.014 * (1 - 0.45 * i / 10) for i in range(11)], 8, rng.random())
        for fr in range(1 if k % 3 else 2):
            top = pts[-1] if fr == 0 else pts[7]
            fa = a + (0 if fr == 0 else rng.uniform(1.2, 2.2))
            fo = Vector((math.cos(fa), math.sin(fa), 0))
            L = rng.uniform(0.7, 1.0) * (height / 1.6) * (0.75 if fr else 1.0)
            rise = rng.uniform(0.55, 0.85)
            rach = []
            for i in range(17):
                t = i / 16
                rach.append(top + Vector((0, 0, 1)) * (L * rise * t) + fo * (L * 0.75 * t)
                            + Vector((0, 0, -1)) * (L * (rise + 0.25) * t * t))
            tube(b, rachis_mat, rach, [0.006 * (1 - 0.75 * i / 16) for i in range(17)], 6, rng.random())
            side = fo.cross(Vector((0, 0, 1))).normalized()
            npairs = 28
            for i in range(3, npairs):
                t = i / npairs
                idx = min(15, int(t * 16))
                p = rach[idx].lerp(rach[idx + 1], t * 16 - idx)
                tang = (rach[idx + 1] - rach[idx]).normalized()
                ll = 0.32 * (height / 1.6) * math.sin(math.pi * (0.1 + 0.85 * t)) ** 0.6
                for sgn in (-1, 1):
                    dirn = (tang * 0.75 + side * sgn * 0.75 + Vector((0, 0, -0.25 - 0.3 * t))).normalized()
                    f = frame_at(p, dirn, Vector((0, 0, 1)))
                    leaf(b, leaflet_mat, f, ll * rng.uniform(0.85, 1.05), 0.022, shape_leaflet, nu=4, nv=8, fold=0.6,
                         arch=0.7 + rng.uniform(0, 0.5), twist=sgn * 0.25, var=rng.random(), droop_tip=0.5)
    obj = b.finish("areca_fronds", col, thickness=0.001)
    _attach(obj, root)
    root["sway"] = {"amp": 1.0, "speed": 0.45}
    return root


# ---- peace lily: the focus plant -----------------------------------------------------

# focus minutes → visual stage
LILY_STAGES = [
    {"id": "seedling", "minutes": 0, "leaves": 3, "size": 0.12, "flowers": 0, "pot": (0.17, 0.11)},
    {"id": "small", "minutes": 25, "leaves": 7, "size": 0.21, "flowers": 0, "pot": (0.21, 0.13)},
    {"id": "growing", "minutes": 45, "leaves": 13, "size": 0.28, "flowers": 0, "pot": (0.3, 0.17)},
    {"id": "mature", "minutes": 60, "leaves": 21, "size": 0.33, "flowers": 0, "pot": (0.3, 0.17)},
    {"id": "flowering", "minutes": 90, "leaves": 24, "size": 0.35, "flowers": 5, "pot": (0.3, 0.17)},
]


def peace_lily(col, stage=4, wilted=False, seed=11):
    st = LILY_STAGES[stage]
    root = _root(f"peace_lily_{st['id']}{'_wilted' if wilted else ''}", col)
    rng = Rng(seed)
    pz = pot("terracotta", st["pot"][0], st["pot"][1], col, root)
    b = Builder()
    leaf_mat = PM.leaf("lily_leaf", (0.012, 0.04, 0.012), (0.03, 0.08, 0.022), 0.28, 0.22, gloss_coat=0.35)
    stem_mat = PM.stem("lily_petiole", (0.05, 0.11, 0.03))
    spathe = PM.leaf("lily_spathe", (0.72, 0.74, 0.66), (0.85, 0.86, 0.8), 0.35, 0.45, dry_color=(0.45, 0.4, 0.25))
    spadix = PM.stem("lily_spadix", (0.62, 0.55, 0.32), 0.7)
    n = st["leaves"] - (3 if wilted and st["leaves"] > 6 else (1 if wilted else 0))
    size = st["size"]
    golden = 2.39996
    for i in range(n):
        a = i * golden + rng.uniform(-0.2, 0.2)
        young = i >= n - 2  # the newest leaves stand more upright
        tilt = (0.2 if young else rng.uniform(0.35, 1.0) * (0.55 if stage < 2 else 1.0)) + (0.45 if wilted else 0.0)
        pl = size * rng.uniform(0.45, 0.75) * (0.75 if young else 1.0)
        out = Vector((math.cos(a), math.sin(a), 0))
        base = Vector((math.cos(a) * 0.01, math.sin(a) * 0.01, pz))
        stem_dir = (Vector((0, 0, 1)) * math.cos(tilt) + out * math.sin(tilt)).normalized()
        sag = -0.2 if not wilted else -0.55
        pts = curve_points(base, stem_dir, pl, out * 0.15 + Vector((0, 0, sag)), 8)
        dry = (0.55 + rng.uniform(0, 0.3)) if wilted else rng.uniform(0, 0.06)
        tube(b, stem_mat, pts, [0.0035 + 0.003 * size for _ in pts], 6, rng.random(), dry)
        tip = pts[-1]
        d = (pts[-1] - pts[-2]).normalized()
        blade_dir = (d + Vector((0, 0, 0.35 if not wilted else -0.6))).normalized()
        f = frame_at(tip, blade_dir, Vector((0, 0, 1)))
        L = size * rng.uniform(0.8, 1.05) * (0.8 if young else 1.0)
        leaf(b, leaf_mat, f, L, L * 0.4, shape_lanceolate, nu=10, nv=16, fold=0.22,
             arch=(0.7 if not wilted else 1.6) + rng.uniform(0, 0.3), twist=rng.uniform(-0.25, 0.25),
             wave=0.06, wave_freq=8.0, var=rng.random(), dry=dry, droop_tip=0.3 if not wilted else 0.9)
    for k in range(st["flowers"] if not wilted else max(0, st["flowers"] - 2)):
        a = k * 2.0 + 0.8
        out = Vector((math.cos(a), math.sin(a), 0))
        h = size * rng.uniform(1.25, 1.5)
        pts = curve_points(Vector((0, 0, pz)), (Vector((0, 0, 1)) + out * 0.2).normalized(), h, out * 0.12, 10)
        tube(b, stem_mat, pts, [0.0035 for _ in pts], 6, rng.random())
        top = pts[-1]
        f = frame_at(top - Vector((0, 0, 0.01)), (Vector((0, 0, 1)) + out * 0.35).normalized(), -out)
        leaf(b, spathe, f, 0.11, 0.065, shape_ovate, nu=10, nv=12, fold=1.1, arch=-0.35, twist=0.1,
             var=rng.random(), dry=0.4 if wilted else 0.0)
        sp = curve_points(top, (Vector((0, 0, 1)) + out * 0.5).normalized(), 0.045, Vector((0, 0, 0)), 5)
        tube(b, spadix, sp, [0.0055, 0.006, 0.006, 0.0055, 0.0045, 0.002], 8, rng.random())
    obj = b.finish("lily_leaves", col, thickness=0.0012)
    _attach(obj, root)
    root["sway"] = {"amp": 0.6, "speed": 0.55}
    return root


# ---- golden pothos in a hanging bowl ---------------------------------------------------

def pothos_hanging(col, seed=5, drop=1.0):
    """Origin = ceiling hook; the bowl hangs `drop` metres below it. Golden
    pothos: a full mound of heart-shaped leaves and a few leafy trailing
    vines (leaves every few centimetres, never bare strings)."""
    root = _root("pothos_hanging", col)
    rng = Rng(seed)
    bowl = bpy.data.objects.new("bowl_root", None)
    link(bowl, col)
    bowl.parent = root
    bowl.location = (0, 0, -drop)
    pz = pot("bowl", 0.17, 0.17, col, bowl, "hanging_bowl")
    b = Builder()
    cord = PM.stem("jute_cord", (0.32, 0.24, 0.13), 0.9)
    for k in range(3):
        a = k * 2.094 + 0.3
        tube(b, cord, [Vector((0, 0, 0)), Vector((math.cos(a) * 0.165, math.sin(a) * 0.165, -drop + 0.16))], [0.0035, 0.0035], 6)
    leaf_mat = PM.leaf("pothos_leaf", (0.03, 0.075, 0.012), (0.07, 0.13, 0.02), 0.3, 0.25, gloss_coat=0.2,
                       variegation=(0.45, 0.42, 0.08))
    vine = PM.stem("pothos_vine", (0.07, 0.13, 0.03))
    z0 = -drop + pz
    # the mound: three rings of leaves spilling over the rim
    for ring, (count, rad, up, L0) in enumerate(((10, 0.05, 0.85, 0.1), (14, 0.12, 0.35, 0.11), (16, 0.17, -0.25, 0.1))):
        for i in range(count):
            a = i * 2 * math.pi / count + ring * 0.4 + rng.uniform(-0.15, 0.15)
            out = Vector((math.cos(a), math.sin(a), 0))
            base = Vector((math.cos(a) * rad, math.sin(a) * rad, z0 + 0.04 - ring * 0.03))
            d = (out * (1 - abs(up)) + Vector((0, 0, up))).normalized()
            L = L0 * rng.uniform(0.85, 1.15)
            leaf(b, leaf_mat, frame_at(base, d), L, L * 0.82, shape_heart, nu=8, nv=10, fold=0.2, arch=0.7,
                 twist=rng.uniform(-0.4, 0.4), var=rng.random())
    # trailing vines with dense leaves
    for v in range(6):
        a = v * 1.05 + rng.uniform(0, 0.4)
        out = Vector((math.cos(a), math.sin(a), 0))
        length = rng.uniform(0.25, 0.6)
        p = Vector((math.cos(a) * 0.17, math.sin(a) * 0.17, z0 + 0.02))
        pts = [p.copy()]
        for i in range(12):
            t = (i + 1) / 12
            p = p + out * (0.03 * (1 - t)) + Vector((0, 0, -length / 12)) + Vector((rng.uniform(-0.008, 0.008), rng.uniform(-0.008, 0.008), 0))
            pts.append(p.copy())
        tube(b, vine, pts, [0.003 for _ in pts], 5, rng.random())
        for i in range(1, len(pts)):
            side = out.cross(Vector((0, 0, 1))) * (1 if i % 2 else -1)
            d = (side * 0.7 + out * 0.6 + Vector((0, 0, 0.15))).normalized()
            L = rng.uniform(0.065, 0.09) * (1.0 - 0.35 * i / len(pts))
            leaf(b, leaf_mat, frame_at(pts[i], d), L, L * 0.82, shape_heart, nu=8, nv=10, fold=0.2, arch=0.8,
                 twist=rng.uniform(-0.5, 0.5), var=rng.random())
    obj = b.finish("pothos", col, thickness=0.001)
    _attach(obj, root)
    root["sway"] = {"amp": 0.8, "speed": 0.35, "pivot": "top"}
    return root


# ---- holy basil (tulsi) --------------------------------------------------------------

def tulsi(col, seed=21, height=0.55):
    """Holy basil: a dense, branching bush of small ovate leaves with
    purple-green stems and flower spikes (manjari) at the tips."""
    root = _root("tulsi", col)
    rng = Rng(seed)
    pz = pot("terracotta", 0.32, 0.19, col, root)
    b = Builder()
    leaf_mat = PM.leaf("tulsi_leaf", (0.025, 0.055, 0.012), (0.06, 0.1, 0.025), 0.5, 0.32)
    stem_mat = PM.stem("tulsi_stem", (0.1, 0.055, 0.05), 0.6)
    spike_mat = PM.stem("tulsi_spike", (0.18, 0.07, 0.11), 0.7)

    def branch(start, direction, length, depth):
        pts = curve_points(start, direction, length, Vector((0, 0, 0.12)) + direction * -0.05, 8)
        tube(b, stem_mat, pts, [0.0045 * (1 - 0.5 * i / 8) * (0.7 ** depth) for i in range(9)], 6, rng.random())
        for i in range(2, 9):
            for k in range(2):
                ang = rng.uniform(0, 6.28)
                d = (Vector((math.cos(ang), math.sin(ang), 0.35)) + direction * 0.3).normalized()
                L = rng.uniform(0.032, 0.05) * (1.1 - 0.3 * i / 8)
                leaf(b, leaf_mat, frame_at(pts[i], d), L, L * 0.6, shape_ovate, nu=6, nv=7, fold=0.3, arch=0.55,
                     twist=rng.uniform(-0.4, 0.4), var=rng.random(), wave=0.05)
        if depth < 1:
            for i in (3, 5, 7):
                ang = rng.uniform(0, 6.28)
                d = (direction + Vector((math.cos(ang), math.sin(ang), 0)) * 0.7).normalized()
                branch(pts[i], d, length * rng.uniform(0.35, 0.55), depth + 1)
        tip = pts[-1]
        spike = curve_points(tip, direction, 0.06, Vector((0, 0, 0.02)), 6)
        tube(b, spike_mat, spike, [0.0035, 0.004, 0.0038, 0.0034, 0.003, 0.0022, 0.001], 6, rng.random())

    for s in range(9):
        a = s * 2.39996 + rng.uniform(0, 0.3)
        out = Vector((math.cos(a), math.sin(a), 0))
        d = (Vector((0, 0, 1)) + out * rng.uniform(0.2, 0.55)).normalized()
        branch(Vector((math.cos(a) * 0.03, math.sin(a) * 0.03, pz)), d, height * rng.uniform(0.6, 1.0), 0)
    obj = b.finish("tulsi_leaves", col, thickness=0.0008)
    _attach(obj, root)
    root["sway"] = {"amp": 0.5, "speed": 0.7}
    return root


BUILDERS = {
    "snake_plant": snake_plant,
    "areca_palm": areca_palm,
    "peace_lily": peace_lily,
    "pothos_hanging": pothos_hanging,
    "tulsi": tulsi,
}
