"""Post-process a rendered pack and generate the app's asset module.

    python3 gen_pack.py [pack dir] [ts out]

1. Crops sky / clouds / landscape to the open-air region the architecture
   leaves visible (plus a parallax margin) and the sun mask to where the sun
   falls, so the phone decodes megabytes instead of tens of megabytes.
2. Composites a preview photograph (environment/preview.webp) and an
   in-place thumbnail of every object (thumbs/<item>.webp) for the
   Collection.
3. Writes src/photoBalcony/pack.generated.ts: the manifest plus a static
   require() for every image (React Native bundles only literal requires).
Plain Python + Pillow + NumPy; no Blender needed.
"""
import json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
pack = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "balcony"
ts_out = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "src" / "photoBalcony" / "pack.generated.ts"
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from composite import compose
m = json.loads((pack / "manifest.json").read_text())
W, H = m["plate"]["width"], m["plate"]["height"]
L = m["layers"]
Q = 88


def bbox(mask, margin):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return [0, 0, W, H]
    mx, my = int(W * margin), int(H * margin)
    x0, y0 = max(0, xs.min() - mx), max(0, ys.min() - my)
    x1, y1 = min(W, xs.max() + 1 + mx), min(H, ys.max() + 1 + my)
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]


def is_cropped(entry):
    return isinstance(entry, dict) and "rect" in entry


arch_img = Image.open(pack / L["architecture"]).convert("RGBA")
arch_rgba = np.array(arch_img)
arch = arch_rgba[..., 3]
# open air = where the architecture is see-through; ignore specks of glass
# translucency (columns/rows with almost no transparent pixels)
see = arch < 128
cols = np.nonzero(see.sum(axis=0) > 0.004 * H)[0]
rows = np.nonzero(see.sum(axis=1) > 0.004 * W)[0]
core = np.zeros_like(see)
if len(cols) and len(rows):
    core[rows.min():rows.max() + 1, cols.min():cols.max() + 1] = True
open_air = bbox(see & core, 0.03)
x, y, w, h = open_air
# make stray translucent glass pixels outside the open air opaque, so nothing
# behind the plate can show through the doors
outside = np.ones_like(see)
outside[y:y + h, x:x + w] = False
fix = outside & (arch < 255)
if fix.any():
    arch_rgba[..., 3][fix] = 255
    Image.fromarray(arch_rgba, "RGBA").save(pack / L["architecture"], "WEBP", quality=Q, method=6)
for key in ("sky", "landscape"):
    if not is_cropped(L[key]):
        rel = L[key]
        img = Image.open(pack / rel)
        img.crop((x, y, x + w, y + h)).save(pack / rel, "WEBP", quality=Q, method=6)
        L[key] = {"file": rel, "rect": open_air}
c = L["clouds"]
if "rect" not in c:
    img = Image.open(pack / c["file"]).convert("RGBA")
    top = max(0, y - c.get("top", 0))
    bottom = min(img.height, y + h - c.get("top", 0))
    img.crop((0, top, img.width, bottom)).save(pack / c["file"], "WEBP", quality=Q, method=6)
    c.update({"rect": [x, y, w, bottom - top], "width": img.width, "height": bottom - top, "top": y})
if not is_cropped(L["sunMask"]):
    # warm sunlight whose alpha is where the sun falls: drawn with ordinary
    # alpha blending it brightens exactly the sunlit patches (no blend modes,
    # which older Android can't do)
    rel = L["sunMask"]
    lum = np.asarray(Image.open(pack / rel).convert("L"))
    r = bbox(lum > 8, 0.0)
    a_ = lum[r[1]:r[1] + r[3], r[0]:r[0] + r[2]]
    rgba = np.zeros(a_.shape + (4,), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3] = 255, 243, 222, a_
    Image.fromarray(rgba, "RGBA").save(pack / rel, "WEBP", quality=80, method=6)
    L["sunMask"] = {"file": rel, "rect": r}
art = m.get("art")
if art and "shade" not in art:
    # the light falling on the frame opening as a black veil: art under it
    # comes out multiplied by the light, with plain alpha blending
    light = np.asarray(Image.open(pack / art["light"]["file"]).convert("L"), dtype=np.float32) / 255.0
    rgba = np.zeros(light.shape + (4,), np.uint8)
    rgba[..., 3] = np.clip((1.0 - light) * 255, 0, 255).astype(np.uint8)
    rel = "artwork/art_shade.webp"
    Image.fromarray(rgba, "RGBA").save(pack / rel, "WEBP", quality=90, method=6)
    art["shade"] = {"file": rel, "rect": art["light"]["rect"]}


