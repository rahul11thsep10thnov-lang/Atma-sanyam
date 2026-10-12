"""Twenty-six more plants for the garden: ten that grow with focus (seed →
sprout → young → mature → flowering, each with a wilted look) and sixteen
that arrive full-grown. All built from the shrub and tree generators with
their own leaf, flower and fruit materials, so each reads as its species."""
import math
import bmesh
from mathutils import Vector

from . import materials as M
from . import plant_materials as PM
from . import plants
from .common import Rng, box, cylinder, link, mesh_object
from .geo import Builder, frame_at, leaf, shape_heart, shape_lanceolate, shape_ovate, shape_sword
from .garden_items import _grow_shrub, _p, _root
from .trees import TreeSpec, build_tree, shrub


def _potted(name, col, pot_kind, pot_h, pot_r):
    root = _root(name, col)
    pz = plants.pot(pot_kind, pot_h, pot_r, col, root)
    top = _root(f"{name}_top", col)
    top.parent = root
    top.location = (0, 0, pz)
    return root, top


# ---- growable (stage 0..4, wilted) ------------------------------------------------------

def sunflower(col, stage=4, wilted=False, seed=101):
    root = _root("sunflower", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.98, 0.78, 0.08), (0.32, 1.25), 0.13, "sunflower_plant",
                leaf_mat=PM.leaf("sunflower_leaf", (0.05, 0.1, 0.03), (0.14, 0.24, 0.07), 0.5, 0.35), flower_layers=1)
    root["sway"] = {"amp": 0.35, "speed": 0.4}
    return root


def dahlia(col, stage=4, wilted=False, seed=102):
    root, top = _potted("dahlia", col, "terracotta", 0.2, 0.16)
    _grow_shrub(col, top, stage, wilted, seed, (0.85, 0.08, 0.35), (0.3, 0.5), 0.05, "dahlia_plant", flower_layers=3)
    return root


def chrysanthemum(col, stage=4, wilted=False, seed=103):
    root, top = _potted("chrysanthemum", col, "terracotta", 0.17, 0.15)
    _grow_shrub(col, top, stage, wilted, seed, (0.95, 0.85, 0.2), (0.3, 0.32), 0.03, "guldaudi_plant", flower_layers=3)
    return root


def petunia(col, stage=4, wilted=False, seed=104):
    root, top = _potted("petunia", col, "cylinder_glazed", 0.15, 0.17)
    _grow_shrub(col, top, stage, wilted, seed, (0.55, 0.12, 0.6), (0.3, 0.22), 0.035, "petunia_plant",
                leaf_mat=PM.leaf("petunia_leaf", (0.06, 0.11, 0.03), (0.16, 0.25, 0.08), 0.45, 0.3))
    return root


def zinnia(col, stage=4, wilted=False, seed=105):
    root = _root("zinnia", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.95, 0.35, 0.12), (0.32, 0.55), 0.05, "zinnia_plant", flower_layers=2)
    return root


def cosmos(col, stage=4, wilted=False, seed=106):
    root = _root("cosmos", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.95, 0.55, 0.75), (0.4, 0.85), 0.03, "cosmos_plant",
                leaf_mat=PM.leaf("cosmos_leaf", (0.05, 0.1, 0.03), (0.13, 0.22, 0.06), 0.4, 0.3))
    root["sway"] = {"amp": 0.5, "speed": 0.6}
    return root


def periwinkle(col, stage=4, wilted=False, seed=107):
    root, top = _potted("periwinkle", col, "terracotta", 0.18, 0.15)
    _grow_shrub(col, top, stage, wilted, seed, (0.92, 0.55, 0.7), (0.26, 0.3), 0.04, "sadabahar_plant",
                leaf_mat=PM.leaf("vinca_leaf", (0.03, 0.08, 0.02), (0.08, 0.17, 0.04), 0.3, 0.3, gloss_coat=0.35))
    return root


def ixora(col, stage=4, wilted=False, seed=108):
    root = _root("ixora", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.9, 0.25, 0.08), (0.5, 0.7), 0.05, "ixora_plant",
                leaf_mat=PM.leaf("ixora_leaf", (0.03, 0.075, 0.02), (0.09, 0.17, 0.045), 0.3, 0.3, gloss_coat=0.3), flower_layers=3)
    return root


