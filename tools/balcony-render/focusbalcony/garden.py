"""The garden: a spacious residential garden seen from the house steps.

Coordinates (metres): the camera stands near (0, -1) looking along +Y.
A flagstone path curves away to the left toward a gate in the back fence;
lawn either side; raised flower beds; a mature neem back-left, a gulmohar
right, a frangipani mid-right; hedges and a timber fence close the garden
with a tree line and hills beyond.
"""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from . import lighting, ground, trees
from .common import DEG, Rng, box, collection, cylinder, mesh_object

PATH = [(0.35, -1.6), (0.3, 0.6), (-0.2, 2.6), (-1.0, 4.8), (-1.9, 7.2), (-2.6, 9.8), (-3.1, 12.4), (-3.4, 14.6)]
BACK_Y = 14.9
SIDE_X = 6.6


def ground_height(x, y):
    return 0.03 * math.sin(x * 0.7 + 1.3) * math.cos(y * 0.5) + 0.02 * math.sin(x * 2.1 + y * 1.7) + 0.012 * math.sin(y * 4.3 + x)


def _path_distance(x, y):
    best = 1e9
    for i in range(len(PATH) - 1):
        a, b = Vector(PATH[i]), Vector(PATH[i + 1])
        ab = b - a
        t = max(0.0, min(1.0, (Vector((x, y)) - a).dot(ab) / ab.length_squared))
        best = min(best, (Vector((x, y)) - (a + ab * t)).length)
    return best


BEDS = [((-2.7, 4.4), (1.9, 4.2)), ((3.1, 7.2), (2.2, 4.0))]


def _in_bed(x, y, margin=0.15):
    for (cx, cy), (w, d) in BEDS:
        if abs(x - cx) < w / 2 + margin and abs(y - cy) < d / 2 + margin:
            return True
    return False


def build_terrain(state):
    col = collection("terrain")
    wet = lighting.wet(state)
    terr = ground.terrain(col, wet=wet)
    ground.lawn(col, terr, density=1.0, wet=wet)
    ground.mow_lawn(terr, lambda x, y: _path_distance(x, y) > 0.72 and not _in_bed(x, y) and abs(x) < SIDE_X - 0.3 and -2.5 < y < BACK_Y - 0.6)
    ground.flagstone_path(col, PATH, width=1.15, wet=wet)
    for (c, size) in BEDS:
        ground.raised_bed(col, c, size, seed=int(c[0] * 10) % 97, wet=wet)
    ground.boulders(col, [(-2.1, 2.3, 0.32), (1.6, 7.6, 0.48), (1.1, 8.3, 0.26)], wet=wet)
    return col


def build_boundary(state):
    col = collection("boundary")
    # back fence and hedges, side hedges
    ground.timber_fence(col, (-SIDE_X - 1, BACK_Y + 0.4), (SIDE_X + 1, BACK_Y + 0.4), height=1.6)
    for i, (x0, x1) in enumerate(((-SIDE_X - 0.5, -4.5), (-2.3, SIDE_X + 0.5),)):
        h = trees.hedge(col, length=x1 - x0, height=1.15, depth=0.7, seed=20 + i, name=f"hedge_back_{i}")
        h.location = ((x0 + x1) / 2, BACK_Y - 0.5, 0)
    for s in (-1, 1):
        h = trees.hedge(col, length=11.0, height=1.3, depth=0.8, seed=30 + s, name=f"hedge_side_{s}")
        h.location = (s * SIDE_X, 8.0, 0)
        h.rotation_euler = (0, 0, 90 * DEG)
        f = ground.timber_fence(col, (s * (SIDE_X + 0.6), -3.0), (s * (SIDE_X + 0.6), BACK_Y + 0.4), height=1.6, seed=40 + s, name=f"fence_side_{s}")
    # gate in the back fence where the path arrives
    teak = M.wood((0.14, 0.09, 0.05), (0.36, 0.26, 0.15), 0.6, 3.0, "fence_wood")
    for i in range(7):
        box(f"gate_slat_{i}", (0.09, 0.03, 1.5), (-3.9 + i * 0.16, BACK_Y - 0.55, 0.78), teak, col, bevel=0.004)
    box("gate_rail_a", (1.1, 0.03, 0.1), (-3.4, BACK_Y - 0.53, 0.35), teak, col)
    box("gate_rail_b", (1.1, 0.03, 0.1), (-3.4, BACK_Y - 0.53, 1.25), teak, col)
    return col


