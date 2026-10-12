"""The balcony: architecture, the room behind the glass, the world beyond
the railing, sun + physical sky, and the architectural camera.

Coordinates (metres): the balcony runs away from the camera along +Y.
Glass facade on the left (x = -1.3), railing on the right (x = +1.45),
far end wall at y = 6.4, floor at z = 0, ceiling at z = 3.0.
"""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from .common import DEG, Rng, box, collection, cylinder, mesh_object

FACADE_X = -1.3
RAIL_X = 1.45
NEAR_Y = -3.2
FAR_Y = 6.4
CEIL_Z = 3.0
DOOR_H = 2.45

SUN_ELEVATION = 33.0  # degrees above the horizon — early morning
SUN_AZIMUTH = 113.0   # degrees, measured from +Y toward +X (outside, ahead-right)


def sun_direction():
    """Unit vector pointing FROM the scene TOWARD the sun."""
    el, az = SUN_ELEVATION * DEG, SUN_AZIMUTH * DEG
    return Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))


# ---------------------------------------------------------------------------

def build_architecture():
    col = collection("architecture")
    wall = M.plaster((0.60, 0.54, 0.46), "plaster_wall")
    ceil_mat = M.plaster((0.66, 0.61, 0.54), "plaster_ceiling")
    frame = M.powder_coat()
    teak = M.wood()

    # floor slab + terracotta tiles
    box("floor", (RAIL_X + 0.2 - FACADE_X, FAR_Y - NEAR_Y, 0.2),
        ((RAIL_X + 0.2 + FACADE_X) / 2, (FAR_Y + NEAR_Y) / 2, -0.1), M.terracotta_tiles(), col)
    # terracotta skirting along the walls
    sk = M.terracotta_tiles(0.6)
    box("skirting_far", (RAIL_X - FACADE_X, 0.012, 0.09), ((RAIL_X + FACADE_X) / 2, FAR_Y - 0.006, 0.045), sk, col, bevel=0.002)

    # far end wall
    box("wall_far", (RAIL_X + 0.2 - FACADE_X + 0.25, 0.25, CEIL_Z), ((RAIL_X + 0.2 + FACADE_X - 0.25) / 2, FAR_Y + 0.125, CEIL_Z / 2), wall, col, bevel=0.01)
    # near end wall (behind camera; it bounces light and shows in the glass)
    box("wall_near", (RAIL_X + 0.2 - FACADE_X + 0.25, 0.25, CEIL_Z), ((RAIL_X + 0.2 + FACADE_X - 0.25) / 2, NEAR_Y - 0.125, CEIL_Z / 2), wall, col)

    # ceiling slab with a drop beam along the railing edge
    box("ceiling", (RAIL_X + 0.3 - FACADE_X + 0.25, FAR_Y - NEAR_Y + 0.5, 0.25), ((RAIL_X + 0.3 + FACADE_X - 0.25) / 2, (FAR_Y + NEAR_Y) / 2, CEIL_Z + 0.125), ceil_mat, col)
    box("beam", (0.3, FAR_Y - NEAR_Y + 0.5, 0.32), (RAIL_X + 0.05, (FAR_Y + NEAR_Y) / 2, CEIL_Z - 0.16), wall, col, bevel=0.012)
    trim = M.matte((0.75, 0.73, 0.7), 0.4, "downlight_trim")
    lens = M.matte((0.05, 0.05, 0.05), 0.2, "downlight_lens")
    for yy in (-1.6, -0.1, 1.5, 3.1, 4.7):
        cylinder(f"downlight_{yy}", 0.055, 0.01, (0.05, yy, CEIL_Z - 0.004), trim, col, verts=32)
        cylinder(f"downlight_lens_{yy}", 0.035, 0.012, (0.05, yy, CEIL_Z - 0.006), lens, col, verts=32)
    # structural column breaking the long view
    box("column", (0.28, 0.28, CEIL_Z), (RAIL_X + 0.02, 3.3, CEIL_Z / 2), wall, col, bevel=0.012)

    # facade wall with two openings for sliding glass doors
    openings = [(0.55, 2.85), (3.75, 5.75)]
    wx, wt = FACADE_X - 0.13, 0.26
    solids = [(NEAR_Y, openings[0][0]), (openings[0][1], openings[1][0]), (openings[1][1], FAR_Y)]
    for i, (y0, y1) in enumerate(solids):
        box(f"facade_{i}", (wt, y1 - y0, CEIL_Z), (wx, (y0 + y1) / 2, CEIL_Z / 2), wall, col, bevel=0.01)
    for i, (y0, y1) in enumerate(openings):
        box(f"facade_head_{i}", (wt, y1 - y0, CEIL_Z - DOOR_H), (wx, (y0 + y1) / 2, (CEIL_Z + DOOR_H) / 2), wall, col, bevel=0.01)
        _sliding_door(col, y0, y1, frame)

    # railing: low plaster upstand + stone coping + bronze balusters + teak handrail
    box("upstand", (0.22, FAR_Y - NEAR_Y, 0.16), (RAIL_X + 0.06, (FAR_Y + NEAR_Y) / 2, 0.08), wall, col, bevel=0.008)
    box("coping", (0.27, FAR_Y - NEAR_Y, 0.045), (RAIL_X + 0.06, (FAR_Y + NEAR_Y) / 2, 0.1825), M.stone(), col, bevel=0.006)
    bronze = M.metal((0.12, 0.085, 0.05), 0.35, "bronze_rail")
    y = NEAR_Y + 0.06
    while y < FAR_Y - 0.05:
        if not (3.12 < y < 3.48):
            box(f"baluster_{y:.2f}", (0.016, 0.016, 0.78), (RAIL_X + 0.04, y, 0.205 + 0.39), bronze, col, bevel=0.002)
        y += 0.115
    box("rail_bottom", (0.03, FAR_Y - NEAR_Y, 0.012), (RAIL_X + 0.04, (FAR_Y + NEAR_Y) / 2, 0.23), bronze, col, bevel=0.002)
    box("rail_flat", (0.04, FAR_Y - NEAR_Y, 0.012), (RAIL_X + 0.04, (FAR_Y + NEAR_Y) / 2, 0.985), bronze, col, bevel=0.002)
    box("handrail", (0.075, FAR_Y - NEAR_Y, 0.055), (RAIL_X + 0.04, (FAR_Y + NEAR_Y) / 2, 1.02), teak, col, bevel=0.012, segments=4)
    return col


