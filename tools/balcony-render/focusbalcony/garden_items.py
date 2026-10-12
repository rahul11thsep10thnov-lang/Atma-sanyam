"""Everything that can stand in the garden. Builders return a root Empty at
the object's base centre, front toward -Y. Growable plants take `stage`
(0 seed … 4 flowering) and `wilted`; lit things take `lit`."""
import math
import bmesh
import bpy
from mathutils import Matrix, Vector

from . import materials as M
from . import plant_materials as PM
from . import plants, trees, decor, textiles, ground
from .common import DEG, Rng, box, cylinder, link, mesh_object
from .geo import Builder, curve_points, disc, frame_at, lathe, leaf, shape_lanceolate, shape_ovate, shape_sword, tube
from .trees import TreeSpec, build_tree, shrub, _flower_mat, bark


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


def _p(o, root):
    o.parent = root
    return o


# ---- growable garden plants ---------------------------------------------------------
# stage: 0 seed (soil mound + stake), 1 sprout, 2 young, 3 mature, 4 flowering

GROWTH_STAGES = [
    {"id": "seed", "minutes": 0},
    {"id": "sprout", "minutes": 25},
    {"id": "young", "minutes": 60},
    {"id": "mature", "minutes": 120},
    {"id": "flowering", "minutes": 240},
]


def _mound(col, root, radius=0.22, seed=1):
    """A low mound of turned soil, as if freshly planted."""
    rng = Rng(seed)
    b = Builder()
    disc(b, ground.soil(), radius, 0.012, rings=6, segments=36, jitter=0.012, rng=rng)
    o = b.finish("mound", col)
    _p(o, root)


def _stake(col, root, height=0.35):
    """A bamboo cane with a jute tag — the seed's marker."""
    cane = M.wood((0.45, 0.36, 0.18), (0.72, 0.6, 0.32), 0.5, 20.0, "bamboo")
    _p(cylinder("stake", 0.006, height, (0.05, 0.04, height / 2), cane, col, verts=8), root)
    tag = M.matte((0.72, 0.64, 0.5), 0.85, "jute_tag")
    t = box("tag", (0.045, 0.002, 0.03), (0.05, 0.035, height - 0.04), tag, col)
    t.rotation_euler = (0, 0.2, 0)
    _p(t, root)


def _grow_shrub(col, root, stage, wilted, seed, flower, size, leaf_size, name, leaf_mat=None, flower_layers=2):
    if stage == 0:
        _mound(col, root, 0.2, seed)
        _stake(col, root)
        return
    scale = [0, 0.22, 0.55, 0.85, 1.0][stage]
    r = size[0] * scale
    h = size[1] * scale
    dens = [0, 0.5, 0.8, 1.0, 1.0][stage]
    s = shrub(col, seed=seed, radius=max(0.08, r), height=max(0.1, h), leaf_size=leaf_size * (0.7 + 0.3 * scale),
              flower=flower if (stage >= 4 and not wilted) else None, flower_density=0.75 if stage >= 4 else 0.0,
              name=name, leaf_mat=leaf_mat, dry=0.75 if wilted else 0.0, droop=0.9 if wilted else 0.0, density=dens)
    s.parent = root
    if stage == 1:
        _mound(col, root, 0.16, seed)
        _stake(col, root, 0.28)
    elif wilted:
        _mound(col, root, 0.14, seed)


def marigold(col, stage=4, wilted=False, seed=21):
    root = _root("marigold", col)
    pz = plants.pot("terracotta", 0.24, 0.15, col, root)
    sub = bpy.data.objects.new("marigold_top", None)
    link(sub, col)
    sub.parent = root
    sub.location = (0, 0, pz)
    _grow_shrub(col, sub, stage, wilted, seed, (0.95, 0.5, 0.05), (0.26, 0.34), 0.03, "marigold_plant",
                leaf_mat=PM.leaf("marigold_leaf", (0.04, 0.09, 0.02), (0.11, 0.2, 0.05), 0.5, 0.35))
    root["sway"] = {"amp": 0.4, "speed": 0.6}
    return root


def hibiscus(col, stage=4, wilted=False, seed=22):
    root = _root("hibiscus", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.85, 0.12, 0.08), (0.55, 0.95), 0.06, "hibiscus_plant",
                leaf_mat=PM.leaf("hibiscus_leaf", (0.035, 0.085, 0.02), (0.1, 0.2, 0.05), 0.35, 0.3, gloss_coat=0.15))
    root["sway"] = {"amp": 0.3, "speed": 0.5}
    return root


def rose_bush(col, stage=4, wilted=False, seed=23):
    root = _root("rose_bush", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.75, 0.05, 0.08), (0.45, 0.7), 0.04, "rose_plant",
                leaf_mat=PM.leaf("rose_leaf", (0.03, 0.07, 0.02), (0.08, 0.16, 0.04), 0.4, 0.3), flower_layers=3)
    root["sway"] = {"amp": 0.3, "speed": 0.55}
    return root


def jasmine(col, stage=4, wilted=False, seed=24):
    root = _root("jasmine", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.98, 0.98, 0.92), (0.5, 0.75), 0.04, "jasmine_plant")
    root["sway"] = {"amp": 0.35, "speed": 0.5}
    return root


def bougainvillea(col, stage=4, wilted=False, seed=25):
    root = _root("bougainvillea", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.9, 0.12, 0.45), (0.7, 1.1), 0.045, "bougainvillea_plant")
    root["sway"] = {"amp": 0.3, "speed": 0.45}
    return root


GROWABLE = {"marigold": marigold, "hibiscus": hibiscus, "rose_bush": rose_bush, "jasmine": jasmine, "bougainvillea": bougainvillea}


# ---- other plants ------------------------------------------------------------------

def croton(col, seed=31):
    root = _root("croton", col)
    lm = PM.leaf("croton_leaf", (0.08, 0.1, 0.02), (0.5, 0.35, 0.05), 0.3, 0.25, gloss_coat=0.3, variegation=(0.8, 0.2, 0.08))
    s = shrub(col, seed=seed, radius=0.4, height=0.8, leaf_size=0.11, name="croton_plant", leaf_mat=lm, density=0.7)
    s.parent = root
    root["sway"] = {"amp": 0.25, "speed": 0.5}
    return root


def banana_plant(col, seed=32, height=2.2):
    """A dwarf banana: a pale pseudostem and a few huge paddle leaves."""
    rng = Rng(seed)
    root = _root("banana", col)
    b = Builder()
    stem = PM.stem("banana_stem", (0.3, 0.38, 0.12), 0.5)
    pts = curve_points(Vector((0, 0, 0)), Vector((0, 0, 1)), height * 0.5, Vector((0.02, 0.01, 0)), 6)
    tube(b, stem, pts, [0.1, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04], segments=14)
    lm = PM.leaf("banana_leaf", (0.05, 0.12, 0.03), (0.16, 0.3, 0.07), 0.3, 0.45, gloss_coat=0.2)
    top = pts[-1]
    for i in range(7):
        a = i * 2.2 + rng.uniform(-0.3, 0.3)
        d = Vector((math.cos(a), math.sin(a), 0.9 - 0.2 * i)).normalized()
        frame = frame_at(top - Vector((0, 0, 0.05 * i)), d)
        leaf(b, lm, frame, height * rng.uniform(0.45, 0.6), height * 0.2, shape_sword, nu=6, nv=12, fold=0.35,
             arch=0.9 + 0.15 * i, wave=0.08, wave_freq=16, var=rng.random())
    o = b.finish("banana_mesh", col)
    _p(o, root)
    root["sway"] = {"amp": 0.5, "speed": 0.35}
    return root


