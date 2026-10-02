"""Quick look at the empty balcony plate.

    python preview.py <out.png> [scale=0.33] [samples=48]
"""
import sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from focusbalcony.common import clear_scene
from focusbalcony import scene

out = sys.argv[1]
s = float(sys.argv[2]) if len(sys.argv) > 2 else 0.33
samples = int(sys.argv[3]) if len(sys.argv) > 3 else 48
clear_scene()
t = time.time()
scene.build_all(int(1080 * s), int(2340 * s))
scene.configure_render(samples, preview=True)
print("built in", round(time.time() - t, 1), "s")
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s")
