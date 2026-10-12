"""The focus room: an enclosed bedroom, 3.6 × 5.2 m, 2.9 m high.

Coordinates (metres): camera near the near wall at y ≈ -2.4 looking +Y.
Left wall (x = -1.8) holds the window at its far end; right wall (x = +1.8)
the door at its far end; the far wall (y = +2.6) is the art wall; the near
wall is behind the camera. The bed stands along the left wall with its
headboard on the far wall, beside the window.
"""
import math
import bmesh
import bpy
from mathutils import Vector

from . import materials as M
from . import textiles, lighting, trees, ground
from .common import DEG, Rng, box, collection, cylinder, mesh_object
from .nodes import Tree as NodeTree

HW, HD, H = 1.8, 2.6, 2.9  # half width, half depth, height
WIN = (0.75, 2.35, 0.85, 2.35)  # y0, y1, sill z, head z  (on the left wall)
DOOR = (1.5, 2.4, 2.1)        # y0, y1, height (on the right wall)

# sun azimuths so the light comes in through the left-wall window
AZIMUTH = {"morning": 262.0, "afternoon": 240.0, "sunset": 285.0}


def oak_floor():
    """Oak planks: per-plank grain offset and tone, fine gaps, soft sheen."""
    key = "oak_floor"
    if key in M._cache:
        return M._cache[key]
    t = NodeTree("oak_floor")
    co = t.coords("Object")
    brick = t.node("ShaderNodeTexBrick", {"Vector": co, "Scale": 1.0, "Mortar Size": 0.004, "Mortar Smooth": 0.2, "Bias": 0.0,
                                          "Brick Width": 1.6, "Row Height": 0.14}, offset=0.47, offset_frequency=2, squash=1.0, squash_frequency=1)
    plank_rand = (brick, "Color")  # per-brick random colour 0..1
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(co, sep.inputs[0])
    shifted = t.node("ShaderNodeCombineXYZ")
    t.set(shifted, "X", t.math("ADD", (sep, "X"), t.math("MULTIPLY", t.node("ShaderNodeSeparateColor", {"Color": plank_rand}), 7.0)))
    t.set(shifted, "Y", t.math("MULTIPLY", (sep, "Y"), 1.0))
    grain = t.node("ShaderNodeTexWave", {"Vector": shifted, "Scale": 2.2, "Distortion": 2.5, "Detail": 5.0, "Detail Scale": 2.0, "Detail Roughness": 0.6},
                   wave_type="BANDS", bands_direction="Y")
    fibres = t.noise(t.coords("Object", scale=(2, 90, 90)), scale=5, detail=8)
    g = t.math("ADD", t.math("MULTIPLY", (grain, "Fac"), 0.7), t.math("MULTIPLY", (fibres, "Fac"), 0.3))
    light, dark = (0.45, 0.3, 0.17), (0.22, 0.13, 0.06)
    col = t.ramp(g, [(0.2, dark), (0.85, light)])
    tone = t.node("ShaderNodeSeparateColor", {"Color": plank_rand})
    col = t.mix_color(t.math("MULTIPLY", (tone, "Red"), 0.3), col, tuple(c * 0.75 for c in light))
    col = t.mix_color(t.map_range((brick, "Fac"), 0.5, 1.0, 0.0, 1.0), col, (0.08, 0.05, 0.03))
    wear = t.noise(co, scale=0.6, detail=3)
    rough = t.map_range(wear, 0.35, 0.65, 0.22, 0.38)
    bump = t.bump(t.math("ADD", t.math("MULTIPLY", (fibres, "Fac"), 0.3), t.math("MULTIPLY", (brick, "Fac"), 1.0)), strength=0.25, distance=0.004)
    mat = t.surface(t.principled(col, rough, bump, Coat_Weight=0.35, Coat_Roughness=0.3))
    M._cache[key] = mat
    return mat


def window_glass():
    """Glass that lets light through: transparent to shadow rays, so the
    sun and sky reach the room without caustics."""
    key = "window_glass"
    if key in M._cache:
        return M._cache[key]
    t = NodeTree("window_glass")
    glass = t.principled((0.95, 0.98, 0.97), 0.0, None, Transmission_Weight=1.0, IOR=1.5)
    clear = t.node("ShaderNodeBsdfTransparent")
    lp = t.node("ShaderNodeLightPath")
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, (lp, "Is Shadow Ray"))
    t.link(glass, mix.inputs[1])
    t.link(clear, mix.inputs[2])
    mat = t.surface(mix)
    M._cache[key] = mat
    return mat


