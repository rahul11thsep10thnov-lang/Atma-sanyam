"""Render every balcony layer and write the app's asset pack.

    python render.py [--scale 1.0] [--arch-samples 128] [--item-samples 96]
                     [--out ../../assets/balcony] [--only substring] [--skip-plates]

Layers (composited back-to-front on device):
  environment/sky.webp        world sky only (opaque)
  environment/clouds.webp     soft clouds, 2x wide, seamless for slow drift
  environment/landscape.webp  hills, trees, city (alpha = sky)
  architecture/base.webp      the empty balcony (alpha = open air)
  lighting/sun_mask.webp      where the sun falls (for a slow light "breath")
  plants|furniture|decor|artwork/<item>__<slot>__<variant>.webp
                              each object with its own shadows, cropped
  manifest.json               rects, pivots, depths, slots, art quad
"""
import argparse, json, math, os, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection
from focusbalcony import scene, plants, furniture, decor, catalog
from focusbalcony import materials as M

ap = argparse.ArgumentParser()
ap.add_argument("--scale", type=float, default=1.0)
ap.add_argument("--arch-samples", type=int, default=128)
ap.add_argument("--item-samples", type=int, default=96)
ap.add_argument("--out", default=str(pathlib.Path(__file__).resolve().parents[2] / "assets" / "balcony"))
ap.add_argument("--only", default=None)
ap.add_argument("--skip-plates", action="store_true")
ap.add_argument("--quality", type=int, default=88)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

OUT = pathlib.Path(args.out)
TMP = OUT / "_tmp"
for sub in ("environment", "architecture", "plants", "furniture", "decor", "artwork", "lighting", "animations", "_tmp"):
    (OUT / sub).mkdir(parents=True, exist_ok=True)
W, H = int(round(1080 * args.scale)), int(round(2340 * args.scale))
BUILDERS = {**plants.BUILDERS, **furniture.BUILDERS, **decor.BUILDERS}
FOLDER = {"PLANTS": "plants", "FURNITURE": "furniture", "TABLES": "furniture", "RUGS": "decor", "LIGHTING": "decor",
          "DECOR": "decor", "WALL_ART": "artwork"}

manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() and args.skip_plates else {}
manifest.update({"version": 1, "plate": {"width": W, "height": H}})
manifest.setdefault("layers", {})
manifest.setdefault("items", {})
manifest.setdefault("slots", {})

# ---------------------------------------------------------------------------
clear_scene()
scene.build_all(W, H)
scene.configure_render(args.arch_samples)
sc = bpy.context.scene
cam = sc.camera
COLS = {n: bpy.data.collections[n] for n in ("architecture", "interior", "landscape")}
sun_dir = scene.sun_direction()
world_bg = sc.world.node_tree.nodes["Background"]
SKY_STRENGTH = world_bg.inputs["Strength"].default_value


def objs(name):
    return list(COLS[name].all_objects)


def visible(name, camera=True):
    for o in objs(name):
        o.visible_camera = camera


def catcher(name, on):
    for o in objs(name):
        o.is_shadow_catcher = on


def to_px(p):
    v = world_to_camera_view(sc, cam, Vector(p))
    return (v.x * W, (1 - v.y) * H)


def render(path, samples, transparent, border=None):
    sc.cycles.samples = samples
    sc.render.film_transparent = transparent
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.render.use_border = border is not None
    sc.render.use_crop_to_border = False
    if border:
        sc.render.border_min_x, sc.render.border_max_x = border[0], border[2]
        sc.render.border_min_y, sc.render.border_max_y = border[1], border[3]
    sc.render.filepath = str(path)
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"  rendered {path.name} in {time.time() - t:.1f}s", flush=True)
    return Image.open(path)


def save_webp(img, rel, lossless=False):
    path = OUT / rel
    img.save(path, "WEBP", quality=args.quality, method=6, lossless=lossless)
    return rel


# ---------------------------------------------------------------------------
def plates():
    print("== plates", flush=True)
    # sky only
    for n in COLS:
        visible(n, False)
    img = render(TMP / "sky.png", 16, False)
    manifest["layers"]["sky"] = save_webp(img.convert("RGB"), "environment/sky.webp")
    sky = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0

    # landscape (sky transparent); the balcony still shades and reflects
    visible("landscape", True)
    img = render(TMP / "landscape.png", 48, True)
    manifest["layers"]["landscape"] = save_webp(img, "environment/landscape.webp")

    # the balcony itself; landscape only in reflections and bounce
    visible("landscape", False)
    visible("architecture", True)
    visible("interior", True)
    img = render(TMP / "architecture.png", args.arch_samples, True)
    manifest["layers"]["architecture"] = save_webp(img, "architecture/base.webp")

    # sun contribution only → a soft mask for the light "breathing"
    world_bg.inputs["Strength"].default_value = 0.0
    img = render(TMP / "sun.png", 24, True)
    world_bg.inputs["Strength"].default_value = SKY_STRENGTH
    a = np.asarray(img.convert("RGBA"), dtype=np.float32) / 255.0
    lum = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]) * a[..., 3]
    lum = np.clip(lum / max(1e-4, np.percentile(lum, 99.5)), 0, 1) ** 1.6
    mask = Image.fromarray((lum * 255).astype(np.uint8), "L").convert("RGB")
    manifest["layers"]["sunMask"] = save_webp(mask, "lighting/sun_mask.webp")

    clouds(sky)
    dust()


