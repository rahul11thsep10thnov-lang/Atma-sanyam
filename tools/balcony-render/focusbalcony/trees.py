"""Trees and shrubs: a recursive branching generator with real leaves (tens
of thousands of small blades) and optional flower clusters. Every builder
returns a root Empty at the trunk base."""
import math
import bpy
from mathutils import Matrix, Vector

from . import plant_materials as PM
from . import materials as M
from .common import DEG, Rng, link
from .geo import Builder, curve_points, frame_at, leaf, shape_ovate, shape_lanceolate, tube
from .nodes import Tree as NodeTree


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


# ---- materials ----------------------------------------------------------------

def bark(name="bark", dark=(0.05, 0.035, 0.022), light=(0.2, 0.15, 0.1), roughness=0.85):
    """Fissured bark: vertical ridges + fine cracks, with per-part variation."""
    key = f"bark::{name}"
    if key in M._cache:
        return M._cache[key]
    t = NodeTree(name)
    co = t.coords("Object", scale=(1, 1, 0.18))
    ridges = t.noise(co, scale=24, detail=7, roughness=0.65)
    cracks = t.noise(t.coords("Object"), scale=70, detail=6)
    h = t.math("ADD", t.math("MULTIPLY", (ridges, "Fac"), 0.7), t.math("MULTIPLY", (cracks, "Fac"), 0.3))
    col = t.ramp(h, [(0.3, dark), (0.7, light)])
    moss = t.noise(t.coords("Object"), scale=3, detail=3)
    col = t.mix_color(t.map_range(moss, 0.6, 0.75, 0.0, 0.5), col, (0.12, 0.14, 0.05))
    bump = t.bump(h, strength=0.55, distance=0.02)
    mat = t.surface(t.principled(col, t.map_range(cracks, 0.3, 0.7, roughness - 0.1, roughness + 0.1), bump))
    M._cache[key] = mat
    return mat


def _flower_mat(name, color, center=(0.95, 0.75, 0.2)):
    key = f"flower::{name}"
    if key in M._cache:
        return M._cache[key]
    t = NodeTree(name)
    uvn = t.node("ShaderNodeUVMap", uv_map="UVMap")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(uvn, sep.inputs[0])
    # uv y runs 0 at the petal base → 1 at the tip
    base = t.mix_color(t.map_range((sep, "Y"), 0.0, 0.35, 0.0, 1.0), center, color)
    var = t.node("ShaderNodeAttribute", attribute_name="var")
    base = t.mix_color(t.math("MULTIPLY", (var, "Fac"), 0.35), base, tuple(min(1, c * 1.25) for c in color))
    p = t.principled(base, 0.55, None)  # the translucent mix gives the backlight; SSS costs minutes per sprite
    tr = t.node("ShaderNodeBsdfTranslucent", {"Color": tuple(c * 0.8 for c in color)})
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, 0.3)
    t.link(p, mix.inputs[1])
    t.link(tr, mix.inputs[2])
    mat = t.surface(mix)
    M._cache[key] = mat
    return mat


# ---- leaves and flowers ----------------------------------------------------------

def _leaf_cluster(b, mat, origin, forward, size, rng, n=1, shape=shape_ovate, dry=0.0, droop=0.0):
    for _ in range(n):
        d = (forward + Vector((rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(-0.5, 0.3)))).normalized()
        frame = frame_at(origin, d)
        tilt = Matrix.Rotation(rng.uniform(-0.8, 0.8), 4, "Y")
        leaf(b, mat, frame @ tilt, size * rng.uniform(0.75, 1.2), size * rng.uniform(0.45, 0.6), shape,
             nu=2, nv=2, fold=0.2, arch=0.3 + droop, twist=rng.uniform(-0.3, 0.3), var=rng.random(), dry=dry)


def _flower(b, mat, origin, up, radius, rng, petals=5, layers=1):
    """A simple open flower: petals as tiny leaf blades around a centre."""
    for layer in range(layers):
        r = radius * (1 - 0.3 * layer)
        for i in range(petals):
            a = 2 * math.pi * i / petals + rng.uniform(-0.2, 0.2) + layer * 0.6
            d = (Vector((math.cos(a), math.sin(a), 0)) * 0.8 + up * (0.45 + 0.3 * layer)).normalized()
            # local frame: spine outward, face up
            frame = frame_at(origin + up * 0.004 * layer, d, up)
            leaf(b, mat, frame, r, r * 0.75, shape_ovate, nu=2, nv=3, fold=-0.25, arch=-0.3, var=rng.random())