def lantana(col, stage=4, wilted=False, seed=109):
    root = _root("lantana", col)
    _grow_shrub(col, root, stage, wilted, seed, (0.95, 0.6, 0.1), (0.55, 0.6), 0.035, "lantana_plant", flower_layers=2)
    return root


def geranium(col, stage=4, wilted=False, seed=110):
    root, top = _potted("geranium", col, "terracotta", 0.19, 0.16)
    _grow_shrub(col, top, stage, wilted, seed, (0.88, 0.1, 0.12), (0.3, 0.38), 0.05, "geranium_plant",
                leaf_mat=PM.leaf("geranium_leaf", (0.06, 0.11, 0.03), (0.15, 0.24, 0.08), 0.5, 0.3), flower_layers=2)
    return root


GROWABLE_EXTRA = {
    "sunflower": sunflower, "dahlia": dahlia, "chrysanthemum": chrysanthemum, "petunia": petunia, "zinnia": zinnia,
    "cosmos": cosmos, "periwinkle": periwinkle, "ixora": ixora, "lantana": lantana, "geranium": geranium,
}


# ---- full-grown ---------------------------------------------------------------------------

def oleander(col, seed=121):
    root = _root("oleander", col)
    s = shrub(col, seed=seed, radius=0.7, height=1.6, leaf_size=0.1, flower=(0.95, 0.45, 0.6), flower_density=0.45, name="kaner_plant",
              leaf_mat=PM.leaf("kaner_leaf", (0.03, 0.07, 0.02), (0.09, 0.16, 0.05), 0.4, 0.3))
    s.parent = root
    return root


def hydrangea(col, seed=122):
    root, top = _potted("hydrangea", col, "cylinder_glazed", 0.22, 0.2)
    s = shrub(col, seed=seed, radius=0.4, height=0.55, leaf_size=0.09, flower=(0.45, 0.55, 0.9), flower_density=1.2, name="hydrangea_plant",
              leaf_mat=PM.leaf("hydrangea_leaf", (0.05, 0.1, 0.03), (0.14, 0.24, 0.08), 0.5, 0.3))
    s.parent = top
    return root


def canna(col, seed=123):
    rng = Rng(seed)
    root = _root("canna", col)
    b = Builder()
    lm = PM.leaf("canna_leaf", (0.05, 0.11, 0.03), (0.14, 0.26, 0.07), 0.4, 0.3)
    fm = M.matte((0.9, 0.12, 0.05), 0.6, "canna_flower")
    for i in range(14):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0, 0.15)
        d = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 1.0)).normalized()
        fr = frame_at(Vector((math.cos(a) * r, math.sin(a) * r, 0.05)), d)
        leaf(b, lm, fr, rng.uniform(0.7, 1.1), 0.22, shape_ovate, nu=3, nv=8, fold=0.25, arch=rng.uniform(0.3, 0.7), var=rng.random())
    for i in range(4):
        a = rng.uniform(0, 6.28)
        fr = frame_at(Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, 0.9)), Vector((0, 0, 1)))
        leaf(b, fm, fr, 0.22, 0.12, shape_ovate, nu=2, nv=4, fold=0.4, arch=0.2, var=rng.random())
    o = b.finish("canna_mesh", col)
    _p(o, root)
    return root


def bird_of_paradise(col, seed=124):
    rng = Rng(seed)
    root = _root("bird_of_paradise", col)
    b = Builder()
    lm = PM.leaf("strelitzia_leaf", (0.03, 0.08, 0.03), (0.1, 0.19, 0.07), 0.3, 0.3, gloss_coat=0.2)
    orange = M.matte((0.95, 0.5, 0.05), 0.6, "strelitzia_flower")
    blue = M.matte((0.1, 0.15, 0.6), 0.6, "strelitzia_blue")
    for i in range(12):
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 1.0)).normalized()
        fr = frame_at(Vector((math.cos(a) * 0.06, math.sin(a) * 0.06, 0.05)), d)
        leaf(b, lm, fr, rng.uniform(0.9, 1.4), 0.2, shape_ovate, nu=3, nv=8, fold=0.15, arch=rng.uniform(0.2, 0.5), var=rng.random())
    for i in range(3):
        a = rng.uniform(0, 6.28)
        base = Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 1.2))
        for k, (mat, ang) in enumerate(((orange, 0.0), (orange, 0.35), (blue, 0.7))):
            fr = frame_at(base, Vector((math.cos(a), math.sin(a), 0.6 + ang)).normalized())
            leaf(b, mat, fr, 0.18, 0.03, shape_lanceolate, nu=1, nv=4, fold=0.0, arch=0.1, var=rng.random())
    o = b.finish("strelitzia_mesh", col)
    _p(o, root)
    return root


