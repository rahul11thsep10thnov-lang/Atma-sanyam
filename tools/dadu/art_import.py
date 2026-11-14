#!/usr/bin/env python3
"""DADU art importer: turns pictures made in ChatGPT (or anywhere) into app-ready files.

Needs Python 3.9+ with Pillow and numpy:   pip install pillow numpy

Typical use (see docs/dadu/ART_PIPELINE.md):

  # 1. Cut one picture that was drawn on a flat magenta background
  python tools/dadu/art_import.py chroma raw/sofa.png assets/dadu-art/props/sofa.png

  #    Characters: add --keep so every pose keeps the same frame:  chroma raw/chintu_idle.png assets/dadu-art/characters/chintu/idle.png --keep --max 1024

  # 2. Cut a sheet of items (3 columns x 3 rows) into separate named files
  python tools/dadu/art_import.py slice raw/sheet1.png --grid 3x3 \
      --names sofa,armchair,bed,desk,lamp,clock,carrom,radio,diya --out assets/dadu-art/props

  # 3. Fit a full-scene picture to the app's frame (rooms and story pages are chosen from the folder name)
  python tools/dadu/art_import.py scene raw/page1.png assets/dadu-art/story/river_tree.png
  python tools/dadu/art_import.py scene raw/living.png assets/dadu-art/rooms/living.png

  # 4. Rebuild the manifest the app reads, then check what is still missing
  python tools/dadu/art_import.py manifest
  python tools/dadu/art_import.py check
"""
import argparse, csv, json, os, re, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ART = os.path.join(ROOT, 'assets', 'dadu-art')
MANIFEST = os.path.join(ROOT, 'src', 'dadu', 'art', 'manifest.generated.ts')
BRIEF = os.path.join(ROOT, 'docs', 'dadu', 'art-brief')
VARIANT_NAMES = {'on', 'open', 'full', 'clean', 'ready', 'seed', 'germination', 'seedling', 'growing', 'mature', 'flowering', 'fruiting', 'harvest'}
ROOM_SIZE = (1620, 990)    # 18:11, the side-view frame (360 x 220 scene units)
STORY_SIZE = (1536, 1024)  # 3:2, wide enough for the story header, which crops it


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def remove_background(img, key=(255, 0, 255), tol=70, holes=0):
    """Make the flat key colour transparent. Only background connected to the picture's edge is removed,
    so a magenta detail inside the subject survives. Edges are softened and colour-spill is cleaned."""
    rgb = np.asarray(img.convert('RGB')).astype(np.int32)
    k = np.array(key, dtype=np.int32)
    dist = np.sqrt(((rgb - k) ** 2).sum(axis=2))
    near = dist < tol
    h, w = near.shape
    mask = Image.fromarray((near * 255).astype(np.uint8), 'L')
    padded = Image.new('L', (w + 2, h + 2), 255)
    padded.paste(mask, (1, 1))
    ImageDraw.floodfill(padded, (0, 0), 128, thresh=0)
    bg = np.asarray(padded)[1:-1, 1:-1] == 128
    if holes:
        # enclosed pockets (between an arm and the body, inside a handle...): also remove key-coloured
        # regions that do not touch the edge, when they are at least `holes` pixels in area
        todo = near & ~bg
        seen = np.zeros_like(todo)
        for y0, x0 in zip(*np.nonzero(todo)):
            if seen[y0, x0]:
                continue
            comp, q = [], deque([(y0, x0)])
            seen[y0, x0] = True
            while q:
                y, x = q.popleft(); comp.append((y, x))
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < h and 0 <= nx < w and todo[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
            if len(comp) >= holes:
                ys, xs = zip(*comp); bg[list(ys), list(xs)] = True
    alpha = np.where(bg, 0, 255).astype(np.float32)
    # soften the 2-pixel rim around the removed area
    grow = bg.copy()
    for _ in range(2):
        g = grow.copy(); g[1:, :] |= grow[:-1, :]; g[:-1, :] |= grow[1:, :]; g[:, 1:] |= grow[:, :-1]; g[:, :-1] |= grow[:, 1:]; grow = g
    rim = grow & ~bg
    soft = np.clip((dist - tol) / (tol * 1.2), 0, 1) * 255
    alpha = np.where(rim, np.minimum(alpha, soft), alpha)
    out = rgb.copy()
    # despill: pull the key colour out of rim pixels (magenta = red and blue high, green low)
    if tuple(key) == (255, 0, 255):
        spill = np.maximum(0, np.minimum(out[..., 0], out[..., 2]) - out[..., 1])
        spill = np.where(rim, spill, 0)
        out[..., 0] -= spill; out[..., 2] -= spill
    rgba = np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def trim(img, pad=4):
    a = np.asarray(img.split()[-1])
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return img
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(img.width, xs.max() + 1 + pad), min(img.height, ys.max() + 1 + pad))
    return img.crop(box)