def lemon_tree(col, seed=33, height=1.7):
    spec = TreeSpec(height=height, trunk_radius=0.045, levels=3, children=(3, 4), spread=50, up=0.3, leaf_size=0.06,
                    leaves_per_m=260, crown_start=0.4, leaf_mat=PM.leaf("lemon_leaf", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 0.3, 0.3, gloss_coat=0.25))
    root = build_tree(col, spec, seed, "lemon")
    rng = Rng(seed + 1)
    fruit = M.matte((0.9, 0.75, 0.08), 0.35, "lemon_skin")
    for i in range(14):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.25, 0.6)
        z = rng.uniform(height * 0.5, height * 0.95)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.035)
        for v in bm.verts:
            v.co.z *= 1.25
        o = mesh_object(f"lemon_{i}", bm, fruit, col, smooth=True)
        o.location = (math.cos(a) * r, math.sin(a) * r, z)
        _p(o, root)
    return root


def ornamental_grass(col, seed=34):
    """Fountain grass: hundreds of thin arching blades and feathery plumes."""
    rng = Rng(seed)
    root = _root("ornamental_grass", col)
    b = Builder()
    lm = PM.leaf("fountain_grass", (0.12, 0.16, 0.04), (0.35, 0.4, 0.14), 0.5, 0.35)
    plume = M.matte((0.55, 0.42, 0.3), 0.8, "plume")
    for i in range(220):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0, 0.12)
        d = Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 1.0)).normalized()
        frame = frame_at(Vector((math.cos(a) * r, math.sin(a) * r, 0)), d)
        L = rng.uniform(0.45, 0.8)
        leaf(b, lm, frame, L, 0.008, shape_sword, nu=1, nv=8, fold=0.0, arch=rng.uniform(1.0, 1.8), var=rng.random())
        if i % 6 == 0:
            frame2 = frame_at(Vector((math.cos(a) * r, math.sin(a) * r, 0)), (d + Vector((0, 0, 0.5))).normalized())
            leaf(b, plume, frame2, L * 1.3, 0.03, shape_lanceolate, nu=2, nv=8, fold=0.0, arch=rng.uniform(0.8, 1.4), var=rng.random())
    o = b.finish("grass_mesh", col)
    _p(o, root)
    root["sway"] = {"amp": 0.7, "speed": 0.7}
    return root


def frangipani_small(col, seed=35):
    return trees.frangipani(col, seed=seed, height=2.0)


def mango_sapling(col, seed=36):
    spec = TreeSpec(height=2.4, trunk_radius=0.05, levels=3, children=(3, 4), spread=45, up=0.35, leaf_size=0.14, leaves_per_m=120,
                    crown_start=0.45, leaf_shape=shape_lanceolate, droop=0.4,
                    leaf_mat=PM.leaf("mango_leaf", (0.03, 0.07, 0.02), (0.1, 0.18, 0.05), 0.3, 0.3, gloss_coat=0.3))
    return build_tree(col, spec, seed, "mango")


def ashoka_tree(col, seed=37, height=4.0):
    """Mast tree: a narrow column of drooping glossy leaves."""
    spec = TreeSpec(height=height, trunk_radius=0.07, levels=3, children=(6, 8), spread=78, up=-0.35, length_ratio=0.32,
                    radius_ratio=0.5, leaf_size=0.13, leaves_per_m=260, crown_start=0.08, droop=0.9, leaf_shape=shape_lanceolate,
                    leaf_mat=PM.leaf("ashoka_leaf", (0.03, 0.075, 0.02), (0.09, 0.17, 0.045), 0.3, 0.3, gloss_coat=0.3))
    return build_tree(col, spec, seed, "ashoka")


# ---- the focus tree: kachnar (orchid tree) --------------------------------------------

TREE_STAGES = [
    {"id": "seed", "minutes": 0},
    {"id": "seedling", "minutes": 300},
    {"id": "young", "minutes": 1200},
    {"id": "mature", "minutes": 3000},
    {"id": "large", "minutes": 6000},
    {"id": "flowering", "minutes": 15000},
    {"id": "grand", "minutes": 30000},
]


def kachnar(col, stage=6, wilted=False, seed=41):
    root = _root("kachnar", col)
    lm = PM.leaf("kachnar_leaf", (0.04, 0.09, 0.025), (0.12, 0.22, 0.06), 0.4, 0.35, dry_color=(0.34, 0.24, 0.08))
    dry = 0.75 if wilted else 0.0
    droop = 0.8 if wilted else 0.15
    if stage == 0:
        _mound(col, root, 0.26, seed)
        _stake(col, root, 0.5)
        return root
    if stage == 1:
        _mound(col, root, 0.2, seed)
        b = Builder()
        rng = Rng(seed)
        stem = PM.stem("kachnar_stem")
        pts = curve_points(Vector((0, 0, 0)), Vector((0.05, 0, 1)).normalized(), 0.28, Vector((0.02, 0.01, -0.1 * droop)), 4)
        tube(b, stem, pts, [0.006, 0.005, 0.004, 0.003, 0.002], segments=6)
        for i in range(6):
            t = 0.35 + 0.65 * i / 6
            p = pts[min(4, int(t * 4))]
            d = Vector((math.cos(i * 2.1), math.sin(i * 2.1), 0.5 - droop)).normalized()
            leaf(b, lm, frame_at(p, d), 0.07, 0.06, shape_ovate, nu=3, nv=4, fold=0.2, arch=0.3 + droop, var=rng.random(), dry=dry)
        _p(b.finish("seedling_mesh", col), root)
        _stake(col, root, 0.4)
        root["sway"] = {"amp": 0.6, "speed": 0.6}
        return root
    heights = {2: 1.5, 3: 2.7, 4: 4.0, 5: 4.6, 6: 5.4}
    h = heights[stage]
    bloom = stage >= 5 and not wilted
    spec = TreeSpec(height=h, trunk_radius=0.03 * h / 1.5 if stage < 4 else 0.13 * h / 4.6, levels=3 if stage == 2 else 4,
                    children=(3, 4) if stage <= 3 else (4, 6), spread=50, up=0.25, leaf_size=0.09 if stage > 2 else 0.07,
                    leaves_per_m=170 if stage < 6 else 230, crown_start=0.35, leaf_mat=lm, droop=droop, dry=dry,
                    bare_fraction=0.45 if wilted else 0.0, flower=(0.95, 0.72, 0.85) if bloom else None,
                    flower_density=0.75 if stage == 5 else 0.95)
    t = build_tree(col, spec, seed + stage, "kachnar_tree")
    t.parent = root
    if stage == 2:
        _stake(col, root, 0.9)
    if stage == 6 and not wilted:
        # a small plank swing hangs from a low branch
        rope = PM.stem("jute_rope", (0.45, 0.33, 0.16), 0.9)
        teak = M.wood()
        for x in (-0.22, 0.22):
            _p(cylinder(f"rope_{x}", 0.008, 1.9, (0.9 + x, 0.5, 2.4), rope, col, verts=8), root)
        _p(box("swing_seat", (0.56, 0.2, 0.035), (0.9, 0.5, 1.44), teak, col, bevel=0.006), root)
    root["sway"] = {"amp": 0.18, "speed": 0.35}
    return root