def build_trees(state):
    col = collection("trees")
    neem = trees.neem_tree(col, seed=3, height=6.0)
    neem.location = (-4.3, 10.6, ground_height(-4.3, 10.6))
    neem.rotation_euler = (0, 0, 40 * DEG)
    gul = trees.gulmohar(col, seed=8, height=5.2)
    gul.location = (4.9, 10.2, ground_height(4.9, 10.2))
    fr = trees.frangipani(col, seed=5, height=2.7)
    fr.location = (3.4, 3.4, ground_height(3.4, 3.4))
    fr.rotation_euler = (0, 0, 110 * DEG)
    # planting in the beds
    rng = Rng(9)
    for (cx, cy), (w, d) in BEDS:
        n = int(w * d * 1.6)
        for i in range(n):
            x = cx + rng.uniform(-w / 2 + 0.35, w / 2 - 0.35)
            y = cy + rng.uniform(-d / 2 + 0.35, d / 2 - 0.35)
            kind = rng.random()
            if kind < 0.4:
                s = trees.shrub(col, seed=100 + i + int(cx), radius=0.32, height=0.42, leaf_size=0.035, flower=(0.95, 0.5, 0.05),
                                flower_density=0.7, name=f"marigold_{cx}_{i}")
            elif kind < 0.7:
                s = trees.shrub(col, seed=200 + i + int(cx), radius=0.4, height=0.55, leaf_size=0.045, flower=(0.9, 0.15, 0.4),
                                flower_density=0.35, name=f"bougainvillea_{cx}_{i}")
            else:
                s = trees.shrub(col, seed=300 + i + int(cx), radius=0.36, height=0.6, leaf_size=0.05, name=f"foliage_{cx}_{i}")
            s.location = (x, y, 0.16)
            s.rotation_euler = (0, 0, rng.uniform(0, 6.28))
    # a loose shrub or two on the lawn edges
    s = trees.shrub(col, seed=77, radius=0.7, height=0.9, leaf_size=0.06, flower=(0.98, 0.98, 0.9), flower_density=0.25, name="jasmine_big")
    s.location = (-5.0, 7.4, 0)
    s = trees.shrub(col, seed=78, radius=0.55, height=0.75, leaf_size=0.055, flower=(0.85, 0.15, 0.1), flower_density=0.4, name="hibiscus_big")
    s.location = (5.4, 4.6, 0)
    return col


def build_beyond(state):
    """The world past the fence: a tree line, fields and hills in haze."""
    col = collection("landscape")
    rng = Rng(42)
    haze = lighting.HAZE[state]
    hz_strength = 1.0 if state not in ("night",) else 0.6
    ground_mat = M.hazed((0.06, 0.08, 0.03), 0.95, haze, hz_strength, 300.0, f"far_ground_{state}", 0.3, 0.03)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=40, y_segments=40, size=900)
    for v in bm.verts:
        v.co.y += 900 + BACK_Y
        v.co.z = -0.3
    mesh_object("far_ground", bm, ground_mat, col)
    leaf_cols = [(0.03, 0.06, 0.018), (0.045, 0.075, 0.022), (0.06, 0.07, 0.025)]
    mats = [M.hazed(c, 0.85, haze, hz_strength * 0.55, 700.0, f"far_canopy_{i}_{state}", 0.25, 0.4) for i, c in enumerate(leaf_cols)]
    variants = []
    for k in range(5):
        bm = bmesh.new()
        r = rng.uniform(2.5, 4.5)
        for _ in range(8):
            o = Vector((rng.uniform(-r, r) * 0.6, rng.uniform(-r, r) * 0.6, rng.uniform(0, r * 0.9)))
            res = bmesh.ops.create_icosphere(bm, subdivisions=3, radius=rng.uniform(r * 0.45, r * 0.75))
            for v in res["verts"]:
                v.co += o + Vector((rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)))
        for f in bm.faces:
            f.smooth = True
        me = bpy.data.meshes.new(f"far_tree_{k}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(mats[k % 3])
        variants.append(me)
    # real trees just past the fence, then the hazed canopy beyond
    for i, (x, y, h, sd) in enumerate(((-9.0, BACK_Y + 5.0, 7.5, 51), (-2.0, BACK_Y + 7.5, 6.5, 52), (4.5, BACK_Y + 5.5, 7.0, 53),
                                       (11.0, BACK_Y + 8.0, 6.5, 54), (-16.0, BACK_Y + 9.0, 8.0, 56))):
        t = trees.neem_tree(col, seed=sd, height=h, density=0.18)
        t.location = (x, y, 0)
    for i in range(420):
        x = rng.uniform(-160, 160)
        y = BACK_Y + 60 + rng.uniform(0, 300) ** 1.0
        me = variants[int(rng.random() * 5) % 5]
        o = bpy.data.objects.new(f"far_tree_{i}", me)
        s = rng.uniform(0.8, 1.9)
        o.location = (x, y, rng.uniform(-0.5, 0.5))
        o.scale = (s, s, s * rng.uniform(0.9, 1.4))
        o.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        col.objects.link(o)
    for layer, (dist, height, hz) in enumerate(((2600, 110, 1100.0), (4200, 230, 1600.0), (6500, 420, 2400.0))):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=40, y_segments=120, size=1.0)
        for v in bm.verts:
            u, w = v.co.x + 0.5, v.co.y + 0.5
            xx = -3000 + w * 6000
            yy = dist + u * 500
            hgt = height * (0.45 + 0.35 * math.sin(xx / 500 + layer * 2) + 0.2 * math.sin(xx / 180 + layer)) * math.sin(u * math.pi)
            v.co = Vector((xx, yy, -0.3 + max(hgt, 0)))
        green = [(0.04, 0.06, 0.025), (0.05, 0.065, 0.035), (0.07, 0.08, 0.06)][layer]
        mesh_object(f"hills_{layer}", bm, M.hazed(green, 0.9, tuple(min(1, c * 1.15) for c in haze), hz_strength * 1.2, hz, f"garden_hill_{layer}_{state}", 0.2, 0.002), col, smooth=True)
    return col


