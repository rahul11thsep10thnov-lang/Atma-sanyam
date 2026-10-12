"""Render a list of garden objects in place: python garden_showcase.py out.png '<json>' [scale] [samples] [state]
json: [[builder, slot_or_[x,y], rotZ, kwargs], ...]"""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from focusbalcony.common import clear_scene, collection, DEG
from focusbalcony import garden, garden_items, garden_catalog, plants, decor, lighting

out = sys.argv[1]
items = json.loads(sys.argv[2])
s = float(sys.argv[3]) if len(sys.argv) > 3 else 0.35
samples = int(sys.argv[4]) if len(sys.argv) > 4 else 24
state = sys.argv[5] if len(sys.argv) > 5 else "morning"
clear_scene()
garden.build_all(int(1080 * s), int(2340 * s), state)
builders = {**plants.BUILDERS, **decor.BUILDERS, **garden_items.BUILDERS}
col = collection("items")
t = time.time()
for name, where, rz, kwargs in items:
    if isinstance(where, str):
        slot = garden_catalog.SLOTS[where]
        pos, rot = slot["pos"], slot.get("rot", 0)
    else:
        pos, rot = (where[0], where[1], garden.ground_height(where[0], where[1]) if len(where) < 3 else where[2]), 0
    if name in garden_catalog.LIT_ITEMS:
        kwargs = {**kwargs, "lit": lighting.lamps_on(state)}
    root = builders[name](col, **kwargs)
    root.location = pos
    root.rotation_euler = (0, 0, (rot + rz) * DEG)
print("items built in", round(time.time() - t, 1), "s", flush=True)
garden.configure_render(samples, preview=True)
bpy.context.scene.render.filepath = out
t = time.time()
bpy.ops.render.render(write_still=True)
print("rendered in", round(time.time() - t, 1), "s")
