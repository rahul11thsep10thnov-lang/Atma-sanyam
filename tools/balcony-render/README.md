# Space renderer (balcony, garden, room)

Everything you see on the Focus Balcony is a photograph rendered here, in
Blender's Cycles path tracer, from procedural models and materials (no
downloaded assets). The app never draws a plant or a chair itself: it only
stacks these pictures (see `docs/PHOTO_BALCONY.md`).

```
focusbalcony/      the scenes: scene.py (balcony), garden.py, room.py;
                   lighting.py (six states); trees, ground, plants,
                   furniture, decor, textiles, materials; a catalog per space
render.py          balcony: every layer + manifest.json   → assets/balcony/
render_space.py    garden/room, one lighting state per run → assets/<space>/
gen_space_pack.py  any space: crop, feather, preview, thumbs, TS module
compose_space.py   compose any state of a garden/room pack (the UI-off check)
artworks.py        the three framed artworks            → assets/balcony/artwork/
gen_pack.py        crop layers, preview + thumbnails,
                   write src/photoBalcony/pack.generated.ts
composite.py       compose any balcony state exactly as the app does
                   (the "hide all UI" check)
preview.py, studio.py, showcase.py, frustum.py   look-development helpers
```

## Rebuild the pack

Needs Python 3.11 and the `bpy` wheel (Blender as a Python module), Pillow
and NumPy. No GPU needed; a full render takes about an hour on 4 CPU cores.

```bash
python3.11 -m venv .venv && . .venv/bin/activate
pip install bpy==5.0.1 pillow numpy

cd tools/balcony-render
python render.py --scale 1.0 --arch-samples 96 --item-samples 48   # layers
python artworks.py --samples 96 --width 900                        # artworks
python gen_pack.py                                                 # app module
rm -rf ../../assets/balcony/_tmp
```

`render.py --scale 0.3 --arch-samples 16 --item-samples 12 --out /tmp/pack`
gives a fast low-resolution pack for trying changes. `--only snake_plant`
re-renders one object (with `--skip-plates` to keep the existing layers).

Check a balcony with every control hidden:

```bash
python composite.py ../../assets/balcony /tmp/check.png \
  '{"focus":{"stage":"flowering"},"placed":[{"item":"cane_lounge_chair","slot":"seating"},
    {"item":"art_frame","slot":"art"}],"art":"../../assets/balcony/artwork/art_morning_hills.webp"}'
```

## Adding or changing an object

1. Model it in `focusbalcony/plants.py`, `furniture.py` or `decor.py`
   (origin at its base, front facing −Y) and add it to that file's
   `BUILDERS`.
2. List it in `focusbalcony/catalog.py` `ITEMS` with the slots it may stand
   in and the rotations to render for each (each rotation is a "Turn" in
   Customize).
3. Give it a price and unlock time in `src/photoBalcony/catalog.ts` `STORE`.
4. Re-render it: `python render.py --only <id> --skip-plates && python gen_pack.py`.

## Replacing a render with artist or photographic assets

Any file in `assets/balcony/` can be swapped for a better image of the same
size and alignment — the manifest positions it, nothing else changes:

- **Objects** (`plants/`, `furniture/`, `decor/`): RGBA, the object plus its
  own soft shadow, cropped exactly to the `rect` in `manifest.json`, seen from
  the balcony camera (`frustum.py` prints it). A photographed or
  artist-rendered object should be shot at the same angle and light (sun from
  outside-right, 33° up, early morning).
- **Artworks** (`artwork/art_*.webp`): any 3:4 image — a real photograph or
  painting is ideal. The scene lights it automatically.
- **Plates** (`environment/`, `architecture/`): a re-shot or re-rendered
  balcony must keep the camera (`scene.build_camera`) so every object still
  lands on its spot.

`docs/PHOTO_BALCONY.md` lists which assets would gain the most from that.
