"""Render a space (garden or room) in one lighting state: the plates, then
every object in every slot it can stand in, with its own shadows.

    python render_space.py --space garden --state morning [--scale 1.0]
        [--plate-samples 96] [--item-samples 40] [--only substring] [--skip-plates]
        [--out ../../assets/<space>]

Output: assets/<space>/<folder>/<file>__<state>.webp and manifest.json that
grows one state at a time (gen_pack.py turns it into the app module).
"""
import argparse, json, math, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection
from focusbalcony import lighting, plants, furniture, decor
from focusbalcony import materials as M

ap = argparse.ArgumentParser()
ap.add_argument("--space", required=True, choices=["garden", "room"])
ap.add_argument("--state", default="morning", choices=list(lighting.STATES))
ap.add_argument("--scale", type=float, default=1.0)
ap.add_argument("--plate-samples", type=int, default=96)
ap.add_argument("--item-samples", type=int, default=40)
ap.add_argument("--only", default=None)
ap.add_argument("--skip-plates", action="store_true")
ap.add_argument("--skip-items", action="store_true")
ap.add_argument("--fresh", action="store_true", help="re-render even when a sidecar from an earlier run exists")
ap.add_argument("--out", default=None)
ap.add_argument("--quality", type=int, default=86)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = pathlib.Path(args.out) if args.out else ROOT / "assets" / args.space
TMP = OUT / "_tmp"
STATE = args.state
W, H = int(round(1080 * args.scale)), int(round(2340 * args.scale))

if args.space == "garden":
    from focusbalcony import garden as space, garden_items as items_mod, garden_catalog as catalog
    FOLDERS = ("environment", "terrain", "trees", "plants", "flowers", "furniture", "decor", "lighting", "weather", "animations", "artwork", "fixtures")
    FOLDER = {"PLANTS": "plants", "TREES": "trees", "FURNITURE": "furniture", "DECOR": "decor", "LIGHTING": "lighting",
              "STRUCTURE": "decor", "FIXTURE": "fixtures", "WALL_ART": "artwork", "PENALTY": "fixtures"}
    PLATE_COLS = ("terrain", "boundary", "trees", "architecture")  # the garden base
    CATCHERS = ("terrain", "boundary", "trees", "architecture")
else:
    from focusbalcony import room as space, room_items as items_mod, room_catalog as catalog
    FOLDERS = ("architecture", "environment", "bed", "furniture", "plants", "decor", "artwork", "lighting", "weather", "animations", "fixtures")
    FOLDER = {"FURNITURE": "furniture", "LIGHTING": "lighting", "TEXTILES": "decor", "RUGS": "decor", "PLANTS": "plants", "FLOWERS": "plants",
              "VASES": "decor", "BOWLS": "decor", "NATURAL": "decor", "CANDLES": "lighting", "BOOKS": "decor", "VINTAGE": "decor",
              "INDIAN": "decor", "LUXURY": "decor", "MIRRORS": "decor", "POTTERY": "decor", "ART": "artwork", "WALL_ART": "artwork",
              "PENALTY": "fixtures"}
    PLATE_COLS = ("architecture", "bed", "interior")
    CATCHERS = ("architecture", "bed", "interior")

for sub in FOLDERS + ("_tmp",):
    (OUT / sub).mkdir(parents=True, exist_ok=True)
from focusbalcony import garden_items as _garden_items
BUILDERS = {**plants.BUILDERS, **furniture.BUILDERS, **decor.BUILDERS, **_garden_items.BUILDERS, **items_mod.BUILDERS}

manifest_path = OUT / "manifest.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest.update({"version": 2, "space": args.space, "plate": {"width": W, "height": H}})
manifest.setdefault("states", {})
manifest.setdefault("items", {})
manifest.setdefault("slots", {})
manifest["states"].setdefault(STATE, {})

