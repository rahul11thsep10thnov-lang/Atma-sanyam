"""Textures and backdrop sprites for the 3D garden and the museum.

    python render_textures.py [--out ../../assets/garden3d] [--only a,b]

grass tile (seamless), hedge strip, sandstone paving tile, the mansion
front, marble and plaster tiles. Writes into assets/garden3d/textures and
records the sprites' scale in textures.json.
"""
import argparse, json, math, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection, box
from focusbalcony import lighting, ground, trees, mansion
from focusbalcony import materials as M
from focusbalcony.scene import configure_render

ap = argparse.ArgumentParser()
ap.add_argument("--out", default=None)
ap.add_argument("--only", default="")
ap.add_argument("--samples", type=int, default=48)
args = ap.parse_args()
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(args.out) if args.out else ROOT / "assets" / "garden3d"
TEX = OUT / "textures"
TEX.mkdir(parents=True, exist_ok=True)
TMP = OUT / "_tmp"
TMP.mkdir(exist_ok=True)
ONLY = [o for o in args.only.split(",") if o]
meta_path = OUT / "textures.json"
meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
sc = None


def wanted(k):
    return not ONLY or any(o in k for o in ONLY)


def fresh(state="morning"):
    global sc
    clear_scene()
    M._cache.clear()
    sc = bpy.context.scene
    configure_render(args.samples)
    sc.cycles.adaptive_threshold = 0.03
    lighting.build(state, sky_scale=1.2)
    fill = bpy.data.lights.new("fill", "SUN")
    fill.energy = 1.0
    fill.angle = 40 * DEG
    o = bpy.data.objects.new("fill", fill)
    o.rotation_euler = (50 * DEG, 0, 15 * DEG)
    sc.collection.objects.link(o)


def ortho_top(size, px):
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = size
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (0, 0, 20)
    cam.rotation_euler = (0, 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = px
    return cam


def render(path, transparent):
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return Image.open(path)


def seamless(img):
    """Mirror into four quadrants so the tile repeats without a seam, then
    halve back to the original size."""
    w, h = img.size
    big = Image.new(img.mode, (w * 2, h * 2))
    big.paste(img, (0, 0))
    big.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (w, 0))
    big.paste(img.transpose(Image.FLIP_TOP_BOTTOM), (0, h))
    big.paste(img.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM), (w, h))
    return big.resize((w, h), Image.LANCZOS)


def save_meta():
    meta_path.write_text(json.dumps(meta, indent=1))


# ---- grass tile ---------------------------------------------------------------------
if wanted("grass"):
    fresh()
    col = collection("t")
    terr = ground.terrain(col, size=(2.0, 2.0), origin=(0.0, 0.0), seed=1)
    ground.lawn(col, terr, density=0.12)
    ortho_top(3.0, 1024)
    img = render(TMP / "grass.png", False).convert("RGB")
    seamless(img).save(TEX / "grass.webp", "WEBP", quality=88, method=6)
    meta["grass"] = {"file": "textures/grass.webp", "metres": 3.0}
    save_meta()
    print("grass done", flush=True)

# ---- sandstone paving tile ----------------------------------------------------------
if wanted("paving"):
    fresh()
    col = collection("t")
    stone = ground.sandstone(False)
    for i in range(-2, 3):
        for j in range(-2, 3):
            b = box(f"slab_{i}_{j}", (0.58, 0.58, 0.05), (i * 0.6, j * 0.6, 0.0), stone, col, bevel=0.01)
            b.rotation_euler = (0, 0, 0.01 * ((i * 7 + j * 3) % 5 - 2))
    ground_mat = ground.gravel(False)
    box("joints", (3.2, 3.2, 0.02), (0, 0, -0.03), ground_mat, col)
    ortho_top(3.0, 1024)
    img = render(TMP / "paving.png", False).convert("RGB")
    seamless(img).save(TEX / "paving.webp", "WEBP", quality=88, method=6)
    meta["paving"] = {"file": "textures/paving.webp", "metres": 3.0}
    save_meta()
    print("paving done", flush=True)

