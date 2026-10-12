"""Render every garden object as a billboard sprite for the real-time 3D
garden: one photograph per object (per growth stage, healthy and wilted;
per lit state for lamps) from a low front angle, on a transparent
background, with the metres-per-pixel scale and the ground-contact pivot
recorded so the app can stand it anywhere.

    python render_sprites.py [--out ../../assets/garden3d] [--only a,b]
        [--samples 32] [--px 1024] [--group day|night|scenery|all] [--fresh]

Writes assets/garden3d/sprites/<key>.webp and assets/garden3d/sprites.json.
"""
import argparse, json, math, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection
from focusbalcony import lighting, plants, furniture, decor, trees
from focusbalcony import materials as M
from focusbalcony import garden_items, garden_catalog, garden_plants_extra as extra, room_items
from focusbalcony.scene import configure_render

ap = argparse.ArgumentParser()
ap.add_argument("--out", default=None)
ap.add_argument("--only", default="")
ap.add_argument("--samples", type=int, default=32)
ap.add_argument("--px", type=int, default=1024)
ap.add_argument("--group", default="all", choices=["day", "night", "scenery", "all"])
ap.add_argument("--fresh", action="store_true")
args = ap.parse_args()

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(args.out) if args.out else ROOT / "assets" / "garden3d"
(OUT / "sprites").mkdir(parents=True, exist_ok=True)
TMP = OUT / "_tmp"
TMP.mkdir(exist_ok=True)
ONLY = [o for o in args.only.split(",") if o]

BUILDERS = {**plants.BUILDERS, **furniture.BUILDERS, **decor.BUILDERS, **room_items.BUILDERS, **garden_items.BUILDERS, **extra.BUILDERS}
manifest_path = OUT / "sprites.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() and not args.fresh else {}
manifest.setdefault("version", 1)
manifest.setdefault("items", {})
manifest.setdefault("scenery", {})
manifest.setdefault("elevationDeg", 22)

sc = None  # set by setup(); clear_scene() replaces the Scene
ELEV = 22.0 * DEG
FOV = 28.0 * DEG


def save():
    manifest_path.write_text(json.dumps(manifest, indent=1))


def setup(state):
    global sc
    clear_scene()
    sc = bpy.context.scene
    M._cache.clear()
    configure_render(args.samples)
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.render.use_persistent_data = True
    sc.render.film_transparent = True
    sc.view_settings.exposure = 0.0 if state == "morning" else 1.2
    lighting.build(state, sky_scale=1.2 if state == "morning" else 1.0)
    if state == "morning":
        # a soft fill from the camera side so the shaded face of every object reads
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
    """Place the camera in front (−Y), ELEV above horizontal, so the bounding
    box fits the frame with a margin; returns the render size."""
    centre = (lo + hi) / 2
    h = max(0.2, hi.z - lo.z)
    w = max(0.2, max(hi.x - lo.x, hi.y - lo.y))
    aspect = max(1.0, min(2.6, (w * 1.08) / (h * 1.02)))
    W, H = int(round(args.px * aspect)), args.px
    sc.render.resolution_x, sc.render.resolution_y = W, H
    # vertical extent seen at the centre distance must cover the box (projected)
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


def render_png(path):
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    return Image.open(path)


def remove(col):
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(col)
    for m_ in list(bpy.data.meshes):
        if m_.users == 0:
            bpy.data.meshes.remove(m_)
    for l_ in list(bpy.data.lights):
        if l_.users == 0 and l_.name not in ("sun", "fill"):
            bpy.data.lights.remove(l_)


def render_sprite(cam, key, builder, kwargs):
    rel = f"sprites/{key}.webp"
    side = TMP / f"{key}.json"
    if not args.fresh and side.exists() and (OUT / rel).exists():
        print(f"  kept {key}", flush=True)
        return json.loads(side.read_text())
    t0 = time.time()
    col = collection(f"item_{key}")
    root = BUILDERS[builder](col, **kwargs)
    root.location = (0, 0, 0)
    bpy.context.view_layer.update()
    bb = bbox(col)
    if bb is None:
        remove(col)
        return None
    lo, hi = bb
    W, H = frame_camera(cam, lo, hi)
    img = render_png(TMP / f"{key}.png")
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 3)
    if len(xs) == 0:
        remove(col)
        return None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = img.crop((x0, y0, x1, y1))
    crop.save(OUT / rel, "WEBP", quality=90, method=6)
    ox, oy = px_of(cam, (0, 0, 0), W, H)
    _, oy1 = px_of(cam, (0, 0, 1), W, H)
    ppm = abs(oy - oy1)
    cw, ch = x1 - x0, y1 - y0
    entry = {
        "file": rel,
        "px": [cw, ch],
        "widthM": round(cw / ppm, 4),
        "heightM": round(ch / ppm, 4),
        "pivot": [round((ox - x0) / cw, 4), round((oy - y0) / ch, 4)],
        "boxM": [round(hi.x - lo.x, 3), round(hi.y - lo.y, 3), round(hi.z - lo.z, 3)],
    }
    sway = root.get("sway")
    if sway:
        entry["sway"] = {k: (v if isinstance(v, str) else float(v)) for k, v in dict(sway).items()}
    art = root.get("art_frame")
    if art:
        fr = bpy.data.objects[art]
        aw, ah = fr["art_size"]
        inset = fr["art_inset_y"]
        mw = fr.matrix_world
        corners = [mw @ Vector((-aw / 2, inset, ah / 2)), mw @ Vector((aw / 2, inset, ah / 2)), mw @ Vector((aw / 2, inset, -ah / 2)), mw @ Vector((-aw / 2, inset, -ah / 2))]
        entry["artQuad"] = [[round((px_of(cam, c, W, H)[0] - x0) / cw, 4), round((px_of(cam, c, W, H)[1] - y0) / ch, 4)] for c in corners]
    remove(col)
    side.write_text(json.dumps(entry))
    print(f"  rendered {key} {cw}x{ch} ({entry['widthM']}x{entry['heightM']} m) in {time.time() - t0:.1f}s", flush=True)
    return entry