def bamboo_clump(col, seed=125):
    rng = Rng(seed)
    root = _root("bamboo_clump", col)
    cane = M.wood((0.35, 0.42, 0.12), (0.6, 0.66, 0.28), 0.45, 30.0, "bamboo_cane")
    b = Builder()
    lm = PM.leaf("bamboo_leaf", (0.06, 0.12, 0.03), (0.17, 0.28, 0.08), 0.5, 0.35)
    for i in range(16):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0, 0.2)
        h = rng.uniform(2.2, 3.4)
        c = cylinder(f"cane_{i}", 0.014, h, (math.cos(a) * r, math.sin(a) * r, h / 2), cane, col, verts=8)
        c.rotation_euler = (rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), 0)
        _p(c, root)
        for k in range(10):
            z = h * rng.uniform(0.45, 1.0)
            la = rng.uniform(0, 6.28)
            d = Vector((math.cos(la), math.sin(la), rng.uniform(-0.4, 0.1))).normalized()
            fr = frame_at(Vector((math.cos(a) * r, math.sin(a) * r, z)), d)
            leaf(b, lm, fr, rng.uniform(0.12, 0.2), 0.02, shape_lanceolate, nu=1, nv=4, fold=0.0, arch=0.3, var=rng.random())
    o = b.finish("bamboo_leaves", col)
    _p(o, root)
    root["sway"] = {"amp": 0.6, "speed": 0.5}
    return root


def papaya_tree(col, seed=126):
    rng = Rng(seed)
    root = _root("papaya_tree", col)
    trunk = M.wood((0.3, 0.26, 0.2), (0.48, 0.42, 0.33), 0.75, 6.0, "papaya_trunk")
    _p(cylinder("papaya_trunk", 0.06, 2.4, (0, 0, 1.2), trunk, col, verts=14, radius_top=0.045), root)
    b = Builder()
    lm = PM.leaf("papaya_leaf", (0.05, 0.1, 0.03), (0.14, 0.24, 0.07), 0.45, 0.3)
    fruit = M.matte((0.35, 0.5, 0.12), 0.45, "papaya_fruit")
    for i in range(16):
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a), math.sin(a), rng.uniform(0.1, 0.5))).normalized()
        fr = frame_at(Vector((0, 0, 2.4 - rng.uniform(0, 0.4))), d)
        leaf(b, lm, fr, rng.uniform(0.6, 0.9), 0.55, shape_heart, nu=4, nv=6, fold=0.1, arch=0.25, var=rng.random())
    for i in range(7):
        a = rng.uniform(0, 6.28)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.07)
        for v in bm.verts:
            v.co.z *= 1.6
        o = mesh_object(f"papaya_{i}", bm, fruit, col, smooth=True)
        o.location = (math.cos(a) * 0.09, math.sin(a) * 0.09, 2.0 - i * 0.05)
        _p(o, root)
    o = b.finish("papaya_leaves", col)
    _p(o, root)
    return root


def guava_tree(col, seed=127):
    spec = TreeSpec(height=2.6, trunk_radius=0.06, levels=3, children=(3, 4), spread=52, up=0.25, leaf_size=0.09, leaves_per_m=200,
                    crown_start=0.35, leaf_shape=shape_ovate, bark_mat=None,
                    leaf_mat=PM.leaf("guava_leaf", (0.04, 0.09, 0.025), (0.12, 0.21, 0.06), 0.4, 0.3))
    root = build_tree(col, spec, seed, "guava")
    rng = Rng(seed + 1)
    fruit = M.matte((0.55, 0.7, 0.2), 0.5, "guava_fruit")
    for i in range(10):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.3, 0.8)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=0.04)
        o = mesh_object(f"guava_{i}", bm, fruit, col, smooth=True)
        o.location = (math.cos(a) * r, math.sin(a) * r, rng.uniform(1.3, 2.3))
        _p(o, root)
    return root


