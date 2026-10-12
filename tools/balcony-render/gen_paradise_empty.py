"""Clears the painted plants out of the Paradise Garden plate so a person's
own plants fill it: the flower beds, the potted plants and the herb and
vegetable beds become lawn or soil, and the lily pads and lotuses in the
pond become water. Paths, steps, balustrades, bridges, lanterns, pillars,
the gazebo, the arches, the landmark trees and the scenery stay as painted.

Within hand-drawn zones, a pixel is "plant" when it is saturated or deep in
shadow; pale stone, paths and lantern glass are not. The cleared areas are
filled with lawn, soil or water textures sampled from the painting itself,
laid in perspective and lit by the plate's own light, so they read as part
of the same painting.

    python gen_paradise_empty.py <work dir> <repo root> [--preview]
"""
import sys
import cv2
import numpy as np
from PIL import Image, ImageFilter

S, REPO = sys.argv[1], sys.argv[2]
PREVIEW = "--preview" in sys.argv
src = cv2.imread(S + "/plate_inpainted2.png")  # 1536 x 393, labels already removed
H, W = src.shape[:2]

# zones (source pixels): what may be cleared, and what fills it
LAWN = [
    # flowers: the big foreground bed, and the bed round the central tree
    [(0, 262), (40, 256), (90, 258), (130, 268), (150, 262), (195, 268), (230, 272), (250, 282), (262, 300), (262, 330), (255, 360), (250, 393), (0, 393)],
    [(196, 240), (215, 230), (262, 228), (300, 232), (338, 241), (342, 256), (320, 266), (280, 268), (240, 265), (205, 258)],
    # trees: the beds either side of the left bridge foot
    [(292, 300), (330, 296), (380, 300), (430, 318), (456, 328), (456, 393), (300, 393), (292, 360)],
    [(340, 256), (380, 252), (420, 258), (440, 272), (420, 288), (380, 292), (345, 285)],
    # fruits: the beds by the right bridge and the foreground bed
    [(1022, 302), (1060, 298), (1100, 300), (1140, 302), (1150, 330), (1150, 393), (1040, 393), (1030, 360)],
    [(1010, 248), (1060, 240), (1110, 238), (1145, 246), (1150, 290), (1110, 296), (1060, 296), (1020, 290)],
    # herbs: the foreground border and the beds among the pillars
    [(1150, 330), (1220, 322), (1300, 318), (1360, 330), (1440, 318), (1536, 300), (1536, 393), (1150, 393)],
    [(1340, 222), (1400, 220), (1470, 222), (1536, 226), (1536, 300), (1480, 298), (1440, 300), (1380, 296), (1340, 290)],
]
SOIL = [
    # herbs: the raised vegetable beds
    [(1215, 242), (1280, 238), (1342, 240), (1342, 286), (1290, 290), (1230, 290), (1215, 280)],
]
WATER = [
    # the lotus pond, around the fountain and under the bridges
    [(470, 300), (520, 285), (600, 282), (700, 282), (800, 280), (900, 282), (940, 300), (990, 330), (1000, 393), (470, 393)],
]
# never touched: lantern bodies and glass, the fountain's glowing lotus
PROTECT = [
    (262, 262, 292, 340), (258, 340, 286, 393), (455, 318, 482, 364), (488, 236, 500, 258),
    (976, 236, 994, 262), (1066, 248, 1092, 292), (1004, 328, 1032, 364), (1084, 336, 1116, 393),
    (1155, 288, 1180, 330), (1220, 278, 1250, 322), (1488, 248, 1512, 290), (1424, 244, 1446, 280),
    (700, 262, 775, 306), (918, 292, 1062, 335),
]


def poly_mask(polys):
    m = np.zeros((H, W), np.uint8)
    for p in polys:
        cv2.fillPoly(m, [np.array(p, np.int32)], 255)
    return m


hsv = cv2.cvtColor(src, cv2.COLOR_BGR2HSV).astype(np.float32)
hue, sat, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
protect = np.zeros((H, W), np.uint8)
for x0, y0, x1, y1 in PROTECT:
    protect[y0:y1, x0:x1] = 255