def wanted(key):
    return not ONLY or any(o in key for o in ONLY)


# ---- what to render -------------------------------------------------------------------

def item_jobs():
    """(item id, meta) for every garden store/fixture item and the new plants."""
    jobs = []
    for item_id, (builder, kwargs, _slots, meta) in garden_catalog.ITEMS.items():
        jobs.append((item_id, builder, kwargs, meta))
    for item_id in extra.BUILDERS:
        name, cat, blurb, coins, unlock = extra.META[item_id]
        meta = {"name": name, "category": cat, "growable": item_id in extra.GROWABLE_EXTRA}
        jobs.append((item_id, item_id, {}, meta))
    return jobs


def run_day():
    cam = setup("morning")
    for item_id, builder, kwargs, meta in item_jobs():
        if not wanted(item_id):
            continue
        rec = manifest["items"].setdefault(item_id, {})
        rec.update({"name": meta["name"], "category": meta["category"]})
        for k in ("growable", "lit", "fixed", "stack", "art", "flat"):
            if meta.get(k):
                rec[k] = True
        if meta.get("growable"):
            rec["stages"] = rec.get("stages") or [{"id": s["id"], "minutes": s["minutes"]} for s in garden_items.GROWTH_STAGES]
            for si, st in enumerate(garden_items.GROWTH_STAGES):
                for wilted in ((False,) if si == 0 else (False, True)):
                    key = f"{item_id}__{st['id']}{'__wilted' if wilted else ''}"
                    e = render_sprite(cam, key, builder, {**kwargs, "stage": si, "wilted": wilted})
                    if e:
                        rec["stages"][si]["wilted" if wilted else "healthy"] = e
        elif meta.get("stack"):
            rec["stack"] = []
            for n in range(0, 5):
                e = render_sprite(cam, f"{item_id}__n{n}", builder, {**kwargs, "count": n})
                rec["stack"].append(e)
        else:
            e = render_sprite(cam, item_id, builder, {**kwargs, **({"lit": False} if meta.get("lit") else {})})
            if e:
                rec["sprite"] = e
        save()
    # the focus tree
    if wanted("focus"):
        ft = manifest.setdefault("focusTree", {"name": "Kachnar", "stages": [{"id": s["id"], "minutes": s["minutes"]} for s in garden_items.TREE_STAGES]})
        for i, st in enumerate(garden_items.TREE_STAGES):
            for wilted in (False, True):
                key = f"focus_kachnar__{st['id']}{'__wilted' if wilted else ''}"
                e = render_sprite(cam, key, "kachnar", {"stage": i, "wilted": wilted})
                if e:
                    ft["stages"][i]["wilted" if wilted else "healthy"] = e
            save()


def run_night():
    cam = setup("night")
    for item_id, builder, kwargs, meta in item_jobs():
        if not meta.get("lit") or not wanted(item_id):
            continue
        rec = manifest["items"].setdefault(item_id, {})
        e = render_sprite(cam, f"{item_id}__night", builder, {**kwargs, "lit": True})
        if e:
            rec["night"] = e
        save()


SCENERY = {
    "neem": ("neem_tree", {"height": 7.5, "density": 0.5}),
    "neem_small": ("neem_tree", {"height": 5.0, "density": 0.5, "seed": 9}),
    "gulmohar": ("gulmohar", {"height": 6.0}),
    "frangipani": ("frangipani", {"height": 3.2}),
    "ashoka": ("ashoka_tree", {"height": 5.5}),
    "jamun_big": ("jamun_tree", {"seed": 140}),
    "hedge_4m": ("hedge", {"length": 4.0, "height": 1.0, "depth": 0.6}),
    "hedge_tall": ("hedge", {"length": 4.0, "height": 1.8, "depth": 0.7, "seed": 6}),
    "boulders": ("decorative_rocks", {}),
}


def run_scenery():
    cam = setup("morning")
    tb = {"neem_tree": trees.neem_tree, "gulmohar": trees.gulmohar, "frangipani": trees.frangipani, "hedge": trees.hedge}
    BUILDERS.update(tb)
    for key, (builder, kwargs) in SCENERY.items():
        if not wanted(key):
            continue
        e = render_sprite(cam, f"scenery__{key}", builder, kwargs)
        if e:
            manifest["scenery"][key] = e
        save()


t0 = time.time()
if args.group in ("day", "all"):
    run_day()
if args.group in ("scenery", "all"):
    run_scenery()
if args.group in ("night", "all"):
    run_night()
save()
print(f"done sprites ({args.group}) in {(time.time() - t0) / 60:.1f} min → {OUT}", flush=True)