def build_house(state):
    """The house behind the camera: steps and a wall so light bounces and
    shadows fall believably; a porch lamp for the dark states."""
    col = collection("architecture")
    plaster = M.plaster((0.62, 0.57, 0.5), "house_plaster")
    box("house_wall", (14.0, 0.4, 3.2), (0, -3.6, 1.6), plaster, col)
    stone = ground.sandstone(lighting.wet(state), "step_stone", (0.4, 0.34, 0.26))
    box("step_1", (3.2, 0.9, 0.16), (0.3, -2.75, 0.08), stone, col, bevel=0.01)
    box("step_2", (3.2, 0.5, 0.16), (0.3, -3.0, 0.24), stone, col, bevel=0.01)
    if lighting.lamps_on(state):
        lighting.point_lamp(col, "porch_lamp", (1.6, -3.3, 2.4), energy=180.0, color=(1.0, 0.75, 0.5), radius=0.12)
        glow = M.emissive((1.0, 0.8, 0.55), 6.0, "porch_glow")
        cylinder("porch_glass", 0.08, 0.16, (1.6, -3.3, 2.4), glow, col, verts=16)
        # low bollard lights along the path
        for i, (x, y) in enumerate(((0.95, 1.4), (-0.3, 5.6), (-1.7, 10.2))):
            cylinder(f"bollard_{i}", 0.03, 0.38, (x, y, 0.19), M.metal((0.1, 0.07, 0.04), 0.45, "bollard_bronze"), col, verts=16)
            cylinder(f"bollard_glow_{i}", 0.028, 0.04, (x, y, 0.39), glow, col, verts=16)
            lighting.point_lamp(col, f"bollard_light_{i}", (x, y, 0.43), energy=12.0, color=(1.0, 0.78, 0.5), radius=0.04)
    else:
        for i, (x, y) in enumerate(((0.95, 1.4), (-0.3, 5.6), (-1.7, 10.2))):
            cylinder(f"bollard_{i}", 0.03, 0.38, (x, y, 0.19), M.metal((0.1, 0.07, 0.04), 0.45, "bollard_bronze"), col, verts=16)
            cylinder(f"bollard_cap_{i}", 0.028, 0.04, (x, y, 0.39), M.matte((0.85, 0.82, 0.75), 0.4, "bollard_lens"), col, verts=16)
    return col


def build_camera(width=1080, height=2340):
    sc = bpy.context.scene
    cam_data = bpy.data.cameras.new("camera")
    cam_data.lens_unit = "FOV"
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = 78.0 * DEG
    cam_data.shift_y = -0.05
    cam_data.clip_start = 0.05
    cam_data.clip_end = 20000
    cam = bpy.data.objects.new("camera", cam_data)
    cam.location = (0.3, -2.75, 1.78)
    cam.rotation_euler = (83 * DEG, 0, -1.5 * DEG)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    return cam


def build_all(width=1080, height=2340, state="morning"):
    build_terrain(state)
    build_boundary(state)
    build_trees(state)
    build_beyond(state)
    build_house(state)
    lighting.build(state)
    build_camera(width, height)


def configure_render(samples=128, preview=False):
    from .scene import configure_render as cr
    cr(samples, preview)
    sc = bpy.context.scene
    sc.cycles.transparent_max_bounces = 24
    try:
        sc.cycles_curves.shape = "RIBBONS"
        sc.cycles_curves.subdivisions = 2
    except AttributeError:
        pass
