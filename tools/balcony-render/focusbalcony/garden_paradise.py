"""The Paradise Garden's plants: 84 species across five segments, each
rendered as a seed and seven sizes (the seven focus sizes). Everything is
built from the shrub, tree and potted-plant generators with its own leaf,
flower and fruit materials, so each reads as its species and each size
is a genuinely bigger, fuller plant rather than a scaled copy."""
import math
import bmesh
from mathutils import Vector

from . import materials as M
from . import plant_materials as PM
from . import plants, trees
from .common import Rng, box, cylinder, link, mesh_object
from .geo import Builder, curve_points, frame_at, leaf, shape_heart, shape_lanceolate, shape_ovate, shape_sword, tube
from .garden_items import _mound, _p, _root, _stake, ashoka_tree, banana_plant, croton, lemon_tree, ornamental_grass
from . import garden_plants_extra as extra
from .trees import TreeSpec, build_tree, shrub, _flower_mat
from .paradise_blooms import Bloom, bloom, bloom_mats, bud, lush_shrub, scapes

# stage 0 = the seed in its mound; stages 1..7 = sizes 1..7 (15, 30, 60, 90, 120, 150, 180 min)
STAGES = [
    {"id": "seed", "minutes": 0},
    {"id": "size1", "minutes": 15},
    {"id": "size2", "minutes": 30},
    {"id": "size3", "minutes": 60},
    {"id": "size4", "minutes": 90},
    {"id": "size5", "minutes": 120},
    {"id": "size6", "minutes": 150},
    {"id": "size7", "minutes": 180},
]
SCALE = [0.0, 0.2, 0.32, 0.46, 0.6, 0.74, 0.88, 1.0]
DENSITY = [0.0, 0.5, 0.65, 0.8, 0.9, 1.0, 1.0, 1.0]
# flowering begins at size 4 and fills in by size 7
FLOWER = [0.0, 0.0, 0.0, 0.0, 0.35, 0.6, 0.85, 1.0]
TREE_H = [0.0, 0.45, 1.1, 1.9, 2.8, 3.7, 4.5, 5.4]


def _leaf(name, dark, light, rough=0.4, trans=0.3, gloss=0.0):
    return PM.leaf(name, dark, light, rough, trans, gloss_coat=gloss)


LEAF_GREEN = (0.04, 0.09, 0.025), (0.12, 0.22, 0.06)
LEAF_DARK = (0.03, 0.07, 0.02), (0.08, 0.16, 0.04)
LEAF_LIGHT = (0.06, 0.12, 0.03), (0.18, 0.3, 0.08)
LEAF_GREY = (0.1, 0.14, 0.09), (0.3, 0.36, 0.26)


def _top_of_pot(name, col, kind, h, r):
    root = _root(name, col)
    pz = plants.pot(kind, h, r, col, root)
    top = _root(f"{name}_top", col)
    top.parent = root
    top.location = (0, 0, pz)
    return root, top


def _spheres(col, root, rng, color, n, r, zrange, spread, stretch=1.0, name="fruit"):
    mat = M.matte(color, 0.35, f"{name}_skin")
    for i in range(n):
        a = rng.uniform(0, 6.28)
        d = rng.uniform(spread * 0.3, spread)
        z = rng.uniform(zrange[0], zrange[1])
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=r)
        for v in bm.verts:
            v.co.z *= stretch
        o = mesh_object(f"{name}_{i}", bm, mat, col, smooth=True)
        o.location = (math.cos(a) * d, math.sin(a) * d, z)
        _p(o, root)


# ---- generic species --------------------------------------------------------------------

def _as_bloom(flower, r=0.012):
    """Species pass a full Bloom, or just a colour for a small simple flower."""
    if flower is None or isinstance(flower, Bloom):
        return flower
    return Bloom("open5", r, tuple(flower), centre=tuple(min(1, c * 0.85 + 0.1) for c in flower), extra={"elev": 18, "w": 0.85, "wave": 0.1})


def _bloom_schedule(stage, flower_from):
    """How much of the bush is in flower, and how much in bud, at a size."""
    k = stage - flower_from
    amount = {0: 0.35, 1: 0.6, 2: 0.85}.get(k, 1.0) if k >= 0 else 0.0
    buds = 0.7 if k == -1 else (0.45 if k in (0, 1) else 0.2 if k >= 2 else 0.0)
    return amount, buds


def shrub_species(name, flower, size, leaf_size, leaf=None, layers=2, pot=None, sway=(0.35, 0.5), flower_from=4, low=False,
                  upright=False, leaflets=2, bloom_scale=1.25, stems=320, stem_color=(0.12, 0.1, 0.045)):
    """A flowering or leafy bush that fills out over the seven sizes and
    comes into bloom: buds the size before `flower_from`, then more and
    more open flowers. `size` = (radius, height) at size 7; `pot` =
    (kind, height, radius), a pot that stays the same while the plant grows."""
    leaf_fn = leaf
    spec = _as_bloom(flower)

    def build(col, stage=7, seed=1):
        if pot:
            root, top = _top_of_pot(name, col, pot[0], pot[1], pot[2])
        else:
            root = top = _root(name, col)
        if stage == 0:
            _mound(col, top, 0.2 if not pot else pot[2] * 0.9, seed)
            _stake(col, top)
            return root
        s = SCALE[stage]
        r = max(0.07, size[0] * s)
        h = max(0.07, size[1] * s)
        amount, buds = _bloom_schedule(stage, flower_from) if spec else (0.0, 0.0)
        lm = (leaf_fn() if callable(leaf_fn) else leaf_fn) or _leaf(f"{name}_leaf", *LEAF_GREEN)
        holder = _root(f"{name}_plant", col)
        holder.parent = top
        lush_shrub(col, holder, seed=seed, radius=r, height=h, leaf_size=leaf_size * (0.7 + 0.3 * s), leaf_mat=lm, density=DENSITY[stage],
                   bloom_spec=spec, bloom_amount=amount, buds=buds, name=name, upright=upright, leaflets=leaflets,
                   bloom_scale=bloom_scale * (0.8 + 0.2 * s), stems_per_m2=stems, stem_color=stem_color)
        if low:
            holder.scale = (1.0, 1.0, 0.55)
        if stage == 1 and not pot:
            _mound(col, top, max(0.1, r * 1.2), seed)
        if sway:
            root["sway"] = {"amp": sway[0], "speed": sway[1]}
        return root
    return build