def _sliding_door(col, y0, y1, frame):
    """Two aluminium-framed glass panels in a perimeter frame, slightly ajar."""
    x = FACADE_X - 0.06
    w = y1 - y0
    p = 0.05  # profile
    box(f"door_head_{y0}", (0.1, w, p), (x, (y0 + y1) / 2, DOOR_H - p / 2), frame, col, bevel=0.003)
    box(f"door_sill_{y0}", (0.12, w, 0.025), (x, (y0 + y1) / 2, 0.0125), frame, col, bevel=0.003)
    for yy in (y0 + p / 2, y1 - p / 2):
        box(f"door_jamb_{y0}_{yy:.2f}", (0.1, p, DOOR_H), (x, yy, DOOR_H / 2), frame, col, bevel=0.003)
    g = M.glass()
    half = (w - 2 * p) / 2 + 0.03
    for i, (yc, dx) in enumerate(((y0 + p + half / 2, -0.03), (y1 - p - half / 2 - 0.12, 0.03))):
        h = DOOR_H - 0.06
        for (sy, sz, oy, oz) in ((0.045, h, -half / 2 + 0.0225, 0), (0.045, h, half / 2 - 0.0225, 0),
                                 (half, 0.06, 0, h / 2 - 0.03), (half, 0.09, 0, -h / 2 + 0.045)):
            box(f"panel_{y0}_{i}_{oy:.2f}_{oz:.2f}", (0.045, sy, sz), (x + dx, yc + oy, 0.03 + h / 2 + oz), frame, col, bevel=0.003)
        box(f"glass_{y0}_{i}", (0.008, half - 0.08, h - 0.14), (x + dx, yc, 0.03 + h / 2 - 0.015), g, col)


def build_interior():
    """The room behind the glass: dim, warm, believable silhouettes. Mostly
    seen through reflections, so it stays simple."""
    col = collection("interior")
    floor = M.wood((0.09, 0.05, 0.03), (0.2, 0.11, 0.06), 0.35, 3.0, "oak_floor")
    wall = M.plaster((0.5, 0.45, 0.39), "plaster_interior")
    box("room_floor", (5.0, FAR_Y - NEAR_Y, 0.05), (FACADE_X - 2.7, (FAR_Y + NEAR_Y) / 2, -0.025), floor, col)
    box("room_back", (0.1, FAR_Y - NEAR_Y, CEIL_Z), (FACADE_X - 5.2, (FAR_Y + NEAR_Y) / 2, CEIL_Z / 2), wall, col)
    box("room_ceiling", (5.0, FAR_Y - NEAR_Y, 0.05), (FACADE_X - 2.7, (FAR_Y + NEAR_Y) / 2, CEIL_Z + 0.02), wall, col)
    for yy in (NEAR_Y, FAR_Y):  # close the room so no ray escapes through the glass
        box(f"room_end_{yy}", (5.0, 0.1, CEIL_Z), (FACADE_X - 2.7, yy, CEIL_Z / 2), wall, col)
    sofa = M.matte((0.32, 0.29, 0.25), 0.9, "sofa_fabric")
    box("sofa_base", (0.9, 2.2, 0.42), (FACADE_X - 4.4, 1.7, 0.21), sofa, col, bevel=0.06, segments=4)
    box("sofa_back", (0.25, 2.2, 0.45), (FACADE_X - 4.75, 1.7, 0.6), sofa, col, bevel=0.08, segments=4)
    box("console", (0.4, 1.4, 0.75), (FACADE_X - 4.9, 4.6, 0.375), M.wood(), col, bevel=0.01)
    cylinder("lamp_shade", 0.18, 0.28, (FACADE_X - 4.9, 4.4, 1.05), M.emissive((1.0, 0.8, 0.55), 2.5, "lamp_glow"), col)
    # sheer curtains inside, pulled to the sides of each opening
    sheer = _sheer()
    for i, yc in enumerate((0.75, 5.55)):
        _curtain(f"inner_curtain_{i}", col, sheer, FACADE_X - 0.32, yc, 0.38, DOOR_H + 0.3, seed=i + 3)
    return col