# ---- the branching generator ---------------------------------------------------------

class TreeSpec:
    def __init__(self, height=4.0, trunk_radius=0.12, levels=4, children=(4, 5), spread=52.0, up=0.25,
                 length_ratio=0.64, radius_ratio=0.58, leaf_size=0.09, leaves_per_m=160, crown_start=0.3,
                 leaf_mat=None, bark_mat=None, flower=None, flower_density=0.0, droop=0.0, gnarl=0.25,
                 leaf_shape=shape_ovate, dry=0.0, bare_fraction=0.0):
        self.__dict__.update(locals())
        del self.__dict__["self"]


def build_tree(col, spec: TreeSpec, seed=1, name="tree"):
    rng = Rng(seed)
    root = _root(name, col)
    b = Builder()
    leaves = Builder()
    bark_mat = spec.bark_mat or bark()
    leaf_mat = spec.leaf_mat or PM.leaf("tree_leaf", (0.03, 0.07, 0.02), (0.1, 0.19, 0.05), 0.45, 0.35)
    flower_mat = _flower_mat("tree_flower", spec.flower) if spec.flower else None
    twigs = []

    def branch(start, direction, length, radius, level):
        bend = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * spec.gnarl * 0.3 + Vector((0, 0, 1)) * spec.up * (0.4 if level else 0.15)
        pts = curve_points(start, direction, length, bend, n=6 if level < 2 else 3)
        rad = [radius * (1 - 0.75 * (i / len(pts)) ** 1.2) + 0.002 for i in range(len(pts))]
        if level == 0:
            rad[0] *= 1.35
        tube(b, bark_mat, pts, rad, segments=10 if level == 0 else (7 if level == 1 else 5), var=rng.random())
        if level >= spec.levels:
            twigs.append((pts, direction, level))
            return
        n = rng.randint(spec.children[0], spec.children[1]) if level else rng.randint(spec.children[0] + 1, spec.children[1] + 2)
        for k in range(n):
            t = rng.uniform(spec.crown_start if level == 0 else 0.25, 0.98)
            idx = min(len(pts) - 2, int(t * (len(pts) - 1)))
            p = pts[idx].lerp(pts[idx + 1], t * (len(pts) - 1) - idx)
            axis = (pts[idx + 1] - pts[idx]).normalized()
            ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((1, 0, 0))
            side = axis.cross(ref).normalized()
            az = rng.uniform(0, 2 * math.pi) + k * 2.4
            side = side * math.cos(az) + axis.cross(side) * math.sin(az)
            ang = spec.spread * DEG * rng.uniform(0.75, 1.25)
            d = (axis * math.cos(ang) + side * math.sin(ang)).normalized()
            d = (d + Vector((0, 0, spec.up))).normalized()
            branch(p, d, length * spec.length_ratio * rng.uniform(0.8, 1.15) * (1.15 - 0.4 * t if level == 0 else 1.0),
                   radius * spec.radius_ratio * rng.uniform(0.85, 1.1), level + 1)
        if level > 0 and level >= spec.levels - 1:
            twigs.append((pts, direction, level))

    trunk_dir = Vector((rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), 1)).normalized()
    branch(Vector((0, 0, 0)), trunk_dir, spec.height * 0.55, spec.trunk_radius, 0)

    # leaves along the twigs
    for pts, direction, level in twigs:
        if spec.bare_fraction and rng.random() < spec.bare_fraction:
            continue
        seg_len = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
        n = max(1, int(seg_len * spec.leaves_per_m))
        for i in range(n):
            t = 0.2 + 0.8 * (i + rng.random()) / n
            idx = min(len(pts) - 2, int(t * (len(pts) - 1)))
            p = pts[idx].lerp(pts[idx + 1], t * (len(pts) - 1) - idx)
            axis = (pts[idx + 1] - pts[idx]).normalized()
            fwd = (axis * 0.5 + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.3, 0.6)))).normalized()
            _leaf_cluster(leaves, leaf_mat, p, fwd, spec.leaf_size, rng, n=2, shape=spec.leaf_shape, dry=spec.dry, droop=spec.droop)
        if flower_mat and spec.flower_density and rng.random() < spec.flower_density:
            p = pts[-1]
            up = (Vector((0, 0, 1)) + direction * 0.3).normalized()
            for _ in range(rng.randint(1, 3)):
                q = p + Vector((rng.uniform(-0.06, 0.06), rng.uniform(-0.06, 0.06), rng.uniform(0, 0.05)))
                _flower(leaves, flower_mat, q, up, spec.leaf_size * 0.45, rng, petals=5, layers=2)

    wood = b.finish(f"{name}_wood", col)
    wood.parent = root
    foliage = leaves.finish(f"{name}_foliage", col)
    foliage.parent = root
    root["sway"] = {"amp": 0.12 + 0.3 / max(1.0, spec.height), "speed": 0.35}
    return root