def tree_species(name, leaf_src, flower=None, fruit=None, heights=TREE_H, spread=52, up=0.25, leaf_size=0.09, leaves_per_m=170,
                 crown_start=0.35, droop=0.15, leaf_shape=shape_ovate, flower_from=6, children=(4, 6), length_ratio=0.64,
                 bloom_density=(0.6, 0.95), sway=(0.18, 0.35)):
    """A tree that goes from seedling to a grand specimen: taller, thicker
    trunk, more levels of branches, denser crown, then flowers or fruit."""
    def build(col, stage=7, seed=1):
        root = _root(name, col)
        if stage == 0:
            _mound(col, root, 0.26, seed)
            _stake(col, root, 0.5)
            return root
        if stage == 1:
            _mound(col, root, 0.2, seed)
            b = Builder()
            rng = Rng(seed)
            stem = PM.stem(f"{name}_stem")
            pts = curve_points(Vector((0, 0, 0)), Vector((0.05, 0, 1)).normalized(), heights[1] * 0.6, Vector((0.02, 0.01, -0.02)), 4)
            tube(b, stem, pts, [0.006, 0.005, 0.004, 0.003, 0.002], segments=6)
            for i in range(7):
                t = 0.3 + 0.7 * i / 7
                p = pts[min(4, int(t * 4))]
                d = Vector((math.cos(i * 2.1), math.sin(i * 2.1), 0.45)).normalized()
                leaf(b, leaf_mat(), frame_at(p, d), leaf_size * 0.9, leaf_size * 0.7, leaf_shape, nu=3, nv=4, fold=0.2, arch=0.3, var=rng.random())
            _p(b.finish(f"{name}_seedling", col), root)
            _stake(col, root, heights[1] * 0.8)
            root["sway"] = {"amp": 0.6, "speed": 0.6}
            return root
        h = heights[stage]
        bloom = flower is not None and stage >= flower_from
        fruiting = fruit is not None and stage >= 5
        levels = 3 if stage <= 3 else 4
        spec = TreeSpec(height=h, trunk_radius=(0.025 + 0.02 * stage) * h / 2.0, levels=levels, children=(3, 4) if stage <= 3 else children,
                        spread=spread, up=up, length_ratio=length_ratio, leaf_size=leaf_size * (0.8 if stage < 4 else 1.0),
                        leaves_per_m=int(leaves_per_m * (0.8 if stage < 5 else 1.0 if stage < 7 else 1.3)), crown_start=crown_start,
                        leaf_mat=leaf_mat(), droop=droop, leaf_shape=leaf_shape,
                        flower=flower if bloom else None, flower_density=bloom_density[0] if stage == flower_from else bloom_density[1])
        t = build_tree(col, spec, seed + stage, f"{name}_tree")
        t.parent = root
        if fruiting:
            rng = Rng(seed + 7)
            n = {5: 6, 6: 12, 7: 20}[stage]
            _spheres(col, root, rng, fruit[0], n, fruit[1] * (0.85 if stage == 5 else 1.0), (h * 0.5, h * 0.92), h * 0.22, fruit[2] if len(fruit) > 2 else 1.0, f"{name}_fruit")
        if stage == 2:
            _stake(col, root, 0.9)
        root["sway"] = {"amp": sway[0], "speed": sway[1]}
        return root

    def leaf_mat():
        return leaf_src() if callable(leaf_src) else leaf_src
    return build


def sized_species(name, make, heights, pot=None, seed_mound=0.2):
    """Wraps a builder that takes `height`: each size is a taller, fuller plant."""
    def build(col, stage=7, seed=1):
        if stage == 0:
            if pot:
                root, top = _top_of_pot(name, col, *pot)
            else:
                root = top = _root(name, col)
            _mound(col, top, seed_mound, seed)
            _stake(col, top)
            return root
        o = make(col, seed=seed, height=heights[stage])
        if stage == 1:
            _mound(col, o, 0.14, seed)
        return o
    return build


def scaled_species(name, make, scales=(0, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1.0), stake=True):
    """Wraps a builder without a size parameter: the whole plant scaled per
    size (used for the few species whose generator has no growth control)."""
    def build(col, stage=7, seed=1):
        if stage == 0:
            root = _root(name, col)
            _mound(col, root, 0.18, seed)
            _stake(col, root)
            return root
        o = make(col, seed=seed)
        s = scales[stage]
        o.scale = (s, s, s)
        if stage == 1 and stake:
            _mound(col, o, 0.14, seed)
        return o
    return build


def vine_species(name, fruit, size, leaf_size, leaf=None, fruit_r=0.05, stretch=1.0, flower=None, climber=False):
    """Ground vines (pumpkin, watermelon, cucumber) and climbers (peas,
    giloy): a sprawling leafy mass that flowers at size 4 and sets fruit from size 5."""
    leaf_fn = leaf
    spec = _as_bloom(flower, 0.025)

    def build(col, stage=7, seed=1):
        root = _root(name, col)
        if stage == 0:
            _mound(col, root, 0.22, seed)
            _stake(col, root)
            return root
        s = SCALE[stage]
        r = max(0.1, size[0] * s)
        h = max(0.08, size[1] * s)
        amount, buds = _bloom_schedule(stage, 4) if spec else (0.0, 0.0)
        holder = _root(f"{name}_vine", col)
        holder.parent = root
        lm = (leaf_fn() if callable(leaf_fn) else leaf_fn) or _leaf(f"{name}_leaf", *LEAF_LIGHT)
        lush_shrub(col, holder, seed=seed, radius=r, height=h if climber else h * 2.2, leaf_size=leaf_size * (0.7 + 0.3 * s), leaf_mat=lm,
                   density=DENSITY[stage], bloom_spec=spec, bloom_amount=amount * 0.5, buds=buds * 0.5, name=name, upright=climber,
                   leaflets=2, core=not climber, stems_per_m2=180)
        if not climber:
            holder.scale = (1.0, 1.0, 0.4)
        else:
            _stake(col, root, h + 0.2)
        if stage >= 5:
            rng = Rng(seed + 3)
            n = {5: 2, 6: 4, 7: 7}[stage]
            _spheres(col, root, rng, fruit, n, fruit_r * (0.8 if stage == 5 else 1.0), (fruit_r * 0.6, h * (0.9 if climber else 0.25)), r * 0.8, stretch, f"{name}_fruit")
        if stage == 1:
            _mound(col, root, 0.16, seed)
        root["sway"] = {"amp": 0.25, "speed": 0.45}
        return root
    return build


