"""Render one object in the balcony at a given spot, for look development.

    python studio.py <out.png> <builder> [x y rotZdeg] [scale] [samples] [kwargs-json]
"""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from mathutils import Vector
from focusbalcony.common import clear_scene, DEG
from focusbalcony import scene, plants

out, name = sys.argv[1], sys.argv[2]
x, y, rz = (float(v) for v in sys.argv[3:6]) if len(sys.argv) > 5 else (0.7, 0.95, 0.0)
s = float(sys.argv[6]) if len(sys.argv) > 6 else 0.3
samples = int(sys.argv[7]) if len(sys.argv) > 7 else 40
kwargs = json.loads(sys.argv[8]) if len(sys.argv) > 8 else {}
clear_scene()
scene.build_all(int(1080 * s), int(2340 * s))
scene.configure_render(samples, preview=True)
builders = {**plants.BUILDERS}
try:
    from focusbalcony import furniture
    builders.update(furniture.BUILDERS)
except ImportError:
    pass
root = builders[name](bpy.context.scene.collection, **kwargs)
root.location = (x, y, 0)
root.rotation_euler = (0, 0, rz * DEG)
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s")
