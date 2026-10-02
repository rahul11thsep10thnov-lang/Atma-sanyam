"""Ground: a lawn with real grass (hair particles), a flagstone path, raised
soil beds, gravel and a timber fence."""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from .common import Rng, box, collection, cylinder, link, mesh_object
from .nodes import Tree as NodeTree


def _cached(key, fn):
    if key in M._cache:
        return M._cache[key]
    M._cache[key] = fn()
    return M._cache[key]


def lawn_soil(wet=False):
    def make():
        t = NodeTree("lawn_soil")
        co = t.coords("Object")
        n = t.noise(co, scale=3, detail=8, roughness=0.6)
        fine = t.noise(co, scale=40, detail=5)
        col = t.ramp((n, "Fac"), [(0.3, (0.05, 0.06, 0.02)), (0.7, (0.1, 0.11, 0.035))])
        col = t.mix_color(t.map_range(fine, 0.4, 0.7, 0.0, 0.4), col, (0.08, 0.05, 0.025))
        rough = 0.35 if wet else 0.9
        return t.surface(t.principled(col, rough, t.bump((fine, "Fac"), 0.2, 0.01)))
    return _cached(f"lawn_soil::{wet}", make)


def grass_blade(wet=False):
    """Colour along the blade (root dark → tip light), random per strand."""
    def make():
        t = NodeTree("grass_blade")
        hi = t.node("ShaderNodeHairInfo")
        along = t.ramp((hi, "Intercept"), [(0.0, (0.03, 0.06, 0.015)), (0.55, (0.09, 0.2, 0.04)), (1.0, (0.22, 0.34, 0.08))])
        col = t.mix_color(t.math("MULTIPLY", (hi, "Random"), 0.5), along, (0.16, 0.19, 0.05))
        p = t.principled(col, 0.45 if wet else 0.6, None, Subsurface_Weight=0.0)
        tr = t.node("ShaderNodeBsdfTranslucent", {"Color": (0.18, 0.3, 0.06)})
        mix = t.node("ShaderNodeMixShader")
        t.set(mix, 0, 0.35)
        t.link(p, mix.inputs[1])
        t.link(tr, mix.inputs[2])
        return t.surface(mix)
    return _cached(f"grass_blade::{wet}", make)


def soil():
    def make():
        t = NodeTree("bed_soil")
        co = t.coords("Object")
        n = t.noise(co, scale=25, detail=9, roughness=0.7)
        clods = t.node("ShaderNodeTexVoronoi", {"Vector": co, "Scale": 60.0, "Randomness": 1.0})
        col = t.ramp((n, "Fac"), [(0.3, (0.045, 0.028, 0.015)), (0.7, (0.1, 0.065, 0.035))])
        col = t.mix_color(t.map_range((clods, "Distance"), 0.3, 0.6, 0.0, 0.5), col, (0.07, 0.045, 0.025))
        h = t.math("ADD", t.math("MULTIPLY", (n, "Fac"), 0.5), t.math("MULTIPLY", (clods, "Distance"), 0.5))
        return t.surface(t.principled(col, 0.95, t.bump(h, 0.6, 0.02)))
    return _cached("bed_soil", make)


def sandstone(wet=False, name="sandstone", color=(0.3, 0.23, 0.15)):
    def make():
        t = NodeTree(name)
        co = t.coords("Object")
        n1 = t.noise(co, scale=2, detail=10, roughness=0.6)
        n2 = t.noise(co, scale=50, detail=6)
        layers = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 6.0, "Distortion": 3.0, "Detail": 3.0}, wave_type="BANDS", bands_direction="X")
        col = t.mix_color(t.map_range(n1, 0.35, 0.65, 0, 1), tuple(c * 0.78 for c in color), color)
        col = t.mix_color(t.math("MULTIPLY", (layers, "Fac"), 0.25), col, tuple(c * 0.85 for c in color))
        var = t.node("ShaderNodeObjectInfo")
        col = t.mix_color(t.math("MULTIPLY", (var, "Random"), 0.3), col, tuple(c * 0.7 for c in color))
        # moss and dirt in the low spots
        col = t.mix_color(t.map_range(n2, 0.62, 0.75, 0.0, 0.35), col, (0.12, 0.12, 0.05))
        rough = t.map_range(n2, 0.3, 0.7, 0.25 if wet else 0.55, 0.45 if wet else 0.8)
        return t.surface(t.principled(col, rough, t.bump((n2, "Fac"), 0.25, 0.004)))
    return _cached(f"{name}::{wet}", make)


