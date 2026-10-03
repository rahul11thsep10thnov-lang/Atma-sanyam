"""Everything that can be placed in the room: furniture for the floor,
small objects for surfaces, framed things for the walls. Builders return a
root Empty at the base centre; fronts face -Y; `lit` for lamps and candles."""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from . import plant_materials as PM
from . import textiles, decor, furniture as F, plants, trees
from .common import DEG, Rng, box, cylinder, link, mesh_object
from .geo import Builder, disc, frame_at, lathe, leaf, shape_heart, shape_lanceolate, shape_ovate, tube
from .nodes import Tree as NodeTree
from .room import painted_wood


def _root(name, col):
    root = bpy.data.objects.new(name, None)
    link(root, col)
    return root


def _p(o, root):
    o.parent = root
    return o


def _lamp(col, root, location, energy, color=(1.0, 0.75, 0.5), radius=0.05):
    from . import lighting
    lighting.point_lamp(col, "lamp_light", location, energy=energy, color=color, radius=radius).parent = root


def _ceramic(name, color, rough=0.25):
    return PM.glazed_pot(name, color, rough)


def _brass():
    return M.metal((0.5, 0.33, 0.1), 0.3, "brass")


def _sphere(name, radius, mat, col, loc=(0, 0, 0), scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=18, radius=radius)
    for f in bm.faces:
        f.smooth = True
    o = mesh_object(name, bm, mat, col, smooth=True)
    o.location = loc
    o.scale = scale
    return o


# ---- furniture ---------------------------------------------------------------------

def bedside_table(col, seed=1):
    root = _root("bedside_table", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("top", (0.5, 0.4, 0.03), (0, 0, 0.585), teak, col, bevel=0.004), root)
    _p(box("drawer", (0.46, 0.36, 0.14), (0, 0, 0.5), teak, col, bevel=0.004), root)
    _p(box("knob", (0.03, 0.02, 0.03), (0, -0.19, 0.5), _brass(), col, bevel=0.006), root)
    for x in (-0.21, 0.21):
        for y in (-0.16, 0.16):
            _p(box(f"leg_{x}_{y}", (0.035, 0.035, 0.44), (x, y, 0.22), teak, col, bevel=0.003), root)
    _p(box("shelf", (0.44, 0.34, 0.02), (0, 0, 0.2), teak, col, bevel=0.003), root)
    return root


def table_lamp(col, seed=2, lit=False, shade=(0.9, 0.86, 0.76), base_mat=None, name="table_lamp"):
    root = _root(name, col)
    base = base_mat or _ceramic("lamp_ceramic", (0.2, 0.26, 0.3), 0.2)
    b = Builder()
    lathe(b, base, [(0.0, 0.0), (0.08, 0.0), (0.085, 0.02), (0.07, 0.1), (0.09, 0.22), (0.07, 0.3), (0.025, 0.33), (0.02, 0.4), (0.0, 0.4)], 40)
    _p(b.finish(f"{name}_base", col), root)
    paper = M.emissive(shade, 1.6, "shade_lit") if lit else M.matte(shade, 0.6, "shade_paper")
    s = Builder()
    lathe(s, paper, [(0.11, 0.56), (0.13, 0.4), (0.11, 0.56)], 36)
    sh = _p(cylinder(f"{name}_shade", 0.13, 0.17, (0, 0, 0.485), paper, col, verts=36, radius_top=0.11), root)
    if lit:
        _lamp(col, root, (0, 0, 0.47), 12.0, (1.0, 0.78, 0.55), 0.04)
    return root


def side_chair(col, seed=3):
    return F.cane_side_chair(col)


