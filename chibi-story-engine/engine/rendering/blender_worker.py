"""Blender render worker. Runs in its own process:

    python -m engine.rendering.blender_worker --plan DIR --out DIR [--samples N] [--width W --height H] [--resume]

It reads a saved ScenePlan and renders one PNG per frame with Cycles. It knows nothing about stories,
characters or animation: only textured planes, a camera and numbers. Progress is reported on stdout as
"CSAE_PROGRESS <done> <total>".
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np

UNIT = 0.01                 # Blender units per stage pixel
ORDER_STEP = 0.05           # stage pixels of depth per unit of draw order


def build_scene(width: int, height: int, samples: int):
    import bpy

    from ..camera.projection import LENS_MM, SENSOR_MM

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = False
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 0
    scene.cycles.transparent_max_bounces = 96
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.pixel_filter_type = "BLACKMAN_HARRIS"
    scene.cycles.filter_width = 1.5
    scene.render.use_persistent_data = True
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.dither_intensity = 0.0
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
    scene.world = world

    cam_data = bpy.data.cameras.new("camera")
    cam_data.lens = LENS_MM
    cam_data.sensor_width = SENSOR_MM
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.clip_start = 0.5
    cam_data.clip_end = 100000.0
    camera = bpy.data.objects.new("camera", cam_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    mesh = bpy.data.meshes.new("unit_quad")
    mesh.from_pydata([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name="uv")
    for i, co in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[i].uv = co
    mesh.update()
    return scene, camera, mesh


def make_material(name: str, image, tint):
    import bpy

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "CLIP"
    tex.interpolation = "Linear"
    colour = nt.nodes.new("ShaderNodeMix")
    colour.data_type = "RGBA"
    colour.blend_type = "MULTIPLY"
    colour.inputs[0].default_value = 1.0
    colour.inputs[7].default_value = (*tint, 1.0)
    emission = nt.nodes.new("ShaderNodeEmission")
    transparent = nt.nodes.new("ShaderNodeBsdfTransparent")
    opacity = nt.nodes.new("ShaderNodeMath")
    opacity.operation = "MULTIPLY"
    opacity.inputs[1].default_value = 1.0
    mix = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], colour.inputs[6])
    nt.links.new(colour.outputs[2], emission.inputs["Color"])
    nt.links.new(tex.outputs["Alpha"], opacity.inputs[0])
    nt.links.new(opacity.outputs[0], mix.inputs[0])
    nt.links.new(transparent.outputs[0], mix.inputs[1])
    nt.links.new(emission.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return mat, opacity


def render(plan_dir: Path, out_dir: Path, samples: int, width: int | None, height: int | None, resume: bool,
           first: int | None = None, last: int | None = None) -> int:
    import bpy
    from mathutils import Matrix

    from ..camera.projection import CAMERA_DISTANCE, REST_X, REST_Y
    from ..composition.plan import ScenePlan

    plan = ScenePlan.load(plan_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    scene, camera, mesh = build_scene(width or plan.width, height or plan.height, samples)
    total = plan.n_frames
    images: dict[str, object] = {}
    done = 0
    index = 0
    started = time.time()
    for shot in plan.shots:
        wanted = [f for f in range(shot.n_frames) if (first is None or index + f >= first) and (last is None or index + f < last)]
        todo = [f for f in wanted if not (resume and _complete(out_dir / f"frame_{index + f:06d}.png"))]
        done += shot.n_frames - len(todo)
        if not todo:
            index += shot.n_frames
            print(f"CSAE_PROGRESS {done} {total}", flush=True)
            continue

        for obj in [o for o in scene.collection.objects if o is not camera]:
            bpy.data.objects.remove(obj, do_unlink=True)
        for mat in list(bpy.data.materials):
            bpy.data.materials.remove(mat)
        objects = []
        for i, sprite in enumerate(shot.sprites):
            image = images.get(sprite.image)
            if image is None:
                if not Path(sprite.image).is_file():
                    raise FileNotFoundError(f"sprite image is missing: {sprite.image}")
                image = images[sprite.image] = bpy.data.images.load(sprite.image)
                image.colorspace_settings.name = "sRGB"
            mat, opacity = make_material(f"m{i}", image, sprite.tint)
            obj = bpy.data.objects.new(f"s{i}", mesh)
            obj.active_material = mat          # objects share one mesh, so the material sits on the object
            obj.material_slots[0].link = "OBJECT"
            obj.material_slots[0].material = mat
            scene.collection.objects.link(obj)
            p = sprite.parallax
            z = (-CAMERA_DISTANCE * (1.0 / p - 1.0) + sprite.order * ORDER_STEP) * UNIT
            objects.append((obj, opacity, sprite, p, z))

        for f in todo:
            for obj, opacity, sprite, p, z in objects:
                alpha = float(sprite.opacity[f])
                hidden = alpha <= 0.003
                obj.hide_render = hidden
                if hidden:
                    continue
                a, b, c, d, tx, ty = (float(v) for v in sprite.affine[f])
                wx, wy = REST_X + (tx - REST_X) / p, REST_Y + (ty - REST_Y) / p
                obj.matrix_world = Matrix(((a / p * UNIT, c / p * UNIT, 0.0, wx * UNIT),
                                           (b / p * UNIT, d / p * UNIT, 0.0, wy * UNIT),
                                           (0.0, 0.0, 1.0, z),
                                           (0.0, 0.0, 0.0, 1.0)))
                opacity.inputs[1].default_value = alpha
            cx, cy, zoom = (float(v) for v in shot.camera[f])
            camera.matrix_world = Matrix.Translation((cx * UNIT, cy * UNIT, CAMERA_DISTANCE / zoom * UNIT))
            target = out_dir / f"frame_{index + f:06d}.png"
            scene.render.filepath = str(target.with_suffix(".tmp.png"))
            bpy.ops.render.render(write_still=True)
            target.with_suffix(".tmp.png").replace(target)        # a frame file only ever appears complete
            done += 1
            print(f"CSAE_PROGRESS {done} {total}", flush=True)
        index += shot.n_frames
    print(f"CSAE_DONE {done} {total} {time.time() - started:.1f}", flush=True)
    return done


def _complete(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 100


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="engine.rendering.blender_worker")
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--samples", type=int, default=4)
    parser.add_argument("--width", type=int)
    parser.add_argument("--height", type=int)
    parser.add_argument("--first", type=int)
    parser.add_argument("--last", type=int)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args(argv)
    try:
        render(args.plan, args.out, args.samples, args.width, args.height, args.resume, args.first, args.last)
    except Exception as exc:  # the parent process reads this line
        print(f"CSAE_ERROR {type(exc).__name__}: {exc}", flush=True)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
