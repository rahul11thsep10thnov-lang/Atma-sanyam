"""Builds assets/paradise/growth_bg.webp, the soft-focus sunset garden behind
the focus session, from the cleaned plate (<work>/plate_inpainted2.png,
written by gen_paradise_plate.py).

    python gen_paradise_growth_bg.py <work dir> <repo root>
"""
import sys, math, random
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
S, REPO = sys.argv[1], sys.argv[2]
src = Image.open(S + '/plate_inpainted2.png').convert('RGB')
W, H = 1080, 1920
# 1. sky: the reference's sunset, lavender overhead to peach-gold at the horizon
stops = [(0.0, (150, 146, 206)), (0.28, (214, 170, 214)), (0.5, (246, 190, 196)), (0.66, (255, 214, 172))]
ys = np.linspace(0, 1, H)
sky = np.zeros((H, 3))
for i in range(3):
    sky[:, i] = np.interp(ys, [s_[0] for s_ in stops], [s_[1][i] for s_ in stops])
sky = np.repeat(sky[:, None, :], W, axis=1)
yy, xx = np.mgrid[0:H, 0:W]
d = np.sqrt(((xx - 640) / 700.0) ** 2 + ((yy - 900) / 520.0) ** 2)
glow = np.clip(1 - d, 0, 1) ** 2.0
sky = sky + (np.array([255, 246, 222]) - sky) * 0.6 * glow[..., None]
img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8))
# 2. the garden, soft-focus: gazebo, falls, pond, and the sky and peaks above them
crop = src.crop((540, 0, 1000, 393))
scale = W / crop.width
band = crop.resize((W, int(crop.height * scale)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
by = H - band.height - 110
mask = np.ones((band.height, W), float)
fade = 420
mask[:fade] = np.linspace(0, 1, fade)[:, None] ** 1.4
img.paste(band, (0, by), Image.fromarray((mask * 255).astype(np.uint8)))
# 3. below the garden: its lowest rows, softly continued down to where the soil sits
low = band.crop((0, band.height - 40, W, band.height)).resize((W, H - (by + band.height) + 20), Image.BILINEAR).filter(ImageFilter.GaussianBlur(14))
img.paste(low, (0, by + band.height - 20))
# 4. bokeh: soft discs of light drifting in the air
rng = random.Random(7)
bok = Image.new('RGBA', (W, H), (0, 0, 0, 0))
dr = ImageDraw.Draw(bok)
for i in range(14):
    x, y, r = rng.uniform(0, W), rng.uniform(H * 0.45, H * 0.82), rng.uniform(8, 26)
    c = rng.choice([(255, 236, 200), (255, 210, 225), (255, 246, 220)])
    dr.ellipse((x - r, y - r, x + r, y + r), fill=c + (int(rng.uniform(30, 60)),))
bok = bok.filter(ImageFilter.GaussianBlur(6))
img = Image.alpha_composite(img.convert('RGBA'), bok).convert('RGB')
# 5. a gentle vignette and a whisper of warmth
v = np.clip(np.sqrt(((xx - W / 2) / (W * 0.8)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2), 0, 1)
arr = np.array(img).astype(float) * (1 - 0.1 * v[..., None] ** 2)
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
img.save(REPO + '/assets/paradise/growth_bg.webp', quality=84, method=6)
img.resize((270, 480)).save(S + '/gbg.png')