def small_table(col, seed=4):
    root = _root("small_table", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(cylinder("top", 0.3, 0.025, (0, 0, 0.5), teak, col, verts=48, bevel=0.004), root)
    for i in range(3):
        a = i * 2.094
        leg = _p(cylinder(f"leg_{i}", 0.018, 0.5, (math.cos(a) * 0.2, math.sin(a) * 0.2, 0.25), teak, col, verts=12), root)
        leg.rotation_euler = (-math.sin(a) * 0.12, math.cos(a) * 0.12, 0)
    return root


def study_desk(col, seed=5):
    root = _root("study_desk", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("top", (1.1, 0.55, 0.03), (0, 0, 0.745), teak, col, bevel=0.004), root)
    _p(box("apron", (1.04, 0.49, 0.08), (0, 0, 0.69), teak, col, bevel=0.003), root)
    for x in (-0.5, 0.5):
        for y in (-0.22, 0.22):
            _p(box(f"leg_{x}_{y}", (0.045, 0.045, 0.73), (x, y, 0.365), teak, col, bevel=0.003), root)
    _p(box("drawer", (0.4, 0.46, 0.07), (0.25, 0.0, 0.69), teak, col, bevel=0.003), root)
    _p(box("knob", (0.03, 0.02, 0.03), (0.25, -0.24, 0.69), _brass(), col, bevel=0.006), root)
    # a notebook and a pen
    paper = M.matte((0.85, 0.82, 0.74), 0.8, "paper")
    _p(box("notebook", (0.2, 0.26, 0.015), (-0.2, -0.02, 0.767), M.matte((0.15, 0.1, 0.07), 0.6, "leather"), col, bevel=0.003), root)
    _p(box("pages", (0.19, 0.25, 0.012), (-0.2, -0.02, 0.766), paper, col), root)
    _p(cylinder("pen", 0.004, 0.14, (0.0, -0.1, 0.765), _brass(), col, verts=10), root).rotation_euler = (0, 90 * DEG, 0.3)
    return root


def bookshelf(col, seed=6):
    """Open teak shelving with books, a plant and a few objects."""
    rng = Rng(seed)
    root = _root("bookshelf", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    W, D, Hh = 0.9, 0.3, 1.8
    for x in (-W / 2, W / 2):
        _p(box(f"side_{x}", (0.03, D, Hh), (x, 0, Hh / 2), teak, col, bevel=0.003), root)
    for i in range(5):
        z = 0.08 + i * 0.41
        _p(box(f"shelf_{i}", (W, D, 0.025), (0, 0, z), teak, col, bevel=0.003), root)
    _p(box("back", (W, 0.012, Hh), (0, D / 2 - 0.006, Hh / 2), painted_wood((0.6, 0.56, 0.48), "shelf_back"), col), root)
    cols = [(0.55, 0.2, 0.15), (0.2, 0.3, 0.45), (0.75, 0.7, 0.6), (0.15, 0.25, 0.2), (0.6, 0.45, 0.2), (0.3, 0.12, 0.1), (0.8, 0.78, 0.7)]
    for i in range(4):
        z = 0.08 + i * 0.41 + 0.0125
        x = -W / 2 + 0.06
        n = rng.randint(5, 11) if i != 2 else 4
        for k in range(n):
            w = rng.uniform(0.02, 0.045)
            h = rng.uniform(0.18, 0.28)
            _p(box(f"book_{i}_{k}", (w, rng.uniform(0.16, 0.22), h), (x + w / 2, 0.02, z + h / 2), M.matte(rng.choice(cols), 0.7, f"book_{rng.randint(0, 999)}"), col, bevel=0.002), root)
            x += w + 0.004
        if i == 2:
            sub = bpy.data.objects.new("shelf_plant", None)
            link(sub, col)
            sub.parent = root
            sub.location = (0.2, 0, z)
            pz = plants.pot("cylinder_glazed", 0.12, 0.08, col, sub, "shelf_pot")
            s = trees.shrub(col, seed=seed, radius=0.14, height=0.12, leaf_size=0.035, name="shelf_pothos", droop=0.8,
                            leaf_mat=PM.leaf("shelf_pothos_leaf", (0.05, 0.12, 0.03), (0.17, 0.3, 0.07), 0.3, 0.35, gloss_coat=0.3))
            s.parent = sub
            s.location = (0, 0, pz)
    _p(_sphere("shelf_globe", 0.07, M.matte((0.35, 0.3, 0.2), 0.5, "globe_paper"), col, (0.3, 0, 0.08 + 4 * 0.41 - 0.41 + 0.09)), root)
    return root


def lounge_chair(col, seed=7):
    return F.cane_lounge_chair(col, seed=seed, cushion_color=(0.7, 0.64, 0.54))


def floor_cushions(col, seed=8):
    root = _root("floor_cushions", col)
    mats = [textiles.block_print("cushion_indigo"), textiles.linen("cushion_sand", (0.72, 0.64, 0.5)), textiles.handloom_stripes("cushion_stripe")]
    for i, (x, y, z, rz) in enumerate(((0, 0, 0, 0.1), (0.1, -0.08, 0.1, -0.3), (-0.08, 0.1, 0.2, 0.5))):
        F.cushion(f"fc_{i}", (0.55, 0.55, 0.1), (x, y, z + 0.05), mats[i % 3], col, root, softness=0.06, tilt=rz)
    return root


def cabinet(col, seed=9):
    root = _root("cabinet", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("body", (0.9, 0.42, 0.78), (0, 0, 0.47), teak, col, bevel=0.005), root)
    for x in (-0.22, 0.22):
        _p(box(f"door_{x}", (0.42, 0.015, 0.68), (x, -0.215, 0.47), teak, col, bevel=0.004), root)
        _p(cylinder(f"knob_{x}", 0.012, 0.02, (x * 0.2 + (0.02 if x < 0 else -0.02), -0.23, 0.47), _brass(), col, verts=12), root).rotation_euler = (90 * DEG, 0, 0)
    for x in (-0.4, 0.4):
        for y in (-0.16, 0.16):
            _p(box(f"leg_{x}_{y}", (0.035, 0.035, 0.08), (x, y, 0.04), teak, col, bevel=0.003), root)
    return root


def floor_lamp(col, seed=10, lit=False):
    root = _root("floor_lamp", col)
    brass = _brass()
    _p(cylinder("base", 0.14, 0.02, (0, 0, 0.01), brass, col, verts=36), root)
    _p(cylinder("stem", 0.012, 1.5, (0, 0, 0.76), brass, col, verts=12), root)
    paper = M.emissive((0.92, 0.86, 0.72), 1.5, "shade_lit") if lit else M.matte((0.92, 0.86, 0.72), 0.6, "shade_paper")
    _p(cylinder("shade", 0.2, 0.26, (0, 0, 1.56), paper, col, verts=36, radius_top=0.16), root)
    if lit:
        _lamp(col, root, (0, 0, 1.5), 30.0, (1.0, 0.78, 0.55), 0.06)
    return root


def pouf(col, seed=11):
    root = _root("pouf", col)
    mat = textiles.handloom_stripes("pouf_fabric", ((0.5, 0.3, 0.12), (0.72, 0.68, 0.58), (0.2, 0.12, 0.08)), 0.05)
    p = _p(cylinder("pouf_body", 0.26, 0.34, (0, 0, 0.17), mat, col, verts=40, bevel=0.07), root)
    return root


# ---- plants ------------------------------------------------------------------------------

def monstera(col, seed=12):
    """Split leaves on long petioles in a charcoal pot."""
    rng = Rng(seed)
    root = _root("monstera", col)
    pz = plants.pot("cylinder_charcoal", 0.3, 0.16, col, root)
    b = Builder()
    lm = PM.leaf("monstera_leaf", (0.03, 0.08, 0.02), (0.1, 0.2, 0.05), 0.3, 0.35, gloss_coat=0.35)
    stem = PM.stem("monstera_stem", (0.1, 0.16, 0.05), 0.5)
    for i in range(7):
        a = i * 0.9 + rng.uniform(-0.3, 0.3)
        L = rng.uniform(0.35, 0.6)
        d = Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 1.0)).normalized()
        pts = [Vector((0, 0, pz)), Vector((0, 0, pz)) + d * L * 0.5, Vector((0, 0, pz)) + d * L + Vector((0, 0, -0.05))]
        tube(b, stem, pts, [0.012, 0.01, 0.008], segments=7)
        tip = pts[-1]
        frame = frame_at(tip, (d * 0.6 + Vector((0, 0, -0.2))).normalized())
        # a heart blade with deep lobes: draw the blade as five narrow fingers
        for k in range(-2, 3):
            ang = k * 0.32
            sub = frame @ Vector((math.sin(ang) * 0.0, 0, 0))
            fr2 = frame_at(tip, (d * 0.6 + Vector((math.sin(ang) * 0.45, math.cos(ang) * 0.1, -0.25))).normalized())
            leaf(b, lm, fr2, 0.32 * (1 - 0.15 * abs(k)), 0.09, shape_lanceolate, nu=3, nv=6, fold=0.15, arch=0.4, var=rng.random())
    _p(b.finish("monstera_mesh", col), root)
    root["sway"] = {"amp": 0.25, "speed": 0.45}
    return root


def bonsai(col, seed=13):
    root = _root("bonsai", col)
    tray = _ceramic("bonsai_tray", (0.25, 0.22, 0.2), 0.3)
    b = Builder()
    lathe(b, tray, [(0.0, 0.0), (0.16, 0.0), (0.17, 0.05), (0.15, 0.05), (0.14, 0.02), (0.0, 0.02)], 40)
    disc(b, PM.soil(), 0.14, 0.03, rings=4, segments=32)
    _p(b.finish("bonsai_tray_mesh", col), root)
    spec = trees.TreeSpec(height=0.32, trunk_radius=0.018, levels=3, children=(3, 4), spread=65, up=0.05, length_ratio=0.6, radius_ratio=0.6,
                          leaf_size=0.016, leaves_per_m=900, crown_start=0.3, gnarl=0.9, leaf_shape=shape_ovate,
                          leaf_mat=PM.leaf("bonsai_leaf", (0.03, 0.07, 0.02), (0.09, 0.17, 0.045), 0.4, 0.3))
    t = trees.build_tree(col, spec, seed, "bonsai_tree")
    t.parent = root
    t.location = (0.02, 0, 0.03)
    t.rotation_euler = (0.25, 0, 0)
    return root


def fiddle_fig(col, seed=14):
    root = _root("fiddle_fig", col)
    pz = plants.pot("cylinder_glazed", 0.34, 0.17, col, root)
    spec = trees.TreeSpec(height=1.5, trunk_radius=0.02, levels=2, children=(3, 4), spread=40, up=0.5, length_ratio=0.55, leaf_size=0.22,
                          leaves_per_m=60, crown_start=0.3, leaf_shape=shape_ovate,
                          leaf_mat=PM.leaf("fig_leaf", (0.03, 0.075, 0.02), (0.09, 0.17, 0.045), 0.25, 0.3, gloss_coat=0.4))
    t = trees.build_tree(col, spec, seed, "fig_tree")
    t.parent = root
    t.location = (0, 0, pz)
    root["sway"] = {"amp": 0.15, "speed": 0.4}
    return root


def rubber_plant(col, seed=15):
    root = _root("rubber_plant", col)
    pz = plants.pot("terracotta", 0.3, 0.16, col, root)
    spec = trees.TreeSpec(height=1.2, trunk_radius=0.018, levels=1, children=(1, 1), spread=10, up=0.9, leaf_size=0.2, leaves_per_m=45,
                          crown_start=0.1, leaf_shape=shape_ovate, droop=0.3,
                          leaf_mat=PM.leaf("rubber_leaf", (0.02, 0.05, 0.015), (0.06, 0.12, 0.03), 0.2, 0.2, gloss_coat=0.5))
    t = trees.build_tree(col, spec, seed, "rubber_tree")
    t.parent = root
    t.location = (0, 0, pz)
    return root


