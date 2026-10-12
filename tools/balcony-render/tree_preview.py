"""python tree_preview.py out.png <species> [height] [samples]"""
import sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from focusbalcony.common import clear_scene, collection, DEG
from focusbalcony import trees, lighting, ground, garden
out, species = sys.argv[1], sys.argv[2]
height = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0
samples = int(sys.argv[4]) if len(sys.argv) > 4 else 24
clear_scene()
col = collection("trees")
t = time.time()
root = getattr(trees, species)(col, height=height) if species != "shrub" else trees.shrub(col, radius=0.6, height=0.8)
print("built in", round(time.time() - t, 1), "s", flush=True)
root.location = (0, height * 1.1 + 1, 0)
terr = ground.terrain(collection("terrain"))
lighting.build("morning")
cam = garden.build_camera(400, 700)
cam.location = (0, -1.0, 1.6)
cam.rotation_euler = (80 * DEG, 0, 0)
cam.data.angle_y = 80 * DEG
garden.configure_render(samples, preview=True)
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s; verts:", sum(len(o.data.vertices) for o in col.all_objects if o.type == "MESH"))