# ---- feather shadow edges ------------------------------------------------------
# The shadow catcher also records the faint, wide darkening an object casts on
# its surroundings (it blocks sky and bounce light). Cropping cuts that off in
# a visible rectangle, so fade the shadow alpha to nothing toward every crop
# edge that isn't the frame edge. The object itself (opaque) is untouched.
def feather(v):
    if v is None or v.get("feathered"):
        return
    path = pack / v["file"]
    img = np.array(Image.open(path).convert("RGBA"))
    h, w = img.shape[:2]
    rx, ry = v["rect"][0], v["rect"][1]
    f = max(10, int(min(w, h) * 0.16))
    ramp = lambda n: np.clip(np.arange(n, dtype=np.float32) / f, 0, 1)
    fx = np.ones(w, np.float32)
    fy = np.ones(h, np.float32)
    if rx > 0:
        fx = np.minimum(fx, ramp(w))
    if rx + w < W:
        fx = np.minimum(fx, ramp(w)[::-1])
    if ry > 0:
        fy = np.minimum(fy, ramp(h))
    if ry + h < H:
        fy = np.minimum(fy, ramp(h)[::-1])
    k = np.outer(fy, fx)
    k = k * k * (3 - 2 * k)  # smoothstep
    a = img[..., 3].astype(np.float32)
    shadow = a < 250
    a[shadow] = a[shadow] * k[shadow]
    a[a < 3] = 0
    img[..., 3] = a.astype(np.uint8)
    Image.fromarray(img, "RGBA").save(path, "WEBP", quality=Q, method=6)
    v["feathered"] = True


for rec in m["items"].values():
    for vs in rec.get("variants", {}).values():
        for v in vs:
            feather(v)
for st in m["focusPlant"]["stages"]:
    feather(st.get("healthy"))
    feather(st.get("wilted"))

# ---- preview + thumbnails -------------------------------------------------------
PREVIEW_STATE = {
    "focus": {"stage": "growing"},
    "placed": [{"item": "cane_lounge_chair", "slot": "seating"}, {"item": "teak_coffee_table", "slot": "table"},
               {"item": "snake_plant", "slot": "rail_mid"}, {"item": "dhurrie_rug", "slot": "rug"},
               {"item": "areca_palm", "slot": "corner_far"}, {"item": "pothos_hanging", "slot": "hang_near"}],
}
PREVIEW_STATE["placed"] = [p for p in PREVIEW_STATE["placed"] if p["slot"] in m["items"].get(p["item"], {}).get("variants", {})]
preview = compose(pack, m, PREVIEW_STATE)
pw = 720
preview.resize((pw, round(pw * H / W)), Image.LANCZOS).save(pack / "environment" / "preview.webp", "WEBP", quality=84, method=6)
m["preview"] = "environment/preview.webp"

(pack / "thumbs").mkdir(exist_ok=True)
base = compose(pack, m, {}).convert("RGBA")
m["thumbs"] = {}
for item_id, rec in m["items"].items():
    slots = rec.get("variants", {})
    if not slots:
        continue
    slot = max(slots, key=lambda k: -slots[k][0]["depth"])  # the nearest spot shows it largest
    v = slots[slot][0]
    rx, ry, rw, rh = v["rect"]
    layer = Image.open(pack / v["file"]).convert("RGBA")
    # the object itself is opaque; its shadow is only partly so
    body = np.asarray(layer)[..., 3] >= 250
    ys, xs = np.nonzero(body) if body.any() else np.nonzero(np.asarray(layer)[..., 3] > 0)
    x0, x1, y0, y1 = rx + xs.min(), rx + xs.max(), ry + ys.min(), ry + ys.max()
    side = max(x1 - x0, y1 - y0, 24) * 1.3
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    img = base.copy()
    img.alpha_composite(layer, (rx, ry))
    box = [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2]
    # keep the crop inside the frame
    dx = max(0, -box[0]) - max(0, box[2] - W)
    dy = max(0, -box[1]) - max(0, box[3] - H)
    box = [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy]
    rel = f"thumbs/{item_id}.webp"
    img.crop(tuple(int(round(b)) for b in box)).resize((240, 240), Image.LANCZOS).save(pack / rel, "WEBP", quality=84, method=6)
    m["thumbs"][item_id] = rel

(pack / "manifest.json").write_text(json.dumps(m, indent=1))

# ---- TypeScript module ----------------------------------------------------------
files = set()


def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == "file" and isinstance(v, str):
                files.add(v)
            else:
                walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
    elif isinstance(o, str) and o.endswith(".webp"):
        files.add(o)


walk(m)
import os
rel_root = pathlib.Path(os.path.relpath(pack.resolve(), ts_out.resolve().parent))
lines = [
    "// GENERATED by tools/balcony-render/gen_pack.py — do not edit by hand.",
    "// Re-render the balcony (tools/balcony-render/README.md) to change it.",
    "/* eslint-disable */",
    "import type { BalconyPack } from './packTypes';",
    "",
    f"export const PACK: BalconyPack = {json.dumps(m, separators=(',', ':'))};",
    "",
    "export const IMAGES: Record<string, number> = {",
]
for f in sorted(files):
    lines.append(f"  {json.dumps(f)}: require({json.dumps(str(rel_root / f))}),")
lines.append("};")
ts_out.parent.mkdir(parents=True, exist_ok=True)
ts_out.write_text("\n".join(lines) + "\n")
total = sum((pack / f).stat().st_size for f in files)
print(f"open air {open_air}; {len(files)} images, {total / 1e6:.1f} MB → {ts_out}")