# ---- species ------------------------------------------------------------------------

def neem_tree(col, seed=3, height=5.5, density=1.0):
    """A mature shade tree with a full, slightly drooping crown."""
    spec = TreeSpec(height=height, trunk_radius=0.16 * height / 5.5, levels=4, children=(4, 5), spread=46, up=0.3,
                    leaf_size=0.11, leaves_per_m=int(220 * density), droop=0.25, leaf_shape=shape_lanceolate,
                    bark_mat=bark("neem_bark", (0.06, 0.04, 0.025), (0.22, 0.16, 0.1), 0.85),
                    leaf_mat=PM.leaf("neem_leaf", (0.035, 0.08, 0.02), (0.12, 0.2, 0.05), 0.45, 0.4))
    return build_tree(col, spec, seed, "neem")


def frangipani(col, seed=5, height=2.6):
    """Plumeria: thick pale branches, big ovate leaves in rosettes at the
    tips and cream-and-yellow flowers."""
    spec = TreeSpec(height=height, trunk_radius=0.09, levels=3, children=(2, 3), spread=38, up=0.5, length_ratio=0.7,
                    radius_ratio=0.75, leaf_size=0.24, leaves_per_m=70, crown_start=0.5, gnarl=0.15,
                    bark_mat=bark("plumeria_bark", (0.3, 0.27, 0.22), (0.5, 0.46, 0.4), 0.7),
                    leaf_mat=PM.leaf("plumeria_leaf", (0.05, 0.11, 0.03), (0.15, 0.25, 0.07), 0.3, 0.3, gloss_coat=0.2),
                    flower=(0.95, 0.9, 0.75), flower_density=0.9)
    return build_tree(col, spec, seed, "frangipani")


def gulmohar(col, seed=8, height=5.0):
    """Flame tree: wide umbrella crown of feathery leaves, orange-red blooms."""
    spec = TreeSpec(height=height, trunk_radius=0.14, levels=4, children=(3, 4), spread=62, up=0.1, length_ratio=0.66,
                    leaf_size=0.06, leaves_per_m=320, crown_start=0.55, leaf_shape=shape_lanceolate,
                    leaf_mat=PM.leaf("gulmohar_leaf", (0.05, 0.1, 0.02), (0.14, 0.24, 0.06), 0.5, 0.45),
                    flower=(0.85, 0.12, 0.03), flower_density=0.7)
    return build_tree(col, spec, seed, "gulmohar")


def shrub(col, seed=11, radius=0.55, height=0.7, leaf_size=0.05, flower=None, flower_density=0.0, name="shrub",
          leaf_mat=None, dry=0.0, droop=0.0, density=1.0):
    """A leafy mound: short woody stems radiating from the base, each tipped
    with leaves, dense enough to read as a clipped shrub."""
    rng = Rng(seed)
    root = _root(name, col)
    b = Builder()
    leaves = Builder()
    stem_mat = PM.stem(f"{name}_stem", (0.12, 0.09, 0.04), 0.6)
    lm = leaf_mat or PM.leaf(f"{name}_leaf", (0.04, 0.09, 0.025), (0.12, 0.22, 0.06), 0.4, 0.35)
    fm = _flower_mat(f"{name}_flower", flower) if flower else None
    n = int(90 * density * (radius / 0.55) ** 2)
    for i in range(n):
        a = rng.uniform(0, 2 * math.pi)
        r = radius * math.sqrt(rng.random()) * 0.9
        top = Vector((math.cos(a) * r, math.sin(a) * r, 0))
        h = height * math.sqrt(max(0.05, 1 - (r / radius) ** 2)) * rng.uniform(0.7, 1.0)
        top.z = h - droop * 0.1
        base = Vector((top.x * 0.3, top.y * 0.3, 0))
        pts = curve_points(base, (top - base).normalized(), (top - base).length, Vector((0, 0, -0.08 * droop)), n=3)
        tube(b, stem_mat, pts, [0.006, 0.005, 0.004, 0.003], segments=5, var=rng.random())
        d = (top - base).normalized()
        for k in range(rng.randint(3, 5)):
            t = 0.45 + 0.55 * k / 5
            p = base.lerp(top, t)
            _leaf_cluster(leaves, lm, p, (d + Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.2))).normalized(),
                          leaf_size, rng, n=2, dry=dry, droop=droop)
        if fm and rng.random() < flower_density:
            _flower(leaves, fm, top + Vector((0, 0, 0.01)), (d + Vector((0, 0, 1))).normalized(), leaf_size * 0.5, rng, 5, 2)
    wood = b.finish(f"{name}_stems", col)
    wood.parent = root
    fol = leaves.finish(f"{name}_leaves", col)
    fol.parent = root
    root["sway"] = {"amp": 0.35, "speed": 0.5}
    return root