def painted_wood(color=(0.86, 0.84, 0.78), name="painted_wood"):
    key = f"painted::{name}"
    if key in M._cache:
        return M._cache[key]
    t = NodeTree(name)
    n = t.noise(t.coords("Object"), scale=120, detail=4)
    grain = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(0.3, 20, 20)), "Scale": 3.0, "Distortion": 4.0}, wave_type="BANDS", bands_direction="X")
    h = t.math("ADD", t.math("MULTIPLY", (n, "Fac"), 0.6), t.math("MULTIPLY", (grain, "Fac"), 0.4))
    mat = t.surface(t.principled(color, t.map_range(n, 0.3, 0.7, 0.3, 0.45), t.bump(h, 0.08, 0.002)))
    M._cache[key] = mat
    return mat


def build_architecture(state):
    col = collection("architecture")
    wall = M.plaster((0.84, 0.80, 0.72), "room_plaster")
    ceil = M.plaster((0.9, 0.88, 0.84), "room_ceiling")
    trim = painted_wood((0.88, 0.86, 0.8), "trim_paint")
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "door_teak")
    t = 0.2
    box("floor", (2 * HW + 0.4, 2 * HD + 0.4, 0.2), (0, 0, -0.1), oak_floor(), col)
    box("ceiling", (2 * HW + 0.4, 2 * HD + 0.4, 0.2), (0, 0, H + 0.1), ceil, col)
    box("wall_far", (2 * HW + 0.4, t, H), (0, HD + t / 2, H / 2), wall, col)
    box("wall_near", (2 * HW + 0.4, t, H), (0, -HD - t / 2, H / 2), wall, col)
    # left wall with the window opening
    wx = -HW - t / 2
    y0, y1, sz, hz = WIN
    box("wall_l_a", (t, y0 + HD, H), (wx, (y0 - HD) / 2, H / 2), wall, col)
    box("wall_l_b", (t, HD - y1, H), (wx, (y1 + HD) / 2, H / 2), wall, col)
    box("wall_l_sill", (t, y1 - y0, sz), (wx, (y0 + y1) / 2, sz / 2), wall, col)
    box("wall_l_head", (t, y1 - y0, H - hz), (wx, (y0 + y1) / 2, (H + hz) / 2), wall, col)
    # right wall with the door opening
    rx = HW + t / 2
    d0, d1, dh = DOOR
    box("wall_r_a", (t, d0 + HD, H), (rx, (d0 - HD) / 2, H / 2), wall, col)
    box("wall_r_b", (t, HD - d1, H), (rx, (d1 + HD) / 2, H / 2), wall, col)
    box("wall_r_head", (t, d1 - d0, H - dh), (rx, (d0 + d1) / 2, (H + dh) / 2), wall, col)
    # baseboards and a slim cornice
    for name, size, loc in (("base_far", (2 * HW, 0.018, 0.11), (0, HD - 0.009, 0.055)),
                            ("base_l_a", (0.018, y0 + HD, 0.11), (-HW + 0.009, (y0 - HD) / 2, 0.055)),
                            ("base_l_b", (0.018, 2 * HD - y0 - HD, 0.11), (-HW + 0.009, (y0 + HD) / 2, 0.055)),
                            ("base_r_a", (0.018, d0 + HD, 0.11), (HW - 0.009, (d0 - HD) / 2, 0.055)),
                            ("base_r_b", (0.018, HD - d1, 0.11), (HW - 0.009, (d1 + HD) / 2, 0.055)),
                            ("base_near", (2 * HW, 0.018, 0.11), (0, -HD + 0.009, 0.055)),
                            ("cornice_far", (2 * HW, 0.05, 0.05), (0, HD - 0.025, H - 0.025)),
                            ("cornice_l", (0.05, 2 * HD, 0.05), (-HW + 0.025, 0, H - 0.025)),
                            ("cornice_r", (0.05, 2 * HD, 0.05), (HW - 0.025, 0, H - 0.025)),
                            ("cornice_near", (2 * HW, 0.05, 0.05), (0, -HD + 0.025, H - 0.025))):
        box(name, size, loc, trim, col, bevel=0.003)

    # the window: frame, four panes, sill board, curtains
    fw = 0.06
    box("win_sill_board", (0.16, y1 - y0 + 0.16, 0.035), (-HW + 0.02, (y0 + y1) / 2, sz + 0.0175), trim, col, bevel=0.004)
    for name, size, loc in (("win_top", (fw, y1 - y0, fw), (-HW - 0.04, (y0 + y1) / 2, hz - fw / 2)),
                            ("win_bottom", (fw, y1 - y0, fw), (-HW - 0.04, (y0 + y1) / 2, sz + 0.035 + fw / 2)),
                            ("win_jamb_a", (fw, fw, hz - sz), (-HW - 0.04, y0 + fw / 2, (sz + hz) / 2)),
                            ("win_jamb_b", (fw, fw, hz - sz), (-HW - 0.04, y1 - fw / 2, (sz + hz) / 2)),
                            ("win_mullion", (fw * 0.7, fw * 0.7, hz - sz), (-HW - 0.04, (y0 + y1) / 2, (sz + hz) / 2)),
                            ("win_transom", (fw * 0.7, y1 - y0, fw * 0.7), (-HW - 0.04, (y0 + y1) / 2, (sz + hz) / 2 + 0.2))):
        box(name, size, loc, trim, col, bevel=0.003)
    box("win_glass", (0.006, y1 - y0 - fw, hz - sz - fw), (-HW - 0.04, (y0 + y1) / 2, (sz + hz) / 2 + 0.02), window_glass(), col)
    sheer = textiles.linen("curtain_linen", (0.76, 0.7, 0.6), 0.6)
    from .scene import _curtain
    _curtain("curtain_a", col, sheer, -HW + 0.09, y0 - 0.18, 0.5, H - 0.12, seed=3, folds=5, depth=0.04)
    _curtain("curtain_b", col, sheer, -HW + 0.09, y1 + 0.18, 0.5, H - 0.12, seed=4, folds=5, depth=0.04)
    cylinder("curtain_rod", 0.012, y1 - y0 + 1.0, (-HW + 0.1, (y0 + y1) / 2, H - 0.1), M.metal((0.5, 0.33, 0.1), 0.3, "brass"), col, verts=12).rotation_euler = (90 * DEG, 0, 0)

    # the door: panelled teak with a brass lever, slightly ajar
    dx = HW - 0.02
    box("door_frame_a", (0.1, 0.06, dh + 0.03), (dx, d0 - 0.03, (dh + 0.03) / 2), trim, col, bevel=0.003)
    box("door_frame_b", (0.1, 0.06, dh + 0.03), (dx, d1 + 0.03, (dh + 0.03) / 2), trim, col, bevel=0.003)
    box("door_frame_top", (0.1, d1 - d0 + 0.12, 0.06), (dx, (d0 + d1) / 2, dh + 0.03), trim, col, bevel=0.003)
    door = bpy.data.objects.new("door_root", None)
    col.objects.link(door)
    door.location = (HW - 0.03, d0, 0)
    door.rotation_euler = (0, 0, 0)  # closed
    dw = d1 - d0
    leaf = box("door_leaf", (0.04, dw, dh), (0, dw / 2, dh / 2), teak, col, bevel=0.004)
    leaf.parent = door
    for i, (zc, ph) in enumerate(((1.55, 0.75), (0.65, 0.75))):
        p = box(f"door_panel_{i}", (0.012, dw - 0.22, ph), (-0.026, dw / 2, zc), teak, col, bevel=0.004)
        p.parent = door
    brass = M.metal((0.5, 0.33, 0.1), 0.3, "brass")
    lever = cylinder("door_lever", 0.011, 0.12, (-0.08, dw - 0.09, 1.02), brass, col, verts=12)
    lever.rotation_euler = (90 * DEG, 0, 0)
    lever.parent = door
    rose = cylinder("door_rose", 0.03, 0.01, (-0.045, dw - 0.09, 1.02), brass, col, verts=24)
    rose.rotation_euler = (0, 90 * DEG, 0)
    rose.parent = door
    return col