def fit_max(img, maxside):
    s = maxside / max(img.size)
    if s >= 1:
        return img
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def cmd_chroma(a):
    img = Image.open(a.src)
    cut = remove_background(img, hex_rgb(a.key), a.tol, a.holes)
    out = fit_max(cut if a.keep else trim(cut), a.max)
    os.makedirs(os.path.dirname(os.path.abspath(a.dst)), exist_ok=True)
    out.save(a.dst, optimize=True)
    print(f'wrote {a.dst} {out.size}')


def cmd_slice(a):
    cols, rows = [int(x) for x in a.grid.lower().split('x')]
    names = [n.strip() for n in a.names.split(',')]
    if len(names) != cols * rows:
        sys.exit(f'--names has {len(names)} entries but the grid has {cols * rows} cells (use "-" for an empty cell)')
    sheet = Image.open(a.src)
    cw, ch = sheet.width / cols, sheet.height / rows
    os.makedirs(a.out, exist_ok=True)
    for i, name in enumerate(names):
        if name in ('', '-'):
            continue
        c, r = i % cols, i // cols
        cell = sheet.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        cut = remove_background(cell, hex_rgb(a.key), a.tol, a.holes)
        out = fit_max(cut if a.keep else trim(cut), a.max)
        dst = os.path.join(a.out, name + '.png')
        out.save(dst, optimize=True)
        print(f'wrote {dst} {out.size}')