# ---- furniture ------------------------------------------------------------------------

def garden_bench(col, seed=51):
    """Teak slat bench with a gently curved back, 1.5 m."""
    root = _root("garden_bench", col)
    teak = M.wood((0.12, 0.07, 0.035), (0.34, 0.22, 0.11), 0.5, 4.0, "bench_teak")
    for x in (-0.68, 0.68):
        for y in (-0.22, 0.2):
            _p(box(f"leg_{x}_{y}", (0.05, 0.05, 0.42), (x, y, 0.21), teak, col, bevel=0.004), root)
        _p(box(f"arm_{x}", (0.05, 0.5, 0.04), (x, 0.0, 0.62), teak, col, bevel=0.004), root)
        _p(box(f"armpost_{x}", (0.04, 0.04, 0.22), (x, -0.2, 0.51), teak, col, bevel=0.003), root)
        _p(box(f"backpost_{x}", (0.05, 0.05, 0.5), (x, 0.24, 0.65), teak, col, bevel=0.004), root).rotation_euler = (-0.12, 0, 0)
    for i in range(5):
        _p(box(f"seat_{i}", (1.5, 0.08, 0.03), (0, -0.2 + i * 0.1, 0.44), teak, col, bevel=0.004), root)
    for i in range(3):
        s = _p(box(f"back_{i}", (1.5, 0.03, 0.08), (0, 0.26 + i * 0.012, 0.6 + i * 0.13), teak, col, bevel=0.004), root)
        s.rotation_euler = (-0.12, 0, 0)
    return root


def iron_bench(col, seed=52):
    """Cast-iron ends with scrolled arms, painted teak slats."""
    root = _root("iron_bench", col)
    iron = M.powder_coat((0.03, 0.03, 0.032), 0.45, "cast_iron")
    slat = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.55, 4.0, "bench_slat")
    for x in (-0.62, 0.62):
        for y in (-0.2, 0.2):
            _p(cylinder(f"leg_{x}_{y}", 0.016, 0.42, (x, y, 0.21), iron, col, verts=10), root)
        _p(cylinder(f"arm_{x}", 0.014, 0.44, (x, 0.0, 0.64), iron, col, verts=10), root).rotation_euler = (90 * DEG, 0, 0)
        _p(cylinder(f"armpost_{x}", 0.013, 0.22, (x, -0.2, 0.53), iron, col, verts=10), root)
        _p(cylinder(f"back_{x}", 0.016, 0.5, (x, 0.22, 0.66), iron, col, verts=10), root).rotation_euler = (-0.1, 0, 0)
        # a scroll: a torus end on the arm
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=True, radius=0.04, segments=18)
        o = mesh_object(f"scroll_{x}", bm, iron, col)
        o.location = (x, -0.22, 0.64)
        o.rotation_euler = (0, 90 * DEG, 0)
        sol = o.modifiers.new("t", "SOLIDIFY")
        sol.thickness = 0.02
        _p(o, root)
    for i in range(6):
        _p(box(f"seat_{i}", (1.38, 0.06, 0.025), (0, -0.19 + i * 0.075, 0.44), slat, col, bevel=0.003), root)
    for i in range(3):
        _p(box(f"back_{i}", (1.38, 0.025, 0.06), (0, 0.245 + i * 0.011, 0.6 + i * 0.12), slat, col, bevel=0.003), root).rotation_euler = (-0.1, 0, 0)
    return root


def wooden_swing(col, seed=53):
    """A jhoola: teak A-frame, a slatted seat on ropes."""
    root = _root("wooden_swing", col)
    teak = M.wood((0.12, 0.07, 0.035), (0.34, 0.22, 0.11), 0.5, 4.0, "swing_teak")
    rope = PM.stem("swing_rope", (0.45, 0.33, 0.16), 0.9)
    H = 2.2
    for x in (-0.9, 0.9):
        for y in (-0.55, 0.55):
            p = _p(box(f"leg_{x}_{y}", (0.07, 0.07, H + 0.1), (x, y * 0.5, H / 2), teak, col, bevel=0.005), root)
            p.rotation_euler = (-math.atan2(y, H) * 1.0, 0, 0)
    _p(box("beam", (2.0, 0.08, 0.1), (0, 0, H + 0.02), teak, col, bevel=0.006), root)
    for x in (-0.45, 0.45):
        _p(cylinder(f"rope_{x}", 0.009, H - 0.55, (x, 0, (H - 0.55) / 2 + 0.5), rope, col, verts=8), root)
    for i in range(6):
        _p(box(f"seat_{i}", (1.0, 0.07, 0.03), (0, -0.2 + i * 0.08, 0.5), teak, col, bevel=0.004), root)
    for i in range(3):
        _p(box(f"back_{i}", (1.0, 0.03, 0.07), (0, 0.23, 0.62 + i * 0.1), teak, col, bevel=0.004), root)
    linen = textiles.linen("swing_cushion", (0.7, 0.62, 0.5))
    from .furniture import cushion
    cushion("swing_cushion", (0.96, 0.44, 0.06), (0, 0.0, 0.55), linen, col, root)
    root["sway"] = {"amp": 0.08, "speed": 0.3}
    return root


def cafe_set(col, seed=54):
    """A round bistro table and two folding chairs in dark green steel."""
    root = _root("cafe_set", col)
    steel = M.powder_coat((0.04, 0.07, 0.04), 0.4, "bistro_green")
    _p(cylinder("top", 0.33, 0.02, (0, 0, 0.72), steel, col, verts=40, bevel=0.004), root)
    _p(cylinder("stem", 0.02, 0.7, (0, 0, 0.36), steel, col, verts=12), root)
    for i in range(3):
        a = i * 2.094
        f = _p(box(f"foot_{i}", (0.26, 0.03, 0.02), (math.cos(a) * 0.13, math.sin(a) * 0.13, 0.012), steel, col, bevel=0.003), root)
        f.rotation_euler = (0, 0, a)
    for sx in (-0.62, 0.62):
        base = Vector((sx, 0.05, 0))
        for x in (-0.18, 0.18):
            for y in (-0.18, 0.18):
                _p(cylinder(f"cleg_{sx}_{x}_{y}", 0.009, 0.44, (sx + x, y, 0.22), steel, col, verts=8), root)
        for i in range(5):
            _p(box(f"cseat_{sx}_{i}", (0.4, 0.05, 0.015), (sx, -0.16 + i * 0.08, 0.45), steel, col, bevel=0.002), root)
        for x in (-0.18, 0.18):
            _p(cylinder(f"cback_{sx}_{x}", 0.009, 0.42, (sx + x, 0.2, 0.65), steel, col, verts=8), root)
        for i in range(2):
            _p(box(f"cbackslat_{sx}_{i}", (0.4, 0.015, 0.05), (sx, 0.2, 0.72 + i * 0.1), steel, col, bevel=0.002), root)
    # a cup and saucer on the table
    glaze = PM.glazed_pot("cup_glaze", (0.85, 0.82, 0.76), 0.2)
    b = Builder()
    lathe(b, glaze, [(0.0, 0.0), (0.05, 0.0), (0.055, 0.004), (0.035, 0.008)], 32)
    lathe(b, glaze, [(0.0, 0.006), (0.03, 0.006), (0.036, 0.05), (0.032, 0.052), (0.028, 0.012)], 28)
    cup = b.finish("cup", col)
    cup.location = (0.1, -0.06, 0.74)
    _p(cup, root)
    return root


