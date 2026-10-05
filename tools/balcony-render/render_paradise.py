"""Render every Paradise Garden species as a seed and seven sizes: one
sprite per stage from a low front angle on a transparent background, with
metres-per-pixel and the ground pivot recorded, plus a 256-px thumbnail.

    python render_paradise.py [--only lily,rose] [--samples 24] [--px 768] [--fresh]

Writes assets/paradise/sprites/<species>__<stage>.webp, thumbs/, sprites.json.
"""
import argparse, json, math, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection
from focusbalcony import lighting
from focusbalcony import materials as M
from focusbalcony import garden_paradise as P
from focusbalcony.scene import configure_render

ap = argparse.ArgumentParser()
ap.add_argument("--only", default="")
ap.add_argument("--samples", type=int, default=24)
ap.add_argument("--px", type=int, default=768)
ap.add_argument("--fresh", action="store_true")
ap.add_argument("--extras", action="store_true", help="render the garden extras (plinth) into extras.json instead")
ap.add_argument("--remeasure", action="store_true", help="recompute widthM/heightM of every rendered sprite from its geometry")
args = ap.parse_args()

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "paradise"
(OUT / "sprites").mkdir(parents=True, exist_ok=True)
(OUT / "thumbs").mkdir(parents=True, exist_ok=True)
TMP = OUT / "_tmp"
TMP.mkdir(exist_ok=True)
ONLY = [o for o in args.only.split(",") if o]

manifest_path = OUT / "sprites.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() and not args.fresh else {}
manifest.setdefault("version", 1)
manifest.setdefault("species", {})
manifest["elevationDeg"] = 22
manifest["stages"] = P.STAGES

sc = None
ELEV = 22.0 * DEG
FOV = 28.0 * DEG

# the order the user sees content: the first few of every segment first
PRIORITY = ["lily", "rose", "lotus", "marigold", "hibiscus", "jasmine", "neem", "mango", "cherry_blossom", "peepal", "palm", "gulmohar",
            "monstera", "peace_lily", "snake_plant", "areca_palm", "fern", "bamboo", "tomato", "strawberry", "chilli", "apple", "banana", "orange",
            "tulsi", "mint", "lavender", "aloe_vera", "lemongrass", "chamomile"]


def save():
    manifest_path.write_text(json.dumps(manifest, indent=1))