def succulent(col, seed=16):
    rng = Rng(seed)
    root = _root("succulent", col)
    pz = plants.pot("cylinder_glazed", 0.08, 0.06, col, root)
    b = Builder()
    lm = PM.leaf("succulent_leaf", (0.3, 0.42, 0.3), (0.55, 0.6, 0.45), 0.5, 0.2)
    for ring, (n, L, tilt) in enumerate(((5, 0.025, 0.2), (8, 0.04, 0.55), (11, 0.05, 0.95))):
        for i in range(n):
            a = i * 2 * math.pi / n + ring * 0.4
            d = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
            leaf(b, lm, frame_at(Vector((0, 0, pz + 0.01)), d), L, L * 0.6, shape_ovate, nu=3, nv=4, fold=-0.3, arch=0.3, var=rng.random())
    _p(b.finish("succulent_mesh", col), root)
    return root


def aloe(col, seed=17):
    rng = Rng(seed)
    root = _root("aloe", col)
    pz = plants.pot("terracotta", 0.12, 0.08, col, root)
    b = Builder()
    lm = PM.leaf("aloe_leaf", (0.15, 0.3, 0.15), (0.3, 0.45, 0.22), 0.4, 0.3, margin=(0.55, 0.5, 0.3))
    for i in range(14):
        a = i * 2.4
        tilt = 0.3 + (i % 3) * 0.3
        d = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
        leaf(b, lm, frame_at(Vector((0, 0, pz)), d), rng.uniform(0.15, 0.26), 0.04, shape_lanceolate, nu=3, nv=8, fold=0.5, arch=0.5, var=rng.random())
    _p(b.finish("aloe_mesh", col), root)
    return root


def dried_branches(col, seed=18):
    """Tall bare branches in a floor vase."""
    root = _root("dried_branches", col)
    b = Builder()
    vase = _ceramic("tall_vase", (0.2, 0.18, 0.16), 0.35)
    lathe(b, vase, [(0.0, 0.0), (0.1, 0.0), (0.12, 0.3), (0.09, 0.5), (0.07, 0.55), (0.08, 0.56), (0.06, 0.52), (0.0, 0.5)], 40)
    _p(b.finish("vase_mesh", col), root)
    spec = trees.TreeSpec(height=1.4, trunk_radius=0.006, levels=3, children=(2, 3), spread=28, up=0.6, length_ratio=0.65, leaf_size=0.01,
                          leaves_per_m=0, crown_start=0.2, gnarl=0.4, bare_fraction=1.0,
                          bark_mat=trees.bark("dry_branch", (0.3, 0.26, 0.2), (0.5, 0.44, 0.36), 0.9))
    for i in range(3):
        t = trees.build_tree(col, spec, seed + i, f"branch_{i}")
        t.parent = root
        t.location = (0.02 * (i - 1), 0.015 * (i % 2), 0.5)
        t.rotation_euler = (0.1 * (i - 1), 0.08 * i, i * 2.0)
    return root


def pampas(col, seed=19):
    rng = Rng(seed)
    root = _root("pampas", col)
    b = Builder()
    vase = _ceramic("pampas_vase", (0.6, 0.55, 0.47), 0.4)
    lathe(b, vase, [(0.0, 0.0), (0.09, 0.0), (0.11, 0.25), (0.08, 0.42), (0.06, 0.45), (0.07, 0.46), (0.05, 0.43), (0.0, 0.4)], 40)
    plume = M.matte((0.72, 0.62, 0.5), 0.9, "pampas_plume")
    stem = PM.stem("pampas_stem", (0.45, 0.36, 0.2), 0.7)
    for i in range(7):
        a = i * 0.9
        d = Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 1)).normalized()
        L = rng.uniform(0.7, 1.0)
        pts = [Vector((0, 0, 0.4)), Vector((0, 0, 0.4)) + d * L]
        tube(b, stem, pts, [0.004, 0.003], segments=6)
        for k in range(26):
            p = pts[-1] - d * rng.uniform(0, 0.28)
            dd = (d + Vector((rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(-0.3, 0.3)))).normalized()
            leaf(b, plume, frame_at(p, dd), rng.uniform(0.06, 0.12), 0.02, shape_lanceolate, nu=1, nv=3, fold=0.0, arch=0.6, var=rng.random())
    _p(b.finish("pampas_mesh", col), root)
    root["sway"] = {"amp": 0.2, "speed": 0.4}
    return root


def orchid(col, seed=20):
    rng = Rng(seed)
    root = _root("orchid", col)
    pz = plants.pot("cylinder_glazed", 0.11, 0.07, col, root)
    b = Builder()
    lm = PM.leaf("orchid_leaf", (0.03, 0.08, 0.02), (0.08, 0.16, 0.04), 0.25, 0.3, gloss_coat=0.5)
    fm = trees._flower_mat("orchid_flower", (0.9, 0.75, 0.9), center=(0.6, 0.1, 0.35))
    stem = PM.stem("orchid_stem", (0.12, 0.18, 0.06), 0.5)
    for i in range(5):
        a = i * 1.3
        leaf(b, lm, frame_at(Vector((0, 0, pz)), Vector((math.cos(a), math.sin(a), 0.35)).normalized()), 0.18, 0.05, shape_lanceolate, nu=3, nv=6, fold=0.3, arch=0.8, var=rng.random())
    pts = [Vector((0, 0, pz)), Vector((0.05, 0.02, pz + 0.25)), Vector((0.16, 0.05, pz + 0.42)), Vector((0.3, 0.07, pz + 0.48))]
    tube(b, stem, pts, [0.005, 0.004, 0.0035, 0.003], segments=6)
    for k in range(6):
        t = 0.45 + 0.55 * k / 6
        p = pts[min(2, int(t * 3))].lerp(pts[min(3, int(t * 3) + 1)], t * 3 - int(t * 3))
        trees._flower(b, fm, p + Vector((0, -0.03, 0)), Vector((0.2, -1, 0.2)).normalized(), 0.035, rng, 5, 1)
    _p(b.finish("orchid_mesh", col), root)
    return root


def fresh_flowers(col, seed=21):
    rng = Rng(seed)
    root = _root("fresh_flowers", col)
    b = Builder()
    glass = M.glass((0.9, 0.95, 0.93), "vase_glass")
    lathe(b, glass, [(0.0, 0.0), (0.05, 0.0), (0.06, 0.02), (0.065, 0.16), (0.045, 0.22), (0.05, 0.23), (0.04, 0.21), (0.0, 0.2)], 36)
    _p(b.finish("flower_vase", col), root)
    _p(cylinder("vase_water", 0.055, 0.1, (0, 0, 0.07), M.glass((0.85, 0.92, 0.9), "water"), col, verts=28), root)
    stem = PM.stem("flower_stem", (0.1, 0.18, 0.05), 0.5)
    lm = PM.leaf("flower_leaf", (0.04, 0.09, 0.02), (0.1, 0.2, 0.05), 0.4, 0.3)
    f = Builder()
    for i in range(7):
        a = i * 0.9
        d = Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, 1)).normalized()
        L = rng.uniform(0.3, 0.42)
        pts = [Vector((0, 0, 0.05)), Vector((0, 0, 0.05)) + d * L]
        tube(f, stem, pts, [0.003, 0.0025], segments=6)
        leaf(f, lm, frame_at(pts[0].lerp(pts[1], 0.7), (d + Vector((0.5, 0.2, 0))).normalized()), 0.06, 0.025, shape_lanceolate, nu=2, nv=4, var=rng.random())
        color = rng.choice([(0.95, 0.5, 0.05), (0.9, 0.15, 0.1), (0.95, 0.9, 0.3), (0.95, 0.5, 0.65)])
        trees._flower(f, trees._flower_mat(f"fresh_{i}", color), pts[-1], d, 0.03, rng, 6, 3)
    _p(f.finish("flowers_mesh", col), root)
    return root


# ---- vessels ---------------------------------------------------------------------

def _vase(col, name, profile, mat, segments=40):
    root = _root(name, col)
    b = Builder()
    lathe(b, mat, profile, segments)
    _p(b.finish(f"{name}_mesh", col), root)
    return root


def ceramic_vase(col, seed=30):
    return _vase(col, "ceramic_vase", [(0.0, 0.0), (0.06, 0.0), (0.075, 0.06), (0.085, 0.16), (0.055, 0.25), (0.045, 0.3), (0.05, 0.31), (0.04, 0.29), (0.0, 0.28)],
                 _ceramic("vase_glaze", (0.62, 0.6, 0.55), 0.3))