def wooden_cart(col, seed=55):
    """A small timber flower cart with pots of marigolds on it."""
    rng = Rng(seed)
    root = _root("wooden_cart", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "cart_wood")
    _p(box("bed", (1.1, 0.6, 0.04), (0, 0, 0.5), teak, col, bevel=0.004), root)
    for y in (-0.29, 0.29):
        _p(box(f"side_{y}", (1.1, 0.02, 0.16), (0, y, 0.59), teak, col, bevel=0.003), root)
    for x in (-0.54, 0.54):
        _p(box(f"end_{x}", (0.02, 0.6, 0.16), (x, 0, 0.59), teak, col, bevel=0.003), root)
    for x in (-0.3, 0.3):
        w = _p(cylinder(f"wheel_{x}", 0.25, 0.04, (x, 0.0, 0.25), teak, col, verts=24, bevel=0.006), root)
        w.rotation_euler = (90 * DEG, 0, 0)
        for s in (-1, 1):
            w2 = _p(cylinder(f"wheel_{x}_{s}", 0.25, 0.04, (x, s * 0.34, 0.25), teak, col, verts=24, bevel=0.006), root)
            w2.rotation_euler = (90 * DEG, 0, 0)
        w.hide_render = True
        w.hide_viewport = True
    _p(cylinder("axle", 0.02, 0.76, (0, 0, 0.25), M.metal((0.08, 0.07, 0.06), 0.5, "axle_iron"), col, verts=10), root).rotation_euler = (90 * DEG, 0, 0)
    for x in (-0.68, -0.6):
        _p(cylinder(f"handle_{x}", 0.016, 0.5, (x - 0.15, 0.15 if x < -0.65 else -0.15, 0.56), teak, col, verts=10), root).rotation_euler = (0, 90 * DEG, 0)
    for i, (x, y) in enumerate(((-0.33, -0.1), (0.0, 0.1), (0.33, -0.08), (0.15, -0.18))):
        sub = bpy.data.objects.new(f"cart_pot_{i}", None)
        link(sub, col)
        sub.parent = root
        sub.location = (x, y, 0.52)
        pz = plants.pot("terracotta", 0.16, 0.1, col, sub, f"cart_pot_mesh_{i}")
        s = shrub(col, seed=seed + i, radius=0.13, height=0.18, leaf_size=0.025, flower=rng.choice([(0.95, 0.5, 0.05), (0.9, 0.2, 0.1), (0.9, 0.12, 0.45)]),
                  flower_density=0.8, name=f"cart_flower_{i}")
        s.parent = sub
        s.location = (0, 0, pz)
    return root


def garden_table(col, seed=56):
    """Small square teak table."""
    root = _root("garden_table", col)
    teak = M.wood((0.12, 0.07, 0.035), (0.34, 0.22, 0.11), 0.5, 4.0, "table_teak")
    _p(box("top", (0.7, 0.7, 0.035), (0, 0, 0.68), teak, col, bevel=0.005), root)
    for x in (-0.3, 0.3):
        for y in (-0.3, 0.3):
            _p(box(f"leg_{x}_{y}", (0.05, 0.05, 0.66), (x, y, 0.33), teak, col, bevel=0.004), root)
    return root


# ---- decor -----------------------------------------------------------------------------

def brass_lantern(col, seed=61, lit=False):
    """A Moroccan-style brass lantern with amber glass."""
    root = _root("brass_lantern", col)
    brass = M.metal((0.5, 0.33, 0.1), 0.3, "brass")
    glass = M.emissive((1.0, 0.65, 0.3), 4.0, "amber_lit") if lit else M.glass((0.9, 0.7, 0.4), "amber_glass")
    b = Builder()
    lathe(b, brass, [(0.0, 0.0), (0.1, 0.0), (0.11, 0.01), (0.1, 0.03), (0.07, 0.03)], 32)
    lathe(b, brass, [(0.0, 0.42), (0.11, 0.42), (0.12, 0.44), (0.05, 0.56), (0.02, 0.6), (0.0, 0.62)], 32)
    _p(b.finish("lantern_brass", col), root)
    _p(cylinder("lantern_glass", 0.085, 0.4, (0, 0, 0.23), glass, col, verts=8), root)
    for i in range(8):
        a = i * math.pi / 4
        _p(box(f"rib_{i}", (0.008, 0.008, 0.4), (math.cos(a) * 0.088, math.sin(a) * 0.088, 0.23), brass, col), root)
    if lit:
        from . import lighting
        lighting.point_lamp(col, "lantern_light", (0, 0, 0.25), energy=9.0, color=(1.0, 0.6, 0.3), radius=0.06).parent = root
    return root


def stone_lantern(col, seed=62, lit=False):
    """A squat carved-stone lantern."""
    root = _root("stone_lantern", col)
    st = ground.sandstone(False, "lantern_stone", (0.36, 0.33, 0.28))
    _p(box("base", (0.4, 0.4, 0.1), (0, 0, 0.05), st, col, bevel=0.02, segments=3), root)
    _p(cylinder("post", 0.09, 0.5, (0, 0, 0.35), st, col, verts=8), root)
    _p(box("house", (0.34, 0.34, 0.26), (0, 0, 0.73), st, col, bevel=0.01), root)
    for a in range(4):
        ang = a * math.pi / 2
        w = _p(box(f"window_{a}", (0.14, 0.03, 0.14), (math.cos(ang) * 0.17, math.sin(ang) * 0.17, 0.73),
                   M.emissive((1.0, 0.7, 0.4), 3.0, "stone_lantern_glow") if lit else M.matte((0.08, 0.07, 0.06), 0.8, "lantern_dark"), col), root)
        w.rotation_euler = (0, 0, ang)
    _p(box("roof", (0.46, 0.46, 0.06), (0, 0, 0.89), st, col, bevel=0.02, segments=3), root)
    _p(cylinder("finial", 0.04, 0.08, (0, 0, 0.96), st, col, verts=8, radius_top=0.0), root)
    if lit:
        from . import lighting
        lighting.point_lamp(col, "stone_lantern_light", (0, 0, 0.74), energy=7.0, color=(1.0, 0.7, 0.4), radius=0.08).parent = root
    return root


def fountain(col, seed=63):
    """A two-tier sandstone fountain with still water in the basin."""
    root = _root("fountain", col)
    st = ground.sandstone(False, "fountain_stone", (0.38, 0.33, 0.26))
    water = M.glass((0.85, 0.92, 0.9), "water")
    b = Builder()
    lathe(b, st, [(0.0, 0.0), (0.9, 0.0), (0.92, 0.3), (0.88, 0.34), (0.8, 0.34), (0.78, 0.1), (0.0, 0.1)], 48)
    lathe(b, st, [(0.0, 0.1), (0.14, 0.1), (0.12, 0.6), (0.18, 0.62), (0.42, 0.62), (0.45, 0.72), (0.4, 0.74), (0.36, 0.66), (0.0, 0.66)], 40)
    lathe(b, st, [(0.0, 0.66), (0.08, 0.66), (0.07, 0.95), (0.12, 0.97), (0.0, 1.08)], 24)
    _p(b.finish("fountain_stone", col), root)
    _p(cylinder("basin_water", 0.78, 0.01, (0, 0, 0.3), water, col, verts=48), root)
    _p(cylinder("bowl_water", 0.36, 0.01, (0, 0, 0.7), water, col, verts=40), root)
    root["water"] = True
    return root