# ---------------------------------------------------------------------------
clear_scene()
M._cache.clear()
space.build_all(W, H, STATE)
space.configure_render(args.plate_samples, state=STATE) if args.space == 'room' else space.configure_render(args.plate_samples)
sc = bpy.context.scene
sc.render.use_persistent_data = True  # keep the scene synced between the many item renders
cam = sc.camera
COLS = {c.name: c for c in bpy.data.collections}
sun_dir = lighting.sun_direction(STATE, getattr(space, "AZIMUTH", {}).get(STATE)) if lighting.STATES[STATE]["sun"] > 0 else None


def objs(name):
    return list(COLS[name].all_objects) if name in COLS else []


def visible(name, camera=True):
    for o in objs(name):
        o.visible_camera = camera


def catcher(name, on):
    for o in objs(name):
        if o.type == "MESH":
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
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError as ex:
        print(f"  render failed for {path.name} with border {border}: {ex}", flush=True)
        raise
    print(f"  rendered {path.name} in {time.time() - t:.1f}s", flush=True)
    return Image.open(path)


def save_webp(img, rel, lossless=False):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=args.quality, method=6, lossless=lossless)
    return rel


def crop_alpha(img):
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 2)
    if len(xs) == 0:
        return None, None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    return img.crop((x0, y0, x1, y1)), [x0, y0, x1 - x0, y1 - y0]


# ---------------------------------------------------------------------------
def plates():
    print(f"== plates {args.space}/{STATE}", flush=True)
    st = manifest["states"][STATE]
    # sky: everything but the world hidden from the camera
    for c in COLS:
        visible(c, False)
    img = render(TMP / f"sky_{STATE}.png", 16, False)
    st["sky"] = {"file": save_webp(img, f"environment/sky__{STATE}.webp"), "rect": [0, 0, W, H]}
    # landscape beyond, alpha = sky
    visible("landscape", True)
    img = render(TMP / f"landscape_{STATE}.png", 48, True)
    st["landscape"] = {"file": save_webp(img, f"environment/landscape__{STATE}.webp"), "rect": [0, 0, W, H]}
    # the base: everything but the landscape, alpha = open air
    visible("landscape", False)
    for c in PLATE_COLS:
        visible(c, True)
    img = render(TMP / f"base_{STATE}.png", args.plate_samples, True)
    st["base"] = {"file": save_webp(img, f"{'terrain' if args.space == 'garden' else 'architecture'}/base__{STATE}.webp"), "rect": [0, 0, W, H]}
    # where the sun falls: lit minus unlit, normalised
    if sun_dir is not None:
        sun = next((o for o in sc.objects if o.type == "LIGHT" and o.data.type == "SUN"), None)
        strength = sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value
        sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
        for o in sc.objects:
            if o.type == "LIGHT" and o is not sun:
                o.hide_render = True
        lit = np.asarray(render(TMP / f"sun_{STATE}.png", 24, False).convert("RGB"), dtype=np.float32).mean(axis=2)
        sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = strength
        for o in sc.objects:
            if o.type == "LIGHT":
                o.hide_render = False
        m = np.clip(lit / max(1.0, np.percentile(lit, 99)), 0, 1)
        st["sunMask"] = {"file": save_webp(Image.fromarray((m * 255).astype(np.uint8), "L"), f"lighting/sun_mask__{STATE}.webp"), "rect": [0, 0, W, H]}
    if STATE == "morning":
        clouds(st)
        dust(st)
    if STATE == "rain":
        rain_streaks(st)