def brass_vase(col, seed=31):
    return _vase(col, "brass_vase", [(0.0, 0.0), (0.05, 0.0), (0.06, 0.02), (0.045, 0.1), (0.07, 0.2), (0.05, 0.28), (0.035, 0.32), (0.045, 0.34), (0.03, 0.33), (0.0, 0.3)], _brass())


def terracotta_vase(col, seed=32):
    return _vase(col, "terracotta_vase", [(0.0, 0.0), (0.12, 0.0), (0.16, 0.12), (0.17, 0.3), (0.12, 0.5), (0.1, 0.58), (0.12, 0.6), (0.09, 0.56), (0.0, 0.54)],
                 PM.terracotta_pot("vase_terracotta", (0.36, 0.15, 0.07)))


def glass_vase(col, seed=33):
    r = _vase(col, "glass_vase", [(0.0, 0.0), (0.06, 0.0), (0.07, 0.02), (0.075, 0.2), (0.06, 0.3), (0.062, 0.31), (0.052, 0.3), (0.0, 0.29)], M.glass((0.88, 0.94, 0.9), "vase_glass"))
    b = Builder()
    lm = PM.leaf("euc_leaf", (0.3, 0.4, 0.32), (0.5, 0.58, 0.46), 0.5, 0.2)
    stem = PM.stem("euc_stem", (0.3, 0.25, 0.15), 0.6)
    rng = Rng(seed)
    for i in range(4):
        d = Vector((math.cos(i * 1.6) * 0.3, math.sin(i * 1.6) * 0.3, 1)).normalized()
        pts = [Vector((0, 0, 0.05)), Vector((0, 0, 0.05)) + d * 0.45]
        tube(b, stem, pts, [0.003, 0.002], segments=6)
        for k in range(8):
            p = pts[0].lerp(pts[1], 0.4 + 0.6 * k / 8)
            leaf(b, lm, frame_at(p, (d + Vector((math.cos(k * 2.2), math.sin(k * 2.2), -0.2))).normalized()), 0.035, 0.03, shape_ovate, nu=2, nv=3, var=rng.random())
    _p(b.finish("eucalyptus", col), r)
    return r


def ceramic_bowl(col, seed=34):
    return _vase(col, "ceramic_bowl", [(0.0, 0.0), (0.07, 0.0), (0.14, 0.05), (0.16, 0.09), (0.165, 0.1), (0.15, 0.1), (0.13, 0.06), (0.0, 0.02)], _ceramic("bowl_glaze", (0.25, 0.3, 0.32), 0.25))


def marble_bowl(col, seed=35):
    key = "marble"
    if key not in M._cache:
        t = NodeTree("marble")
        n = t.noise(t.coords("Object"), scale=4, detail=8, distortion=2.0)
        v = t.math("ABSOLUTE", t.math("SUBTRACT", (n, "Fac"), 0.5))
        col_ = t.ramp(t.math("MULTIPLY", v, 3.0, clamp=True), [(0.0, (0.35, 0.33, 0.3)), (0.12, (0.78, 0.76, 0.72)), (1.0, (0.85, 0.83, 0.8))])
        M._cache[key] = t.surface(t.principled(col_, 0.18, None, Coat_Weight=0.3))
    r = _vase(col, "marble_bowl", [(0.0, 0.0), (0.06, 0.0), (0.12, 0.04), (0.14, 0.08), (0.145, 0.09), (0.13, 0.09), (0.11, 0.05), (0.0, 0.02)], M._cache[key])
    rng = Rng(seed)
    fruit = M.matte((0.75, 0.55, 0.1), 0.4, "orange_skin")
    for i in range(4):
        a = i * 1.6
        _p(_sphere(f"orange_{i}", 0.035, fruit, col, (math.cos(a) * 0.05, math.sin(a) * 0.05, 0.06 + (0.04 if i == 3 else 0))), r)
    return r


def brass_tray(col, seed=36):
    root = _root("brass_tray", col)
    b = Builder()
    lathe(b, _brass(), [(0.0, 0.0), (0.17, 0.0), (0.18, 0.02), (0.17, 0.02), (0.165, 0.005), (0.0, 0.005)], 48)
    _p(b.finish("tray_mesh", col), root)
    glaze = _ceramic("cup_glaze", (0.85, 0.82, 0.76), 0.2)
    for i, (x, y) in enumerate(((-0.06, 0.02), (0.06, -0.03))):
        c = Builder()
        lathe(c, glaze, [(0.0, 0.006), (0.028, 0.006), (0.033, 0.05), (0.03, 0.052), (0.026, 0.012)], 24)
        o = c.finish(f"tray_cup_{i}", col)
        o.location = (x, y, 0.005)
        _p(o, root)
    return root


def wooden_tray(col, seed=37):
    root = _root("wooden_tray", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("tray", (0.36, 0.24, 0.015), (0, 0, 0.0075), teak, col, bevel=0.003), root)
    for y in (-0.115, 0.115):
        _p(box(f"lip_{y}", (0.36, 0.012, 0.035), (0, y, 0.0175), teak, col, bevel=0.002), root)
    for x in (-0.175, 0.175):
        _p(box(f"lip_{x}", (0.012, 0.24, 0.035), (x, 0, 0.0175), teak, col, bevel=0.002), root)
    _p(cylinder("candle", 0.025, 0.07, (-0.08, 0, 0.05), M.matte((0.9, 0.86, 0.78), 0.6, "wax"), col, verts=24), root)
    _p(box("matchbox", (0.05, 0.035, 0.012), (0.08, 0.03, 0.021), M.matte((0.3, 0.15, 0.1), 0.7, "matchbox"), col), root)
    return root


def fruit_bowl(col, seed=38):
    root = _root("fruit_bowl", col)
    b = Builder()
    lathe(b, textiles.rattan_strip("rattan_bowl"), [(0.0, 0.0), (0.08, 0.0), (0.15, 0.05), (0.17, 0.09), (0.175, 0.1), (0.16, 0.1), (0.14, 0.06), (0.0, 0.02)], 40)
    _p(b.finish("fruit_bowl_mesh", col), root)
    rng = Rng(seed)
    for i, (c, r) in enumerate((((0.75, 0.55, 0.1), 0.035), ((0.6, 0.1, 0.05), 0.03), ((0.85, 0.7, 0.1), 0.03), ((0.2, 0.5, 0.1), 0.028))):
        a = i * 1.7
        _p(_sphere(f"fruit_{i}", r, M.matte(c, 0.4, f"fruit_{i}"), col, (math.cos(a) * 0.06, math.sin(a) * 0.06, 0.05)), root)
    return root


def rattan_basket(col, seed=39):
    root = _root("rattan_basket", col)
    b = Builder()
    lathe(b, textiles.rattan_strip("rattan_basket_mat"), [(0.0, 0.0), (0.16, 0.0), (0.18, 0.02), (0.2, 0.3), (0.21, 0.32), (0.19, 0.32), (0.18, 0.04), (0.0, 0.03)], 40)
    _p(b.finish("basket_mesh", col), root)
    throw = textiles.handloom_stripes("basket_throw", ((0.6, 0.42, 0.15), (0.72, 0.68, 0.58), (0.14, 0.06, 0.03)), 0.035)
    _p(box("rolled_throw", (0.26, 0.26, 0.16), (0, 0, 0.36), throw, col, bevel=0.06, segments=4), root)
    return root


def wicker_basket(col, seed=40):
    root = _root("wicker_basket", col)
    b = Builder()
    lathe(b, textiles.rattan_strip("wicker_mat"), [(0.0, 0.0), (0.14, 0.0), (0.17, 0.02), (0.19, 0.22), (0.2, 0.24), (0.18, 0.24), (0.17, 0.03), (0.0, 0.02)], 36)
    _p(b.finish("wicker_mesh", col), root)
    h = _p(cylinder("handle", 0.008, 0.36, (0, 0, 0.38), textiles.rattan_strip("wicker_mat"), col, verts=10), root)
    h.rotation_euler = (0, 90 * DEG, 0)
    for x in (-0.17, 0.17):
        _p(cylinder(f"handle_leg_{x}", 0.008, 0.16, (x, 0, 0.3), textiles.rattan_strip("wicker_mat"), col, verts=10), root)
    return root