def birdbath(col, seed=64):
    root = _root("birdbath", col)
    st = ground.sandstone(False, "birdbath_stone", (0.4, 0.37, 0.32))
    b = Builder()
    lathe(b, st, [(0.0, 0.0), (0.22, 0.0), (0.2, 0.05), (0.08, 0.08), (0.07, 0.66), (0.1, 0.68), (0.32, 0.7), (0.34, 0.76), (0.3, 0.76), (0.0, 0.72)], 40)
    _p(b.finish("birdbath_stone", col), root)
    _p(cylinder("bath_water", 0.28, 0.01, (0, 0, 0.735), M.glass((0.85, 0.92, 0.9), "water"), col, verts=40), root)
    return root


def birdhouse_post(col, seed=65):
    root = _root("birdhouse", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "birdhouse_wood")
    paint = M.matte((0.72, 0.68, 0.58), 0.7, "birdhouse_paint")
    _p(box("post", (0.07, 0.07, 1.7), (0, 0, 0.85), teak, col, bevel=0.004), root)
    _p(box("house", (0.24, 0.22, 0.26), (0, 0, 1.83), paint, col, bevel=0.003), root)
    for s in (-1, 1):
        r = _p(box(f"roof_{s}", (0.3, 0.16, 0.02), (0, s * 0.07, 2.0), teak, col, bevel=0.002), root)
        r.rotation_euler = (s * 0.6, 0, 0)
    _p(cylinder("hole", 0.03, 0.01, (0, -0.11, 1.86), M.matte((0.02, 0.02, 0.02), 0.9, "hole"), col, verts=20), root).rotation_euler = (90 * DEG, 0, 0)
    _p(cylinder("perch", 0.006, 0.08, (0, -0.14, 1.78), teak, col, verts=8), root).rotation_euler = (90 * DEG, 0, 0)
    return root


def bird_feeder(col, seed=66, drop=0.6):
    """Hanging feeder: origin at the hook."""
    root = _root("bird_feeder", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "feeder_wood")
    rope = PM.stem("feeder_cord", (0.45, 0.33, 0.16), 0.9)
    _p(cylinder("cord", 0.004, drop, (0, 0, -drop / 2), rope, col, verts=6), root)
    _p(box("tray", (0.3, 0.3, 0.02), (0, 0, -drop - 0.2), teak, col, bevel=0.003), root)
    _p(box("roof", (0.36, 0.36, 0.02), (0, 0, -drop + 0.02), teak, col, bevel=0.003), root)
    for x in (-0.13, 0.13):
        for y in (-0.13, 0.13):
            _p(cylinder(f"post_{x}_{y}", 0.006, 0.2, (x, y, -drop - 0.09), teak, col, verts=8), root)
    seed_mat = M.matte((0.5, 0.4, 0.2), 0.9, "birdseed")
    _p(cylinder("seed", 0.12, 0.015, (0, 0, -drop - 0.185), seed_mat, col, verts=20), root)
    root["sway"] = {"amp": 0.5, "speed": 0.45, "pivot": "top"}
    return root


def decorative_rocks(col, seed=67):
    root = _root("rocks", col)
    rng = Rng(seed)
    granite = ground.sandstone(False, "deco_granite", (0.33, 0.32, 0.3))
    for i, (x, y, r) in enumerate(((0, 0, 0.3), (0.42, 0.1, 0.2), (-0.3, 0.22, 0.16), (0.2, -0.3, 0.12))):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=r)
        for v in bm.verts:
            v.co.x *= rng.uniform(0.9, 1.4)
            v.co.z *= 0.7
            v.co += Vector((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), rng.uniform(-0.04, 0.04))) * r
        o = mesh_object(f"rock_{i}", bm, granite, col, smooth=True)
        o.location = (x, y, r * 0.3)
        o.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        _p(o, root)
    return root


def stone_urn(col, seed=68):
    """A classical urn planted with trailing greenery."""
    root = _root("stone_urn", col)
    st = ground.sandstone(False, "urn_stone", (0.4, 0.38, 0.33))
    b = Builder()
    lathe(b, st, [(0.0, 0.0), (0.22, 0.0), (0.2, 0.08), (0.1, 0.1), (0.09, 0.3), (0.16, 0.34), (0.2, 0.5), (0.26, 0.64), (0.3, 0.66),
                  (0.3, 0.7), (0.26, 0.7), (0.24, 0.6), (0.0, 0.58)], 48)
    _p(b.finish("urn_stone", col), root)
    s = shrub(col, seed=seed, radius=0.3, height=0.32, leaf_size=0.045, name="urn_plant", droop=0.5)
    s.parent = root
    s.location = (0, 0, 0.58)
    return root


def pergola(col, seed=69):
    """A timber pergola with a climber over it — 2.6 m square."""
    rng = Rng(seed)
    root = _root("pergola", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "pergola_wood")
    H = 2.5
    for x in (-1.3, 1.3):
        for y in (-1.3, 1.3):
            _p(box(f"post_{x}_{y}", (0.12, 0.12, H), (x, y, H / 2), teak, col, bevel=0.006), root)
    for y in (-1.3, 1.3):
        _p(box(f"beam_{y}", (3.0, 0.08, 0.18), (0, y, H + 0.09), teak, col, bevel=0.005), root)
    for i in range(7):
        _p(box(f"rafter_{i}", (0.06, 3.0, 0.14), (-1.3 + i * 0.433, 0, H + 0.25), teak, col, bevel=0.004), root)
    lm = PM.leaf("climber_leaf", (0.04, 0.09, 0.025), (0.12, 0.22, 0.06), 0.4, 0.35)
    fm = _flower_mat("climber_flower", (0.9, 0.12, 0.45))
    b = Builder()
    stem = PM.stem("climber_stem", (0.1, 0.08, 0.04), 0.7)
    for x in (-1.3, 1.3):
        pts = curve_points(Vector((x, -1.3, 0)), Vector((0, 0, 1)), H, Vector((0, 0.1, 0)), 10)
        tube(b, stem, pts, [0.02 - 0.0015 * i for i in range(11)], segments=6)
        for i in range(60):
            t = rng.uniform(0.2, 1.0)
            p = pts[min(9, int(t * 10))] + Vector((rng.uniform(-0.1, 0.1), rng.uniform(-0.1, 0.1), 0))
            trees._leaf_cluster(b, lm, p, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.3)).normalized(), 0.06, rng, n=2)
    for i in range(420):
        p = Vector((rng.uniform(-1.4, 1.4), rng.uniform(-1.4, 1.4), H + 0.3 + rng.uniform(-0.1, 0.12)))
        trees._leaf_cluster(b, lm, p, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 0.3))).normalized(), 0.065, rng, n=2)
        if rng.random() < 0.3:
            trees._flower(b, fm, p + Vector((0, 0, -0.04)), Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), -1)).normalized(), 0.03, rng, 5, 2)
    _p(b.finish("pergola_climber", col), root)
    root["sway"] = {"amp": 0.08, "speed": 0.4}
    return root