def pomegranate_tree(col, seed=128):
    spec = TreeSpec(height=2.2, trunk_radius=0.05, levels=3, children=(3, 5), spread=55, up=0.2, leaf_size=0.05, leaves_per_m=240,
                    crown_start=0.3, gnarl=0.4, leaf_shape=shape_lanceolate, flower=(0.9, 0.2, 0.08), flower_density=0.25,
                    leaf_mat=PM.leaf("anar_leaf", (0.04, 0.09, 0.02), (0.12, 0.2, 0.05), 0.3, 0.3, gloss_coat=0.3))
    root = build_tree(col, spec, seed, "pomegranate")
    rng = Rng(seed + 1)
    fruit = M.matte((0.65, 0.12, 0.08), 0.45, "anar_fruit")
    for i in range(8):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.3, 0.7)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=8, radius=0.05)
        o = mesh_object(f"anar_{i}", bm, fruit, col, smooth=True)
        o.location = (math.cos(a) * r, math.sin(a) * r, rng.uniform(1.0, 1.9))
        _p(o, root)
    return root


def curry_leaf(col, seed=129):
    root = _root("curry_leaf", col)
    spec = TreeSpec(height=1.5, trunk_radius=0.03, levels=3, children=(3, 4), spread=50, up=0.3, leaf_size=0.045, leaves_per_m=320,
                    crown_start=0.3, leaf_shape=shape_lanceolate,
                    leaf_mat=PM.leaf("kadi_leaf", (0.03, 0.08, 0.02), (0.1, 0.19, 0.05), 0.35, 0.3, gloss_coat=0.3))
    t = build_tree(col, spec, seed, "kadi_patta")
    t.parent = root
    return root


def mint_pot(col, seed=130):
    root, top = _potted("mint_pot", col, "terracotta", 0.14, 0.14)
    s = shrub(col, seed=seed, radius=0.2, height=0.22, leaf_size=0.035, name="mint_plant",
              leaf_mat=PM.leaf("mint_leaf", (0.07, 0.13, 0.04), (0.2, 0.32, 0.1), 0.55, 0.35), density=1.2)
    s.parent = top
    return root


def aloe_garden(col, seed=131):
    rng = Rng(seed)
    root, top = _potted("aloe_garden", col, "terracotta", 0.16, 0.15)
    b = Builder()
    lm = PM.leaf("aloe_leaf", (0.12, 0.22, 0.1), (0.3, 0.45, 0.22), 0.3, 0.3, gloss_coat=0.1)
    for i in range(22):
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a) * 0.7, math.sin(a) * 0.7, 1.0)).normalized()
        fr = frame_at(Vector((math.cos(a) * 0.02, math.sin(a) * 0.02, 0)), d)
        leaf(b, lm, fr, rng.uniform(0.25, 0.4), 0.06, shape_sword, nu=2, nv=6, fold=0.5, arch=rng.uniform(0.2, 0.4), var=rng.random())
    o = b.finish("aloe_mesh", col)
    _p(o, top)
    return root


def cactus_garden(col, seed=132):
    rng = Rng(seed)
    root = _root("cactus_garden", col)
    skin = M.matte((0.2, 0.36, 0.17), 0.7, "cactus_skin")
    for i, (x, y, h, r) in enumerate(((0, 0, 1.3, 0.1), (0.22, 0.05, 0.7, 0.07), (-0.2, -0.08, 0.5, 0.06))):
        c = cylinder(f"cactus_{i}", r, h, (x, y, h / 2), skin, col, verts=14, radius_top=r * 0.85, bevel=0.02)
        _p(c, root)
    arm = cylinder("cactus_arm", 0.06, 0.5, (0.17, 0, 0.95), skin, col, verts=12, bevel=0.02)
    arm.rotation_euler = (0, 0.8, 0)
    _p(arm, root)
    gravel = M.matte((0.55, 0.5, 0.42), 0.9, "cactus_gravel")
    _p(cylinder("cactus_bed", 0.42, 0.04, (0, 0, 0.02), gravel, col, verts=32), root)
    return root