def periodic_noise(h, w, beta, rng):
    """Tileable fractal noise via a power-law spectrum."""
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    f = np.sqrt(fx * fx * 4.0 + fy * fy)  # stretched horizontally
    f[0, 0] = 1.0
    spec = (rng.normal(size=(h, w)) + 1j * rng.normal(size=(h, w))) / (f ** beta)
    spec[0, 0] = 0
    n = np.real(np.fft.ifft2(spec))
    return (n - n.min()) / (n.max() - n.min())


def clouds(sky):
    """Soft morning cumulus/stratus, lit warm from the sun side, 2x the plate
    width so the app can drift them slowly and loop seamlessly."""
    rng = np.random.default_rng(7)
    ch, cw = int(H * 0.5), W * 2
    n = periodic_noise(ch, cw, 1.9, rng)
    detail = periodic_noise(ch, cw, 1.4, rng)
    d = np.clip((n * 0.8 + detail * 0.2 - 0.52) / 0.22, 0, 1)
    yy = np.linspace(0, 1, ch)[:, None]
    d *= np.clip((yy - 0.05) / 0.25, 0, 1) * np.clip((0.98 - yy) / 0.3, 0, 1)  # thin near the top and horizon
    d = d ** 1.3
    lit = np.clip(np.roll(n, -6, axis=1) - n + 0.5, 0, 1)
    warm = np.array([1.0, 0.9, 0.78])
    shade = np.array([0.78, 0.76, 0.78])
    col = shade[None, None, :] * (1 - lit[..., None]) + warm[None, None, :] * lit[..., None]
    rgba = np.dstack([np.clip(col, 0, 1), d * 0.75])
    img = Image.fromarray((rgba * 255).astype(np.uint8), "RGBA")
    manifest["layers"]["clouds"] = {"file": save_webp(img, "environment/clouds.webp"), "width": cw, "height": ch, "top": 0}


def dust():
    s = 32
    yy, xx = np.mgrid[0:s, 0:s] / (s - 1) - 0.5
    a = np.clip(1 - np.sqrt(xx ** 2 + yy ** 2) * 2, 0, 1) ** 2.2
    img = Image.fromarray(np.dstack([np.full((s, s), 255), np.full((s, s), 236), np.full((s, s), 200), (a * 255)]).astype(np.uint8), "RGBA")
    manifest["layers"]["dust"] = save_webp(img, "animations/dust.webp", lossless=True)


# ---------------------------------------------------------------------------
def shadow_hits(p):
    """Where the sun shadow of point p lands (floor, glass facade or far wall)."""
    d = sun_dir
    hits = []
    if d.z > 1e-4:
        hits.append(p - d * (p.z / d.z))
    if d.x > 1e-4 and p.x > scene.FACADE_X:
        hits.append(p - d * ((p.x - scene.FACADE_X) / d.x))
    if d.y < -1e-4:
        hits.append(p - d * ((scene.FAR_Y - p.y) / -d.y))
    good = [q for q in hits if q.z >= -0.01 and scene.FACADE_X - 0.01 <= q.x and q.y <= scene.FAR_Y + 0.01]
    if not good:
        return []
    return [min(good, key=lambda q: (q - p).length)]


def border_for(item_col):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in item_col.all_objects:
        if o.type != "MESH":
            continue
        e = o.evaluated_get(dg)
        for c in e.bound_box:
            w = o.matrix_world @ Vector(c)
            pts.append(w)
            pts.extend(shadow_hits(w))
    xs, ys = [], []
    for p in pts:
        v = world_to_camera_view(sc, cam, p)
        if v.z > 0:
            xs.append(v.x)
            ys.append(v.y)
    m = 0.03
    return (max(0, min(xs) - m), max(0, min(ys) - m), min(1, max(xs) + m), min(1, max(ys) + m))


def crop_alpha(img):
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 2)
    if len(xs) == 0:
        return None, None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    return img.crop((x0, y0, x1, y1)), [x0, y0, x1 - x0, y1 - y0]


