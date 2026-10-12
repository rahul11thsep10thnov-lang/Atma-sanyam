import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from focusbalcony.common import clear_scene
from focusbalcony import scene
clear_scene()
scene.build_camera()
sc = bpy.context.scene; cam = sc.camera
bpy.context.view_layer.update()
def proj(p):
    v = world_to_camera_view(sc, cam, Vector(p)); return (round(v.x,3), round(1-v.y,3))
for y in (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0):
    xs = [x/100 for x in range(-130, 146, 1)]
    vis = [x for x in xs if 0 <= proj((x, y, 0))[0] <= 1 and 0 <= proj((x, y, 0))[1] <= 1]
    print(f"y={y:4}: floor x visible {min(vis) if vis else None}..{max(vis) if vis else None}   screen(0,y,0)={proj((0,y,0))}")
for name, p in {"far wall art centre": (0.0, 6.38, 1.55), "ceiling hook (0.9,2.0)": (0.9, 2.0, 3.0), "pier shelf": (-1.17, 3.3, 1.5), "rail top y=2": (1.45, 2.0, 1.05)}.items():
    print(name, proj(p))
