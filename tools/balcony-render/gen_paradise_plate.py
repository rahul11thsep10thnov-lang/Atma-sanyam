"""Builds assets/paradise/plate_full.webp and plate_thumb.webp from the
reference panorama (the top band of the reference montage, 1536 x 393,
saved as <work>/plate_full_src.png): removes the montage's baked UI chips
with Poisson cloning, upscales 2.5x. Needs opencv-python-headless.

    python gen_paradise_plate.py <work dir> <repo root>
"""
# Removes the reference montage's baked UI chips from the full-view plate
# with gradient-domain (Poisson) cloning, then rebuilds the app's plate assets.
import sys, cv2, numpy as np
from PIL import Image, ImageFilter
S, REPO = sys.argv[1], sys.argv[2]
im = cv2.imread(S + '/plate_full_src.png')
P = [((8,6,264,50),(0,44)),((40,253,166,292),(0,36)),((340,253,461,292),(0,-38)),((634,335,869,374),(0,-46)),((1036,251,1212,290),(0,36)),((1339,251,1510,290),(-180,40))]
out = im.copy()
for (x0,y0,x1,y1),(dx,dy) in P:
    m=5; x0-=m;y0-=m;x1+=m;y1+=m; x0=max(1,x0);y0=max(1,y0)
    w,h=x1-x0,y1-y0
    src=out[y0+dy:y1+dy, x0+dx:x1+dx].copy()[:, ::-1]
    mask=np.full((h,w),255,np.uint8); mask[0,:]=0;mask[-1,:]=0;mask[:,0]=0;mask[:,-1]=0
    out=cv2.seamlessClone(src,out,mask,(x0+w//2,y0+h//2),cv2.NORMAL_CLONE)
cv2.imwrite(S+'/plate_inpainted2.png', out)
rgb = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
rgb.resize((3840,983),Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2,percent=60,threshold=2)).save(REPO+'/assets/paradise/plate_full.webp',quality=86,method=6)
rgb.resize((1152,295),Image.LANCZOS).save(REPO+'/assets/paradise/plate_thumb.webp',quality=80,method=6)
rgb.resize((1920,492),Image.LANCZOS).save(S+'/plate_view.png')