def flower_arch(col, seed=70):
    """A metal arch over the path, covered in a flowering climber."""
    rng = Rng(seed)
    root = _root("flower_arch", col)
    iron = M.powder_coat((0.03, 0.03, 0.032), 0.45, "arch_iron")
    b = Builder()
    W, H = 1.5, 2.3
    pts = []
    for i in range(25):
        t = i / 24
        if t < 0.3:
            pts.append(Vector((-W / 2, 0, t / 0.3 * (H - W / 2))))
        elif t > 0.7:
            pts.append(Vector((W / 2, 0, (1 - t) / 0.3 * (H - W / 2))))
        else:
            a = math.pi * (1 - (t - 0.3) / 0.4)
            pts.append(Vector((math.cos(a) * W / 2, 0, H - W / 2 + math.sin(a) * W / 2)))
    for dy in (-0.18, 0.18):
        tube(b, iron, [p + Vector((0, dy, 0)) for p in pts], [0.012] * len(pts), segments=8)
    for i in range(0, 25, 3):
        tube(b, iron, [pts[i] + Vector((0, -0.18, 0)), pts[i] + Vector((0, 0.18, 0))], [0.008, 0.008], segments=6)
    lm = PM.leaf("arch_leaf", (0.04, 0.09, 0.025), (0.12, 0.22, 0.06), 0.4, 0.35)
    fm = _flower_mat("arch_rose", (0.92, 0.55, 0.65))
    for i in range(380):
        p = rng.choice(pts) + Vector((rng.uniform(-0.1, 0.1), rng.uniform(-0.24, 0.24), rng.uniform(-0.08, 0.1)))
        trees._leaf_cluster(b, lm, p, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.3, 0.6))).normalized(), 0.05, rng, n=2)
        if rng.random() < 0.3:
            trees._flower(b, fm, p, Vector((rng.uniform(-0.5, 0.5), rng.uniform(-1, 1), 0.6)).normalized(), 0.028, rng, 5, 3)
    _p(b.finish("arch_mesh", col), root)
    root["sway"] = {"amp": 0.12, "speed": 0.45}
    return root


def trellis_climber(col, seed=71):
    """A timber lattice panel with a money plant climbing it."""
    rng = Rng(seed)
    root = _root("trellis", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "trellis_wood")
    for x in (-0.55, 0.55):
        _p(box(f"post_{x}", (0.05, 0.05, 1.8), (x, 0, 0.9), teak, col, bevel=0.003), root)
    for i in range(9):
        _p(box(f"h_{i}", (1.1, 0.015, 0.025), (0, 0, 0.2 + i * 0.19), teak, col), root)
    for i in range(7):
        _p(box(f"v_{i}", (0.025, 0.015, 1.5), (-0.45 + i * 0.15, 0.01, 0.95), teak, col), root)
    lm = PM.leaf("trellis_pothos", (0.05, 0.12, 0.03), (0.17, 0.3, 0.07), 0.3, 0.35, gloss_coat=0.3, variegation=(0.6, 0.62, 0.2))
    b = Builder()
    for i in range(150):
        p = Vector((rng.uniform(-0.5, 0.5), -0.03, rng.uniform(0.15, 1.75)))
        trees._leaf_cluster(b, lm, p, Vector((rng.uniform(-0.5, 0.5), -1, rng.uniform(-0.6, 0.2))).normalized(), 0.075, rng, n=1)
    _p(b.finish("trellis_leaves", col), root)
    root["sway"] = {"amp": 0.1, "speed": 0.5}
    return root


def hanging_basket(col, seed=72, drop=0.55):
    """Coir-lined wire basket of trailing flowers; origin at the hook."""
    root = _root("hanging_basket", col)
    rope = PM.stem("basket_chain", (0.2, 0.18, 0.15), 0.4)
    coir = M.matte((0.35, 0.25, 0.12), 0.95, "coir")
    for i in range(3):
        a = i * 2.094
        c = _p(cylinder(f"chain_{i}", 0.003, drop, (math.cos(a) * 0.08, math.sin(a) * 0.08, -drop / 2), rope, col, verts=6), root)
        c.rotation_euler = (0, 0, 0)
    b = Builder()
    lathe(b, coir, [(0.0, -drop - 0.22), (0.1, -drop - 0.22), (0.2, -drop - 0.1), (0.22, -drop), (0.2, -drop), (0.18, -drop - 0.1), (0.0, -drop - 0.12)], 32)
    _p(b.finish("basket", col), root)
    s = shrub(col, seed=seed, radius=0.26, height=0.18, leaf_size=0.035, flower=(0.95, 0.4, 0.55), flower_density=0.7, name="basket_flowers", droop=0.6)
    s.parent = root
    s.location = (0, 0, -drop - 0.1)
    root["sway"] = {"amp": 0.45, "speed": 0.4, "pivot": "top"}
    return root


def string_lights(col, seed=73, lit=False):
    """Two timber posts with a sagging line of warm bulbs."""
    rng = Rng(seed)
    root = _root("string_lights", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "post_wood")
    cord = PM.stem("light_cord", (0.03, 0.03, 0.03), 0.5)
    bulb = M.emissive((1.0, 0.72, 0.4), 8.0, "bulb_lit") if lit else M.glass((0.95, 0.9, 0.8), "bulb_glass")
    for x in (-1.6, 1.6):
        _p(box(f"post_{x}", (0.08, 0.08, 2.4), (x, 0, 1.2), teak, col, bevel=0.004), root)
    b = Builder()
    pts = [Vector((-1.6 + 3.2 * i / 20, 0, 2.35 - 0.35 * math.sin(math.pi * i / 20))) for i in range(21)]
    tube(b, cord, pts, [0.004] * 21, segments=6)
    _p(b.finish("cord", col), root)
    for i in range(1, 20, 2):
        p = pts[i]
        _p(cylinder(f"socket_{i}", 0.012, 0.03, (p.x, p.y, p.z - 0.02), M.powder_coat(), col, verts=10), root)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.028)
        o = mesh_object(f"bulb_{i}", bm, bulb, col, smooth=True)
        o.location = (p.x, p.y, p.z - 0.06)
        _p(o, root)
        if lit and i % 4 == 1:
            from . import lighting
            lighting.point_lamp(col, f"bulb_light_{i}", (p.x, p.y, p.z - 0.06), energy=3.0, color=(1.0, 0.72, 0.4), radius=0.03).parent = root
    root["sway"] = {"amp": 0.05, "speed": 0.5}
    return root


def urli_bowl(col, seed=74):
    """A wide brass urli with water and floating marigold heads."""
    rng = Rng(seed)
    root = _root("urli", col)
    brass = M.metal((0.5, 0.33, 0.1), 0.3, "brass")
    b = Builder()
    lathe(b, brass, [(0.0, 0.0), (0.18, 0.0), (0.26, 0.05), (0.33, 0.14), (0.35, 0.17), (0.37, 0.17), (0.36, 0.19), (0.32, 0.18), (0.3, 0.14), (0.24, 0.07), (0.0, 0.05)], 48)
    _p(b.finish("urli_brass", col), root)
    _p(cylinder("urli_water", 0.3, 0.005, (0, 0, 0.13), M.glass((0.85, 0.92, 0.9), "water"), col, verts=40), root)
    fm = _flower_mat("urli_marigold", (0.95, 0.5, 0.05))
    pet = Builder()
    for i in range(9):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0, 0.24)
        trees._flower(pet, fm, Vector((math.cos(a) * r, math.sin(a) * r, 0.14)), Vector((0, 0, 1)), 0.025, rng, 6, 3)
    _p(pet.finish("urli_flowers", col), root)
    return root