def fruit_bush(name, fruit, size, leaf_size, leaf=None, fruit_r=0.04, stretch=1.0, flower=(0.98, 0.95, 0.8), pot=None, staked=False):
    """Tomato, chilli, brinjal, strawberry: a bush that flowers at size 4 and fruits from size 5."""
    base = shrub_species(name, _as_bloom(flower, 0.012), size, leaf_size, leaf=leaf, pot=pot, flower_from=4, bloom_scale=1.0)

    def build(col, stage=7, seed=1):
        root = base(col, stage, seed)
        if stage >= 5:
            rng = Rng(seed + 5)
            s = SCALE[stage]
            n = {5: 5, 6: 10, 7: 16}[stage]
            top = next((c for c in root.children if c.name.startswith(f"{name}_top")), root) if pot else root
            _spheres(col, top, rng, fruit, n, fruit_r * (0.85 if stage == 5 else 1.0), (size[1] * s * 0.3, size[1] * s * 0.9), size[0] * s * 0.8, stretch, f"{name}_fruit")
        if staked and stage >= 3:
            _stake(col, root, size[1] * SCALE[stage] + 0.15)
        return root
    return build


# blooms per size for clumps: (stalks, open blooms per stalk, buds per stalk)
SCAPES = {3: (1, 0, 2), 4: (1, 1, 2), 5: (2, 2, 1), 6: (3, 2, 2), 7: (4, 3, 1)}


def rosette_species(name, leaf_mat_fn, n_leaves, length, width, shape=shape_sword, arch=0.6, pot=None, flower=None, flower_h=0.0, up=0.9,
                    face_out=0.8, scape_table=SCAPES):
    """Rosettes and clumps (lily, lotus, tulip, iris, daffodil, gerbera, snake
    plant, spider plant, turmeric...): leaves from one crown that multiply
    and lengthen, then flower stalks, buds first, then open blooms."""
    spec = _as_bloom(flower, 0.03)

    def build(col, stage=7, seed=1):
        if pot:
            root, top = _top_of_pot(name, col, pot[0], pot[1], pot[2])
        else:
            root = top = _root(name, col)
        if stage == 0:
            _mound(col, top, 0.18 if not pot else pot[2] * 0.9, seed)
            _stake(col, top)
            return root
        s = SCALE[stage]
        rng = Rng(seed)
        b = Builder()
        lm = leaf_mat_fn()
        n = max(3, int(n_leaves * (0.3 + 0.7 * s)))
        L = length * (0.4 + 0.6 * s)
        for i in range(n):
            a = i * 2.39996 + rng.uniform(-0.2, 0.2)
            r = rng.uniform(0, 0.05 * s)
            d = Vector((math.cos(a) * (1 - up), math.sin(a) * (1 - up), up)).normalized()
            fr = frame_at(Vector((math.cos(a) * r, math.sin(a) * r, 0)), d)
            leaf(b, lm, fr, L * rng.uniform(0.7, 1.0), width * (0.6 + 0.4 * s), shape, nu=2, nv=8, fold=0.25, arch=arch * rng.uniform(0.8, 1.2), var=rng.random())
        _p(b.finish(f"{name}_mesh", col), top)
        if spec and stage in scape_table:
            k, per, nbud = scape_table[stage]
            if k:
                scapes(col, top, spec=spec, name=name, count=k, blooms_per=per, buds_per=nbud, height=(flower_h or L * 1.1) * (0.75 + 0.25 * s),
                       rng=rng, face_out=face_out)
        if stage == 1 and not pot:
            _mound(col, top, 0.12, seed)
        root["sway"] = {"amp": 0.3, "speed": 0.5}
        return root
    return build


def _sunflower(col, stage=7, seed=1):
    """Sunflowers: one to three tall stems, big heart leaves all the way
    up, a green bud at size 4 and great faces turned to the sun from size 5."""
    root = _root("sunflower", col)
    if stage == 0:
        _mound(col, root, 0.2, seed)
        _stake(col, root)
        return root
    rng = Rng(seed)
    hts = [0, 0.14, 0.3, 0.55, 0.85, 1.1, 1.35, 1.6]
    stems = {1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 2, 7: 3}[stage]
    spec = Bloom("daisy", 0.14, (0.92, 0.42, 0.0), centre=(0.75, 0.25, 0.0), disc=(0.12, 0.06, 0.02), petals=24, extra={"disc_r": 0.42, "elev": 12, "w": 0.26})
    mats = bloom_mats("sunflower", spec)
    b = Builder()
    stem = PM.stem("sunflower_stem", (0.12, 0.2, 0.05), 0.5)
    lm = _leaf("sunflower_leaf", (0.03, 0.07, 0.015), (0.08, 0.16, 0.035), 0.5, 0.3)
    for k in range(stems):
        a = k * 2.3 + 0.6
        base = Vector((math.cos(a) * 0.06 * k, math.sin(a) * 0.06 * k, 0))
        h = hts[stage] * (1 - 0.12 * k)
        pts = curve_points(base, Vector((math.cos(a) * 0.05 * k, math.sin(a) * 0.05 * k - 0.03, 1)).normalized(), h, Vector((0, -0.04, 0)), 6)
        sr = 0.003 + 0.011 * SCALE[stage]
        tube(b, stem, pts, [sr, sr * 0.92, sr * 0.85, sr * 0.78, sr * 0.7, sr * 0.62, sr * 0.6], segments=8)
        nleaf = 2 + int(stage * 1.4)
        for i in range(nleaf):
            t = 0.15 + 0.75 * i / nleaf
            p = pts[min(6, int(t * 6))]
            d = Vector((math.cos(i * 2.4), math.sin(i * 2.4), 0.25)).normalized()
            ls = (0.05 + 0.22 * SCALE[stage]) * (1.15 - 0.55 * t)
            leaf(b, lm, frame_at(p, d), ls * 1.3, ls, shape_heart, nu=4, nv=6, fold=0.2, arch=0.6, var=rng.random())
        ax = Vector((0, -1, 0.45)).normalized()
        if stage == 4:
            bud(b, lm, pts[-1], (ax + Vector((0, 0, 1))).normalized(), 0.06, 0.05, rng)
        elif stage >= 5:
            bloom(b, spec, mats, pts[-1] + ax * 0.01, ax, rng, (0.75 + 0.25 * SCALE[stage]) * (1 - 0.15 * k))
    _p(b.finish("sunflower_mesh", col), root)
    if stage == 1:
        _mound(col, root, 0.1, seed)
    root["sway"] = {"amp": 0.35, "speed": 0.4}
    return root


# ---- segment 1: flowers ------------------------------------------------------------------

