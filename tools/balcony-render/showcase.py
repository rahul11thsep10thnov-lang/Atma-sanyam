"""Render several objects in the balcony at once (look development).

    python showcase.py <out.png> <scale> <samples> '<json list of [builder, x, y, rotZ, kwargs]>'
"""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from focusbalcony.common import clear_scene, DEG
from focusbalcony import scene, plants

out, s, samples, spec = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), json.loads(sys.argv[4])
clear_scene()
scene.build_all(int(1080 * s), int(2340 * s))
scene.configure_render(samples, preview=True)
builders = {**plants.BUILDERS}
try:
    from focusbalcony import furniture, decor
    builders.update(furniture.BUILDERS)
    builders.update(decor.BUILDERS)
except ImportError as e:
    print("note:", e)
for name, x, y, rz, kw in spec:
    z = kw.pop("z", 0.0)
    root = builders[name](bpy.context.scene.collection, **kw)
    root.location = (x, y, z)
    root.rotation_euler = (0, 0, rz * DEG)
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s")
