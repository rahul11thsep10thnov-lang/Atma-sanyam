"""Render the framed artworks the jigsaw wall assembles — three photographs
of the balcony's world, 3:4 portrait:

  artwork/art_morning_hills.webp     layered ridges in morning haze (telephoto)
  artwork/art_lily_study.webp        a flowering peace lily, window light
  artwork/art_light_terracotta.webp  pots on terracotta in railing shadows

    python artworks.py [--only morning|lily|terracotta] [--samples 128] [--width 900]

Swap any of these for a real photograph or painting at the same path (3:4,
ideally 1200 x 1600) — the app needs no other change.
"""
import argparse, math, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import bpy
from mathutils import Vector
from PIL import Image

from focusbalcony.common import DEG, clear_scene, collection, box
from focusbalcony import scene, plants
from focusbalcony import materials as M

ap = argparse.ArgumentParser()
ap.add_argument("--only", default=None)
ap.add_argument("--samples", type=int, default=128)
ap.add_argument("--width", type=int, default=900)
ap.add_argument("--out", default=str(pathlib.Path(__file__).resolve().parents[2] / "assets" / "balcony" / "artwork"))
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
OUT = pathlib.Path(args.out)
OUT.mkdir(parents=True, exist_ok=True)
W, H = args.width, int(round(args.width * 4 / 3))


def reset():
    clear_scene()
    M._cache.clear()  # cached materials die with the factory reset


def camera(loc, look_at, angle_y, shift=(0.0, 0.0), dof=None):
    sc = bpy.context.scene
    data = bpy.data.cameras.new("art_cam")
    data.lens_unit = "FOV"
    data.sensor_fit = "VERTICAL"
    data.angle_y = angle_y * DEG
    data.shift_x, data.shift_y = shift
    data.clip_start = 0.02
    data.clip_end = 30000
    if dof:
        data.dof.use_dof = True
        data.dof.focus_distance = dof[0]
        data.dof.aperture_fstop = dof[1]
    cam = bpy.data.objects.new("art_cam", data)
    cam.location = loc
    cam.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(cam)
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = W, H


def finish(name):
    sc = bpy.context.scene
    tmp = OUT / f"_{name}.png"
    sc.render.filepath = str(tmp)
    t = time.time()
    bpy.ops.render.render(write_still=True)
    img = Image.open(tmp).convert("RGB")
    img.save(OUT / f"{name}.webp", "WEBP", quality=90, method=6)
    tmp.unlink()
    print(f"  {name}: {time.time() - t:.0f}s", flush=True)


def _ridge(col, dist, height, depth, seed, mat, detail):
    """One hill ridge across the view: a long hump whose crest wanders, with
    a fine tree-line roughness on the nearer ones."""
    import bmesh
    from focusbalcony.common import Rng, mesh_object
    rng = Rng(seed)
    waves = [(rng.uniform(260, 900), rng.uniform(0, 6.28), rng.uniform(0.15, 0.3)) for _ in range(3)]
    fine = [(rng.uniform(2.5, 28), rng.uniform(0, 6.28)) for _ in range(14)]
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=20, y_segments=2400 if detail else 900, size=1.0)
    for v in bm.verts:
        u, w = v.co.x + 0.5, v.co.y + 0.5
        y = -1800 + w * 3600
        crest = 0.5 + sum(a * math.sin(y / L + ph) for L, ph, a in waves)
        # canopy: bumpy crowns, never a smooth sand-dune line
        trees = detail * sum(abs(math.sin(y / L + ph)) for L, ph in fine) / len(fine) * 2.2
        h = max(0.0, height * crest + trees) * max(0.0, math.sin(u * math.pi)) ** 0.7
        v.co = Vector((dist + (u - 0.5) * depth, y, h))
    return mesh_object(f"ridge_{seed}", bm, mat, col, smooth=True)