# a plant: saturated colour (leaves and flowers) or the deep shade between leaves
plantish = ((sat > 0.32) | (val < 0.26)).astype(np.uint8) * 255
# water is blue-cyan; in the pond, plants are what is not water
waterish = (((hue > 170) & (hue < 230) & (sat > 0.25)) | ((sat < 0.25) & (val > 0.6))).astype(np.uint8) * 255


def clean(m, close=5, open_=3, min_area=40):
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((open_, open_), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    out = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= min_area:
            out[lab == i] = 255
    return out


zl, zs, zw = poly_mask(LAWN), poly_mask(SOIL), poly_mask(WATER)
m_lawn = clean(cv2.bitwise_and(plantish, zl)) & ~protect
m_soil = clean(cv2.bitwise_and(plantish, zs)) & ~protect
m_water = clean(cv2.bitwise_and(255 - waterish, zw), close=3, open_=3, min_area=12) & ~protect
# grow a touch so petals' bright rims go too
m_lawn = cv2.dilate(m_lawn, np.ones((3, 3), np.uint8)) & zl & ~protect
m_soil = cv2.dilate(m_soil, np.ones((3, 3), np.uint8)) & zs & ~protect
m_water = cv2.dilate(m_water, np.ones((3, 3), np.uint8)) & zw & ~protect

if PREVIEW:
    ov = src.copy()
    ov[m_lawn > 0] = (ov[m_lawn > 0] * 0.3 + np.array([0, 255, 255]) * 0.7).astype(np.uint8)
    ov[m_soil > 0] = (ov[m_soil > 0] * 0.3 + np.array([0, 80, 160]) * 0.7).astype(np.uint8)
    ov[m_water > 0] = (ov[m_water > 0] * 0.3 + np.array([255, 0, 255]) * 0.7).astype(np.uint8)
    for z, c in ((zl, (0, 255, 0)), (zs, (0, 128, 255)), (zw, (255, 255, 0))):
        cs, _ = cv2.findContours(z, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(ov, cs, -1, c, 1)
    for x0, y0, x1, y1 in PROTECT:
        cv2.rectangle(ov, (x0, y0), (x1, y1), (0, 0, 255), 1)
    cv2.imwrite(S + "/empty_masks.png", cv2.resize(ov, (W * 2, H * 2), interpolation=cv2.INTER_NEAREST))
    print("lawn", int((m_lawn > 0).sum()), "soil", int((m_soil > 0).sum()), "water", int((m_water > 0).sum()))
    sys.exit(0)

# ---- fill ------------------------------------------------------------------------------
rng = np.random.default_rng(7)
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
# perspective: things further back (higher on the plate) are smaller
depth = np.clip((ys - 200) / (H - 200), 0.05, 1.0)


def _grid(cell_y, cell_x):
    gh, gw = int(H / cell_y) + 3, int(W / cell_x) + 3
    g = rng.random((gh, gw)).astype(np.float32)
    return cv2.resize(g, (int(gw * cell_x), int(gh * cell_y)), interpolation=cv2.INTER_CUBIC)[:H, :W]


def noise(scale, aniso=1.0):
    """Value noise; the grain is `scale` px near the bottom and finer toward the
    horizon (two octaves blended by depth, so nothing aliases). aniso > 1 makes
    upright strokes, aniso < 1 long horizontal ones."""
    near = _grid(scale * max(1, aniso), scale / max(1, 1 / aniso) if aniso < 1 else scale / aniso * aniso)
    far = _grid(scale * 0.45 * max(1, aniso), scale * 0.45 / max(1, 1 / aniso) if aniso < 1 else scale * 0.45)
    if aniso < 1:
        near = _grid(scale, scale / aniso)
        far = _grid(scale * 0.45, scale * 0.45 / aniso)
    elif aniso > 1:
        near = _grid(scale * aniso, scale)
        far = _grid(scale * 0.45 * aniso, scale * 0.45)
    return near * depth + far * (1 - depth)


src_f = src.astype(np.float32) / 255
lum = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
light = cv2.GaussianBlur(lum, (0, 0), 14)
light = np.clip(light / max(1e-3, np.percentile(light[m_lawn > 0], 60)), 0.55, 1.45)

# lawn: painted grass, its colours taken from the plate's own lawn, short upright
# strokes that shrink toward the horizon, lit by the plate's light
# the painting has no bare lawn to copy, so the palette follows its foliage:
# deep shade, mid green, and the warm gold the sunset lays on the grass
pal = np.array([[[34, 74, 38]], [[52, 108, 58]], [[74, 150, 112]]], np.uint8)  # BGR
lab_pal = cv2.cvtColor(pal, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
ref_mean, ref_std = lab_pal.mean(0), np.maximum(lab_pal.std(0), 4)
blades = 0.62 * noise(1.4, aniso=3.0) + 0.26 * noise(4.5) + 0.12 * noise(20)
tuft = cv2.GaussianBlur(blades, (0, 0), 0.6)
L = ref_mean[0] + (tuft - tuft.mean()) / max(1e-3, tuft.std()) * ref_std[0] * 0.55
A = ref_mean[1] + (noise(30) - 0.5) * ref_std[1] * 0.8
B = ref_mean[2] + (noise(40) - 0.5) * ref_std[2] * 0.8
lawn_lab = np.dstack([L, A, B]).clip(0, 255).astype(np.uint8)
lawn = cv2.cvtColor(lawn_lab, cv2.COLOR_LAB2BGR).astype(np.float32) / 255
# the painting's own shading (softened) shapes the ground: mounds, dips, shadows of the pillars
shade = cv2.GaussianBlur(lum, (0, 0), 3.0)
shade = np.clip(shade / max(1e-3, np.percentile(shade[m_lawn > 0], 55)), 0.45, 1.5) ** 0.55
lawn = lawn * (light[..., None] ** 0.9) * shade[..., None]
sun = np.clip(1 - np.hypot((xs - 820) / 900, (ys - 120) / 420), 0, 1) ** 2
lawn = lawn + sun[..., None] * np.array([0.02, 0.07, 0.12], np.float32)
# beds sit into the ground: the far edge of each cleared patch falls into shadow
edge = cv2.GaussianBlur((m_lawn > 0).astype(np.float32), (0, 0), 4)
lawn = lawn * (0.72 + 0.28 * edge[..., None])
soil_c = np.array([36, 58, 86], np.float32) / 255
soil = soil_c * (0.7 + 0.55 * noise(4)[..., None]) * (light[..., None] ** 1.1)

# water: the pond's own colours spread across the cleared area, then long ripples
wmask = ((waterish > 0) & (zw > 0) & (m_water == 0)).astype(np.float32)
num = cv2.GaussianBlur(src_f * wmask[..., None], (0, 0), 5)
den = cv2.GaussianBlur(wmask, (0, 0), 5)[..., None]
near = num / np.maximum(den, 1e-3)
num2 = cv2.GaussianBlur(src_f * wmask[..., None], (0, 0), 18)
den2 = cv2.GaussianBlur(wmask, (0, 0), 18)[..., None]
far = num2 / np.maximum(den2, 1e-3)
water = np.where(den > 0.15, near, far)
rip = 0.6 * noise(4, aniso=0.18) + 0.4 * noise(12, aniso=0.3)
water = water * (0.86 + 0.28 * rip[..., None])
glint = np.clip((noise(2.5, aniso=0.15) - 0.8) * 5, 0, 1)[..., None] * (light[..., None] > 1.0)
water = water + glint * np.array([0.6, 0.78, 0.95], np.float32) * 0.25

out = src_f.copy()
ragged = noise(2.5)
for m, fill, feather in ((m_lawn, lawn, 1.2), (m_soil, soil, 1.0), (m_water, water, 1.6)):
    a = cv2.GaussianBlur((m > 0).astype(np.float32), (0, 0), feather * 1.6)
    # a ragged edge, like grass meeting a path, not a cut-out
    a = np.clip((a - 0.5) * 1.8 + (ragged - 0.5) * 0.6 + 0.5, 0, 1)[..., None]
    out = out * (1 - a) + np.clip(fill, 0, 1) * a
out8 = (np.clip(out, 0, 1) * 255).astype(np.uint8)
cv2.imwrite(S + "/plate_empty.png", out8)
rgb = Image.fromarray(cv2.cvtColor(out8, cv2.COLOR_BGR2RGB))
rgb.resize((3840, 983), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)).save(REPO + "/assets/paradise/plate_full.webp", quality=86, method=6)
rgb.resize((1152, 295), Image.LANCZOS).save(REPO + "/assets/paradise/plate_thumb.webp", quality=80, method=6)
print("written")
