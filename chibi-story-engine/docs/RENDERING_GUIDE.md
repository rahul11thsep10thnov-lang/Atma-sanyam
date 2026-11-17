# Rendering guide

## Pipeline

```
Story Definition ─▶ composer ─▶ ScenePlan ─▶ Blender worker (Cycles) ─▶ PNG frames ─▶ FFmpeg ─▶ scene.mp4
                                                                      scene videos + mixed soundtrack ─▶ final.mp4
```

## Commands

```bash
python -m engine.cli storyboard stories/x.hi.txt --story-id x -o stories/x.json   # text -> Story Definition
python -m engine.cli validate stories/x.json                                       # quality-control report
python -m engine.cli speech stories/x.json --retime                                # voices; shots re-timed to them
python -m engine.cli render stories/x.json --preview                               # 640x360, fast
python -m engine.cli render stories/x.json                                         # final, at the story's output size
python -m engine.cli render stories/x.json --scenes scene_03                       # only that scene, then reassemble
python -m engine.cli frame stories/x.json scene_02 4.5 -o still.png                # one still, software compositor
```

Through the API: `POST /stories/{id}/render` (`mode` preview|final, `scene_ids`, `force`), `GET /render-jobs/{id}`,
`POST /render-jobs/{id}/cancel`, `POST /render-jobs/{id}/resume`.

## Settings (`RenderSettings`)

| | Preview | Final |
|---|---|---|
| Size | 640×360 | the story's `output` (1920×1080 by default) |
| Cycles samples | 1 | 1 |
| H.264 | CRF 24, veryfast | CRF 18, medium |
| Worker processes per scene | 2 | 2 |

Every layer is an unlit emission surface, so one sample per pixel at the pixel centre is already the exact colour;
edges are anti-aliased by the textures. Sprites sit at slightly different depths (0.5 px apart) and are scaled about
the view axis so they still project to exactly the planned pixels: this removes coplanar artefacts.

## Measured speed (4 CPU cores, no GPU)

| | per frame | "Monkey and the Crocodile" (140.8 s, 3,379 frames) |
|---|---|---|
| 640×360 | about 0.13 s | about 5 minutes |
| 1920×1080 | about 0.9 s (alone), 1.3 s with two workers sharing the CPU | about 40 minutes |

EEVEE and Workbench need a GPU and are not used.

## Cache, recovery, cancellation

- Scene key = hash(plan digest, size, fps, samples, encoder settings, renderer version). The plan digest covers every
  transform, the camera and the checksum of every image. Same key, same file: unchanged scenes are never rendered again.
- Scene videos: `renders/scenes/<story>/<scene>/<key>.mp4` with a sidecar JSON (frames, checksum, settings).
- Work in progress: `renders/temporary/<story>/<scene>_<key>/frames/`. A frame file appears only when complete. A new
  attempt renders only missing frames. The folder is deleted after the encoded scene has passed validation.
- A crashed worker is retried (`retries`, default 1). An error the worker reports itself, or the time limit
  (`timeout`), is not retried. Other scenes continue either way.
- Cancelling kills the worker processes; finished scenes and frames stay.
- Final video: `renders/final/<story>/<story>_<WxH>_<hash>.mp4` = stream-copied concatenation of the scene videos plus
  the mixed soundtrack (AAC 192 kbit/s).

## Validation of every output

Resolution, frame rate, frame count, duration, audio stream present and as long as the picture, full decode without
errors. Quality control adds black-frame detection (fades at scene boundaries are allowed) and soundtrack peak level.

## Determinism

Composition is pure Python on fixed inputs; blinks and particles are seeded from ids; Cycles runs with a fixed seed.
The same story, asset versions, audio and settings give the same plan digest and visually identical frames.