def _sheer():
    from .nodes import Tree
    t = Tree("sheer_linen")
    co = t.coords("Object", scale=(1, 900, 900))
    w1 = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 1.0, "Distortion": 0.4}, wave_type="BANDS", bands_direction="Y")
    w2 = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": 1.0, "Distortion": 0.4}, wave_type="BANDS", bands_direction="Z")
    h = t.math("MULTIPLY", (w1, "Fac"), (w2, "Fac"))
    bump = t.bump(h, 0.15, 0.0006)
    base = (0.78, 0.74, 0.66)
    p = t.principled(base, 0.85, bump, Sheen_Weight=0.4, Subsurface_Weight=0.0)
    tr = t.node("ShaderNodeBsdfTranslucent", {"Color": base})
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, 0.45)
    t.link(p, mix.inputs[1])
    t.link(tr, mix.inputs[2])
    return t.surface(mix)


def _curtain(name, col, mat, x, yc, width, height, seed=1, folds=9, depth=0.05):
    """A hanging fabric panel with soft vertical folds and a gentle hem sway."""
    rng = Rng(seed)
    bm = bmesh.new()
    nu, nv = folds * 8, 24
    phases = [rng.uniform(0, 6.28) for _ in range(3)]
    verts = []
    for j in range(nv + 1):
        v = j / nv
        z = height * (1 - v)
        row = []
        for i in range(nu + 1):
            u = i / nu
            yy = yc - width / 2 + u * width
            fold = math.sin(u * folds * 2 * math.pi + phases[0]) * depth * (0.6 + 0.4 * v)
            fold += math.sin(u * folds * 5.1 + phases[1]) * depth * 0.2
            row.append(bm.verts.new((x + fold, yy, z)))
        verts.append(row)
    for j in range(nv):
        for i in range(nu):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    obj = mesh_object(name, bm, mat, col, smooth=True)
    s = obj.modifiers.new("solid", "SOLIDIFY")
    s.thickness = 0.002
    return obj


# ---------------------------------------------------------------------------