# ---- candles and lights ----------------------------------------------------------------

def pillar_candles(col, seed=41, lit=False):
    root = _root("pillar_candles", col)
    wax = M.matte((0.9, 0.86, 0.78), 0.55, "wax")
    flame = M.emissive((1.0, 0.6, 0.2), 25.0, "flame")
    for i, (x, y, h, r) in enumerate(((0, 0, 0.16, 0.035), (0.08, 0.02, 0.1, 0.03), (-0.07, 0.03, 0.07, 0.028))):
        _p(cylinder(f"candle_{i}", r, h, (x, y, h / 2), wax, col, verts=28, bevel=0.004), root)
        _p(cylinder(f"wick_{i}", 0.001, 0.012, (x, y, h + 0.005), M.matte((0.05, 0.04, 0.03), 0.9, "wick"), col, verts=6), root)
        if lit:
            _p(cylinder(f"flame_{i}", 0.006, 0.025, (x, y, h + 0.022), flame, col, verts=8, radius_top=0.0), root)
    if lit:
        _lamp(col, root, (0, 0, 0.2), 2.5, (1.0, 0.6, 0.25), 0.02)
    return root


def taper_candles(col, seed=42, lit=False):
    root = _root("taper_candles", col)
    brass = _brass()
    wax = M.matte((0.92, 0.88, 0.8), 0.55, "wax")
    flame = M.emissive((1.0, 0.6, 0.2), 25.0, "flame")
    for i, x in enumerate((-0.07, 0.07)):
        b = Builder()
        lathe(b, brass, [(0.0, 0.0), (0.04, 0.0), (0.045, 0.01), (0.015, 0.03), (0.012, 0.14), (0.02, 0.15), (0.018, 0.165), (0.0, 0.16)], 24)
        o = b.finish(f"holder_{i}", col)
        o.location = (x, 0, 0)
        _p(o, root)
        _p(cylinder(f"taper_{i}", 0.01, 0.2, (x, 0, 0.26), wax, col, verts=16, radius_top=0.008), root)
        if lit:
            _p(cylinder(f"flame_{i}", 0.005, 0.022, (x, 0, 0.372), flame, col, verts=8, radius_top=0.0), root)
    if lit:
        _lamp(col, root, (0, 0, 0.38), 2.0, (1.0, 0.6, 0.25), 0.02)
    return root


def scented_candle(col, seed=43, lit=False):
    root = _root("scented_candle", col)
    jar = M.glass((0.7, 0.6, 0.5), "amber_jar")
    _p(cylinder("jar", 0.04, 0.09, (0, 0, 0.045), jar, col, verts=32), root)
    _p(cylinder("wax", 0.036, 0.07, (0, 0, 0.037), M.matte((0.9, 0.85, 0.75), 0.6, "wax"), col, verts=32), root)
    if lit:
        _p(cylinder("flame", 0.005, 0.02, (0, 0, 0.085), M.emissive((1.0, 0.6, 0.2), 25.0, "flame"), col, verts=8, radius_top=0.0), root)
        _lamp(col, root, (0, 0, 0.1), 1.5, (1.0, 0.6, 0.25), 0.02)
    return root


def hurricane_lantern(col, seed=44, lit=False):
    root = _root("hurricane_lantern", col)
    glass = M.glass((0.9, 0.93, 0.9), "lantern_glass")
    _p(cylinder("base", 0.08, 0.02, (0, 0, 0.01), painted_wood((0.85, 0.82, 0.74), "lantern_base"), col, verts=32), root)
    _p(cylinder("glass", 0.07, 0.26, (0, 0, 0.15), glass, col, verts=36), root)
    _p(cylinder("candle", 0.03, 0.12, (0, 0, 0.08), M.matte((0.9, 0.86, 0.78), 0.55, "wax"), col, verts=24), root)
    if lit:
        _p(cylinder("flame", 0.006, 0.025, (0, 0, 0.152), M.emissive((1.0, 0.6, 0.2), 25.0, "flame"), col, verts=8, radius_top=0.0), root)
        _lamp(col, root, (0, 0, 0.16), 3.0, (1.0, 0.6, 0.25), 0.03)
    return root


def tealight_holders(col, seed=45, lit=False):
    root = _root("tealights", col)
    for i, (x, y) in enumerate(((0, 0), (0.09, 0.03), (-0.05, 0.08))):
        b = Builder()
        lathe(b, _brass(), [(0.0, 0.0), (0.03, 0.0), (0.032, 0.025), (0.028, 0.025), (0.026, 0.004), (0.0, 0.004)], 24)
        o = b.finish(f"tl_holder_{i}", col)
        o.location = (x, y, 0)
        _p(o, root)
        _p(cylinder(f"tl_wax_{i}", 0.024, 0.015, (x, y, 0.012), M.matte((0.92, 0.9, 0.82), 0.6, "wax"), col, verts=20), root)
        if lit:
            _p(cylinder(f"tl_flame_{i}", 0.004, 0.015, (x, y, 0.027), M.emissive((1.0, 0.6, 0.2), 25.0, "flame"), col, verts=8, radius_top=0.0), root)
    if lit:
        _lamp(col, root, (0.02, 0.03, 0.05), 1.5, (1.0, 0.6, 0.25), 0.02)
    return root


def ceramic_lamp(col, seed=46, lit=False):
    return table_lamp(col, seed, lit, shade=(0.88, 0.84, 0.74), base_mat=_ceramic("lamp_ceramic_cream", (0.72, 0.66, 0.56), 0.25), name="ceramic_lamp")


def brass_lamp(col, seed=47, lit=False):
    return table_lamp(col, seed, lit, shade=(0.3, 0.26, 0.2), base_mat=_brass(), name="brass_lamp")


def mushroom_lamp(col, seed=48, lit=False):
    root = _root("mushroom_lamp", col)
    glass = M.emissive((1.0, 0.85, 0.6), 2.0, "mushroom_lit") if lit else M.glass((0.9, 0.85, 0.75), "opal")
    _p(cylinder("stem", 0.03, 0.16, (0, 0, 0.08), glass, col, verts=32, radius_top=0.025), root)
    _p(_sphere("cap", 0.1, glass, col, (0, 0, 0.17), (1, 1, 0.5)), root)
    if lit:
        _lamp(col, root, (0, 0, 0.14), 6.0, (1.0, 0.8, 0.55), 0.04)
    return root


def wall_sconce(col, seed=49, lit=False):
    """Origin at the wall point; the shade stands off the wall along -Y."""
    root = _root("wall_sconce", col)
    _p(box("plate", (0.08, 0.01, 0.12), (0, -0.005, 0), _brass(), col, bevel=0.003), root)
    _p(cylinder("arm", 0.006, 0.12, (0, -0.07, 0.0), _brass(), col, verts=10), root).rotation_euler = (90 * DEG, 0, 0)
    paper = M.emissive((0.92, 0.86, 0.72), 1.5, "shade_lit") if lit else M.matte((0.92, 0.86, 0.72), 0.6, "shade_paper")
    _p(cylinder("shade", 0.07, 0.12, (0, -0.13, 0.03), paper, col, verts=28, radius_top=0.055), root)
    if lit:
        _lamp(col, root, (0, -0.13, 0.02), 7.0, (1.0, 0.78, 0.55), 0.03)
    return root


# ---- objects ----------------------------------------------------------------------------

