"""Post-process a rendered space pack (v2: lighting states) and write the
app's asset module.

    python3 gen_space_pack.py <space> [pack dir] [ts out]

For every rendered state: crop sky/landscape to the open air of that
state's base plate, turn the sun mask into a warm alpha layer, feather the
shadow edges of every object layer. Then a preview photograph and in-place
thumbnails (morning), and src/spaces/packs/<space>.generated.ts with a
literal require() per image. Plain Python + Pillow + NumPy.

The balcony's v1 manifest is upgraded to the same shape (one state,
"morning") so one engine draws all three spaces.
"""
import json, os, pathlib, sys
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from compose_space import compose

ROOT = pathlib.Path(__file__).resolve().parents[2]
space = sys.argv[1]
pack = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "assets" / space
ts_out = pathlib.Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "src" / "spaces" / "packs" / f"{space}.generated.ts"
m = json.loads((pack / "manifest.json").read_text())
Q = 86


# ---- v1 (balcony) → v2 ------------------------------------------------------------
def upgrade_v1(m):
    L = m["layers"]
    st = {"sky": L["sky"], "landscape": L["landscape"], "base": {"file": L["architecture"], "rect": [0, 0, m["plate"]["width"], m["plate"]["height"]]}}
    if isinstance(L.get("sunMask"), dict):
        st["sunMask"] = L["sunMask"]
    out = {"version": 2, "space": "balcony", "plate": m["plate"], "states": {"morning": st}, "renderedStates": ["morning"],
           "slots": m["slots"], "items": {}, "clouds": L.get("clouds"), "dust": L.get("dust"), "preview": m.get("preview"), "thumbs": m.get("thumbs")}
    for k in ("sunMaskDone", "artShadeDone"):
        pass
    for item_id, rec in m["items"].items():
        r = {k: v for k, v in rec.items() if k not in ("variants", "growable")}  # v1 "growable" had no stages
        r["variants"] = {}
        for slot, vs in rec["variants"].items():
            r["variants"][slot] = []
            for v in vs:
                nv = {"rotation": v.get("rotation", 0), "pivot": v["pivot"], "depth": v["depth"], "files": {"morning": {"file": v["file"], "rect": v["rect"]}}}
                if v.get("sway"):
                    nv["sway"] = v["sway"]
                if v.get("feathered"):
                    nv["feathered"] = True
                r["variants"][slot].append(nv)
        if item_id == "art_frame" and m.get("art"):
            for v in r["variants"].get("art", []):
                v["artQuad"] = m["art"]["quad"]
                if m["art"].get("shade"):
                    v["artShade"] = {"morning": m["art"]["shade"]}
        out["items"][item_id] = r
    fp = m["focusPlant"]
    stages = []
    for s in fp["stages"]:
        ns = {"id": s["id"], "minutes": s["minutes"]}
        for k in ("healthy", "wilted"):
            v = s.get(k)
            ns[k] = {"pivot": v["pivot"], "depth": v["depth"], "rotation": 0, "sway": v.get("sway"), "files": {"morning": {"file": v["file"], "rect": v["rect"]}}} if v else {"files": {}}
        stages.append(ns)
    out["focusPlant"] = {"slot": fp["slot"], "name": fp["name"], "stages": stages}
    return out


# a v1 pack (the balcony) is upgraded on every run and written beside the
# original, so the balcony renderer keeps its own manifest
manifest_out = pack / "manifest.json"
if m.get("version", 1) == 1:
    m = upgrade_v1(m)
    manifest_out = pack / "manifest.v2.json"

W, H = m["plate"]["width"], m["plate"]["height"]
m["renderedStates"] = sorted(m["states"].keys(), key=lambda s: ["morning", "afternoon", "sunset", "evening", "night", "rain"].index(s))


def bbox(mask, margin):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return [0, 0, W, H]
    mx, my = int(W * margin), int(H * margin)
    x0, y0 = max(0, xs.min() - mx), max(0, ys.min() - my)
    x1, y1 = min(W, xs.max() + 1 + mx), min(H, ys.max() + 1 + my)
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]


def is_full(layer):
    return layer["rect"][2] == W and layer["rect"][3] == H