def gravel(wet=False):
    def make():
        t = NodeTree("gravel")
        co = t.coords("Object")
        v = t.node("ShaderNodeTexVoronoi", {"Vector": co, "Scale": 110.0, "Randomness": 1.0})
        n = t.noise(co, scale=8, detail=4)
        col = t.ramp((v, "Distance"), [(0.0, (0.5, 0.47, 0.42)), (0.35, (0.28, 0.26, 0.22)), (0.6, (0.15, 0.13, 0.1))])
        col = t.mix_color(t.map_range(n, 0.3, 0.7, 0.0, 0.3), col, (0.33, 0.27, 0.2))
        return t.surface(t.principled(col, 0.5 if wet else 0.85, t.bump((v, "Distance"), 0.7, 0.01)))
    return _cached(f"gravel::{wet}", make)


# ---- terrain -------------------------------------------------------------------------

def terrain(col, size=(28.0, 36.0), origin=(0.0, 12.0), seed=1, wet=False):
    """Gently undulating ground, lawn material, no grass yet."""
    rng = Rng(seed)
    bm = bmesh.new()
    res = 90
    bmesh.ops.create_grid(bm, x_segments=res, y_segments=res, size=1.0)
    for v in bm.verts:
        x = origin[0] + v.co.x * size[0]
        y = origin[1] + v.co.y * size[1]
        z = 0.03 * math.sin(x * 0.7 + 1.3) * math.cos(y * 0.5) + 0.02 * math.sin(x * 2.1 + y * 1.7) + 0.012 * math.sin(y * 4.3 + x)
        v.co = Vector((x, y, z))
    obj = mesh_object("terrain", bm, lawn_soil(wet), col, smooth=True)
    return obj


def lawn(col, terrain_obj, density=1.0, length=0.038, seed=2, wet=False):
    """Grass as hair particles on the terrain (interpolated children)."""
    ps = terrain_obj.modifiers.new("grass", "PARTICLE_SYSTEM")
    s = ps.particle_system.settings
    s.type = "HAIR"
    s.count = int(60000 * density)
    s.hair_length = length
    s.length_random = 0.4
    # with advanced hair the emission velocity IS the length
    s.use_advanced_hair = True
    s.normal_factor = length
    s.factor_random = length * 0.3
    s.effector_weights.gravity = 0.03
    s.hair_step = 4
    s.child_type = "INTERPOLATED"
    s.child_percent = 10
    s.rendered_child_count = 24
    s.child_radius = 0.045
    s.child_roundness = 0.5
    s.clump_factor = 0.35
    s.roughness_1 = 0.02
    s.roughness_1_size = 0.3
    s.roughness_endpoint = 0.04
    s.roughness_end_shape = 1.0
    s.use_clump_curve = False
    s.root_radius = 0.9
    s.tip_radius = 0.15
    s.radius_scale = 0.0016
    s.shape = 0.0
    s.use_close_tip = True
    s.material = len(terrain_obj.data.materials) + 1
    terrain_obj.data.materials.append(grass_blade(wet))
    ps.particle_system.seed = seed
    return ps


def mow_lawn(terrain_obj, keep):
    """Keep grass only where `keep(x, y)` is true (vertex group density)."""
    vg = terrain_obj.vertex_groups.new(name="lawn")
    for v in terrain_obj.data.vertices:
        vg.add([v.index], 1.0 if keep(v.co.x, v.co.y) else 0.0, "REPLACE")
    for m in terrain_obj.modifiers:
        if m.type == "PARTICLE_SYSTEM":
            m.particle_system.vertex_group_density = "lawn"


# ---- the path ------------------------------------------------------------------------

def flagstone_path(col, centre, width=1.1, seed=3, wet=False, name="path"):
    """Irregular flagstones along a polyline `centre` (list of (x, y)),
    slightly uneven, with gravel in the joints."""
    rng = Rng(seed)
    stone = sandstone(wet)
    # gravel bed first
    bm = bmesh.new()
    rows = []
    for (x, y) in centre:
        rows.append([bm.verts.new((x - width / 2 - 0.08, y, 0.01)), bm.verts.new((x + width / 2 + 0.08, y, 0.01))])
    for i in range(len(rows) - 1):
        bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
    mesh_object(f"{name}_gravel", bm, gravel(wet), col)
    # stones: walk the path, laying 2-3 across each step
    k = 0
    for i in range(len(centre) - 1):
        x0, y0 = centre[i]
        x1, y1 = centre[i + 1]
        seg = Vector((x1 - x0, y1 - y0))
        n = max(1, int(seg.length / 0.62))
        for j in range(n):
            t = (j + 0.5) / n
            cx, cy = x0 + seg.x * t, y0 + seg.y * t
            across = rng.randint(2, 3)
            for a in range(across):
                u = -width / 2 + width * (a + 0.5) / across + rng.uniform(-0.04, 0.04)
                sx = width / across * rng.uniform(0.78, 0.92)
                sy = 0.62 * rng.uniform(0.7, 0.9)
                pos = (cx + u, cy + rng.uniform(-0.03, 0.03), 0.028 + rng.uniform(-0.006, 0.008))
                if rng.random() < 0.4:
                    st = cylinder(f"{name}_stone_{k}", max(sx, sy) * 0.56, 0.06, pos, stone, col, verts=rng.randint(6, 9), bevel=0.012)
                    st.scale = (sx / max(sx, sy), sy / max(sx, sy), 1)
                else:
                    st = box(f"{name}_stone_{k}", (sx, sy, 0.06), pos, stone, col, bevel=0.014, segments=3)
                st.rotation_euler = (rng.uniform(-0.015, 0.015), rng.uniform(-0.015, 0.015), math.atan2(seg.y, seg.x) + rng.uniform(-0.12, 0.12))
                k += 1
    return k