FLOWERS = {
    "rose": shrub_species("rose", Bloom("rose", 0.05, (0.62, 0.0, 0.035), centre=(0.3, 0.0, 0.02)), (0.42, 0.72), 0.045,
                          leaf=lambda: _leaf("rose_leaf", *LEAF_DARK), leaflets=3, flower_from=3),
    "jasmine": shrub_species("jasmine", Bloom("star", 0.016, (0.99, 0.99, 0.95), centre=(0.96, 0.93, 0.78), extra={"per_tip": 1.2}), (0.48, 0.72), 0.04, leaflets=3),
    "marigold": shrub_species("marigold", Bloom("pompom", 0.036, (0.96, 0.36, 0.0), centre=(0.8, 0.18, 0.0), petals=12, extra={"rows": 7, "w": 0.55, "frill": 0.25, "per_tip": 0.8}),
                              (0.28, 0.4), 0.032, leaf=lambda: _leaf("marigold_leaf", (0.04, 0.09, 0.02), (0.11, 0.2, 0.05), 0.5, 0.35), sway=(0.4, 0.6), flower_from=3),
    "hibiscus": shrub_species("hibiscus", Bloom("open5", 0.075, (0.78, 0.0, 0.04), centre=(0.35, 0.0, 0.03), extra={"column": True, "centre_color": (0.95, 0.75, 0.3), "w": 1.0, "wave": 0.3}),
                              (0.55, 0.95), 0.06, leaf=lambda: _leaf("hibiscus_leaf", (0.035, 0.085, 0.02), (0.1, 0.2, 0.05), 0.35, 0.3, 0.15), bloom_scale=1.1),
    "lotus": rosette_species("lotus", lambda: _leaf("lotus_leaf", (0.06, 0.13, 0.05), (0.2, 0.33, 0.12), 0.3, 0.35), 9, 0.3, 0.26, shape_heart, arch=0.2,
                             pot=("bowl", 0.16, 0.34), flower=Bloom("lotus", 0.085, (0.97, 0.55, 0.72), centre=(0.99, 0.92, 0.94), disc=(0.85, 0.75, 0.25)), flower_h=0.42, up=0.7, face_out=0.25),
    "lily": rosette_species("lily", lambda: _leaf("lily_leaf", (0.05, 0.12, 0.04), (0.15, 0.28, 0.09), 0.3, 0.35, 0.2), 18, 0.42, 0.06, shape_lanceolate, arch=0.7,
                            flower=Bloom("trumpet", 0.1, (0.9, 0.16, 0.42), centre=(0.99, 0.86, 0.84)), flower_h=0.62, up=0.85,
                            scape_table={3: (1, 0, 2), 4: (1, 1, 2), 5: (2, 2, 1), 6: (3, 2, 2), 7: (5, 3, 1)}),
    "orchid": rosette_species("orchid", lambda: _leaf("orchid_leaf", (0.04, 0.1, 0.03), (0.12, 0.24, 0.07), 0.25, 0.3, 0.4), 7, 0.24, 0.08, shape_ovate, arch=0.5,
                              pot=("cylinder_glazed", 0.14, 0.09), flower=Bloom("orchid", 0.045, (0.82, 0.38, 0.82), centre=(0.97, 0.88, 0.97), extra={"centre_color": (0.8, 0.15, 0.45)}),
                              flower_h=0.48, up=0.6),
    "tulip": rosette_species("tulip", lambda: _leaf("tulip_leaf", (0.1, 0.17, 0.08), (0.28, 0.38, 0.18), 0.35, 0.3), 8, 0.28, 0.07, shape_lanceolate, arch=0.4,
                             flower=Bloom("cup", 0.035, (0.92, 0.1, 0.12), centre=(0.95, 0.8, 0.25)), flower_h=0.4, up=0.9, face_out=0.1,
                             scape_table={3: (2, 0, 1), 4: (2, 1, 0), 5: (3, 1, 0), 6: (4, 1, 0), 7: (6, 1, 0)}),
    "dahlia": shrub_species("dahlia", Bloom("pompom", 0.06, (0.85, 0.08, 0.38), centre=(0.55, 0.02, 0.2), petals=14, extra={"rows": 8, "w": 0.45, "frill": 0.05, "per_tip": 0.45}),
                            (0.32, 0.55), 0.05, upright=True),
    "chrysanthemum": shrub_species("chrysanthemum", Bloom("pompom", 0.04, (0.98, 0.84, 0.2), centre=(0.9, 0.6, 0.1), petals=16, extra={"rows": 7, "w": 0.3, "per_tip": 0.8}),
                                   (0.32, 0.36), 0.032),
    "sunflower": _sunflower,
    "lavender": shrub_species("lavender", Bloom("spike", 0.016, (0.4, 0.22, 0.75), centre=(0.3, 0.15, 0.6), extra={"length": 4.0, "whorls": 9, "per_tip": 1.0}),
                              (0.3, 0.45), 0.02, leaf=lambda: _leaf("lavender_leaf", *LEAF_GREY), sway=(0.45, 0.6), upright=True, flower_from=3, stem_color=(0.2, 0.26, 0.14)),
    "bougainvillea": shrub_species("bougainvillea", Bloom("bract", 0.04, (0.92, 0.12, 0.5), centre=(0.95, 0.55, 0.75), extra={"cluster": 4, "per_tip": 0.75}),
                                   (0.7, 1.1), 0.045, sway=(0.3, 0.45)),
    "petunia": shrub_species("petunia", Bloom("open5", 0.035, (0.6, 0.12, 0.62), centre=(0.95, 0.85, 0.45), extra={"elev": 40, "w": 1.05, "wave": 0.25, "arch": 0.35, "per_tip": 0.9}),
                             (0.3, 0.24), 0.035, leaf=lambda: _leaf("petunia_leaf", (0.06, 0.11, 0.03), (0.16, 0.25, 0.08), 0.45, 0.3), flower_from=3),
    "gerbera": rosette_species("gerbera", lambda: _leaf("gerbera_leaf", (0.05, 0.11, 0.03), (0.14, 0.24, 0.07), 0.4, 0.3), 12, 0.2, 0.08, shape_ovate, arch=0.8,
                               flower=Bloom("daisy", 0.06, (0.95, 0.22, 0.04), centre=(0.95, 0.55, 0.1), disc=(0.25, 0.14, 0.04), petals=18, extra={"w": 0.22}),
                               flower_h=0.34, up=0.55, face_out=0.35, scape_table={3: (1, 0, 1), 4: (1, 1, 0), 5: (2, 1, 0), 6: (3, 1, 0), 7: (5, 1, 0)}),
    "carnation": shrub_species("carnation", Bloom("pompom", 0.034, (0.95, 0.42, 0.58), centre=(0.8, 0.2, 0.35), petals=10, extra={"rows": 5, "w": 0.6, "frill": 0.45, "per_tip": 0.6}),
                               (0.28, 0.42), 0.02, leaf=lambda: _leaf("carnation_leaf", *LEAF_GREY), upright=True),
    "daffodil": rosette_species("daffodil", lambda: _leaf("daffodil_leaf", (0.08, 0.15, 0.06), (0.22, 0.34, 0.14), 0.35, 0.3), 12, 0.3, 0.022, shape_sword, arch=0.3,
                                flower=Bloom("daffodil", 0.042, (0.99, 0.9, 0.3), centre=(0.98, 0.85, 0.4), extra={"centre_color": (0.98, 0.62, 0.06)}), flower_h=0.38, up=0.92,
                                face_out=0.75, scape_table={3: (2, 0, 1), 4: (2, 1, 0), 5: (3, 1, 0), 6: (4, 1, 0), 7: (6, 1, 0)}),
    "iris": rosette_species("iris", lambda: _leaf("iris_leaf", (0.07, 0.14, 0.07), (0.2, 0.32, 0.15), 0.35, 0.3), 9, 0.5, 0.035, shape_sword, arch=0.2,
                            flower=Bloom("iris", 0.05, (0.38, 0.25, 0.78), centre=(0.95, 0.85, 0.3), extra={"centre_color": (0.95, 0.8, 0.2)}), flower_h=0.62, up=0.95, face_out=0.2,
                            scape_table={3: (1, 0, 1), 4: (1, 1, 1), 5: (2, 1, 1), 6: (3, 1, 1), 7: (4, 1, 1)}),
    "gardenia": shrub_species("gardenia", Bloom("rose", 0.038, (0.99, 0.98, 0.93), centre=(0.96, 0.93, 0.8)), (0.45, 0.6), 0.05,
                              leaf=lambda: _leaf("gardenia_leaf", (0.03, 0.07, 0.02), (0.08, 0.17, 0.04), 0.25, 0.3, 0.45)),
    "plumeria": tree_species("plumeria", lambda: _leaf("plumeria_leaf", (0.05, 0.1, 0.03), (0.14, 0.25, 0.07), 0.4, 0.35), flower=(0.99, 0.95, 0.75), heights=[0, 0.4, 0.8, 1.3, 1.8, 2.2, 2.6, 3.0], leaf_size=0.2, leaves_per_m=90, children=(3, 4), spread=60, up=0.4, flower_from=5, leaf_shape=shape_lanceolate),
}