def morning_hills():
    """Ridges stacked in morning haze, backlit by a low sun just out of
    frame — the view from the balcony, seen through a long lens."""
    reset()
    scene.SUN_ELEVATION, scene.SUN_AZIMUTH = 6.5, 86.0
    scene.build_lighting(sun_strength=3.0, sky_strength=0.5)
    col = collection("ridges")
    haze = (0.95, 0.80, 0.70)
    layers = [(380, 34, 300, 9.0), (720, 70, 420, 7.0), (1250, 120, 600, 5.0), (2000, 190, 800, 3.0), (3100, 280, 1000, 0.0)]
    for i, (dist, height, depth, detail) in enumerate(layers):
        green = (0.02, 0.032, 0.02)
        mat = M.hazed(green, 0.9, haze, 1.6, 3600.0, f"ridge_mat_{i}", 0.12, 0.01)
        _ridge(col, dist, height, depth, 101 + i * 7, mat, detail)
    scene.configure_render(args.samples)
    bpy.context.scene.view_settings.exposure = -1.2  # keep the sunlit sky from clipping
    camera((0.0, 0.0, 62.0), (3000.0, 120.0, 62.0), 12.0, shift=(0.0, 0.08))
    finish("art_morning_hills")


def lily_study():
    """A flowering peace lily on a teak sideboard, against lime plaster,
    lit from a window at the left."""
    reset()
    scene.SUN_ELEVATION, scene.SUN_AZIMUTH = 30.0, 250.0
    col = collection("still_life")
    wall = M.plaster()
    box("wall", (4.0, 0.1, 3.0), (0.0, 0.62, 1.5), wall, col)
    box("floor", (4.0, 3.0, 0.02), (0.0, -0.8, -0.01), M.stone(), col)
    top = M.stone((0.24, 0.22, 0.18), "sideboard_stone")
    body = M.wood(scale=0.8, name="sideboard_teak")
    box("sideboard", (1.6, 0.5, 0.05), (0.0, 0.3, 0.725), top, col, bevel=0.006)
    box("sideboard_body", (1.56, 0.46, 0.7), (0.0, 0.3, 0.35), body, col, bevel=0.004)
    lily = plants.peace_lily(col, stage=4, seed=17)
    lily.location = (0.05, 0.3, 0.75)
    lily.rotation_euler = (0, 0, 25 * DEG)
    # window light: a large soft area light, warm, from the left
    data = bpy.data.lights.new("window", "AREA")
    data.shape, data.size, data.size_y = "RECTANGLE", 1.2, 1.8
    data.energy, data.color = 420.0, (1.0, 0.9, 0.78)
    win = bpy.data.objects.new("window", data)
    win.location = (-2.0, -0.4, 1.6)
    win.rotation_euler = (Vector((0.1, 0.3, 1.1)) - win.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(win)
    # a little fill from the room
    world = bpy.data.worlds.new("room")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.56, 0.48, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scene.configure_render(args.samples)
    camera((0.25, -1.95, 1.18), (0.05, 0.3, 1.07), 28.0, dof=(2.3, 4.0))
    finish("art_lily_study")


def light_on_terracotta():
    """Terracotta pots by the railing, the balusters' shadows striping the
    tiles and climbing the pots — the balcony in its best light."""
    reset()
    scene.build_architecture()
    scene.build_lighting()
    col = collection("pots")
    tulsi = plants.tulsi(col, seed=21)
    tulsi.location = (0.62, 1.62, 0)
    snake = plants.snake_plant(col, seed=5, height=0.55, pot_kind="terracotta")
    snake.location = (0.36, 1.2, 0)
    snake.rotation_euler = (0, 0, 40 * DEG)
    root = bpy.data.objects.new("bare_pot", None)
    bpy.context.scene.collection.objects.link(root)
    plants.pot("terracotta", 0.16, 0.1, col, root, "small_pot")
    root.location = (0.72, 0.98, 0)
    scene.configure_render(args.samples)
    bpy.context.scene.view_settings.exposure = 0.25
    camera((-0.35, -0.3, 1.2), (0.55, 1.35, 0.2), 36.0, dof=(2.0, 5.6))
    finish("art_light_terracotta")


JOBS = {"morning": morning_hills, "lily": lily_study, "terracotta": light_on_terracotta}
for key, job in JOBS.items():
    if args.only and args.only not in key:
        continue
    job()