# ---- per state: crop the far layers, warm the sun mask ----------------------------
for state, L in m["states"].items():
    if L.get("cropped"):
        continue
    base = np.array(Image.open(pack / L["base"]["file"]).convert("RGBA"))
    see = base[..., 3] < 128
    cols = np.nonzero(see.sum(axis=0) > 0.004 * H)[0]
    rows = np.nonzero(see.sum(axis=1) > 0.004 * W)[0]
    core = np.zeros_like(see)
    if len(cols) and len(rows):
        core[rows.min():rows.max() + 1, cols.min():cols.max() + 1] = True
    open_air = bbox(see & core, 0.03)
    x, y, w, h = open_air
    outside = np.ones_like(see)
    outside[y:y + h, x:x + w] = False
    fix = outside & (base[..., 3] < 255)
    if fix.any():
        base[..., 3][fix] = 255
        Image.fromarray(base, "RGBA").save(pack / L["base"]["file"], "WEBP", quality=Q, method=6)
    for key in ("sky", "landscape"):
        if is_full(L[key]):
            img = Image.open(pack / L[key]["file"])
            img.crop((x, y, x + w, y + h)).save(pack / L[key]["file"], "WEBP", quality=Q, method=6)
            L[key]["rect"] = open_air
    if L.get("sunMask") and is_full(L["sunMask"]):
        lum = np.asarray(Image.open(pack / L["sunMask"]["file"]).convert("L"))
        r = bbox(lum > 8, 0.0)
        a_ = lum[r[1]:r[1] + r[3], r[0]:r[0] + r[2]]
        rgba = np.zeros(a_.shape + (4,), np.uint8)
        rgba[..., 0], rgba[..., 1], rgba[..., 2], rgba[..., 3] = 255, 243, 222, a_
        Image.fromarray(rgba, "RGBA").save(pack / L["sunMask"]["file"], "WEBP", quality=80, method=6)
        L["sunMask"]["rect"] = r
    L["cropped"] = True
    L["openAir"] = open_air
if m.get("clouds") and m["clouds"].get("top", 0) == 0 and "morning" in m["states"]:
    c = m["clouds"]
    x, y, w, h = m["states"]["morning"]["openAir"]
    c["top"] = y
    c["rect"] = [x, y, w, min(h, c["height"])]


# ---- feather shadow edges of every object layer ------------------------------------
def feather(layer):
    if layer is None or layer.get("feathered"):
        return
    path = pack / layer["file"]
    img = np.array(Image.open(path).convert("RGBA"))
    h, w = img.shape[:2]
    rx, ry = layer["rect"][0], layer["rect"][1]
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
    k = k * k * (3 - 2 * k)
    a = img[..., 3].astype(np.float32)
    shadow = a < 250
    a[shadow] = a[shadow] * k[shadow]
    a[a < 3] = 0
    img[..., 3] = a.astype(np.uint8)
    Image.fromarray(img, "RGBA").save(path, "WEBP", quality=Q, method=6)
    layer["feathered"] = True


CLEAN_VERSION = 2
LAMP_STATES = {"evening", "night"}