def cmd_scene(a):
    img = Image.open(a.src).convert('RGB')
    kind = a.kind or ('room' if f'{os.sep}rooms{os.sep}' in os.path.abspath(a.dst) else 'story')
    tw, th = ROOM_SIZE if kind == 'room' else STORY_SIZE
    s = max(tw / img.width, th / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    l, t = (img.width - tw) // 2, (img.height - th) // 2
    img = img.crop((l, t, l + tw, t + th))
    os.makedirs(os.path.dirname(os.path.abspath(a.dst)), exist_ok=True)
    img.save(a.dst, optimize=True)
    print(f'wrote {a.dst} {img.size}')


def size_of(p):
    with Image.open(p) as im:
        return im.width, im.height


def req(rel):
    return f"require('../../../assets/dadu-art/{rel}')"


def cmd_manifest(_):
    props, rooms, story, chars, ui = {}, {}, {}, {}, {}
    def sidecar(path):
        j = os.path.splitext(path)[0] + '.json'
        return json.load(open(j)) if os.path.exists(j) else {}
    d = os.path.join(ART, 'props')
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not f.lower().endswith('.png'):
            continue
        stem = f[:-4]
        base, _, variant = stem.partition('@')
        e = props.setdefault(base, {'variants': {}})
        w, h = size_of(os.path.join(d, f))
        if variant:
            if variant not in VARIANT_NAMES:
                print(f'warning: {f}: unknown variant "{variant}" (allowed: {", ".join(sorted(VARIANT_NAMES))})')
            e['variants'][variant] = f'props/{f}'
        else:
            e.update({'src': f'props/{f}', 'w': w, 'h': h, **{k: v for k, v in sidecar(os.path.join(d, f)).items() if k in ('scale', 'dx', 'dy')}})
    for kind, target in (('rooms', rooms), ('story', story), ('ui', ui)):
        d = os.path.join(ART, kind)
        for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                w, h = size_of(os.path.join(d, f))
                target[os.path.splitext(f)[0]] = {'src': f'{kind}/{f}', 'w': w, 'h': h}
    d = os.path.join(ART, 'characters')
    for c in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        cd = os.path.join(d, c)
        if not os.path.isdir(cd):
            continue
        for f in sorted(os.listdir(cd)):
            if f.lower().endswith('.png'):
                w, h = size_of(os.path.join(cd, f))
                chars.setdefault(c, {})[f[:-4]] = {'src': f'characters/{c}/{f}', 'w': w, 'h': h}
    props = {k: v for k, v in props.items() if 'src' in v}
    def entry(e):
        parts = [f"src: {req(e['src'])}", f"w: {e['w']}", f"h: {e['h']}"]
        for k in ('scale', 'dx', 'dy'):
            if k in e:
                parts.append(f'{k}: {e[k]}')
        if e.get('variants'):
            parts.append('variants: { ' + ', '.join(f"{n}: {req(p)}" for n, p in sorted(e['variants'].items())) + ' }')
        return '{ ' + ', '.join(parts) + ' }'
    def block(name, d, nested=False):
        if not d:
            return f'  {name}: {{}},'
        if nested:
            return f'  {name}: {{\n' + ',\n'.join(f"    {json.dumps(c)}: {{ " + ', '.join(f"{json.dumps(p)}: {entry(e)}" for p, e in sorted(v.items())) + ' }' for c, v in sorted(d.items())) + ',\n  },'
        return f'  {name}: {{\n' + ',\n'.join(f'    {json.dumps(k)}: {entry(v)}' for k, v in sorted(d.items())) + ',\n  },'
    body = '\n'.join([block('props', props), block('rooms', rooms), block('story', story), block('characters', chars, True), block('ui', ui)])
    src = ("// GENERATED by tools/dadu/art_import.py from assets/dadu-art. Do not edit by hand.\n"
           "import type { ArtManifest } from './types';\n\n"
           f"export const ART: ArtManifest = {{\n{body}\n}};\n")
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    open(MANIFEST, 'w').write(src)
    print(f'manifest: {len(props)} props, {len(rooms)} rooms, {len(story)} story pages, {sum(len(v) for v in chars.values())} character images, {len(ui)} ui')


def read_csv(name):
    p = os.path.join(BRIEF, name)
    return list(csv.DictReader(open(p, encoding='utf-8'))) if os.path.exists(p) else []


def cmd_check(_):
    def have(kind, ext=('.png', '.jpg', '.jpeg', '.webp')):
        d = os.path.join(ART, kind)
        return {os.path.splitext(f)[0].partition('@')[0] for f in os.listdir(d) if f.lower().endswith(ext)} if os.path.isdir(d) else set()
    for title, rows, key, kind in (('props', read_csv('objects.csv'), 'sprite_key', 'props'), ('side-view rooms', read_csv('rooms-side-view.csv'), 'file_name', 'rooms'), ('story pages', read_csv('story-pages.csv'), 'art_file_name', 'story')):
        want = [r[key] for r in rows]
        got = have(kind)
        missing = [w for w in want if w not in got]
        extra = sorted(got - set(want))
        print(f'{title}: {len(want) - len(missing)} of {len(want)} done')
        if extra:
            print(f'  not in the list (check spelling): {", ".join(extra)}')
        if missing and len(missing) <= 25:
            print('  still to do: ' + ', '.join(missing))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest='cmd', required=True)
    c = s.add_parser('chroma'); c.add_argument('src'); c.add_argument('dst'); c.add_argument('--key', default='ff00ff'); c.add_argument('--tol', type=int, default=70); c.add_argument('--max', type=int, default=768); c.add_argument('--keep', action='store_true', help='keep the full canvas (use for characters so every pose has the same frame)'); c.add_argument('--holes', type=int, default=0, help='also remove enclosed key-coloured pockets of at least this many pixels (use 60 for characters)'); c.set_defaults(f=cmd_chroma)
    c = s.add_parser('slice'); c.add_argument('src'); c.add_argument('--grid', required=True); c.add_argument('--names', required=True); c.add_argument('--out', default=os.path.join(ART, 'props')); c.add_argument('--key', default='ff00ff'); c.add_argument('--tol', type=int, default=70); c.add_argument('--max', type=int, default=768); c.add_argument('--keep', action='store_true'); c.add_argument('--holes', type=int, default=0); c.set_defaults(f=cmd_slice)
    c = s.add_parser('scene'); c.add_argument('src'); c.add_argument('dst'); c.add_argument('--kind', choices=['room', 'story'], help='room = side-view backdrop, story = story page (default: chosen from the folder name)'); c.set_defaults(f=cmd_scene)
    c = s.add_parser('manifest'); c.set_defaults(f=cmd_manifest)
    c = s.add_parser('check'); c.set_defaults(f=cmd_check)
    a = p.parse_args(); a.f(a)


if __name__ == '__main__':
    main()