def build_bed(state):
    """A low teak platform bed with an upholstered headboard, a draped
    linen sheet, two pillows and a folded throw at the foot."""
    col = collection("bed")
    rng = Rng(5)
    teak = M.wood((0.11, 0.055, 0.025), (0.32, 0.17, 0.08), 0.4, 5.0, "bed_teak")
    linen = textiles.linen("bed_linen", (0.82, 0.78, 0.7), 0.4)
    head_linen = textiles.linen("headboard_linen", (0.5, 0.45, 0.36), 0.3)
    throw = textiles.handloom_stripes("bed_throw", ((0.6, 0.42, 0.15), (0.72, 0.68, 0.58), (0.14, 0.06, 0.03)), 0.035)
    cx, cy = -1.0, 1.6  # bed centre; 1.5 × 2.0
    bw, bl = 1.5, 2.0
    box("bed_frame", (bw + 0.1, bl + 0.06, 0.22), (cx, cy, 0.19), teak, col, bevel=0.01)
    for x in (-bw / 2 + 0.1, bw / 2 - 0.1):
        for y in (-bl / 2 + 0.12, bl / 2 - 0.12):
            box(f"bed_leg_{x}_{y}", (0.08, 0.08, 0.1), (cx + x, cy + y, 0.05), teak, col, bevel=0.004)
    box("headboard", (bw + 0.1, 0.06, 1.05), (cx, HD - 0.035, 0.525), teak, col, bevel=0.006)
    box("headboard_pad", (bw - 0.1, 0.05, 0.6), (cx, HD - 0.09, 0.78), head_linen, col, bevel=0.02, segments=4)
    mat = box("mattress", (bw, bl, 0.22), (cx, cy, 0.41), linen, col, bevel=0.05, segments=4)
    # the sheet: a subdivided slab over the mattress, wrinkled by noise
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=50, y_segments=66, size=1.0)
    for v in bm.verts:
        # create_grid spans -1..1, so halve the size factors
        v.co = Vector((cx + v.co.x * (bw + 0.16) / 2, cy - 0.08 + v.co.y * bl / 2, 0.525))
    sheet = mesh_object("sheet", bm, linen, col, smooth=True)
    sub = sheet.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 2
    disp = sheet.modifiers.new("wrinkles", "DISPLACE")
    tex = bpy.data.textures.new("sheet_wrinkles", "CLOUDS")
    tex.noise_scale = 0.22
    tex.noise_depth = 3
    disp.texture = tex
    disp.strength = 0.03
    disp.mid_level = 0.5
    sol = sheet.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = 0.004
    # drape over the sides: pull edge rows down
    for v in sheet.data.vertices:
        if abs(v.co.x - cx) > bw / 2 - 0.02:
            v.co.z -= 0.18 * min(1.0, (abs(v.co.x - cx) - bw / 2 + 0.02) / 0.1)
    # pillows
    pillow = textiles.linen("pillow_linen", (0.86, 0.83, 0.76), 0.5)
    for i, x in enumerate((-0.36, 0.36)):
        p = box(f"pillow_{i}", (0.62, 0.42, 0.14), (cx + x, HD - 0.33, 0.6), pillow, col, bevel=0.06, segments=5)
        p.rotation_euler = (-0.35, 0, rng.uniform(-0.08, 0.08))
        d = p.modifiers.new("soft", "DISPLACE")
        d.texture = tex
        d.strength = 0.02
    # the folded throw at the foot
    for i in range(3):
        box(f"throw_{i}", (bw - 0.2 - i * 0.05, 0.42 - i * 0.04, 0.03), (cx, cy - bl / 2 + 0.3, 0.55 + i * 0.03), throw, col, bevel=0.012, segments=3)
    return col