# ---- segment 2: trees --------------------------------------------------------------------

TREES = {
    "banyan": tree_species("banyan", lambda: _leaf("banyan_leaf", (0.03, 0.07, 0.02), (0.09, 0.18, 0.05), 0.3, 0.3, 0.3), heights=[0, 0.5, 1.3, 2.3, 3.4, 4.6, 5.6, 6.6], spread=70, up=0.1, leaf_size=0.11, leaves_per_m=200, children=(5, 7), crown_start=0.3),
    "peepal": tree_species("peepal", lambda: _leaf("peepal_leaf", (0.04, 0.09, 0.025), (0.14, 0.26, 0.07), 0.3, 0.4, 0.35), leaf_shape=shape_heart, leaf_size=0.12, leaves_per_m=170, heights=[0, 0.5, 1.2, 2.2, 3.2, 4.3, 5.2, 6.0]),
    "neem": tree_species("neem", lambda: _leaf("neem_leaf", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 0.45, 0.35), leaf_shape=shape_lanceolate, leaf_size=0.08, leaves_per_m=220, heights=[0, 0.5, 1.2, 2.2, 3.3, 4.4, 5.3, 6.2], children=(4, 6)),
    "ashoka": tree_species("ashoka", lambda: _leaf("ashoka_leaf", (0.03, 0.075, 0.02), (0.09, 0.17, 0.045), 0.3, 0.3, 0.3), heights=[0, 0.5, 1.2, 2.0, 3.0, 4.0, 4.8, 5.6], spread=78, up=-0.35, length_ratio=0.32, leaf_size=0.13, leaves_per_m=260, crown_start=0.08, droop=0.9, leaf_shape=shape_lanceolate, children=(6, 8)),
    "gulmohar": tree_species("gulmohar", lambda: _leaf("gulmohar_leaf", (0.05, 0.1, 0.03), (0.15, 0.26, 0.07), 0.45, 0.4), flower=(0.95, 0.2, 0.05), leaf_size=0.07, leaves_per_m=190, spread=68, up=0.15, flower_from=5, heights=[0, 0.5, 1.2, 2.1, 3.1, 4.2, 5.0, 5.8]),
    "cherry_blossom": tree_species("cherry_blossom", lambda: _leaf("cherry_leaf", (0.06, 0.1, 0.03), (0.17, 0.26, 0.08), 0.45, 0.35), flower=(0.98, 0.72, 0.8), flower_from=4, bloom_density=(0.7, 1.0), leaf_size=0.07, leaves_per_m=120, spread=58, heights=[0, 0.45, 1.1, 1.9, 2.8, 3.6, 4.3, 5.0]),
    "jacaranda": tree_species("jacaranda", lambda: _leaf("jacaranda_leaf", (0.05, 0.1, 0.035), (0.15, 0.25, 0.08), 0.45, 0.4), flower=(0.5, 0.4, 0.85), flower_from=5, bloom_density=(0.7, 1.0), leaf_size=0.06, leaves_per_m=180, spread=62, heights=[0, 0.5, 1.2, 2.1, 3.1, 4.2, 5.0, 5.8]),
    "palm": sized_species("palm", plants.areca_palm, [0, 0.35, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1]),
    "coconut": sized_species("coconut", lambda col, seed, height: plants.areca_palm(col, seed=seed, height=height), [0, 0.5, 1.0, 1.6, 2.4, 3.2, 4.0, 4.8]),
    "maple": tree_species("maple", lambda: _leaf("maple_leaf", (0.35, 0.07, 0.03), (0.75, 0.22, 0.08), 0.45, 0.4), leaf_size=0.1, leaves_per_m=180, spread=56, heights=[0, 0.45, 1.1, 2.0, 2.9, 3.8, 4.6, 5.4]),
    "cedar": tree_species("cedar", lambda: _leaf("cedar_leaf", (0.03, 0.07, 0.03), (0.08, 0.15, 0.07), 0.6, 0.2), leaf_shape=shape_lanceolate, leaf_size=0.05, leaves_per_m=360, spread=85, up=0.05, length_ratio=0.5, crown_start=0.15, children=(6, 9), heights=[0, 0.5, 1.2, 2.2, 3.3, 4.4, 5.4, 6.4]),
    "pine": tree_species("pine", lambda: _leaf("pine_leaf", (0.04, 0.08, 0.035), (0.1, 0.18, 0.08), 0.6, 0.2), leaf_shape=shape_sword, leaf_size=0.06, leaves_per_m=320, spread=80, up=0.1, length_ratio=0.45, crown_start=0.3, children=(6, 8), heights=[0, 0.5, 1.3, 2.4, 3.6, 4.8, 5.8, 6.8]),
    "cypress": tree_species("cypress", lambda: _leaf("cypress_leaf", (0.03, 0.07, 0.03), (0.09, 0.16, 0.07), 0.6, 0.2), leaf_shape=shape_lanceolate, leaf_size=0.04, leaves_per_m=420, spread=30, up=0.8, length_ratio=0.4, crown_start=0.05, children=(5, 7), heights=[0, 0.5, 1.3, 2.4, 3.6, 4.8, 5.8, 6.8], droop=0.0),
    "magnolia": tree_species("magnolia", lambda: _leaf("magnolia_leaf", (0.03, 0.07, 0.02), (0.09, 0.18, 0.05), 0.3, 0.3, 0.4), flower=(0.99, 0.96, 0.9), flower_from=5, leaf_size=0.14, leaves_per_m=120, spread=55, heights=[0, 0.45, 1.0, 1.8, 2.6, 3.4, 4.1, 4.8]),
    "amaltas": tree_species("amaltas", lambda: _leaf("amaltas_leaf", (0.05, 0.1, 0.03), (0.15, 0.26, 0.07), 0.45, 0.4), flower=(0.98, 0.85, 0.15), flower_from=5, bloom_density=(0.7, 1.0), leaf_size=0.09, leaves_per_m=150, spread=60, droop=0.35, heights=[0, 0.5, 1.2, 2.0, 3.0, 4.0, 4.8, 5.6]),
    "arjuna": tree_species("arjuna", lambda: _leaf("arjuna_leaf", (0.04, 0.09, 0.03), (0.12, 0.22, 0.07), 0.45, 0.35), leaf_size=0.1, leaves_per_m=170, spread=62, heights=[0, 0.5, 1.3, 2.3, 3.4, 4.6, 5.6, 6.6], children=(4, 6)),
    "kadamba": tree_species("kadamba", lambda: _leaf("kadamba_leaf", (0.04, 0.09, 0.025), (0.13, 0.24, 0.07), 0.4, 0.35), flower=(0.98, 0.75, 0.3), flower_from=6, leaf_size=0.13, leaves_per_m=150, spread=72, up=0.0, heights=[0, 0.5, 1.2, 2.2, 3.3, 4.4, 5.3, 6.2]),
}