def setup():
    global sc
    clear_scene()
    sc = bpy.context.scene
    M._cache.clear()
    configure_render(args.samples)
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.render.use_persistent_data = True
    sc.render.film_transparent = True
    sc.view_settings.exposure = 0.0
    lighting.build("morning", sky_scale=1.2)
    # a soft fill from the camera side so the shaded face of every plant reads
    fill = bpy.data.lights.new("fill", "SUN")
    fill.energy = 1.2
    fill.angle = 40 * DEG
    fill.color = (0.9, 0.95, 1.0)
    o = bpy.data.objects.new("fill", fill)
    o.rotation_euler = (55 * DEG, 0, 10 * DEG)
    sc.collection.objects.link(o)
    cam_data = bpy.data.cameras.new("camera")
    cam_data.lens_unit = "FOV"
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = FOV
    cam_data.clip_start = 0.02
    cam_data.clip_end = 500
    cam = bpy.data.objects.new("camera", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def bbox(col):
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
    if lo.x > hi.x:
        return None
    return lo, hi


def frame_camera(cam, lo, hi):
    centre = (lo + hi) / 2
    h = max(0.2, hi.z - lo.z)
    w = max(0.2, max(hi.x - lo.x, hi.y - lo.y))
    aspect = max(1.0, min(2.6, (w * 1.08) / (h * 1.02)))
    W, H = int(round(args.px * aspect)), args.px
    sc.render.resolution_x, sc.render.resolution_y = W, H
    extent = max(h * 1.12, w * 1.12 / aspect * 0.9 + h * 0.2)
    dist = (extent / 2) / math.tan(FOV / 2)
    dist = max(dist, w * 0.9)
    d = Vector((0, -math.cos(ELEV), math.sin(ELEV)))
    cam.location = centre + d * dist
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    return W, H


def px_of(cam, p, W, H):
    v = world_to_camera_view(sc, cam, Vector(p))
    return v.x * W, (1 - v.y) * H


def remove(col):
    # meshes go; materials stay (they are cached and shared between species)
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(col)
    for m_ in list(bpy.data.meshes):
        if m_.users == 0:
            bpy.data.meshes.remove(m_)
    for l_ in list(bpy.data.lights):
        if l_.users == 0 and l_.name not in ("sun", "fill"):
            bpy.data.lights.remove(l_)


def measure_ppm(cam, lo, hi, W, H):
    """Image pixels per metre at the plant itself: a horizontal span through
    the plant's centre, square to the view, so neither perspective nor the
    camera's elevation distorts it (a 1 m vertical reference does, badly,
    for small plants close to the lens)."""
    c = (lo + hi) / 2
    dx = max(0.02, (hi.x - lo.x) / 2)
    xa, _ = px_of(cam, (c.x - dx, c.y, c.z), W, H)
    xb, _ = px_of(cam, (c.x + dx, c.y, c.z), W, H)
    return abs(xb - xa) / (2 * dx)


def remeasure(cam, key, builder, stage, entry):
    """Recompute an existing sprite's metres from its geometry, without rendering."""
    col = collection(key)
    builder(col, stage=stage, seed=sum(ord(c) for c in key) % 977 + 3)
    bpy.context.view_layer.update()
    bb = bbox(col)
    if not bb:
        remove(col)
        return entry
    lo, hi = bb
    W, H = frame_camera(cam, lo, hi)
    ppm = measure_ppm(cam, lo, hi, W, H)
    cw, ch = entry["px"]
    entry = {**entry, "widthM": round(cw / ppm, 4), "heightM": round(ch / ppm, 4)}
    remove(col)
    return entry


def render_sprite(cam, key, builder, stage):
    side = TMP / f"{key}.json"
    if side.exists() and not args.fresh and (OUT / "sprites" / f"{key}.webp").exists():
        print(f"  kept {key}", flush=True)
        return json.loads(side.read_text())
    t0 = time.time()
    col = collection(key)
    root = builder(col, stage=stage, seed=sum(ord(c) for c in key) % 977 + 3)
    bpy.context.view_layer.update()
    bb = bbox(col)
    if not bb:
        remove(col)
        return None
    lo, hi = bb
    W, H = frame_camera(cam, lo, hi)
    tmp = TMP / f"{key}.png"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = str(tmp)
    bpy.ops.render.render(write_still=True)
    im = Image.open(tmp).convert("RGBA")
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        remove(col)
        return None
    x0, x1 = int(max(0, xs.min() - 4)), int(min(W, xs.max() + 5))
    y0, y1 = int(max(0, ys.min() - 4)), int(min(H, ys.max() + 5))
    crop = im.crop((x0, y0, x1, y1))
    rel = f"sprites/{key}.webp"
    crop.save(OUT / rel, quality=86, method=6)
    th = crop.copy()
    th.thumbnail((256, 256), Image.LANCZOS)
    th.save(OUT / "thumbs" / f"{key}.webp", quality=80, method=6)
    ox, oy = px_of(cam, (0, 0, 0), W, H)
    ppm = measure_ppm(cam, lo, hi, W, H)
    cw, ch = x1 - x0, y1 - y0
    entry = {
        "file": rel,
        "thumb": f"thumbs/{key}.webp",
        "px": [cw, ch],
        "widthM": round(cw / ppm, 4),
        "heightM": round(ch / ppm, 4),
        "pivot": [round((ox - x0) / cw, 4), round((oy - y0) / ch, 4)],
        "boxM": [round(hi.x - lo.x, 3), round(hi.y - lo.y, 3), round(hi.z - lo.z, 3)],
    }
    sway = root.get("sway")
    if sway:
        entry["sway"] = {k: float(v) for k, v in dict(sway).items()}
    remove(col)
    side.write_text(json.dumps(entry))
    print(f"  rendered {key} {cw}x{ch} ({entry['widthM']}x{entry['heightM']} m) in {time.time() - t0:.1f}s", flush=True)
    return entry


def wanted(key):
    return not ONLY or any(o == key for o in ONLY)


def extras():
    cam = setup()
    out = {}
    for key, builder in P.EXTRAS.items():
        e = render_sprite(cam, key, builder, 7)
        if e:
            out[key] = e
    (OUT / "extras.json").write_text(json.dumps(out, indent=1))
    print("extras done", list(out), flush=True)


def remeasure_all():
    cam = setup()
    n = 0
    for species, rec in manifest["species"].items():
        if species not in P.BUILDERS or not wanted(species):
            continue
        for si, st in enumerate(P.STAGES):
            e = rec["stages"][si]
            if not e:
                continue
            key = f"{species}__{st['id']}"
            e2 = remeasure(cam, key, P.BUILDERS[species], si, e)
            rec["stages"][si] = e2
            side = TMP / f"{key}.json"
            if side.exists():
                side.write_text(json.dumps(e2))
            n += 1
            print(f"  {key}: {e['heightM']} -> {e2['heightM']} m", flush=True)
    if n:
        save()
    ex = OUT / "extras.json"
    if ex.exists():
        data = json.loads(ex.read_text())
        for key, builder in P.EXTRAS.items():
            if key in data:
                data[key] = remeasure(cam, key, builder, 7, data[key])
        ex.write_text(json.dumps(data, indent=1))
    print(f"remeasured {n} sprites", flush=True)


def main():
    if args.remeasure:
        return remeasure_all()
    if args.extras:
        return extras()
    cam = setup()
    t0 = time.time()
    order = [s for s in PRIORITY if s in P.BUILDERS] + [s for s in P.BUILDERS if s not in PRIORITY]
    seg_of = {sid: seg for seg, d in P.SEGMENTS.items() for sid in d}
    for species in order:
        if not wanted(species):
            continue
        rec = manifest["species"].setdefault(species, {"segment": seg_of[species], "stages": [None] * len(P.STAGES)})
        rec["segment"] = seg_of[species]
        for si, st in enumerate(P.STAGES):
            key = f"{species}__{st['id']}"
            try:
                e = render_sprite(cam, key, P.BUILDERS[species], si)
            except Exception as ex:  # one broken stage must not stop the queue
                print(f"  FAILED {key}: {ex}", flush=True)
                e = None
            if e:
                rec["stages"][si] = e
            save()
    print(f"done paradise in {(time.time() - t0) / 60:.1f} min → {OUT}", flush=True)


main()