def book_stack(col, seed=50):
    rng = Rng(seed)
    root = _root("book_stack", col)
    cols = [(0.55, 0.2, 0.15), (0.2, 0.3, 0.45), (0.75, 0.7, 0.6), (0.15, 0.25, 0.2), (0.6, 0.45, 0.2)]
    z = 0
    for i in range(4):
        w, d, h = rng.uniform(0.16, 0.24), rng.uniform(0.22, 0.3), rng.uniform(0.02, 0.035)
        b = _p(box(f"book_{i}", (w, d, h), (rng.uniform(-0.01, 0.01), rng.uniform(-0.01, 0.01), z + h / 2), M.matte(rng.choice(cols), 0.7, f"bookc_{i}"), col, bevel=0.002), root)
        b.rotation_euler = (0, 0, rng.uniform(-0.15, 0.15))
        _p(box(f"pages_{i}", (w - 0.01, d - 0.012, h - 0.004), (0.006, 0, z + h / 2), M.matte((0.85, 0.82, 0.74), 0.8, "paper"), col), root).rotation_euler = b.rotation_euler
        z += h
    return root


def bookends(col, seed=51):
    root = _root("bookends", col)
    stone = M.matte((0.3, 0.29, 0.27), 0.5, "bookend_stone")
    for s in (-1, 1):
        _p(box(f"end_{s}", (0.03, 0.12, 0.15), (s * 0.16, 0, 0.075), stone, col, bevel=0.004), root)
    rng = Rng(seed)
    cols = [(0.55, 0.2, 0.15), (0.2, 0.3, 0.45), (0.75, 0.7, 0.6), (0.15, 0.25, 0.2), (0.6, 0.45, 0.2)]
    x = -0.14
    while x < 0.13:
        w = rng.uniform(0.02, 0.04)
        h = rng.uniform(0.16, 0.22)
        _p(box(f"bk_{x:.2f}", (w, rng.uniform(0.13, 0.17), h), (x + w / 2, 0, h / 2), M.matte(rng.choice(cols), 0.7, f"bkc_{x:.2f}"), col, bevel=0.002), root)
        x += w + 0.003
    return root


def globe(col, seed=52):
    root = _root("globe", col)
    _p(cylinder("base", 0.06, 0.015, (0, 0, 0.0075), _brass(), col, verts=32), root)
    _p(cylinder("post", 0.006, 0.08, (0, 0, 0.05), _brass(), col, verts=10), root)
    t = NodeTree("globe_map")
    n = t.noise(t.coords("Object"), scale=3, detail=6, distortion=1.0)
    land = t.map_range((n, "Fac"), 0.5, 0.56, 0.0, 1.0)
    colr = t.mix_color(land, (0.2, 0.3, 0.42), (0.55, 0.48, 0.3))
    gm = t.surface(t.principled(colr, 0.35))
    _p(_sphere("globe_sphere", 0.1, gm, col, (0, 0, 0.2)), root)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.115, segments=48)
    arc = mesh_object("meridian", bm, _brass(), col)
    arc.location = (0, 0, 0.2)
    arc.rotation_euler = (90 * DEG, 0.4, 0)
    sk = arc.modifiers.new("skin", "SKIN")
    for v in arc.data.skin_vertices[0].data:
        v.radius = (0.004, 0.004)
    _p(arc, root)
    return root


def decorative_box(col, seed=53):
    root = _root("decorative_box", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("box", (0.24, 0.16, 0.1), (0, 0, 0.05), teak, col, bevel=0.004), root)
    _p(box("lid", (0.25, 0.17, 0.02), (0, 0, 0.11), teak, col, bevel=0.004), root)
    _p(box("inlay", (0.16, 0.09, 0.003), (0, 0, 0.121), _brass(), col, bevel=0.001), root)
    return root


def mantel_clock(col, seed=54):
    root = _root("mantel_clock", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("body", (0.22, 0.08, 0.16), (0, 0, 0.08), teak, col, bevel=0.01, segments=4), root)
    _p(box("base", (0.26, 0.1, 0.02), (0, 0, 0.01), teak, col, bevel=0.004), root)
    dial = _p(cylinder("dial", 0.055, 0.005, (0, -0.04, 0.09), M.matte((0.9, 0.87, 0.78), 0.6, "dial"), col, verts=40), root)
    dial.rotation_euler = (90 * DEG, 0, 0)
    ring = _p(cylinder("bezel", 0.06, 0.008, (0, -0.041, 0.09), _brass(), col, verts=40), root)
    ring.rotation_euler = (90 * DEG, 0, 0)
    for i, (L, a) in enumerate(((0.035, 1.9), (0.045, 0.3))):
        h = _p(box(f"hand_{i}", (0.003, 0.002, L), (math.cos(a) * L / 2 * 0, -0.044, 0.09 + L / 2 * 0), M.matte((0.05, 0.05, 0.05), 0.5, "hand"), col), root)
        h.rotation_euler = (0, a, 0)
        h.location = (math.sin(a) * L / 2, -0.044, 0.09 + math.cos(a) * L / 2)
    return root


def vintage_camera(col, seed=55):
    root = _root("vintage_camera", col)
    body = M.matte((0.08, 0.07, 0.065), 0.55, "camera_leather")
    chrome = M.metal((0.6, 0.6, 0.6), 0.25, "chrome")
    _p(box("body", (0.14, 0.05, 0.085), (0, 0, 0.0425), body, col, bevel=0.006), root)
    _p(box("top", (0.14, 0.05, 0.015), (0, 0, 0.0925), chrome, col, bevel=0.003), root)
    _p(cylinder("lens", 0.025, 0.03, (0.0, -0.04, 0.045), chrome, col, verts=28), root).rotation_euler = (90 * DEG, 0, 0)
    _p(cylinder("glass", 0.018, 0.004, (0.0, -0.056, 0.045), M.glass((0.3, 0.35, 0.4), "lens_glass"), col, verts=28), root).rotation_euler = (90 * DEG, 0, 0)
    _p(cylinder("knob", 0.01, 0.012, (0.05, 0, 0.106), chrome, col, verts=16), root)
    return root


def brass_diya(col, seed=56, lit=False):
    root = _root("brass_diya", col)
    b = Builder()
    lathe(b, _brass(), [(0.0, 0.0), (0.045, 0.0), (0.05, 0.005), (0.03, 0.02), (0.028, 0.06), (0.07, 0.075), (0.072, 0.085), (0.065, 0.085), (0.06, 0.078), (0.0, 0.072)], 32)
    _p(b.finish("diya_mesh", col), root)
    if lit:
        _p(cylinder("flame", 0.006, 0.025, (0.05, 0, 0.098), M.emissive((1.0, 0.6, 0.2), 25.0, "flame"), col, verts=8, radius_top=0.0), root)
        _lamp(col, root, (0.05, 0, 0.11), 1.5, (1.0, 0.6, 0.25), 0.015)
    return root


def brass_bell(col, seed=57):
    root = _root("brass_bell", col)
    b = Builder()
    lathe(b, _brass(), [(0.0, 0.0), (0.08, 0.0), (0.082, 0.012), (0.06, 0.04), (0.045, 0.1), (0.04, 0.16), (0.015, 0.17), (0.012, 0.2), (0.0, 0.2)], 36)
    _p(b.finish("bell_mesh", col), root)
    _p(cylinder("clapper", 0.012, 0.03, (0, 0, 0.0), _brass(), col, verts=12), root)
    return root


def kalash(col, seed=58):
    root = _root("kalash", col)
    b = Builder()
    lathe(b, _brass(), [(0.0, 0.0), (0.05, 0.0), (0.055, 0.01), (0.1, 0.07), (0.1, 0.13), (0.06, 0.19), (0.06, 0.22), (0.075, 0.23), (0.07, 0.24), (0.0, 0.23)], 36)
    _p(b.finish("kalash_mesh", col), root)
    lm = PM.leaf("mango_leaf_k", (0.03, 0.07, 0.02), (0.1, 0.18, 0.05), 0.3, 0.3, gloss_coat=0.3)
    f = Builder()
    for i in range(5):
        a = i * 1.26
        leaf(f, lm, frame_at(Vector((0, 0, 0.23)), Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, 0.3)).normalized()), 0.1, 0.035, shape_lanceolate, nu=2, nv=5, arch=0.4, var=0.5)
    _p(f.finish("kalash_leaves", col), root)
    _p(_sphere("coconut", 0.055, M.matte((0.35, 0.22, 0.1), 0.9, "coconut"), col, (0, 0, 0.27), (1, 1, 1.2)), root)
    return root