def periodic_noise(h, w, beta, rng):
    f = np.fft.fft2(rng.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    k = np.sqrt(fx ** 2 + fy ** 2)
    k[0, 0] = 1.0
    f = f / (k ** (beta / 2))
    f[0, 0] = 0
    n = np.real(np.fft.ifft2(f))
    n = (n - n.min()) / (n.max() - n.min())
    return n


def clouds(st):
    rng = np.random.default_rng(7)
    h, w = H // 3, W * 2
    n = periodic_noise(h, w, 3.2, rng)
    density = np.clip((n - 0.5) * 2.4, 0, 1)
    density *= np.linspace(0.0, 1.0, h)[:, None] ** 0.6
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = 250
    rgba[..., 3] = (density * 150).astype(np.uint8)
    rel = save_webp(Image.fromarray(rgba, "RGBA"), "animations/clouds.webp")
    manifest["clouds"] = {"file": rel, "width": w, "height": h, "top": 0, "rect": [0, 0, W, h]}


def dust(st):
    size = 32
    y, x = np.mgrid[0:size, 0:size]
    d = np.sqrt((x - size / 2 + 0.5) ** 2 + (y - size / 2 + 0.5) ** 2) / (size / 2)
    a = np.clip(1 - d, 0, 1) ** 2
    rgba = np.zeros((size, size, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (a * 255).astype(np.uint8)
    manifest["dust"] = save_webp(Image.fromarray(rgba, "RGBA"), "animations/dust.webp")


def rain_streaks(st):
    """A tall tile of thin, slightly slanted raindrop streaks, looped
    vertically in the app."""
    rng = np.random.default_rng(11)
    w, h = 540, 1200
    img = np.zeros((h, w), np.float32)
    for _ in range(900):
        x = rng.uniform(0, w)
        y = rng.uniform(0, h)
        L = rng.uniform(18, 46)
        a = rng.uniform(0.25, 0.7)
        for t in np.linspace(0, 1, int(L)):
            xx = int(x + t * L * 0.08) % w
            yy = int(y + t * L) % h
            img[yy, xx] = max(img[yy, xx], a * (0.4 + 0.6 * t))
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = 235
    rgba[..., 3] = (np.clip(img, 0, 1) * 170).astype(np.uint8)
    manifest["rain"] = {"file": save_webp(Image.fromarray(rgba, "RGBA"), "weather/rain.webp"), "width": w, "height": h}


# ---------------------------------------------------------------------------
def shadow_hits(p):
    """Where the sun shadow of p lands on the ground (and the room's walls)."""
    if sun_dir is None:
        return []
    d = sun_dir
    hits = []
    if d.z > 1e-4:
        hits.append(p - d * (p.z / d.z))
    if args.space == "room":
        from focusbalcony.room import HW, HD
        if d.x > 1e-4:
            hits.append(p - d * ((p.x + HW) / d.x))
        if d.x < -1e-4:
            hits.append(p - d * ((p.x - HW) / d.x))
        if d.y < -1e-4:
            hits.append(p - d * ((p.y - HD) / d.y))
    return [q for q in hits if q.z >= -0.01]


def border_for(item_col):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in item_col.all_objects:
        if o.type != "MESH":
            continue
        e = o.evaluated_get(dg)
        for c in e.bound_box:
            w_ = o.matrix_world @ Vector(c)
            pts.append(w_)
            pts.extend(shadow_hits(w_))
        if o.type == "LIGHT":
            pass
    # lamps light their surroundings: give lit items room
    lit = any(o.type == "LIGHT" for o in item_col.all_objects)
    xs, ys = [], []
    for p in pts:
        v = world_to_camera_view(sc, cam, p)
        if v.z > 0:
            xs.append(v.x)
            ys.append(v.y)
    if not xs or max(xs) < 0 or min(xs) > 1 or max(ys) < 0 or min(ys) > 1:
        return None  # entirely off screen
    m = 0.03 if not lit else 0.18
    x0, y0, x1, y1 = min(xs) - m, min(ys) - m, max(xs) + m, max(ys) + m
    # Blender refuses borders under a few pixels
    if x1 - x0 < 0.08:
        x0, x1 = (x0 + x1) / 2 - 0.04, (x0 + x1) / 2 + 0.04
    if y1 - y0 < 0.08:
        y0, y1 = (y0 + y1) / 2 - 0.04, (y0 + y1) / 2 + 0.04
    return (max(0, x0), max(0, y0), min(1, x1), min(1, y1))


def remove_collection(col):
    for o in list(col.all_objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(col)
    for m_ in list(bpy.data.meshes):
        if m_.users == 0:
            bpy.data.meshes.remove(m_)
    for l_ in list(bpy.data.lights):
        if l_.users == 0:
            bpy.data.lights.remove(l_)


def render_item(item_id, builder, kwargs, slot_id, rz, variant, folder, key):
    # resume: every finished render leaves a sidecar next to its PNG so an interrupted
    # queue can pick up where it stopped without re-rendering
    side = TMP / f"{key}__{STATE}.json"
    if not args.fresh and side.exists() and (OUT / f"{folder}/{key}__{STATE}.webp").exists():
        print(f"  kept {key} (already rendered)", flush=True)
        return json.loads(side.read_text())
    slot = catalog.SLOTS[slot_id]
    col = collection(f"item_{key}")
    kw = dict(kwargs)
    if item_id in catalog.LIT_ITEMS:
        kw["lit"] = lighting.lamps_on(STATE)
    root = BUILDERS[builder](col, **kw)
    root.location = slot["pos"]
    rot = slot.get("rot", 0) + rz
    root.rotation_euler = (0, 0, rot * DEG)
    bpy.context.view_layer.update()
    border = border_for(col)
    if border is None:
        print(f"  skipped {key}: off screen", flush=True)
        remove_collection(col)
        return None
    img = render(TMP / f"{key}.png", args.item_samples, True, border)
    cropped, rect = crop_alpha(img.convert("RGBA"))
    entry = None
    if cropped is not None:
        rel = save_webp(cropped, f"{folder}/{key}__{STATE}.webp")
        pivot = to_px(root.location)
        dist = (Vector(slot["pos"]) - cam.location).length
        entry = {"file": rel, "rect": rect, "pivot": [round(pivot[0], 1), round(pivot[1], 1)], "depth": round(dist, 3), "rotation": rz}
        sway = root.get("sway")
        if sway:
            entry["sway"] = {k: (v if isinstance(v, str) else float(v)) for k, v in dict(sway).items()}
        art = root.get("art_frame")
        if art or builder == "art_frame":
            fr = bpy.data.objects[art] if art else root
            aw, ah = fr["art_size"]
            inset = fr["art_inset_y"]
            mw = fr.matrix_world
            corners = [mw @ Vector((-aw / 2, inset, ah / 2)), mw @ Vector((aw / 2, inset, ah / 2)), mw @ Vector((aw / 2, inset, -ah / 2)), mw @ Vector((-aw / 2, inset, -ah / 2))]
            entry["artQuad"] = [[round(c, 1) for c in to_px(p)] for p in corners]
    remove_collection(col)
    side.write_text(json.dumps(entry))
    return entry


def set_variant(rec, slot_id, variant, entry):
    """Store a state's render inside the item's variant record."""
    vs = rec["variants"].setdefault(slot_id, [])
    while len(vs) <= variant:
        vs.append({"rotation": 0, "files": {}})
    v = vs[variant]
    if entry:
        v["rotation"] = entry["rotation"]
        v["pivot"] = entry["pivot"]
        v["depth"] = entry["depth"]
        if "sway" in entry:
            v["sway"] = entry["sway"]
        if "artQuad" in entry:
            v["artQuad"] = entry["artQuad"]
        v.setdefault("files", {})[STATE] = {"file": entry["file"], "rect": entry["rect"]}


def items():
    print(f"== items {args.space}/{STATE}", flush=True)
    visible("landscape", False)
    for c in PLATE_COLS:
        visible(c, True)
        catcher(c, True)
    for sid, s in catalog.SLOTS.items():
        px = to_px(s["pos"])
        rec = {"kind": s["kind"], "group": s["group"], "label": s["label"], "anchor": [round(px[0], 1), round(px[1], 1)],
               "depth": round((Vector(s["pos"]) - cam.location).length, 3)}
        if s.get("requires"):
            rec["requires"] = s["requires"]
        manifest["slots"][sid] = rec

    # the focus plant/tree: every stage, healthy and wilted
    if not args.only or "focus" in args.only:
        if args.space == "garden":
            stages_def, builder, name = items_mod.TREE_STAGES, "kachnar", "Kachnar"
        else:
            stages_def, builder, name = [{"id": s["id"], "minutes": s["minutes"]} for s in plants.LILY_STAGES], "peace_lily", "Peace lily"
        fp = manifest.setdefault("focusPlant", {"slot": catalog.FOCUS_SLOT, "name": name, "stages": []})
        fp["stages"] = fp.get("stages") or [{"id": s["id"], "minutes": s["minutes"], "healthy": {"files": {}}, "wilted": {"files": {}}} for s in stages_def]
        for i, st in enumerate(stages_def):
            for wilted in (False, True):
                key = f"focus_{builder}__{st['id']}{'__wilted' if wilted else ''}"
                e = render_item(builder, builder, {"stage": i, "wilted": wilted}, catalog.FOCUS_SLOT, 0, 0, "plants", key)
                rec = fp["stages"][i]["wilted" if wilted else "healthy"]
                if e:
                    rec.update({"pivot": e["pivot"], "depth": e["depth"], "rotation": 0, "sway": e.get("sway")})
                    rec.setdefault("files", {})[STATE] = {"file": e["file"], "rect": e["rect"]}

    for item_id, (builder, kwargs, slots, meta) in catalog.ITEMS.items():
        if args.only and args.only not in item_id:
            continue
        rec = manifest["items"].setdefault(item_id, {})
        rec.update({k: v for k, v in meta.items()})
        rec.setdefault("variants", {})
        folder = FOLDER[meta["category"]]
        growable = meta.get("growable")
        for slot_id, rotations in slots.items():
            for vi, rz in enumerate(rotations):
                if growable:
                    # every growth stage, healthy and wilted, in this slot
                    stages = rec.setdefault("stages", {}).setdefault(slot_id, [])
                    while len(stages) < len(items_mod.GROWTH_STAGES):
                        stages.append({"id": items_mod.GROWTH_STAGES[len(stages)]["id"], "minutes": items_mod.GROWTH_STAGES[len(stages)]["minutes"],
                                       "healthy": {"files": {}}, "wilted": {"files": {}}})
                    for si, st in enumerate(items_mod.GROWTH_STAGES):
                        for wilted in ((False,) if si == 0 else (False, True)):
                            key = f"{item_id}__{slot_id}__{st['id']}{'__wilted' if wilted else ''}"
                            e = render_item(item_id, builder, {**kwargs, "stage": si, "wilted": wilted}, slot_id, rz, vi, folder, key)
                            r = stages[si]["wilted" if wilted else "healthy"]
                            if e:
                                r.update({"pivot": e["pivot"], "depth": e["depth"], "rotation": rz, "sway": e.get("sway")})
                                r.setdefault("files", {})[STATE] = {"file": e["file"], "rect": e["rect"]}
                    # the variant entry points at the flowering stage for thumbnails
                    set_variant(rec, slot_id, vi, None)
                elif meta.get("stack"):
                    for n in range(0, 5):
                        key = f"{item_id}__{slot_id}__{vi}__n{n}"
                        e = render_item(item_id, builder, {**kwargs, "count": n}, slot_id, rz, vi, folder, key)
                        stack = rec.setdefault("stackFiles", {}).setdefault(slot_id, [])
                        while len(stack) <= n:
                            stack.append({"files": {}})
                        if e:
                            stack[n].update({"pivot": e["pivot"], "depth": e["depth"]})
                            stack[n]["files"][STATE] = {"file": e["file"], "rect": e["rect"]}
                            if n == 0:
                                set_variant(rec, slot_id, vi, e)
                else:
                    key = f"{item_id}__{slot_id}__{vi}"
                    e = render_item(item_id, builder, kwargs, slot_id, rz, vi, folder, key)
                    set_variant(rec, slot_id, vi, e)
        manifest_path.write_text(json.dumps(manifest, indent=1))


t0 = time.time()
if not args.skip_plates:
    plates()
    manifest_path.write_text(json.dumps(manifest, indent=1))
if not args.skip_items:
    items()
manifest_path.write_text(json.dumps(manifest, indent=1))
print(f"done {args.space}/{STATE} in {(time.time() - t0) / 60:.1f} min → {OUT}", flush=True)