def fern(col, seed=133):
    rng = Rng(seed)
    root, top = _potted("fern", col, "terracotta", 0.18, 0.17)
    b = Builder()
    lm = PM.leaf("fern_frond", (0.05, 0.11, 0.03), (0.15, 0.27, 0.08), 0.6, 0.35)
    for i in range(34):
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a) * 0.9, math.sin(a) * 0.9, rng.uniform(0.3, 1.0))).normalized()
        fr = frame_at(Vector((math.cos(a) * 0.03, math.sin(a) * 0.03, 0.02)), d)
        leaf(b, lm, fr, rng.uniform(0.35, 0.55), 0.09, shape_lanceolate, nu=2, nv=10, fold=0.1, arch=rng.uniform(0.6, 1.1), var=rng.random())
    o = b.finish("fern_mesh", col)
    _p(o, top)
    root["sway"] = {"amp": 0.4, "speed": 0.6}
    return root


def elephant_ear(col, seed=134):
    rng = Rng(seed)
    root = _root("elephant_ear", col)
    b = Builder()
    lm = PM.leaf("colocasia_leaf", (0.03, 0.08, 0.03), (0.1, 0.2, 0.07), 0.35, 0.3, gloss_coat=0.15)
    for i in range(7):
        a = rng.uniform(0, 6.28)
        d = Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, 1.0)).normalized()
        fr = frame_at(Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.03)), d)
        leaf(b, lm, fr, rng.uniform(0.8, 1.15), 0.6, shape_heart, nu=4, nv=7, fold=0.2, arch=rng.uniform(0.4, 0.8), var=rng.random())
    o = b.finish("colocasia_mesh", col)
    _p(o, root)
    return root


def peepal_sapling(col, seed=135):
    spec = TreeSpec(height=3.0, trunk_radius=0.06, levels=3, children=(3, 4), spread=50, up=0.3, leaf_size=0.12, leaves_per_m=150,
                    crown_start=0.4, leaf_shape=shape_heart, droop=0.5,
                    leaf_mat=PM.leaf("peepal_leaf", (0.04, 0.09, 0.025), (0.13, 0.22, 0.06), 0.4, 0.3, gloss_coat=0.3))
    return build_tree(col, spec, seed, "peepal")


def jamun_tree(col, seed=136):
    spec = TreeSpec(height=4.2, trunk_radius=0.1, levels=4, children=(3, 4), spread=48, up=0.3, leaf_size=0.1, leaves_per_m=200,
                    crown_start=0.45, leaf_shape=shape_lanceolate,
                    leaf_mat=PM.leaf("jamun_leaf", (0.03, 0.075, 0.02), (0.09, 0.17, 0.045), 0.3, 0.3, gloss_coat=0.35))
    root = build_tree(col, spec, seed, "jamun")
    rng = Rng(seed + 1)
    fruit = M.matte((0.15, 0.05, 0.12), 0.4, "jamun_fruit")
    for i in range(18):
        a = rng.uniform(0, 6.28)
        r = rng.uniform(0.4, 1.3)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.018)
        o = mesh_object(f"jamun_{i}", bm, fruit, col, smooth=True)
        o.location = (math.cos(a) * r, math.sin(a) * r, rng.uniform(2.2, 3.8))
        _p(o, root)
    return root


def planter_stand(col, seed=137):
    """A six-tier wrought-iron plant stand: a spiral of round shelves on a
    post, each one a step higher than the last."""
    root = _root("planter_stand", col)
    iron = M.powder_coat((0.03, 0.028, 0.026), 0.45, "stand_iron")
    _p(cylinder("stand_post", 0.025, 2.6, (0, 0, 1.3), iron, col, verts=12), root)
    _p(cylinder("stand_foot", 0.3, 0.03, (0, 0, 0.015), iron, col, verts=24), root)
    for i in range(3):
        a = i * 2.094
        _p(cylinder(f"stand_leg_{i}", 0.012, 0.5, (math.cos(a) * 0.22, math.sin(a) * 0.22, 0.02), iron, col, verts=8), root)
    for lvl in range(6):
        a = lvl * 1.05
        z = 0.08 + lvl * 0.42
        arm = cylinder(f"stand_arm_{lvl}", 0.01, 0.26, (math.cos(a) * 0.13, math.sin(a) * 0.13, z), iron, col, verts=8)
        arm.rotation_euler = (0, 1.5708, a)
        _p(arm, root)
        _p(cylinder(f"stand_ring_{lvl}", 0.17, 0.015, (math.cos(a) * 0.26, math.sin(a) * 0.26, z), iron, col, verts=24), root)
    return root


