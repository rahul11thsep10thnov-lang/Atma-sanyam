"""Render the tree prototypes with the production method (Blender Cycles,
transparent PNG sprites at the same 22 degree elevation).

    python render_proto.py --out OUT [--only mango,neem] [--stages 1-7] [--samples 24] [--px 640] [--detail]

Writes OUT/<species>_<stage>.png (and, with --detail, <species>_close.png / _trunk.png).
Nothing here touches assets/paradise.
"""
import argparse, math, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
from PIL import Image
import numpy as np

import trees_v3 as T
from focusbalcony import lighting
from focusbalcony import materials as M
from focusbalcony.common import DEG, clear_scene, collection
from focusbalcony.scene import configure_render

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--only", default="mango,banana,peepal,coconut,banyan,deodar,palm")
ap.add_argument("--stages", default="1-7")
ap.add_argument("--samples", type=int, default=24)
ap.add_argument("--px", type=int, default=640)
ap.add_argument("--detail", action="store_true")
args = ap.parse_args()
OUT = pathlib.Path(args.out); OUT.mkdir(parents=True, exist_ok=True)
a, _, b = args.stages.partition("-")
STAGES = list(range(int(a), int(b or a) + 1))

ELEV, FOV = 30 * DEG, 28 * DEG
clear_scene()
sc = bpy.context.scene
M._cache.clear()
configure_render(args.samples)
sc.cycles.adaptive_threshold = 0.03
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = -0.15
sc.render.use_persistent_data = True
lighting.build("morning", sky_scale=1.2)
fill = bpy.data.lights.new("fill", "SUN"); fill.energy = 1.2; fill.angle = 40 * DEG; fill.color = (0.92, 0.96, 1.0)
fo = bpy.data.objects.new("fill", fill); fo.rotation_euler = (55 * DEG, 0, 10 * DEG); sc.collection.objects.link(fo)
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.002))
gp = bpy.context.active_object; gp.is_shadow_catcher = True
cd = bpy.data.cameras.new("camera"); cd.lens_unit = "FOV"; cd.sensor_fit = "VERTICAL"; cd.angle_y = FOV; cd.clip_start = 0.02; cd.clip_end = 500
cam = bpy.data.objects.new("camera", cd); sc.collection.objects.link(cam); sc.camera = cam


def bbox(col):
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    dg = bpy.context.evaluated_depsgraph_get()
    for o in col.all_objects:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = ev.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z))); hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    return lo, hi


def frame(lo, hi, px):
    centre = (lo + hi) / 2
    h = max(0.2, hi.z - lo.z); w = max(0.2, max(hi.x - lo.x, hi.y - lo.y))
    aspect = max(1.0, min(2.2, (w * 1.06) / (h * 1.04)))
    W, H = int(round(px * aspect)), px
    sc.render.resolution_x, sc.render.resolution_y = W, H
    extent = max(h * 1.1, w * 1.1 / aspect * 0.9 + h * 0.2)
    dist = max((extent / 2) / math.tan(FOV / 2), w * 0.9)
    d = Vector((0, -math.cos(ELEV), math.sin(ELEV)))
    cam.location = centre + d * dist
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()


def shot(path):
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"; sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    im = Image.open(path).convert("RGBA")
    # the tree's own pixels (the ground shadow is soft and faint, and is kept, but must not set the crop)
    a = im.getchannel("A")
    solid = a.point(lambda v: 255 if v > 120 else 0).getbbox()
    sh = a.point(lambda v: 255 if v > 8 else 0).getbbox()
    box = sh or solid
    if box:
        im.crop(box).save(path)
    return box


import json
META = {}


def px_of(p):
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(sc, cam, Vector(p))
    return v.x * sc.render.resolution_x, (1 - v.y) * sc.render.resolution_y


def meta_for(sp, st, lo, hi, box, col):
    c = (lo + hi) / 2
    dx = max(0.02, (hi.x - lo.x) / 2)
    xa, _ = px_of((c.x - dx, c.y, c.z)); xb, _ = px_of((c.x + dx, c.y, c.z))
    ppm = abs(xb - xa) / (2 * dx)
    bx, by = px_of((c.x, c.y, lo.z))
    # ground footprint: the extent of the geometry within 25 cm of the ground (trunk and roots)
    dg = bpy.context.evaluated_depsgraph_get()
    flo = Vector((1e9, 1e9, 0)); fhi = Vector((-1e9, -1e9, 0))
    for o in col.all_objects:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        for v in me.vertices:
            w = ev.matrix_world @ v.co
            if w.z < lo.z + 0.25:
                flo.x = min(flo.x, w.x); flo.y = min(flo.y, w.y); fhi.x = max(fhi.x, w.x); fhi.y = max(fhi.y, w.y)
        ev.to_mesh_clear()
    foot = max(fhi.x - flo.x, fhi.y - flo.y) if flo.x < 1e8 else 0.0
    W, H = sc.render.resolution_x, sc.render.resolution_y
    return {"species": sp, "stage": st, "file": f"{sp}_{st}.png", "px": [box[2] - box[0], box[3] - box[1]], "ppm": round(ppm, 2),
            "widthM": round((box[2] - box[0]) / ppm, 3), "heightM": round((box[3] - box[1]) / ppm, 3),
            "pivot": [round((bx - box[0]) / (box[2] - box[0]), 4), round((by - box[1]) / (box[3] - box[1]), 4)],
            "treeHeightM": round(hi.z - lo.z, 3), "canopyWidthM": round(max(hi.x - lo.x, hi.y - lo.y), 3), "footprintM": round(foot, 3),
            "collisionRadiusM": round(max(foot * 0.5, 0.5 * max(hi.x - lo.x, hi.y - lo.y) * 0.35), 3), "shadowBoundsM": [round(max(hi.x - lo.x, hi.y - lo.y) * 1.1, 3), round((hi.z - lo.z) * 0.9, 3)]}


def clean(col):
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(col)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


for sp in args.only.split(","):
    for st in STAGES:
        t0 = time.time()
        col = collection(f"{sp}{st}")
        T.build(col, sp, st, seed=3)
        bpy.context.view_layer.update()
        lo, hi = bbox(col)
        frame(lo, hi, args.px if st < 7 else int(args.px * 1.4))
        box = shot(OUT / f"{sp}_{st}.png")
        META[f"{sp}_{st}"] = meta_for(sp, st, lo, hi, box, col)
        (OUT / "meta.json").write_text(json.dumps(META, indent=1))
        print(f"{sp} stage {st}: {time.time() - t0:.0f}s", flush=True)
        if args.detail and st == 7:
            c = (lo + hi) / 2; w = max(hi.x - lo.x, hi.y - lo.y); h = hi.z - lo.z
            frame(Vector((c.x - w * 0.2, c.y - w * 0.2, lo.z + h * 0.5)), Vector((c.x + w * 0.2, c.y + w * 0.2, hi.z - h * 0.02)), 900)
            shot(OUT / f"{sp}_close.png")
            frame(Vector((c.x - w * 0.09, c.y - w * 0.09, lo.z)), Vector((c.x + w * 0.09, c.y + w * 0.09, lo.z + h * 0.34)), 900)
            shot(OUT / f"{sp}_trunk.png")
            print(f"{sp} detail shots done", flush=True)
        clean(col)