def build_outside(state):
    """What the window shows: lawn, a flowering tree, hedges and hazed hills."""
    col = collection("landscape")
    haze = lighting.HAZE[state]
    wet = lighting.wet(state)
    terr = ground.terrain(col, size=(60.0, 60.0), origin=(-32.1, 10.0), wet=wet)
    terr.location = (0, 0, -0.15)
    t = trees.frangipani(col, seed=7, height=3.2)
    t.location = (-4.8, 3.6, -0.15)
    t2 = trees.neem_tree(col, seed=9, height=6.5, density=0.3)
    t2.location = (-9.0, 7.0, -0.15)
    for i, (x, y) in enumerate(((-3.6, 1.2), (-5.0, 0.4), (-4.2, 5.8))):
        s = trees.shrub(col, seed=60 + i, radius=0.6, height=0.8, leaf_size=0.05, flower=(0.9, 0.12, 0.45) if i == 1 else None, flower_density=0.4, name=f"out_shrub_{i}")
        s.location = (x, y, -0.15)
    h = trees.hedge(col, length=14.0, height=1.4, depth=0.8, seed=19, name="out_hedge")
    h.location = (-8.0, 11.0, -0.15)
    rng = Rng(3)
    mats = [M.hazed(c, 0.85, haze, 0.7, 500.0, f"out_canopy_{i}_{state}", 0.25, 0.4) for i, c in enumerate(((0.03, 0.06, 0.018), (0.05, 0.075, 0.022)))]
    for i in range(90):
        bm = bmesh.new()
        r = rng.uniform(2.5, 4.5)
        for _ in range(6):
            res = bmesh.ops.create_icosphere(bm, subdivisions=3, radius=rng.uniform(r * 0.5, r * 0.8))
            for v in res["verts"]:
                v.co += Vector((rng.uniform(-r, r) * 0.5, rng.uniform(-r, r) * 0.5, rng.uniform(0, r * 0.8)))
        for f in bm.faces:
            f.smooth = True
        o = mesh_object(f"out_tree_{i}", bm, mats[i % 2], col)
        o.location = (-14 - rng.uniform(0, 90), rng.uniform(-30, 60), -0.5)
    for layer, (dist, height, hz) in enumerate(((900, 70, 700.0), (1800, 160, 1200.0))):
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=40, y_segments=100, size=1.0)
        for v in bm.verts:
            u, w = v.co.x + 0.5, v.co.y + 0.5
            yy = -2500 + w * 5000
            xx = -(dist + u * 400)
            hgt = height * (0.5 + 0.35 * math.sin(yy / 420 + layer) + 0.15 * math.sin(yy / 150)) * math.sin(u * math.pi)
            v.co = Vector((xx, yy, -0.5 + max(hgt, 0)))
        mesh_object(f"out_hills_{layer}", bm, M.hazed((0.05, 0.065, 0.035), 0.9, tuple(min(1, c * 1.1) for c in haze), 1.2, hz, f"out_hill_{layer}_{state}", 0.2, 0.002), col, smooth=True)
    return col