# ---- segment 3: indoor and ornamental ---------------------------------------------------

def _big_leaf_plant(name, dark, light, n, length, width, shape, pot, gloss=0.35, arch=0.5, flower=None):
    return rosette_species(name, lambda: _leaf(f"{name}_leaf", dark, light, 0.25, 0.3, gloss), n, length, width, shape, arch=arch, pot=pot, flower=flower, up=0.75, face_out=0.5)


INDOOR = {
    "monstera": _big_leaf_plant("monstera", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 9, 0.42, 0.34, shape_heart, ("cylinder_glazed", 0.3, 0.18), gloss=0.45, arch=0.6),
    "areca_palm": sized_species("areca_palm", plants.areca_palm, [0, 0.4, 0.65, 0.9, 1.15, 1.4, 1.6, 1.85]),
    "snake_plant": sized_species("snake_plant", lambda col, seed, height: plants.snake_plant(col, seed=seed, height=height), [0, 0.25, 0.38, 0.5, 0.62, 0.72, 0.8, 0.9]),
    "peace_lily": rosette_species("peace_lily", lambda: _leaf("peace_lily_leaf", (0.03, 0.08, 0.02), (0.09, 0.2, 0.05), 0.25, 0.3, 0.5), 18, 0.33, 0.1, shape_lanceolate, arch=0.55, pot=("cylinder_glazed", 0.3, 0.17), flower=Bloom("spathe", 0.06, (0.99, 0.99, 0.96), centre=(0.92, 0.95, 0.85), extra={"centre_color": (0.95, 0.92, 0.7)}), flower_h=0.42, up=0.8, face_out=0.5),
    "fiddle_leaf_fig": tree_species("fiddle_leaf_fig", lambda: _leaf("fiddle_leaf", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 0.25, 0.3, 0.45), heights=[0, 0.35, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1], leaf_size=0.22, leaves_per_m=60, children=(2, 3), spread=40, up=0.6, crown_start=0.3),
    "rubber_plant": tree_species("rubber_plant", lambda: _leaf("rubber_leaf", (0.02, 0.05, 0.02), (0.06, 0.13, 0.04), 0.2, 0.25, 0.6), heights=[0, 0.35, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1], leaf_size=0.2, leaves_per_m=70, children=(2, 3), spread=40, up=0.6, crown_start=0.3),
    "philodendron": _big_leaf_plant("philodendron", (0.03, 0.08, 0.02), (0.11, 0.22, 0.06), 12, 0.3, 0.22, shape_heart, ("terracotta", 0.24, 0.16), gloss=0.4, arch=0.7),
    "calathea": _big_leaf_plant("calathea", (0.03, 0.09, 0.04), (0.14, 0.26, 0.1), 14, 0.26, 0.14, shape_ovate, ("cylinder_glazed", 0.2, 0.15), gloss=0.3, arch=0.5),
    "croton": scaled_species("croton", croton),
    "zz_plant": _big_leaf_plant("zz_plant", (0.02, 0.06, 0.02), (0.07, 0.15, 0.04), 16, 0.4, 0.05, shape_sword, ("cylinder_glazed", 0.22, 0.14), gloss=0.55, arch=0.35),
    "fern": scaled_species("fern", extra.fern),
    "bonsai": tree_species("bonsai", lambda: _leaf("bonsai_leaf", (0.03, 0.07, 0.02), (0.09, 0.17, 0.05), 0.5, 0.3), heights=[0, 0.15, 0.25, 0.33, 0.4, 0.46, 0.52, 0.58], leaf_size=0.03, leaves_per_m=700, children=(3, 4), spread=70, up=0.0, crown_start=0.4, droop=0.2),
    "bamboo": scaled_species("bamboo", extra.bamboo_clump),
    "spider_plant": _big_leaf_plant("spider_plant", (0.1, 0.17, 0.08), (0.32, 0.42, 0.2), 30, 0.32, 0.018, shape_sword, ("terracotta", 0.18, 0.14), gloss=0.1, arch=1.1),
    "anthurium": _big_leaf_plant("anthurium", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 10, 0.26, 0.18, shape_heart, ("cylinder_glazed", 0.18, 0.13), gloss=0.5, arch=0.5, flower=Bloom("spathe", 0.055, (0.88, 0.05, 0.08), centre=(0.7, 0.02, 0.05), extra={"centre_color": (0.98, 0.85, 0.3), "elev": 25, "shape": shape_heart})),
}