def remove_collection(col):
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(col)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def render_item(item_id, builder, kwargs, slot_id, rz, variant, folder, extra_key=None):
    slot = catalog.SLOTS[slot_id]
    col = collection(f"item_{item_id}_{slot_id}_{variant}")
    root = BUILDERS[builder](col, **kwargs)
    root.location = slot["pos"]
    rot = slot.get("rot", 0) + rz
    root.rotation_euler = (0, 0, rot * DEG)
    bpy.context.view_layer.update()
    border = border_for(col)
    key = extra_key or f"{item_id}__{slot_id}__{variant}"
    img = render(TMP / f"{key}.png", args.item_samples, True, border)
    cropped, rect = crop_alpha(img.convert("RGBA"))
    entry = None
    if cropped is not None:
        rel = save_webp(cropped, f"{folder}/{key}.webp")
        pivot = to_px(root.location)
        dist = (Vector(slot["pos"]) - cam.location).length
        entry = {"file": rel, "rect": rect, "pivot": [round(pivot[0], 1), round(pivot[1], 1)], "depth": round(dist, 3),
                 "rotation": rz}
        sway = root.get("sway")
        if sway:
            entry["sway"] = {k: (v if isinstance(v, str) else float(v)) for k, v in dict(sway).items()}
    remove_collection(col)
    return entry, root


def items():
    print("== items", flush=True)
    visible("landscape", False)
    visible("architecture", True)
    visible("interior", True)
    catcher("architecture", True)
    catcher("interior", True)

    for sid, s in catalog.SLOTS.items():
        px = to_px(s["pos"])
        manifest["slots"][sid] = {"kind": s["kind"], "group": s["group"], "label": s["label"],
                                  "anchor": [round(px[0], 1), round(px[1], 1)],
                                  "depth": round((Vector(s["pos"]) - cam.location).length, 3)}

    # the focus plant: every growth stage, healthy and wilted
    if not args.only or "focus" in args.only or "peace_lily" in args.only:
        stages = []
        for i, st in enumerate(plants.LILY_STAGES):
            rec = {"id": st["id"], "minutes": st["minutes"]}
            for wilted in (False, True):
                e, _ = render_item("peace_lily", "peace_lily", {"stage": i, "wilted": wilted}, catalog.FOCUS_SLOT, 0, 0,
                                   "plants", f"focus_lily__{st['id']}{'__wilted' if wilted else ''}")
                rec["wilted" if wilted else "healthy"] = e
            stages.append(rec)
        manifest["focusPlant"] = {"slot": catalog.FOCUS_SLOT, "name": "Peace lily", "stages": stages}

    for item_id, (builder, kwargs, slots, meta) in catalog.ITEMS.items():
        if args.only and args.only not in item_id:
            continue
        rec = manifest["items"].get(item_id, {}) | {k: v for k, v in meta.items()}
        rec["variants"] = rec.get("variants", {})
        folder = FOLDER[meta["category"]]
        for slot_id, rotations in slots.items():
            rec["variants"][slot_id] = []
            for vi, rz in enumerate(rotations):
                e, root = render_item(item_id, builder, kwargs, slot_id, rz, vi, folder)
                if e:
                    rec["variants"][slot_id].append(e)
        manifest["items"][item_id] = rec

    if not args.only or "art" in args.only:
        art()


def art():
    """The art wall: where an artwork maps into the frame (4 corners), and a
    light map of that opening so the artwork picks up the scene's light."""
    slot = catalog.SLOTS["art"]
    col = collection("item_art_light")
    white = M.matte((0.8, 0.8, 0.8), 0.9, "canvas_white")
    root = decor.art_frame(col, canvas=white)
    root.location = slot["pos"]
    bpy.context.view_layer.update()
    aw, ah = root["art_size"]
    inset = root["art_inset_y"]
    mw = root.matrix_world
    corners = [mw @ Vector((-aw / 2, inset, ah / 2)), mw @ Vector((aw / 2, inset, ah / 2)),
               mw @ Vector((aw / 2, inset, -ah / 2)), mw @ Vector((-aw / 2, inset, -ah / 2))]
    quad = [[round(c, 1) for c in to_px(p)] for p in corners]
    img = render(TMP / "art_light.png", max(48, args.item_samples // 2), True, border_for(col)).convert("RGBA")
    xs, ys = [q[0] for q in quad], [q[1] for q in quad]
    box = (int(min(xs)), int(min(ys)), int(math.ceil(max(xs))), int(math.ceil(max(ys))))
    region = np.asarray(img.crop(box), dtype=np.float32)[..., :3] / 255.0
    light = np.clip(region / max(1e-4, np.percentile(region.mean(axis=2), 97)), 0, 1)
    rel = save_webp(Image.fromarray((light * 255).astype(np.uint8), "RGB"), "artwork/art_light.webp")
    remove_collection(col)
    manifest["art"] = {"slot": "art", "quad": quad, "light": {"file": rel, "rect": [box[0], box[1], box[2] - box[0], box[3] - box[1]]},
                       "aspect": aw / ah}


t0 = time.time()
if not args.skip_plates and not args.only:
    plates()
items()
manifest_path.write_text(json.dumps(manifest, indent=1))
print(f"done in {(time.time() - t0) / 60:.1f} min → {OUT}", flush=True)