def lamps_on(state):
    """Indoors the lamps also come on for rain: an overcast sky through one
    window leaves the room nearly black."""
    return lighting.lamps_on(state) or state == "rain"


def build_lamps(state):
    """Interior lighting for the dark states: a warm bedside lamp glow is
    part of the bedside lamp item; here the ceiling pendant's light."""
    col = collection("interior")
    if lamps_on(state):
        lighting.point_lamp(col, "ceiling_light", (0.2, 0.3, H - 0.35), energy=60.0, color=(1.0, 0.8, 0.6), radius=0.15)
        glow = M.emissive((1.0, 0.85, 0.65), 4.0, "pendant_glow")
        cylinder("pendant_shade", 0.16, 0.16, (0.2, 0.3, H - 0.35), M.matte((0.9, 0.86, 0.78), 0.6, "shade_paper"), col, verts=32)
        cylinder("pendant_bulb", 0.03, 0.05, (0.2, 0.3, H - 0.38), glow, col, verts=12)
    else:
        cylinder("pendant_shade", 0.16, 0.16, (0.2, 0.3, H - 0.35), M.matte((0.9, 0.86, 0.78), 0.6, "shade_paper"), col, verts=32)
    cylinder("pendant_cord", 0.004, 0.3, (0.2, 0.3, H - 0.15), M.powder_coat(), col, verts=8)
    return col


def build_camera(width=1080, height=2340):
    sc = bpy.context.scene
    cam_data = bpy.data.cameras.new("camera")
    cam_data.lens_unit = "FOV"
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = 92.0 * DEG
    cam_data.shift_y = 0.02
    cam_data.clip_start = 0.05
    cam_data.clip_end = 20000
    cam = bpy.data.objects.new("camera", cam_data)
    cam.location = (0.55, -2.4, 1.45)
    cam.rotation_euler = (85 * DEG, 0, 7.0 * DEG)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    return cam


def build_all(width=1080, height=2340, state="morning"):
    build_architecture(state)
    build_bed(state)
    build_outside(state)
    build_lamps(state)
    lighting.build(state, AZIMUTH, sky_scale=1.7)
    build_camera(width, height)


EXPOSURE = {"morning": 2.25, "afternoon": 1.8, "sunset": 1.9, "evening": 1.8, "night": 1.9, "rain": 2.1}


def configure_render(samples=128, preview=False, state="morning"):
    from .scene import configure_render as cr
    cr(samples, preview)
    sc = bpy.context.scene
    sc.view_settings.exposure = EXPOSURE.get(state, 1.2)
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.diffuse_bounces = 6
    sc.cycles.max_bounces = 12
    try:
        sc.cycles_curves.shape = "RIBBONS"
    except AttributeError:
        pass