# ---- segment 4: fruits and vegetables ---------------------------------------------------

FRUITS = {
    "mango": tree_species("mango", lambda: _leaf("mango_leaf", (0.03, 0.07, 0.02), (0.1, 0.18, 0.05), 0.3, 0.3, 0.3), fruit=((0.95, 0.6, 0.1), 0.055, 1.35), leaf_shape=shape_lanceolate, leaf_size=0.14, leaves_per_m=130, droop=0.4, up=0.35, heights=[0, 0.5, 1.2, 2.0, 2.9, 3.8, 4.6, 5.4]),
    "apple": tree_species("apple", lambda: _leaf("apple_leaf", (0.05, 0.1, 0.03), (0.14, 0.25, 0.07), 0.45, 0.35), fruit=((0.85, 0.12, 0.1), 0.045), flower=(0.98, 0.9, 0.92), flower_from=4, leaf_size=0.07, leaves_per_m=200, spread=58, heights=[0, 0.45, 1.0, 1.7, 2.4, 3.0, 3.5, 4.0]),
    "orange": tree_species("orange", lambda: _leaf("orange_leaf", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 0.3, 0.3, 0.3), fruit=((0.98, 0.55, 0.08), 0.045), leaf_size=0.07, leaves_per_m=260, spread=52, heights=[0, 0.4, 0.9, 1.5, 2.1, 2.7, 3.2, 3.7]),
    "lemon": sized_species("lemon", lambda col, seed, height: lemon_tree(col, seed=seed, height=height), [0, 0.35, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1]),
    "pomegranate": tree_species("pomegranate", lambda: _leaf("pomegranate_leaf", (0.04, 0.09, 0.02), (0.12, 0.22, 0.05), 0.35, 0.3, 0.3), fruit=((0.78, 0.1, 0.12), 0.05), flower=(0.95, 0.25, 0.1), flower_from=4, leaf_shape=shape_lanceolate, leaf_size=0.05, leaves_per_m=280, spread=60, heights=[0, 0.4, 0.9, 1.5, 2.1, 2.7, 3.2, 3.7]),
    "guava": tree_species("guava", lambda: _leaf("guava_leaf", (0.04, 0.09, 0.025), (0.13, 0.24, 0.07), 0.45, 0.35), fruit=((0.6, 0.78, 0.25), 0.04), leaf_size=0.1, leaves_per_m=160, spread=62, heights=[0, 0.4, 0.9, 1.5, 2.1, 2.7, 3.2, 3.7]),
    "papaya": sized_species("papaya", lambda col, seed, height: _papaya(col, seed, height), [0, 0.5, 0.9, 1.4, 1.9, 2.4, 2.9, 3.4]),
    "banana": sized_species("banana", lambda col, seed, height: banana_plant(col, seed=seed, height=height), [0, 0.4, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7]),
    "strawberry": fruit_bush("strawberry", (0.85, 0.08, 0.1), (0.3, 0.14), 0.045, leaf=lambda: _leaf("strawberry_leaf", *LEAF_LIGHT), fruit_r=0.018, stretch=1.3, flower=(0.99, 0.99, 0.95)),
    "watermelon": vine_species("watermelon", (0.12, 0.3, 0.1), (0.9, 0.25), 0.06, fruit_r=0.11, stretch=0.85, flower=(0.98, 0.9, 0.3)),
    "tomato": fruit_bush("tomato", (0.72, 0.04, 0.02), (0.3, 0.85), 0.045, fruit_r=0.032, flower=(0.98, 0.9, 0.2), staked=True),
    "chilli": fruit_bush("chilli", (0.85, 0.1, 0.05), (0.28, 0.6), 0.04, leaf=lambda: _leaf("chilli_leaf", *LEAF_DARK), fruit_r=0.012, stretch=3.2, flower=(0.99, 0.99, 0.96)),
    "brinjal": fruit_bush("brinjal", (0.3, 0.08, 0.4), (0.35, 0.7), 0.07, fruit_r=0.03, stretch=1.9, flower=(0.7, 0.5, 0.85)),
    "carrot": rosette_species("carrot", lambda: _leaf("carrot_leaf", (0.05, 0.11, 0.03), (0.16, 0.28, 0.08), 0.5, 0.35), 20, 0.28, 0.03, shape_lanceolate, arch=0.5, up=0.85),
    "radish": rosette_species("radish", lambda: _leaf("radish_leaf", (0.06, 0.12, 0.03), (0.18, 0.3, 0.08), 0.5, 0.35), 12, 0.22, 0.08, shape_ovate, arch=0.4, up=0.8),
    "pumpkin": vine_species("pumpkin", (0.95, 0.5, 0.08), (1.0, 0.3), 0.08, fruit_r=0.12, stretch=0.7, flower=(0.98, 0.85, 0.2)),
    "cucumber": vine_species("cucumber", (0.2, 0.42, 0.12), (0.7, 0.22), 0.06, fruit_r=0.03, stretch=3.0, flower=(0.98, 0.9, 0.3)),
    "peas": vine_species("peas", (0.35, 0.6, 0.2), (0.25, 1.1), 0.03, fruit_r=0.012, stretch=3.5, flower=(0.99, 0.99, 0.96), climber=True),
}


def _papaya(col, seed, height):
    """A single pale trunk with a crown of big palmate leaves; fruit under the crown from 2 m."""
    rng = Rng(seed)
    root = _root("papaya", col)
    b = Builder()
    stem = PM.stem("papaya_stem", (0.3, 0.3, 0.22), 0.6)
    pts = curve_points(Vector((0, 0, 0)), Vector((0, 0, 1)), height, Vector((0.01, 0.01, 0)), 6)
    tube(b, stem, pts, [0.06, 0.055, 0.05, 0.045, 0.04, 0.035, 0.03], segments=12)
    lm = _leaf("papaya_leaf", (0.05, 0.11, 0.03), (0.15, 0.27, 0.07), 0.4, 0.4)
    top = pts[-1]
    for i in range(10):
        a = i * 2.4
        d = Vector((math.cos(a), math.sin(a), 0.35 - 0.05 * (i % 3))).normalized()
        leaf(b, lm, frame_at(top - Vector((0, 0, 0.04 * (i % 4))), d), height * 0.28, height * 0.22, shape_heart, nu=4, nv=6, fold=0.2, arch=0.5, var=rng.random())
    _p(b.finish("papaya_mesh", col), root)
    if height > 1.9:
        _spheres(col, root, rng, (0.55, 0.7, 0.2), 6 if height < 2.8 else 10, 0.05, (height * 0.72, height * 0.9), 0.07, 1.6, "papaya_fruit")
    root["sway"] = {"amp": 0.3, "speed": 0.35}
    return root


