"""Builds assets/paradise/soil.png, the tilled loam along the bottom of the
focus session: a shaded heightmap of clods, crumbs and pebbles with a
ragged top edge.

    python gen_paradise_soil.py <repo root> <preview.png>
"""
import sys, numpy as np, random
from PIL import Image, ImageFilter, ImageDraw
REPO = sys.argv[1]
W, H = 2048, 400
rng = np.random.default_rng(11)
def vnoise(scale, w=W, h=H):
    gw, gh = int(w / scale) + 3, int(h / scale) + 3
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((int(gw * scale), int(gh * scale)), Image.BICUBIC)
    return np.asarray(im, np.float32)[:h, :w] / 255.0
# relief: clods (lumpy, cellular), crumbs and fine grain; foreshortened toward the top
yy = np.arange(H)[:, None] / H
cl = vnoise(14) ** 1.6
cl2 = vnoise(6) ** 1.4
grain = rng.random((H, W)).astype(np.float32)
height = 1.2 * cl + 0.6 * cl2 + 0.25 * vnoise(40) + 0.12 * grain
# pebbles as smooth bumps
r = random.Random(5)
peb = np.zeros((H, W), np.float32)
pm = Image.new('L', (W, H), 0); pd = ImageDraw.Draw(pm)
for i in range(70):
    x, y, s = r.uniform(0, W), r.uniform(30, H), r.uniform(3, 7)
    pd.ellipse((x - s, y - s * 0.65, x + s, y + s * 0.65), fill=255)
pm = np.asarray(pm.filter(ImageFilter.GaussianBlur(2.2)), np.float32) / 255
height += 1.4 * pm
# shade: light from the upper left
gy, gx = np.gradient(height)
nx, ny, nz = -gx * 3.0, -gy * 3.0, np.ones_like(height)
ln = np.sqrt(nx * nx + ny * ny + nz * nz)
L = np.array([-0.45, -0.65, 0.6]); L = L / np.linalg.norm(L)
shade = np.clip((nx * L[0] + ny * L[1] + nz * L[2]) / ln, 0, 1)
ao = np.clip(0.55 + 0.6 * (height - height.mean()), 0.3, 1.1)
base = np.array([108, 74, 46], np.float32)
tone = 0.82 + 0.3 * (vnoise(120) - 0.5)
col = base[None, None, :] * (0.35 + 0.95 * shade[..., None]) * ao[..., None] * tone[..., None]
peb_col = np.array([150, 138, 118], np.float32)
col = col * (1 - pm[..., None]) + peb_col * (0.45 + 0.8 * shade[..., None]) * pm[..., None]
col = col * (1.0 - 0.3 * yy[..., None])  # wetter and darker with depth
a = np.zeros((H, W, 4), np.uint8)
a[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
edge = 14 + 10 * (vnoise(50, W, 1)[0] - 0.5) * 2 + 5 * (vnoise(9, W, 1)[0] - 0.5) * 2
ys = np.arange(H)[:, None]
a[..., 3] = (np.clip((ys - edge[None, :]) * 0.5, 0, 1) * 255).astype(np.uint8)
img = Image.fromarray(a)
d = ImageDraw.Draw(img)
for i in range(320):  # crumbs spilling over the edge
    x = r.uniform(0, W); y = edge[int(x) % W] + r.uniform(-4, 4); s = r.uniform(1.5, 4)
    k = r.uniform(0.7, 1.15)
    d.ellipse((x - s, y - s * 0.8, x + s, y + s * 0.8), fill=(int(70 * k), int(47 * k), int(29 * k), 255))
    d.ellipse((x - s * 0.7, y - s * 0.8, x + s * 0.2, y - s * 0.1), fill=(int(105 * k), int(74 * k), int(46 * k), 255))
img.save(REPO + '/assets/paradise/soil.png', optimize=True)
img.crop((0, 0, 1024, 400)).save(sys.argv[2])