def wooden_elephant(col, seed=59):
    """A carved teak elephant, stylised the way the bazaar ones are: a
    rounded body, columnar legs, a hanging trunk and fan ears."""
    root = _root("wooden_elephant", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 8.0, "carved_teak")
    _p(_sphere("body", 0.1, teak, col, (0, 0, 0.16), (1.3, 0.9, 0.95)), root)
    _p(_sphere("head", 0.065, teak, col, (-0.14, 0, 0.2), (1.0, 0.95, 1.0)), root)
    for x in (-0.07, 0.07):
        for y in (-0.045, 0.045):
            _p(cylinder(f"leg_{x}_{y}", 0.028, 0.12, (x, y, 0.06), teak, col, verts=16, bevel=0.006), root)
    b = Builder()
    pts = [Vector((-0.19, 0, 0.19)), Vector((-0.24, 0, 0.14)), Vector((-0.26, 0.01, 0.07)), Vector((-0.25, 0.02, 0.01))]
    tube(b, teak, pts, [0.025, 0.02, 0.015, 0.012], segments=10)
    _p(b.finish("trunk", col), root)
    for y in (-0.06, 0.06):
        e = _p(_sphere(f"ear_{y}", 0.05, teak, col, (-0.12, y, 0.21), (0.6, 0.25, 1.0)), root)
    _p(box("blanket", (0.14, 0.2, 0.01), (0.02, 0, 0.255), textiles.block_print("elephant_cloth"), col, bevel=0.003), root)
    return root


def jharokha(col, seed=60):
    """A carved teak lattice frame for the wall; origin on the wall."""
    root = _root("jharokha", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 8.0, "carved_teak")
    w, h = 0.5, 0.7
    for (sx, sz, ww, hh) in ((0, 1, w, 0.07), (0, -1, w, 0.07), (1, 0, 0.07, h), (-1, 0, 0.07, h)):
        _p(box(f"jf_{sx}{sz}", (ww, 0.05, hh), (sx * (w - 0.07) / 2, -0.025, sz * (h - 0.07) / 2), teak, col, bevel=0.006), root)
    arch = _p(cylinder("arch", w / 2 - 0.04, 0.05, (0, -0.025, h / 2 - 0.06), teak, col, verts=32), root)
    arch.rotation_euler = (90 * DEG, 0, 0)
    inner = _p(cylinder("arch_inner", w / 2 - 0.1, 0.06, (0, -0.025, h / 2 - 0.06), M.plaster((0.70, 0.65, 0.57), "room_plaster"), col, verts=32), root)
    inner.rotation_euler = (90 * DEG, 0, 0)
    for i in range(5):
        _p(box(f"lat_v_{i}", (0.012, 0.02, h - 0.14), (-0.16 + i * 0.08, -0.02, 0), teak, col), root)
    for i in range(7):
        _p(box(f"lat_h_{i}", (w - 0.14, 0.02, 0.012), (0, -0.02, -0.25 + i * 0.08), teak, col), root)
    return root


def metallic_sphere(col, seed=61):
    root = _root("metallic_sphere", col)
    _p(cylinder("ring", 0.07, 0.015, (0, 0, 0.0075), M.matte((0.3, 0.29, 0.27), 0.5, "sphere_stone"), col, verts=32), root)
    _p(_sphere("sphere", 0.09, M.metal((0.6, 0.55, 0.45), 0.15, "aged_brass"), col, (0, 0, 0.1)), root)
    return root


def marble_sculpture(col, seed=62):
    """An abstract marble form on a plinth: a smooth twisted loop."""
    root = _root("marble_sculpture", col)
    if "marble" not in M._cache:
        marble_bowl(col, seed)  # creates the material
    _p(box("plinth", (0.2, 0.2, 0.06), (0, 0, 0.03), M.matte((0.15, 0.14, 0.13), 0.4, "plinth"), col, bevel=0.004), root)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=0.1, segments=64)
    for i, v in enumerate(bm.verts):
        a = i / 64 * 2 * math.pi
        v.co = Vector((math.cos(a) * 0.09, math.sin(2 * a) * 0.04, 0.17 + math.sin(a) * 0.1))
    o = mesh_object("loop", bm, M._cache["marble"], col, smooth=True)
    sk = o.modifiers.new("skin", "SKIN")
    for v in o.data.skin_vertices[0].data:
        v.radius = (0.028, 0.02)
    sub = o.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    _p(o, root)
    return root


def round_mirror(col, seed=63):
    """Origin on the wall; brass rim, reflective disc."""
    root = _root("round_mirror", col)
    rim = _p(cylinder("rim", 0.3, 0.03, (0, -0.015, 0), _brass(), col, verts=64), root)
    rim.rotation_euler = (90 * DEG, 0, 0)
    mirror = M.metal((0.95, 0.95, 0.95), 0.0, "mirror_silver")
    m = _p(cylinder("mirror", 0.27, 0.004, (0, -0.032, 0), mirror, col, verts=64), root)
    m.rotation_euler = (90 * DEG, 0, 0)
    return root


def arched_mirror(col, seed=64):
    """A tall arched mirror leaning against the wall; origin at the base
    on the wall line."""
    root = _root("arched_mirror", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    mirror = M.metal((0.95, 0.95, 0.95), 0.0, "mirror_silver")
    f = bpy.data.objects.new("am_root", None)
    link(f, col)
    f.parent = root
    f.rotation_euler = (-0.1, 0, 0)
    w, h = 0.6, 1.3
    for (sx, ww, hh, z) in ((1, 0.05, h - w / 2, (h - w / 2) / 2), (-1, 0.05, h - w / 2, (h - w / 2) / 2)):
        p = box(f"am_side_{sx}", (ww, 0.04, hh), (sx * (w - 0.05) / 2, -0.02, z), teak, col, bevel=0.004)
        p.parent = f
    bot = box("am_bottom", (w, 0.04, 0.05), (0, -0.02, 0.025), teak, col, bevel=0.004)
    bot.parent = f
    arc = cylinder("am_arc", w / 2, 0.04, (0, -0.02, h - w / 2), teak, col, verts=48)
    arc.rotation_euler = (90 * DEG, 0, 0)
    arc.parent = f
    arc_in = cylinder("am_arc_mirror", w / 2 - 0.05, 0.05, (0, -0.02, h - w / 2), mirror, col, verts=48)
    arc_in.rotation_euler = (90 * DEG, 0, 0)
    arc_in.parent = f
    pane = box("am_pane", (w - 0.1, 0.006, h - w / 2 - 0.05), (0, -0.045, (h - w / 2 + 0.05) / 2), mirror, col)
    pane.parent = f
    return root


def gramophone(col, seed=65):
    root = _root("gramophone", col)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    _p(box("box", (0.3, 0.3, 0.14), (0, 0, 0.07), teak, col, bevel=0.006), root)
    _p(cylinder("turntable", 0.11, 0.01, (0, 0, 0.145), M.matte((0.05, 0.05, 0.05), 0.3, "vinyl"), col, verts=48), root)
    b = Builder()
    lathe(b, _brass(), [(0.02, 0.0), (0.03, 0.15), (0.06, 0.3), (0.12, 0.4), (0.19, 0.45), (0.22, 0.47), (0.21, 0.48), (0.17, 0.46), (0.1, 0.4), (0.05, 0.3), (0.025, 0.15), (0.015, 0.0)], 36)
    horn = b.finish("horn", col)
    horn.location = (0.04, 0.0, 0.15)
    horn.rotation_euler = (0.9, 0, 0.3)
    _p(horn, root)
    return root


def vintage_telephone(col, seed=66):
    root = _root("vintage_telephone", col)
    bak = M.matte((0.05, 0.045, 0.04), 0.3, "bakelite")
    _p(box("base", (0.22, 0.2, 0.09), (0, 0, 0.045), bak, col, bevel=0.025, segments=5), root)
    _p(cylinder("dial", 0.055, 0.01, (0, -0.02, 0.095), M.matte((0.85, 0.82, 0.74), 0.5, "dial"), col, verts=40), root)
    h = _p(cylinder("handset", 0.022, 0.22, (0, 0.03, 0.13), bak, col, verts=20, bevel=0.01), root)
    h.rotation_euler = (0, 90 * DEG, 0)
    for x in (-0.1, 0.1):
        _p(_sphere(f"cup_{x}", 0.03, bak, col, (x, 0.03, 0.125)), root)
    return root


def miniature_suitcase(col, seed=67):
    root = _root("suitcase", col)
    leather = M.matte((0.32, 0.18, 0.08), 0.5, "suitcase_leather")
    _p(box("case", (0.42, 0.14, 0.3), (0, 0, 0.15), leather, col, bevel=0.012, segments=4), root)
    _p(box("strap_a", (0.03, 0.15, 0.3), (-0.12, 0, 0.15), M.matte((0.2, 0.1, 0.05), 0.6, "strap"), col, bevel=0.003), root)
    _p(box("strap_b", (0.03, 0.15, 0.3), (0.12, 0, 0.15), M.matte((0.2, 0.1, 0.05), 0.6, "strap"), col, bevel=0.003), root)
    _p(box("handle", (0.12, 0.02, 0.03), (0, 0, 0.32), M.matte((0.2, 0.1, 0.05), 0.6, "strap"), col, bevel=0.008), root)
    return root


def knitted_blanket(col, seed=68):
    """A folded knitted blanket; sits on the foot of the bed."""
    root = _root("knitted_blanket", col)
    t = NodeTree("knit")
    co = t.coords("Object", scale=(1, 1, 1))
    w1 = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 90.0, "Distortion": 1.0}, wave_type="BANDS", bands_direction="X")
    w2 = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 60.0, "Distortion": 1.0}, wave_type="BANDS", bands_direction="Y")
    h = t.math("MULTIPLY", (w1, "Fac"), (w2, "Fac"))
    knit = t.surface(t.principled((0.62, 0.52, 0.4), 0.9, t.bump(h, 0.5, 0.004), Sheen_Weight=0.6))
    for i in range(3):
        _p(box(f"fold_{i}", (0.7 - i * 0.03, 0.45 - i * 0.02, 0.035), (0, 0, 0.0175 + i * 0.035), knit, col, bevel=0.016, segments=4), root)
    return root


