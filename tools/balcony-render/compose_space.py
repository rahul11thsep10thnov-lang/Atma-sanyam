"""Composite a space (v2 manifest: states) exactly as the app does.

    python compose_space.py <pack dir> <out.png> '<state json>' [lighting state]

state: {"focus": {"stage": "flowering", "wilted": false},
        "placed": [{"item": "garden_bench", "slot": "seat", "variant": 0, "stage": "mature", "wilted": false}, ...],
        "art": {"<slot>": "<path to artwork>"}}
"""
import json, sys, pathlib
import numpy as np
from PIL import Image, ImageDraw

GRADES = {
    # derived states: (multiply rgb, add rgb, desaturate) applied to a rendered source state
    "afternoon": ("morning", (1.08, 1.06, 1.02), (0.0, 0.0, 0.0), 0.0),
    "evening": ("sunset", (0.55, 0.45, 0.5), (0.0, 0.0, 0.02), 0.25),
}


def source_state(m, state):
    if state in m.get("renderedStates", list(m["states"].keys())):
        return state, None
    if state in GRADES and GRADES[state][0] in m["states"]:
        return GRADES[state][0], GRADES[state]
    return "morning", None


def grade(img, g):
    if g is None:
        return img
    _, mul, add, desat = g
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    rgb = a[..., :3] / 255.0
    if desat:
        lum = rgb @ np.array([0.3, 0.59, 0.11])
        rgb = rgb * (1 - desat) + lum[..., None] * desat
    rgb = rgb * np.array(mul) + np.array(add)
    a[..., :3] = np.clip(rgb, 0, 1) * 255
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def _full(pack, layer, W, H):
    img = Image.open(pack / layer["file"]).convert("RGBA")
    full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    full.paste(img, tuple(layer["rect"][:2]))
    return full


def _paste_art(canvas, pack, art_path, quad, shade=None):
    W, H = canvas.size
    a = Image.open(art_path).convert("RGB")
    dst = np.array(quad, dtype=np.float64)
    src = np.array([[0, 0], [a.width, 0], [a.width, a.height], [0, a.height]], dtype=np.float64)
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    coeffs = np.linalg.solve(np.array(A), np.array(B))
    warped = a.transform((W, H), Image.PERSPECTIVE, tuple(coeffs), Image.BICUBIC).convert("RGBA")
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in quad], fill=255)
    canvas.paste(warped, (0, 0), mask)
    if shade:
        canvas.alpha_composite(_full(pack, shade, W, H))


def compose(pack, m, state, lighting="morning"):
    pack = pathlib.Path(pack)
    W, H = m["plate"]["width"], m["plate"]["height"]
    src, g = source_state(m, lighting)
    L = m["states"][src]
    canvas = Image.new("RGBA", (W, H), (40, 34, 30, 255))
    canvas.alpha_composite(grade(_full(pack, L["sky"], W, H), g))
    c = m.get("clouds")
    if c and lighting not in ("night", "rain"):
        clouds = Image.open(pack / c["file"]).convert("RGBA")
        strip = clouds.crop((W // 3, 0, W // 3 + W, clouds.height))
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.paste(strip, (0, c["top"]))
        if "rect" in L["sky"]:
            x, y, w, h = L["sky"]["rect"]
            mask = Image.new("L", (W, H), 0)
            ImageDraw.Draw(mask).rectangle([x, y, x + w, y + h], fill=255)
            layer.putalpha(Image.fromarray(np.minimum(np.asarray(layer)[..., 3], np.asarray(mask))))
        canvas.alpha_composite(layer)
    canvas.alpha_composite(grade(_full(pack, L["landscape"], W, H), g))
    canvas.alpha_composite(grade(_full(pack, L["base"], W, H), g))

    layers = []
    for p in state.get("placed", []):
        rec = m["items"][p["item"]]
        slot = p["slot"]
        if rec.get("growable") and rec.get("stages", {}).get(slot):
            st = next(s for s in rec["stages"][slot] if s["id"] == p.get("stage", "flowering"))
            v = st["wilted" if p.get("wilted") else "healthy"]
        elif rec.get("stack"):
            v = rec["stackFiles"][slot][min(4, p.get("count", 0))]
        else:
            v = rec["variants"][slot][p.get("variant", 0)]
        layers.append((-1e9 if rec.get("flat") else -v["depth"], v, p))
    f = state.get("focus")
    if f:
        st = next(s for s in m["focusPlant"]["stages"] if s["id"] == f["stage"])
        v = st["wilted" if f.get("wilted") else "healthy"]
        layers.append((-v["depth"], v, None))
    arts = state.get("art", {})
    for _, v, p in sorted(layers, key=lambda t: t[0]):
        files = v.get("files", {})
        fsrc = src if src in files else next(iter(files), None)
        if not fsrc:
            continue
        canvas.alpha_composite(grade(_full(pack, files[fsrc], W, H), g))
        if p and v.get("artQuad") and arts.get(p["slot"]):
            _paste_art(canvas, pack, arts[p["slot"]], v["artQuad"], v.get("artShade", {}).get(fsrc))
    if lighting == "rain" and m.get("rain"):
        r = Image.open(pack / m["rain"]["file"]).convert("RGBA")
        tile = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for yy in range(0, H, r.height):
            for xx in range(0, W, r.width):
                tile.alpha_composite(r, (xx, yy))
        canvas.alpha_composite(tile)
    return canvas.convert("RGB")


if __name__ == "__main__":
    pack = pathlib.Path(sys.argv[1])
    m = json.loads((pack / "manifest.json").read_text())
    lighting = sys.argv[4] if len(sys.argv) > 4 else "morning"
    compose(pack, m, json.loads(sys.argv[3]), lighting).save(sys.argv[2])
    print("saved", sys.argv[2])