# ---- marble and plaster (museum) ------------------------------------------------------
if wanted("marble"):
    fresh()
    col = collection("t")
    m = M.stone((0.82, 0.8, 0.76), "museum_marble")
    for i in range(-2, 3):
        for j in range(-2, 3):
            box(f"m_{i}_{j}", (0.59, 0.59, 0.04), (i * 0.6, j * 0.6, 0.0), m, col, bevel=0.004)
    box("grout", (3.2, 3.2, 0.02), (0, 0, -0.03), M.matte((0.5, 0.48, 0.45), 0.8, "grout"), col)
    ortho_top(3.0, 1024)
    img = render(TMP / "marble.png", False).convert("RGB")
    seamless(img).save(TEX / "marble.webp", "WEBP", quality=88, method=6)
    meta["marble"] = {"file": "textures/marble.webp", "metres": 3.0}
    fresh()
    col = collection("t")
    box("plaster", (3.2, 3.2, 0.05), (0, 0, 0), M.plaster((0.86, 0.83, 0.76), "museum_plaster"), col)
    ortho_top(3.0, 512)
    img = render(TMP / "plaster.png", False).convert("RGB")
    seamless(img).save(TEX / "plaster.webp", "WEBP", quality=85, method=6)
    meta["plaster"] = {"file": "textures/plaster.webp", "metres": 3.0}
    fresh()
    col = collection("t")
    box("wood", (3.2, 3.2, 0.05), (0, 0, 0), M.wood(), col)
    ortho_top(3.0, 512)
    img = render(TMP / "wood.png", False).convert("RGB")
    seamless(img).save(TEX / "wood.webp", "WEBP", quality=85, method=6)
    meta["wood"] = {"file": "textures/wood.webp", "metres": 3.0}
    save_meta()
    print("marble/plaster/wood done", flush=True)


def front_sprite(key, build, elev_deg=12.0, fov_deg=30.0, px=1600):
    """A front-on sprite of a big thing (a hedge run, the mansion) with its
    metre scale and ground pivot, like render_sprites.py."""
    fresh()
    col = collection("t")
    root = build(col)
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    dg = bpy.context.evaluated_depsgraph_get()
    for o in col.all_objects:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = ev.matrix_world @ Vector(c)
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
    centre = (lo + hi) / 2
    h = hi.z - lo.z
    w = max(hi.x - lo.x, 0.1)
    aspect = max(1.0, min(4.0, w * 1.05 / (h * 1.05)))
    W, H = int(px * aspect), px
    sc.render.resolution_x, sc.render.resolution_y = W, H
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens_unit = "FOV"
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = fov_deg * DEG
    cam_data.clip_end = 1000
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    elev = elev_deg * DEG
    extent = max(h * 1.1, w * 1.1 / aspect)
    dist = (extent / 2) / math.tan(fov_deg * DEG / 2)
    d = Vector((0, -math.cos(elev), math.sin(elev)))
    cam.location = centre + d * dist
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    img = render(TMP / f"{key}.png", True)
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 3)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = img.crop((x0, y0, x1, y1))
    rel = f"textures/{key}.webp"
    crop.save(OUT / rel, "WEBP", quality=88, method=6)

    def px_of(p):
        v = world_to_camera_view(sc, cam, Vector(p))
        return v.x * W, (1 - v.y) * H

    ox, oy = px_of((0, 0, 0))
    _, oy1 = px_of((0, 0, 1))
    ppm = abs(oy - oy1)
    cw, ch = x1 - x0, y1 - y0
    meta[key] = {"file": rel, "px": [cw, ch], "widthM": round(cw / ppm, 3), "heightM": round(ch / ppm, 3), "pivot": [round((ox - x0) / cw, 4), round((oy - y0) / ch, 4)]}
    save_meta()
    print(f"{key} done {cw}x{ch} ({meta[key]['widthM']}x{meta[key]['heightM']} m)", flush=True)


if wanted("hedge"):
    front_sprite("hedge_run", lambda col: trees.hedge(col, length=8.0, height=1.1, depth=0.7, seed=5), elev_deg=10, px=1024)
    front_sprite("hedge_tall_run", lambda col: trees.hedge(col, length=8.0, height=2.2, depth=0.8, seed=6), elev_deg=10, px=1024)

if wanted("mansion"):
    front_sprite("mansion", lambda col: mansion.mansion(col), elev_deg=6, fov_deg=28, px=1400)

print("textures done", flush=True)