def diya_stand(col, seed=75, lit=False):
    """A brass tiered stand of five clay diyas."""
    root = _root("diya_stand", col)
    brass = M.metal((0.5, 0.33, 0.1), 0.3, "brass")
    clay = PM.terracotta_pot("diya_clay", (0.36, 0.14, 0.06))
    flame = M.emissive((1.0, 0.6, 0.2), 25.0, "flame")
    _p(cylinder("base", 0.12, 0.02, (0, 0, 0.01), brass, col, verts=32), root)
    _p(cylinder("stem", 0.012, 0.6, (0, 0, 0.31), brass, col, verts=12), root)
    for i, (r, z) in enumerate(((0.0, 0.62), (0.14, 0.42), (0.14, 0.42), (0.14, 0.42), (0.14, 0.42))):
        a = (i - 1) * 2 * math.pi / 4
        x, y = math.cos(a) * r, math.sin(a) * r
        if i:
            arm = _p(cylinder(f"arm_{i}", 0.006, r, (x / 2, y / 2, z - 0.02), brass, col, verts=8), root)
            arm.rotation_euler = (0, 90 * DEG, a)
        b = Builder()
        lathe(b, clay, [(0.0, 0.0), (0.03, 0.0), (0.045, 0.02), (0.05, 0.03), (0.045, 0.03), (0.035, 0.012), (0.0, 0.01)], 20)
        d = b.finish(f"diya_{i}", col)
        d.location = (x, y, z)
        _p(d, root)
        if lit:
            f = _p(cylinder(f"flame_{i}", 0.006, 0.03, (x, y, z + 0.035), flame, col, verts=8, radius_top=0.0), root)
            from . import lighting
            lighting.point_lamp(col, f"diya_light_{i}", (x, y, z + 0.05), energy=1.5, color=(1.0, 0.6, 0.25), radius=0.01).parent = root
    return root


def matka_cluster(col, seed=76):
    """Three traditional clay water pots, one planted with tulsi."""
    root = _root("matkas", col)
    clay = PM.terracotta_pot("matka_clay", (0.34, 0.15, 0.07))
    for i, (x, y, r) in enumerate(((0, 0, 0.19), (0.3, -0.08, 0.15), (-0.2, 0.2, 0.12))):
        b = Builder()
        lathe(b, clay, [(0.0, 0.0), (r * 0.45, 0.0), (r, r * 0.8), (r * 0.85, r * 1.6), (r * 0.5, r * 1.9), (r * 0.55, r * 2.05), (r * 0.5, r * 2.08), (r * 0.42, r * 1.92), (0.0, r * 1.85)], 40)
        m = b.finish(f"matka_{i}", col)
        m.location = (x, y, 0)
        _p(m, root)
    t = plants.tulsi(col, seed=seed, height=0.4)
    t.parent = root
    t.location = (0, 0, 0.36)
    for o in t.children:
        if o.name.startswith("pot"):
            o.hide_render = True
    return root


def terracotta_trio(col, seed=77):
    rng = Rng(seed)
    root = _root("terracotta_trio", col)
    for i, (x, y, h, r) in enumerate(((0, 0, 0.32, 0.18), (0.38, 0.05, 0.24, 0.14), (-0.3, 0.12, 0.2, 0.12))):
        sub = bpy.data.objects.new(f"trio_{i}", None)
        link(sub, col)
        sub.parent = root
        sub.location = (x, y, 0)
        pz = plants.pot("terracotta", h, r, col, sub, f"trio_pot_{i}")
        s = shrub(col, seed=seed + i, radius=r * 1.5, height=h * 0.9, leaf_size=0.035,
                  flower=rng.choice([(0.95, 0.5, 0.05), (0.9, 0.2, 0.1), (0.95, 0.9, 0.3), None]), flower_density=0.7, name=f"trio_plant_{i}")
        s.parent = sub
        s.location = (0, 0, pz)
    root["sway"] = {"amp": 0.3, "speed": 0.55}
    return root


# ---- the garden's own fixtures ---------------------------------------------------------

def dustbin(col, seed=81):
    """A galvanised bin with a domed lid: anything dropped in is gone for good."""
    root = _root("dustbin", col)
    zinc = M.metal((0.45, 0.46, 0.44), 0.42, "galvanised")
    b = Builder()
    lathe(b, zinc, [(0.0, 0.0), (0.2, 0.0), (0.21, 0.01), (0.24, 0.6), (0.255, 0.61), (0.25, 0.63), (0.23, 0.62), (0.2, 0.02)], 40)
    lathe(b, zinc, [(0.0, 0.72), (0.08, 0.7), (0.27, 0.64), (0.27, 0.62), (0.25, 0.62), (0.07, 0.68), (0.0, 0.7)], 40)
    _p(b.finish("bin_body", col), root)
    for z in (0.18, 0.4):
        _p(cylinder(f"band_{z}", 0.245 + z * 0.02, 0.025, (0, 0, z), zinc, col, verts=40), root)
    h = _p(cylinder("lid_handle", 0.008, 0.12, (0, 0, 0.74), zinc, col, verts=8), root)
    h.rotation_euler = (0, 90 * DEG, 0)
    return root


def image_rack(col, seed=82, count=0):
    """A timber rack against which finished pictures lean, `count` of them."""
    rng = Rng(seed)
    root = _root("image_rack", col)
    teak = M.wood((0.12, 0.07, 0.035), (0.34, 0.22, 0.11), 0.5, 4.0, "rack_teak")
    for x in (-0.42, 0.42):
        _p(box(f"upright_{x}", (0.05, 0.05, 0.95), (x, 0.12, 0.475), teak, col, bevel=0.003), root)
        _p(box(f"foot_{x}", (0.05, 0.4, 0.05), (x, 0.0, 0.025), teak, col, bevel=0.003), root)
    for z in (0.3, 0.6, 0.9):
        _p(box(f"rail_{z}", (0.9, 0.04, 0.04), (0, 0.12, z), teak, col, bevel=0.003), root)
    _p(box("ledge", (0.9, 0.2, 0.03), (0, -0.02, 0.06), teak, col, bevel=0.003), root)
    frame_wood = M.wood((0.06, 0.03, 0.014), (0.17, 0.085, 0.04), 0.35, 6.0, "teak_frame")
    canvas = M.matte((0.55, 0.5, 0.42), 0.8, "stacked_canvas")
    for i in range(min(count, 5)):
        y = -0.06 - i * 0.045
        f = bpy.data.objects.new(f"stacked_{i}", None)
        link(f, col)
        f.parent = root
        f.location = (rng.uniform(-0.05, 0.05), y, 0.08)
        f.rotation_euler = (-0.22 - i * 0.03, 0, rng.uniform(-0.03, 0.03))
        w, hgt = 0.5 - i * 0.02, 0.66 - i * 0.02
        for (sx, sz, ww, hh) in ((0, 1, w, 0.04), (0, -1, w, 0.04), (1, 0, 0.04, hgt), (-1, 0, 0.04, hgt)):
            part = box(f"stk_{i}_{sx}{sz}", (ww, 0.03, hh), (sx * (w - 0.04) / 2, 0, hgt / 2 + sz * (hgt - 0.04) / 2), frame_wood, col, bevel=0.004)
            part.parent = f
        c = box(f"stk_canvas_{i}", (w - 0.06, 0.01, hgt - 0.06), (0, 0.012, hgt / 2), canvas, col)
        c.parent = f
    return root