def hedge(col, length=3.0, height=1.0, depth=0.6, seed=4, name="hedge"):
    """A clipped hedge: a dense skin of small leaves over a rounded box."""
    rng = Rng(seed)
    root = _root(name, col)
    leaves = Builder()
    lm = PM.leaf("hedge_leaf", (0.03, 0.075, 0.02), (0.1, 0.18, 0.045), 0.4, 0.3)
    core = M.matte((0.02, 0.03, 0.01), 0.9, "hedge_core")
    inner = Builder()
    # inner dark core so gaps never show the background
    from .geo import lathe  # noqa: F401  (kept for parity; core is a box below)
    bm_pts = [[Vector((x, y, z)) for x in (-length / 2 + 0.05, length / 2 - 0.05)] for (y, z) in ((-depth / 2 + 0.05, 0.02), (depth / 2 - 0.05, 0.02), (depth / 2 - 0.05, height - 0.08), (-depth / 2 + 0.05, height - 0.08), (-depth / 2 + 0.05, 0.02))]
    inner.grid(bm_pts, [[(0, 0), (1, 0)]] * len(bm_pts), core)
    n = int(length * depth * 2 * 900 + length * height * 2 * 700)
    for i in range(n):
        face = rng.random()
        if face < 0.45:  # top
            p = Vector((rng.uniform(-length / 2, length / 2), rng.uniform(-depth / 2, depth / 2), height))
            nrm = Vector((0, 0, 1))
        elif face < 0.75:  # front
            p = Vector((rng.uniform(-length / 2, length / 2), -depth / 2, rng.uniform(0.05, height)))
            nrm = Vector((0, -1, 0))
        elif face < 0.9:  # back
            p = Vector((rng.uniform(-length / 2, length / 2), depth / 2, rng.uniform(0.05, height)))
            nrm = Vector((0, 1, 0))
        else:  # ends
            s = 1 if rng.random() < 0.5 else -1
            p = Vector((s * length / 2, rng.uniform(-depth / 2, depth / 2), rng.uniform(0.05, height)))
            nrm = Vector((s, 0, 0))
        p += nrm * rng.uniform(-0.04, 0.02)
        _leaf_cluster(leaves, lm, p, (nrm + Vector((rng.uniform(-0.7, 0.7), rng.uniform(-0.7, 0.7), rng.uniform(-0.2, 0.5)))).normalized(),
                      0.035, rng, n=1)
    c = inner.finish(f"{name}_core", col)
    c.parent = root
    f = leaves.finish(f"{name}_leaves", col)
    f.parent = root
    root["sway"] = {"amp": 0.1, "speed": 0.5}
    return root


def dead_sapling(col, seed=2, height=0.9):
    """A sapling that gave up: bare grey twigs, a few brown curled leaves."""
    spec = TreeSpec(height=height, trunk_radius=0.014, levels=3, children=(2, 3), spread=40, up=0.05, leaf_size=0.04,
                    leaves_per_m=25, droop=1.1, dry=0.9, bare_fraction=0.6, gnarl=0.5,
                    bark_mat=bark("dead_bark", (0.18, 0.16, 0.13), (0.34, 0.31, 0.27), 0.9),
                    leaf_mat=PM.leaf("dead_leaf", (0.2, 0.12, 0.04), (0.33, 0.22, 0.08), 0.7, 0.1))
    return build_tree(col, spec, seed, "dead_sapling")