def build_landscape():
    """What you see past the railing from the 7th floor: a canopy of trees,
    low-rise roofs, a distant city and layered hills in morning haze."""
    col = collection("landscape")
    rng = Rng(42)
    haze = (0.60, 0.56, 0.50)
    ground_z = -24.0

    # ground + canopy floor
    ground = M.hazed((0.06, 0.07, 0.035), 0.95, haze, 1.0, 650.0, "ground", 0.3, 0.03)
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=60, y_segments=60, size=1500)
    for v in bm.verts:
        v.co.x += 1500
        v.co.z = ground_z
    mesh_object("ground", bm, ground, col)

    # trees: a few variant meshes, instanced
    leaf_cols = [(0.035, 0.06, 0.018), (0.05, 0.075, 0.022), (0.06, 0.07, 0.025), (0.04, 0.055, 0.02)]
    tree_mats = [M.hazed(c, 0.85, haze, 1.0, 700.0, f"canopy_{i}", 0.25, 0.4) for i, c in enumerate(leaf_cols)]
    variants = []
    for k in range(6):
        bm = bmesh.new()
        r = rng.uniform(3.0, 5.5)
        for _ in range(9):
            o = Vector((rng.uniform(-r, r) * 0.6, rng.uniform(-r, r) * 0.6, rng.uniform(0, r * 0.9)))
            res = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rng.uniform(r * 0.45, r * 0.75))
            for v in res["verts"]:
                v.co += o
                v.co += Vector((rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)))
        me = bpy.data.meshes.new(f"tree_{k}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(tree_mats[k % len(tree_mats)])
        variants.append((me, r))
    n = 0
    for _ in range(2600):
        x = rng.uniform(25, 900) ** 1.0
        y = rng.uniform(-500, 700)
        if x < 60 and y > 40:
            continue
        me, r = variants[int(rng.random() * len(variants)) % len(variants)]
        o = bpy.data.objects.new(f"tree_{n}", me)
        o.location = (x, y, ground_z + rng.uniform(-1, 1))
        s = rng.uniform(0.8, 1.6)
        o.scale = (s, s, s * rng.uniform(0.85, 1.25))
        o.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        col.objects.link(o)
        n += 1

    # low-rise roofs between the trees
    roof_cols = [(0.32, 0.27, 0.22), (0.36, 0.33, 0.29), (0.25, 0.16, 0.11), (0.4, 0.38, 0.35)]
    for i in range(140):
        x = rng.uniform(70, 900)
        y = rng.uniform(-400, 600)
        w, d, h = rng.uniform(8, 22), rng.uniform(8, 22), rng.uniform(6, 20)
        m = M.hazed(rng.choice(roof_cols), 0.8, haze, 1.0, 700.0, f"roof_{i % 4}", 0.2, 0.2)
        b = box(f"house_{i}", (w, d, h), (x, y, ground_z + h / 2), m, col)
        b.rotation_euler = (0, 0, rng.uniform(-0.4, 0.4))

    # distant city: towers with faint window grids
    for i in range(70):
        x = rng.uniform(1300, 2600)
        y = rng.uniform(-900, 1400)
        w, h = rng.uniform(25, 60), rng.uniform(40, 140)
        m = M.hazed((0.42, 0.40, 0.37) if i % 3 else (0.3, 0.32, 0.34), 0.5, haze, 1.0, 1100.0, f"tower_{i % 3}", 0.15, 0.05)
        box(f"tower_{i}", (w, w * rng.uniform(0.6, 1.2), h), (x, y, ground_z + h / 2), m, col)

    # layered hills
    for layer, (dist, height, hz) in enumerate(((3200, 260, 1500.0), (5200, 520, 1900.0), (8000, 900, 2600.0))):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=80, y_segments=160, size=1.0)
        for v in bm.verts:
            u, w = v.co.x + 0.5, v.co.y + 0.5
            yy = -6000 + w * 14000
            xx = dist + u * 900
            hgt = height * (0.45 + 0.35 * math.sin(yy / 900 + layer * 2) + 0.2 * math.sin(yy / 310 + layer)) * math.sin(u * math.pi)
            v.co = Vector((xx, yy, ground_z + max(hgt, 0)))
        green = [(0.05, 0.065, 0.03), (0.06, 0.07, 0.04), (0.08, 0.085, 0.07)][layer]
        mesh_object(f"hills_{layer}", bm, M.hazed(green, 0.9, haze, 1.0, hz, f"hill_{layer}", 0.2, 0.002), col, smooth=True)
    return col


# ---------------------------------------------------------------------------

def build_lighting(sun_strength=6.5, sky_strength=0.42):
    sc = bpy.context.scene
    world = bpy.data.worlds.new("sky")
    sc.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "MULTIPLE_SCATTERING"
    sky.sun_disc = False
    sky.sun_elevation = SUN_ELEVATION * DEG
    # sky texture: rotation 0 = sun toward -Y? we match it to our azimuth convention
    sky.sun_rotation = (180.0 - SUN_AZIMUTH) * DEG
    sky.air_density = 1.4
    sky.aerosol_density = 3.0
    sky.altitude = 30.0
    bg.inputs["Strength"].default_value = sky_strength
    nt.links.new(sky.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])

    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = sun_strength
    sun_data.angle = 0.6 * DEG
    sun_data.color = (1.0, 0.86, 0.68)
    sun = bpy.data.objects.new("sun", sun_data)
    d = sun_direction()
    sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(sun)
    return sun


def build_camera(width=1080, height=2340):
    sc = bpy.context.scene
    cam_data = bpy.data.cameras.new("camera")
    cam_data.lens_unit = "FOV"
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = 72.0 * DEG
    cam_data.shift_y = -0.1
    cam_data.clip_start = 0.05
    cam_data.clip_end = 20000
    cam = bpy.data.objects.new("camera", cam_data)
    cam.location = (0.05, -2.45, 1.55)
    cam.rotation_euler = (90 * DEG, 0, -4.5 * DEG)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    return cam


def configure_render(samples=128, preview=False):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02 if preview else 0.008
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 8
    sc.cycles.diffuse_bounces = 4
    sc.cycles.glossy_bounces = 4
    sc.cycles.transmission_bounces = 8
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.threads_mode = "AUTO"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Base Contrast"
    sc.view_settings.exposure = 0.0
    sc.render.film_transparent = False


def build_all(width=1080, height=2340):
    build_architecture()
    build_interior()
    build_landscape()
    build_lighting()
    build_camera(width, height)