def easel(col, seed=83, canvas=None):
    """A field easel holding the framed artwork; origin at the base, art
    opening corners recorded like art_frame."""
    root = _root("easel", col)
    teak = M.wood((0.14, 0.09, 0.05), (0.38, 0.26, 0.14), 0.6, 3.0, "easel_wood")
    H = 1.7
    for x in (-0.3, 0.3):
        leg = _p(box(f"leg_{x}", (0.035, 0.035, H), (x * 0.9, 0.05, H / 2), teak, col, bevel=0.002), root)
        leg.rotation_euler = (0.12, 0, -x * 0.5)
    back = _p(box("leg_back", (0.035, 0.035, H), (0, 0.5, H / 2), teak, col, bevel=0.002), root)
    back.rotation_euler = (-0.5, 0, 0)
    _p(box("tray", (0.62, 0.08, 0.03), (0, -0.02, 0.56), teak, col, bevel=0.002), root).rotation_euler = (0.12, 0, 0)
    _p(box("cross", (0.5, 0.03, 0.03), (0, 0.1, 1.05), teak, col), root).rotation_euler = (0.12, 0, 0)
    fr = decor.art_frame(col, seed=seed, art_w=0.6, art_h=0.8, canvas=canvas)
    fr.parent = root
    fr.location = (0, -0.03, 0.58 + 0.44)
    fr.rotation_euler = (0.12, 0, 0)
    root["art_frame"] = fr.name
    return root


def dead_sapling(col, seed=2):
    root = _root("dead_sapling_root", col)
    t = trees.dead_sapling(col, seed=seed, height=0.95)
    t.parent = root
    _mound(col, root, 0.18, seed)
    rng = Rng(seed)
    # fallen brown leaves around it
    b = Builder()
    lm = PM.leaf("fallen_leaf", (0.2, 0.12, 0.04), (0.33, 0.22, 0.08), 0.7, 0.1)
    for i in range(14):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.1, 0.4)
        leaf(b, lm, frame_at(Vector((math.cos(a) * r, math.sin(a) * r, 0.004)), Vector((math.cos(a + 1), math.sin(a + 1), 0.05))),
             0.04, 0.025, shape_ovate, nu=2, nv=3, fold=0.4, arch=0.2, var=rng.random(), dry=1.0)
    _p(b.finish("fallen_leaves", col), root)
    return root


def broken_frame(col, seed=3):
    """A framed picture that didn't make it: shattered glass over a faded
    print, propped against whatever is behind it."""
    rng = Rng(seed)
    root = _root("broken_frame", col)
    frame_wood = M.wood((0.06, 0.03, 0.014), (0.17, 0.085, 0.04), 0.35, 6.0, "teak_frame")
    w, hgt = 0.56, 0.72
    f = bpy.data.objects.new("bf", None)
    link(f, col)
    f.parent = root
    f.rotation_euler = (-0.2, 0, 0)
    for (sx, sz, ww, hh) in ((0, 1, w, 0.045), (0, -1, w, 0.045), (1, 0, 0.045, hgt), (-1, 0, 0.045, hgt)):
        part = box(f"bf_{sx}{sz}", (ww, 0.03, hh), (sx * (w - 0.045) / 2, 0, hgt / 2 + sz * (hgt - 0.045) / 2), frame_wood, col, bevel=0.004)
        part.parent = f
    # the corner of the frame is split
    split = box("bf_split", (0.045, 0.032, 0.18), ((w - 0.045) / 2 + 0.02, 0.005, hgt - 0.12), frame_wood, col, bevel=0.004)
    split.rotation_euler = (0, 0.25, 0.1)
    split.parent = f
    from .nodes import Tree as NT
    t = NT("faded_print")
    co = t.coords("Object", scale=(1, 1, 1))
    n = t.noise(co, scale=6, detail=4)
    base = t.mix_color(t.map_range(n, 0.3, 0.7, 0, 1), (0.42, 0.4, 0.34), (0.55, 0.5, 0.42))
    stain = t.noise(co, scale=2.5, detail=5)
    base = t.mix_color(t.map_range(stain, 0.55, 0.7, 0.0, 0.6), base, (0.3, 0.24, 0.16))
    print_mat = t.surface(t.principled(base, 0.8))
    c = box("bf_print", (w - 0.07, 0.008, hgt - 0.07), (0, 0.012, hgt / 2), print_mat, col)
    c.parent = f
    # shattered glass: thin glass with crack lines as dark bump
    g = NT("cracked_glass")
    co2 = g.coords("Object")
    v = g.node("ShaderNodeTexVoronoi", {"Vector": co2, "Scale": 9.0, "Randomness": 1.0}, feature="DISTANCE_TO_EDGE")
    crack = g.map_range((v, "Distance"), 0.0, 0.012, 1.0, 0.0)
    gl = g.principled((0.9, 0.93, 0.92), 0.05, g.bump(crack, 0.6, 0.004), Transmission_Weight=1.0, IOR=1.5)
    white = g.node("ShaderNodeBsdfDiffuse", {"Color": (0.85, 0.85, 0.85)})
    mix = g.node("ShaderNodeMixShader")
    g.set(mix, 0, g.math("MULTIPLY", crack, 0.9))
    g.link(gl, mix.inputs[1])
    g.link(white, mix.inputs[2])
    glass = g.surface(mix)
    gp = box("bf_glass", (w - 0.07, 0.003, hgt - 0.07), (0, 0.004, hgt / 2), glass, col)
    gp.parent = f
    # a missing shard at the lower corner
    hole = box("bf_hole", (0.16, 0.0032, 0.12), (-(w - 0.07) / 2 + 0.08, 0.004, 0.09), print_mat, col)
    hole.parent = f
    # shards on the ground
    shard = M.glass((0.9, 0.93, 0.92), "shard_glass")
    for i in range(5):
        s = box(f"shard_{i}", (rng.uniform(0.03, 0.07), 0.003, rng.uniform(0.02, 0.05)), (rng.uniform(-0.3, 0.3), rng.uniform(-0.25, -0.05), 0.003), shard, col)
        s.rotation_euler = (90 * DEG, 0, rng.uniform(0, 6.28))
        _p(s, root)
    return root


BUILDERS = {
    **GROWABLE,
    "croton": croton, "banana_plant": banana_plant, "lemon_tree": lemon_tree, "ornamental_grass": ornamental_grass,
    "frangipani_small": frangipani_small, "mango_sapling": mango_sapling, "ashoka_tree": ashoka_tree,
    "kachnar": kachnar,
    "garden_bench": garden_bench, "iron_bench": iron_bench, "wooden_swing": wooden_swing, "cafe_set": cafe_set,
    "wooden_cart": wooden_cart, "garden_table": garden_table,
    "brass_lantern": brass_lantern, "stone_lantern": stone_lantern, "fountain": fountain, "birdbath": birdbath,
    "birdhouse_post": birdhouse_post, "bird_feeder": bird_feeder, "decorative_rocks": decorative_rocks, "stone_urn": stone_urn,
    "pergola": pergola, "flower_arch": flower_arch, "trellis_climber": trellis_climber, "hanging_basket": hanging_basket,
    "string_lights": string_lights, "urli_bowl": urli_bowl, "diya_stand": diya_stand, "matka_cluster": matka_cluster,
    "terracotta_trio": terracotta_trio,
    "dustbin": dustbin, "image_rack": image_rack, "easel": easel, "dead_sapling": dead_sapling, "broken_frame": broken_frame,
}