def throw_on_chair(col, seed=69):
    root = _root("throw", col)
    mat = textiles.handloom_stripes("throw_fabric", ((0.6, 0.42, 0.15), (0.72, 0.68, 0.58), (0.14, 0.06, 0.03)), 0.035)
    _p(box("throw_fold", (0.5, 0.3, 0.05), (0, 0, 0.025), mat, col, bevel=0.02, segments=4), root)
    return root


def decorative_plate(col, seed=70):
    """A hand-painted plate for the wall; origin on the wall."""
    root = _root("decorative_plate", col)
    t = NodeTree("painted_plate")
    co = t.coords("Object")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(co, sep.inputs[0])
    r = t.math("SQRT", t.math("ADD", t.math("POWER", (sep, "X"), 2.0), t.math("POWER", (sep, "Z"), 2.0)))
    rings = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 1.0, "Distortion": 0.0}, wave_type="RINGS", rings_direction="Y")
    band = t.map_range((rings, "Fac"), 0.45, 0.55, 0.0, 1.0)
    base = t.mix_color(band, (0.85, 0.82, 0.74), (0.12, 0.2, 0.42))
    base = t.mix_color(t.map_range(r, 0.11, 0.115, 0.0, 1.0), base, (0.12, 0.2, 0.42))
    pm = t.surface(t.principled(base, 0.22, None, Coat_Weight=0.4))
    p = _p(cylinder("plate", 0.13, 0.015, (0, -0.0075, 0), pm, col, verts=64, bevel=0.006), root)
    p.rotation_euler = (90 * DEG, 0, 0)
    return root


def old_map(col, seed=71):
    """A framed antique map; origin on the wall."""
    root = _root("old_map", col)
    t = NodeTree("old_map")
    co = t.coords("Object")
    n = t.noise(co, scale=5, detail=6, distortion=1.5)
    land = t.map_range((n, "Fac"), 0.48, 0.52, 0.0, 1.0)
    age = t.noise(co, scale=2, detail=3)
    paper = t.mix_color(land, (0.72, 0.62, 0.45), (0.5, 0.42, 0.28))
    paper = t.mix_color(t.map_range(age, 0.55, 0.7, 0.0, 0.5), paper, (0.45, 0.35, 0.2))
    mm = t.surface(t.principled(paper, 0.85))
    fr = decor.art_frame(col, seed=seed, art_w=0.7, art_h=0.5, canvas=mm)
    fr.parent = root
    return root


def pendant_light(col, seed=72, lit=False):
    """Hangs from the ceiling: origin at the ceiling point."""
    root = _root("pendant_light", col)
    _p(cylinder("cord", 0.004, 0.6, (0, 0, -0.3), M.powder_coat(), col, verts=8), root)
    rattan = textiles.rattan_strip("pendant_rattan")
    b = Builder()
    lathe(b, rattan, [(0.04, -0.6), (0.2, -0.75), (0.26, -0.92), (0.24, -0.93), (0.19, -0.77), (0.045, -0.63)], 40)
    _p(b.finish("pendant_shade", col), root)
    if lit:
        _p(cylinder("bulb", 0.03, 0.06, (0, 0, -0.75), M.emissive((1.0, 0.85, 0.6), 6.0, "bulb_lit"), col, verts=14), root)
        _lamp(col, root, (0, 0, -0.78), 40.0, (1.0, 0.8, 0.58), 0.08)
    return root


BUILDERS = {
    "bedside_table": bedside_table, "table_lamp": table_lamp, "side_chair": side_chair, "small_table": small_table,
    "study_desk": study_desk, "bookshelf": bookshelf, "lounge_chair": lounge_chair, "floor_cushions": floor_cushions,
    "cabinet": cabinet, "floor_lamp": floor_lamp, "pouf": pouf,
    "monstera": monstera, "bonsai": bonsai, "fiddle_fig": fiddle_fig, "rubber_plant": rubber_plant, "succulent": succulent, "aloe": aloe,
    "dried_branches": dried_branches, "pampas": pampas, "orchid": orchid, "fresh_flowers": fresh_flowers,
    "ceramic_vase": ceramic_vase, "brass_vase": brass_vase, "terracotta_vase": terracotta_vase, "glass_vase": glass_vase,
    "ceramic_bowl": ceramic_bowl, "marble_bowl": marble_bowl, "brass_tray": brass_tray, "wooden_tray": wooden_tray, "fruit_bowl": fruit_bowl,
    "rattan_basket": rattan_basket, "wicker_basket": wicker_basket,
    "pillar_candles": pillar_candles, "taper_candles": taper_candles, "scented_candle": scented_candle, "hurricane_lantern": hurricane_lantern,
    "tealight_holders": tealight_holders, "ceramic_lamp": ceramic_lamp, "brass_lamp": brass_lamp, "mushroom_lamp": mushroom_lamp,
    "wall_sconce": wall_sconce, "pendant_light": pendant_light,
    "book_stack": book_stack, "bookends": bookends, "globe": globe, "decorative_box": decorative_box, "mantel_clock": mantel_clock,
    "vintage_camera": vintage_camera, "brass_diya": brass_diya, "brass_bell": brass_bell, "kalash": kalash, "wooden_elephant": wooden_elephant,
    "jharokha": jharokha, "metallic_sphere": metallic_sphere, "marble_sculpture": marble_sculpture, "round_mirror": round_mirror,
    "arched_mirror": arched_mirror, "gramophone": gramophone, "vintage_telephone": vintage_telephone, "miniature_suitcase": miniature_suitcase,
    "knitted_blanket": knitted_blanket, "throw_on_chair": throw_on_chair, "decorative_plate": decorative_plate, "old_map": old_map,
}