def clean_shadow(layer, state="morning", lit=False):
    """Denoise the caught-shadow alpha of an object layer.

    Cycles denoises colour but not the shadow catcher's alpha, so at low
    sample counts a faint speckle of 1-10/255 alpha covers the whole crop
    (very visible on plain walls). Shadow pixels are dark with partial
    alpha; the object's own pixels (opaque or coloured) are left alone.

    A lit item in a lamp-lit state throws its own light onto the catcher,
    which Cycles folds into the alpha as a dark veil over the whole crop;
    those layers keep no caught shadow at all. Night shadows of unlit items
    are faint under moonlight, so they are reduced."""
    if layer is None or layer.get("cleaned") == CLEAN_VERSION:
        return
    path = pack / layer["file"]
    img = np.array(Image.open(path).convert("RGBA"))
    a = img[..., 3]
    rgb_max = img[..., :3].max(axis=2)
    shadow = (a < 250) & (rgb_max < 60)
    if shadow.any():
        if lit and state in LAMP_STATES:
            cleaned = a.copy()
            cleaned[shadow] = 0
        else:
            al = Image.fromarray(a, "L")
            med = np.array(al.filter(ImageFilter.MedianFilter(5)))
            soft = np.array(Image.fromarray(med, "L").filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
            if state == "night":
                soft = soft * 0.35
            cleaned = np.where(shadow, soft, a).astype(np.uint8)
            cleaned[(cleaned < 12) & shadow] = 0
        img[..., 3] = cleaned
        Image.fromarray(img, "RGBA").save(path, "WEBP", quality=Q, method=6)
    layer["cleaned"] = CLEAN_VERSION


def each_variant_layer():
    """Yield (variant record, state, layer, lit) for every object layer."""
    for rec in m["items"].values():
        lit = bool(rec.get("lit"))
        for vs in rec.get("variants", {}).values():
            for v in vs:
                for st, f in v.get("files", {}).items():
                    yield v, st, f, lit
        for stages in rec.get("stages", {}).values():
            for stg in stages:
                for k in ("healthy", "wilted"):
                    for st, f in stg.get(k, {}).get("files", {}).items():
                        yield stg[k], st, f, lit
        for stack in rec.get("stackFiles", {}).values():
            for n in stack:
                for st, f in n.get("files", {}).items():
                    yield n, st, f, lit
    for stg in m["focusPlant"]["stages"]:
        for k in ("healthy", "wilted"):
            for st, f in stg.get(k, {}).get("files", {}).items():
                yield stg[k], st, f, False


for v, st, f, lit in each_variant_layer():
    if not v.get("feathered"):
        feather(f)
    clean_shadow(f, st, lit)
for v, st, f, lit in each_variant_layer():
    v["feathered"] = True
    v["cleaned"] = CLEAN_VERSION

# ---- art shade: the light on each frame opening, as a dark veil ---------------------
# (the frame's own layer is rendered with a white canvas; the opening's
# brightness becomes alpha so the artwork sits in the scene's light)
for item_id, rec in m["items"].items():
    if not rec.get("art"):
        continue
    for slot, vs in rec["variants"].items():
        for v in vs:
            if not v.get("artQuad"):
                continue
            v.setdefault("artShade", {})
            for state, f in v["files"].items():
                if state in v["artShade"]:
                    continue
                q = v["artQuad"]
                xs, ys = [p[0] for p in q], [p[1] for p in q]
                x0, y0, x1, y1 = int(min(xs)), int(min(ys)), int(max(xs)) + 1, int(max(ys)) + 1
                full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                full.paste(Image.open(pack / f["file"]).convert("RGBA"), tuple(f["rect"][:2]))
                region = np.asarray(full.crop((x0, y0, x1, y1)), dtype=np.float32)[..., :3] / 255.0
                light = region.mean(axis=2)
                light = np.clip(light / max(1e-3, np.percentile(light, 97)), 0, 1)
                rgba = np.zeros(light.shape + (4,), np.uint8)
                rgba[..., 3] = np.clip((1.0 - light) * 255, 0, 255).astype(np.uint8)
                rel = f"artwork/{item_id}__{slot}__shade__{state}.webp"
                Image.fromarray(rgba, "RGBA").save(pack / rel, "WEBP", quality=90, method=6)
                v["artShade"][state] = {"file": rel, "rect": [x0, y0, x1 - x0, y1 - y0]}

# ---- preview and thumbnails ---------------------------------------------------------
STARTERS = {
    "balcony": [{"item": "cane_lounge_chair", "slot": "seating"}, {"item": "teak_coffee_table", "slot": "table"}, {"item": "snake_plant", "slot": "rail_mid"},
                {"item": "dhurrie_rug", "slot": "rug"}, {"item": "areca_palm", "slot": "corner_far"}, {"item": "pothos_hanging", "slot": "hang_near"}],
    "garden": [{"item": "garden_bench", "slot": "seat"}, {"item": "marigold", "slot": "bed_r", "stage": "flowering"}, {"item": "brass_lantern", "slot": "path_near"},
               {"item": "stone_urn", "slot": "house_l"}, {"item": "dustbin", "slot": "house_r", "count": 0}, {"item": "fountain", "slot": "feature"}],
    "room": [{"item": "bedside_table", "slot": "bedside"}, {"item": "table_lamp", "slot": "bedside_top"}, {"item": "side_chair", "slot": "chair"},
             {"item": "small_table", "slot": "table"}, {"item": "dhurrie_rug", "slot": "rug"}, {"item": "monstera", "slot": "corner_door"}],
}
placed = [p for p in STARTERS.get(space, []) if p["item"] in m["items"] and p["slot"] in m["items"][p["item"]].get("variants", {}) | m["items"][p["item"]].get("stages", {}) | m["items"][p["item"]].get("stackFiles", {})]
focus_stage = m["focusPlant"]["stages"][min(2, len(m["focusPlant"]["stages"]) - 1)]["id"]
preview = compose(pack, m, {"focus": {"stage": focus_stage}, "placed": placed}, "morning")
pw = 720
preview.resize((pw, round(pw * H / W)), Image.LANCZOS).save(pack / "environment" / "preview.webp", "WEBP", quality=84, method=6)
m["preview"] = "environment/preview.webp"

(pack / "thumbs").mkdir(exist_ok=True)
base = compose(pack, m, {}, "morning").convert("RGBA")
m["thumbs"] = {}
src_state = "morning" if "morning" in m["states"] else m["renderedStates"][0]
for item_id, rec in m["items"].items():
    cand = None
    if rec.get("growable") and rec.get("stages"):
        for slot, stages in rec.get("stages", {}).items():
            st = stages[-1]["healthy"]
            if src_state in st.get("files", {}):
                cand = (st["depth"], st["files"][src_state])
                break
    elif rec.get("stack"):
        for slot, stack in rec.get("stackFiles", {}).items():
            n = stack[min(2, len(stack) - 1)]
            if src_state in n.get("files", {}):
                cand = (n["depth"], n["files"][src_state])
                break
    else:
        best = None
        for slot, vs in rec.get("variants", {}).items():
            v = vs[0]
            if src_state in v.get("files", {}) and (best is None or v["depth"] < best[0]):
                best = (v["depth"], v["files"][src_state])
        cand = best
    if not cand:
        continue
    f = cand[1]
    rx, ry, rw, rh = f["rect"]
    layer = Image.open(pack / f["file"]).convert("RGBA")
    body = np.asarray(layer)[..., 3] >= 250
    ys, xs = np.nonzero(body) if body.any() else np.nonzero(np.asarray(layer)[..., 3] > 0)
    x0, x1, y0, y1 = rx + xs.min(), rx + xs.max(), ry + ys.min(), ry + ys.max()
    side = max(x1 - x0, y1 - y0, 24) * 1.3
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    img = base.copy()
    img.alpha_composite(layer, (rx, ry))
    box = [cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2]
    dx = max(0, -box[0]) - max(0, box[2] - W)
    dy = max(0, -box[1]) - max(0, box[3] - H)
    box = [box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy]
    rel = f"thumbs/{item_id}.webp"
    img.crop(tuple(int(round(b)) for b in box)).resize((240, 240), Image.LANCZOS).save(pack / rel, "WEBP", quality=84, method=6)
    m["thumbs"][item_id] = rel

manifest_out.write_text(json.dumps(m, indent=1))

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
rel_root = pathlib.Path(os.path.relpath(pack.resolve(), ts_out.resolve().parent))
lines = [
    "// GENERATED by tools/balcony-render/gen_space_pack.py — do not edit by hand.",
    "// Re-render the space (tools/balcony-render/README.md) to change it.",
    "/* eslint-disable */",
    "import type { SpacePack } from '../packTypes';",
    "",
    f"export const PACK: SpacePack = {json.dumps(m, separators=(',', ':'))} as unknown as SpacePack;",
    "",
    "export const IMAGES: Record<string, number> = {",
]
for f in sorted(files):
    lines.append(f"  {json.dumps(f)}: require({json.dumps(str(rel_root / f))}),")
lines.append("};")
ts_out.parent.mkdir(parents=True, exist_ok=True)
ts_out.write_text("\n".join(lines) + "\n")
total = sum((pack / f).stat().st_size for f in files if (pack / f).exists())
print(f"{space}: states {m['renderedStates']}; {len(files)} images, {total / 1e6:.1f} MB → {ts_out}")
