"""Quick look at the garden: python garden_preview.py out.png [scale] [samples] [state]"""
import sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from focusbalcony.common import clear_scene
from focusbalcony import garden

out = sys.argv[1]
s = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3
samples = int(sys.argv[3]) if len(sys.argv) > 3 else 24
state = sys.argv[4] if len(sys.argv) > 4 else "morning"
clear_scene()
t = time.time()
garden.build_all(int(1080 * s), int(2340 * s), state)
print("built in", round(time.time() - t, 1), "s", flush=True)
garden.configure_render(samples, preview=True)
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s")