# ---- segment 5: herbs and medicinal -----------------------------------------------------

HERBS = {
    "tulsi": sized_species("tulsi", lambda col, seed, height: plants.tulsi(col, seed=seed, height=height), [0, 0.18, 0.26, 0.34, 0.42, 0.5, 0.58, 0.66]),
    "mint": shrub_species("mint", None, (0.26, 0.24), 0.035, leaf=lambda: _leaf("mint_leaf", *LEAF_LIGHT), pot=("terracotta", 0.17, 0.15)),
    "coriander": shrub_species("coriander", Bloom("star", 0.007, (0.99, 0.99, 0.95), extra={"per_tip": 1.5}), (0.22, 0.3), 0.02, leaf=lambda: _leaf("coriander_leaf", (0.06, 0.12, 0.03), (0.2, 0.32, 0.09), 0.5, 0.4), flower_from=6),
    "rosemary": shrub_species("rosemary", Bloom("star", 0.008, (0.62, 0.62, 0.92), extra={"per_tip": 1.2}), (0.3, 0.55), 0.012, leaf=lambda: _leaf("rosemary_leaf", *LEAF_GREY), flower_from=6, layers=1),
    "thyme": shrub_species("thyme", Bloom("star", 0.006, (0.85, 0.62, 0.88), extra={"per_tip": 1.5}), (0.24, 0.16), 0.01, leaf=lambda: _leaf("thyme_leaf", *LEAF_GREY), flower_from=6, layers=1, low=True),
    "lemongrass": scaled_species("lemongrass", ornamental_grass),
    "aloe_vera": sized_species("aloe_vera", lambda col, seed, height: _aloe(col, seed, height), [0, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.5]),
    "ashwagandha": fruit_bush("ashwagandha", (0.9, 0.35, 0.08), (0.3, 0.55), 0.04, fruit_r=0.01, flower=(0.8, 0.85, 0.5)),
    "brahmi": shrub_species("brahmi", Bloom("open5", 0.009, (0.97, 0.95, 0.99), extra={"per_tip": 0.8}), (0.4, 0.08), 0.015, leaf=lambda: _leaf("brahmi_leaf", *LEAF_LIGHT), flower_from=5, layers=1, low=True),
    "giloy": vine_species("giloy", (0.85, 0.15, 0.1), (0.3, 1.3), 0.05, leaf=lambda: _leaf("giloy_leaf", (0.04, 0.1, 0.03), (0.14, 0.26, 0.07), 0.35, 0.35, 0.25), fruit_r=0.01, climber=True),
    "chamomile": shrub_species("chamomile", Bloom("daisy", 0.015, (0.99, 0.99, 0.97), centre=(0.99, 0.95, 0.6), disc=(0.95, 0.78, 0.1), petals=14, extra={"w": 0.3, "per_tip": 1.0}), (0.28, 0.3), 0.012, leaf=lambda: _leaf("chamomile_leaf", (0.06, 0.12, 0.03), (0.2, 0.32, 0.09), 0.5, 0.4), layers=1, sway=(0.45, 0.6)),
    "sage": shrub_species("sage", Bloom("spike", 0.013, (0.45, 0.3, 0.75), extra={"length": 4.0, "whorls": 7, "per_tip": 0.8}), (0.3, 0.35), 0.035, leaf=lambda: _leaf("sage_leaf", (0.12, 0.17, 0.11), (0.36, 0.42, 0.3), 0.7, 0.3), flower_from=6, layers=1),
    "turmeric": rosette_species("turmeric", lambda: _leaf("turmeric_leaf", (0.04, 0.1, 0.03), (0.13, 0.26, 0.07), 0.35, 0.4), 9, 0.55, 0.12, shape_lanceolate, arch=0.4, up=0.9),
    "ginger": rosette_species("ginger", lambda: _leaf("ginger_leaf", (0.05, 0.11, 0.03), (0.15, 0.28, 0.08), 0.35, 0.4), 16, 0.5, 0.04, shape_lanceolate, arch=0.55, up=0.85),
}


def _aloe(col, seed, height):
    rng = Rng(seed)
    root = _root("aloe", col)
    b = Builder()
    lm = _leaf("aloe_leaf", (0.12, 0.22, 0.12), (0.3, 0.45, 0.25), 0.35, 0.25, 0.3)
    n = int(10 + height * 30)
    for i in range(n):
        a = i * 2.39996 + rng.uniform(-0.15, 0.15)
        d = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 1.0)).normalized()
        leaf(b, lm, frame_at(Vector((0, 0, 0.01 * (i % 3))), d), height * rng.uniform(0.8, 1.0), height * 0.18, shape_sword, nu=3, nv=8, fold=0.55, arch=0.45, var=rng.random())
    _p(b.finish("aloe_mesh", col), root)
    return root


SEGMENTS = {"flowers": FLOWERS, "trees": TREES, "indoor": INDOOR, "fruits": FRUITS, "herbs": HERBS}
BUILDERS = {**FLOWERS, **TREES, **INDOOR, **FRUITS, **HERBS}


# ---- extras: pieces of the garden drawn with the plants ---------------------------------

def plinth(col, stage=7, seed=1):
    """A sandstone plinth rising from the lotus pond: a potted plant stands on it."""
    from .geo import lathe
    root = _root("plinth", col)
    b = Builder()
    stone = M.stone((0.62, 0.55, 0.44), "plinth_stone")
    prof = [(0.0, 0.0), (0.2, 0.0), (0.2, 0.02), (0.17, 0.05), (0.15, 0.17), (0.18, 0.19), (0.215, 0.205), (0.215, 0.235), (0.2, 0.245), (0.0, 0.245)]
    lathe(b, stone, prof, segments=40)
    _p(b.finish("plinth_mesh", col), root)
    # a dark wet band where the stone meets the water
    wet = M.matte((0.12, 0.13, 0.1), 0.35, "plinth_wet")
    w = Builder()
    lathe(w, wet, [(0.201, 0.0), (0.201, 0.03), (0.19, 0.045)], segments=40)
    _p(w.finish("plinth_wet", col), root)
    return root


EXTRAS = {"plinth": plinth}