SINGLE_EXTRA = {
    "planter_stand": planter_stand,
    "oleander": oleander, "hydrangea": hydrangea, "canna": canna, "bird_of_paradise": bird_of_paradise, "bamboo_clump": bamboo_clump,
    "papaya_tree": papaya_tree, "guava_tree": guava_tree, "pomegranate_tree": pomegranate_tree, "curry_leaf": curry_leaf,
    "mint_pot": mint_pot, "aloe_garden": aloe_garden, "cactus_garden": cactus_garden, "fern": fern, "elephant_ear": elephant_ear,
    "peepal_sapling": peepal_sapling, "jamun_tree": jamun_tree,
}

BUILDERS = {**GROWABLE_EXTRA, **SINGLE_EXTRA}

# name, category, blurb, coins, unlock minutes
META = {
    "sunflower": ("Sunflower", "PLANTS", "Surajmukhi: a tall head of gold that follows the sun. Grows with your focus.", 40, 15),
    "dahlia": ("Dahlia", "PLANTS", "Layered magenta blooms in a terracotta pot. Grows with your focus.", 50, 45),
    "chrysanthemum": ("Chrysanthemum", "PLANTS", "Guldaudi: a mound of yellow autumn flowers. Grows with your focus.", 45, 30),
    "petunia": ("Petunia", "PLANTS", "Purple trumpets spilling from a blue glazed pot. Grows with your focus.", 35, 10),
    "zinnia": ("Zinnia", "PLANTS", "Orange and pink, bright as paper. Grows with your focus.", 35, 20),
    "cosmos": ("Cosmos", "PLANTS", "Airy pink flowers on thin stems. Grows with your focus.", 40, 25),
    "periwinkle": ("Sadabahar", "PLANTS", "Periwinkle: pink stars that never stop. Grows with your focus.", 30, 0),
    "ixora": ("Ixora", "PLANTS", "Rugmini: dense orange-red clusters. Grows with your focus.", 55, 70),
    "lantana": ("Lantana", "PLANTS", "Orange and yellow, loved by butterflies. Grows with your focus.", 40, 35),
    "geranium": ("Geranium", "PLANTS", "Scarlet geranium in a terracotta pot. Grows with your focus.", 45, 40),
    "oleander": ("Kaner", "PLANTS", "Oleander: a tall shrub of pink flowers.", 90, 150),
    "hydrangea": ("Hydrangea", "PLANTS", "Blue mopheads in a glazed pot.", 85, 120),
    "canna": ("Canna lily", "PLANTS", "Broad paddle leaves and red flames.", 70, 90),
    "bird_of_paradise": ("Bird of paradise", "PLANTS", "Strelitzia: orange and blue cranes above long leaves.", 120, 240),
    "bamboo_clump": ("Bamboo", "PLANTS", "A tall clump of golden bamboo.", 140, 300),
    "papaya_tree": ("Papaya", "TREES", "A single-stemmed papaya heavy with fruit.", 110, 180),
    "guava_tree": ("Guava", "TREES", "Amrood: a round little tree in fruit.", 120, 220),
    "pomegranate_tree": ("Pomegranate", "TREES", "Anar: red flowers and ruby fruit.", 130, 260),
    "curry_leaf": ("Curry leaf", "PLANTS", "Kadi patta by the kitchen door.", 60, 60),
    "mint_pot": ("Mint", "PLANTS", "Pudina in a terracotta pot.", 25, 0),
    "aloe_garden": ("Aloe vera", "PLANTS", "Fleshy aloe in a terracotta pot.", 30, 10),
    "cactus_garden": ("Cactus bed", "PLANTS", "Three cacti on a gravel bed.", 65, 100),
    "fern": ("Fern", "PLANTS", "Arching fronds in a terracotta pot.", 45, 40),
    "elephant_ear": ("Elephant ear", "PLANTS", "Colocasia: leaves as big as umbrellas.", 75, 110),
    "peepal_sapling": ("Peepal", "TREES", "A young peepal with heart-shaped leaves.", 150, 400),
    "jamun_tree": ("Jamun", "TREES", "A jamun tree, dark fruit in its crown.", 170, 480),
    "planter_stand": ("Planter stand", "FURNITURE", "A six-tier iron stand: holds six planters one above the other.", 160, 120),
}