def stepping_stones(col, points, seed=4, wet=False):
    rng = Rng(seed)
    for i, (x, y) in enumerate(points):
        r = rng.uniform(0.2, 0.27)
        st = cylinder(f"step_{i}", r, 0.05, (x, y, 0.025), sandstone(wet), col, verts=14, bevel=0.012)
        st.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        st.scale = (1, rng.uniform(0.8, 1.0), 1)


def raised_bed(col, centre, size, seed=5, name="bed", wet=False):
    """A soil bed edged with rough sandstone blocks."""
    rng = Rng(seed)
    x, y = centre
    w, d = size
    soil_top = 0.14
    bed = box(f"{name}_soil", (w - 0.2, d - 0.2, soil_top), (x, y, soil_top / 2), soil(), col)
    sub = bed.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 3
    disp = bed.modifiers.new("clods", "DISPLACE")
    tex = bpy.data.textures.new(f"{name}_clods", "CLOUDS")
    tex.noise_scale = 0.08
    disp.texture = tex
    disp.strength = 0.03
    stone = sandstone(wet, "bed_stone", (0.36, 0.3, 0.22))
    edge_h = 0.2
    k = 0
    for (sx, sy, length, horiz) in ((x, y - d / 2, w, True), (x, y + d / 2, w, True), (x - w / 2, y, d, False), (x + w / 2, y, d, False)):
        n = max(1, int(length / 0.42))
        for i in range(n):
            t = (i + 0.5) / n - 0.5
            L = length / n * rng.uniform(0.84, 0.95)
            pos = (sx + t * length, sy, edge_h / 2 - 0.02) if horiz else (sx, sy + t * length, edge_h / 2 - 0.02)
            dims = (L, 0.22, edge_h * rng.uniform(0.9, 1.05)) if horiz else (0.22, L, edge_h * rng.uniform(0.9, 1.05))
            b = box(f"{name}_edge_{k}", dims, pos, stone, col, bevel=0.02, segments=3)
            b.rotation_euler = (rng.uniform(-0.03, 0.03), rng.uniform(-0.03, 0.03), rng.uniform(-0.04, 0.04))
            k += 1
    return bed


def timber_fence(col, start, end, height=1.5, seed=6, name="fence"):
    """Horizontal slat fence between timber posts, slightly weathered."""
    rng = Rng(seed)
    teak = M.wood((0.14, 0.09, 0.05), (0.36, 0.26, 0.15), 0.6, 3.0, "fence_wood")
    a, b_ = Vector((start[0], start[1], 0)), Vector((end[0], end[1], 0))
    d = b_ - a
    length = d.length
    dirn = d.normalized()
    rot = math.atan2(dirn.y, dirn.x)
    n_posts = int(length / 2.0) + 1
    for i in range(n_posts + 1):
        p = a + dirn * min(length, i * length / n_posts)
        post = box(f"{name}_post_{i}", (0.1, 0.1, height + 0.05), (p.x, p.y, (height + 0.05) / 2), teak, col, bevel=0.006)
        post.rotation_euler = (0, 0, rot)
    slats = int((height - 0.15) / 0.17)
    for s in range(slats):
        z = 0.12 + s * 0.17 + 0.07
        mid = a + dirn * (length / 2)
        slat = box(f"{name}_slat_{s}", (length, 0.025, 0.13), (mid.x, mid.y + 0.06 * math.cos(rot), z), teak, col, bevel=0.004)
        slat.rotation_euler = (0, rng.uniform(-0.004, 0.004), rot)
    return rot


def boulders(col, points, seed=7, wet=False):
    """Weathered granite boulders half-settled into the ground."""
    rng = Rng(seed)
    granite = sandstone(wet, "granite", (0.33, 0.32, 0.3))
    for i, (x, y, r) in enumerate(points):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=r)
        for v in bm.verts:
            v.co.x *= rng.uniform(0.9, 1.3)
            v.co.z *= 0.65
            v.co += Vector((rng.uniform(-0.05, 0.05), rng.uniform(-0.05, 0.05), rng.uniform(-0.03, 0.03))) * r
        o = mesh_object(f"boulder_{i}", bm, granite, col, smooth=True)
        o.location = (x, y, r * 0.2)
        o.rotation_euler = (0, 0, rng.uniform(0, 6.28))
