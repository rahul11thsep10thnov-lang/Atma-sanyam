"""Physically based materials, all procedural (no texture downloads).

Colours are LINEAR RGB. Every surface gets micro-variation in colour,
roughness and relief, because flat uniform surfaces are what make renders
read as CG.
"""
import bpy
from .nodes import Tree

_cache: dict[str, bpy.types.Material] = {}


def cached(fn):
    def wrapper(*a, **k):
        key = fn.__name__ + repr(a) + repr(sorted(k.items()))
        if key not in _cache:
            _cache[key] = fn(*a, **k)
        return _cache[key]
    return wrapper


@cached
def plaster(color=(0.62, 0.555, 0.47), name="plaster"):
    t = Tree(name)
    co = t.coords("Object")
    fine = t.noise(co, scale=180, detail=10, roughness=0.65)
    mid = t.noise(co, scale=22, detail=6, roughness=0.6)
    large = t.noise(co, scale=1.8, detail=3)
    dark = tuple(c * 0.9 for c in color)
    col = t.mix_color(t.map_range(large, 0.35, 0.65, 0, 1), dark, color)
    col = t.mix_color(t.map_range(mid, 0.3, 0.7, 0, 0.35), col, tuple(c * 1.04 for c in color))
    h = t.math("ADD", t.math("MULTIPLY", (fine, "Fac"), 0.7), t.math("MULTIPLY", (mid, "Fac"), 0.3))
    bump = t.bump(h, strength=0.12, distance=0.004)
    rough = t.map_range(fine, 0.3, 0.7, 0.82, 0.95)
    return t.surface(t.principled(col, rough, bump))


@cached
def terracotta_tiles(tile=0.3):
    t = Tree("terracotta_tiles")
    co = t.coords("Object")
    brick = t.node("ShaderNodeTexBrick", {"Vector": co, "Scale": 1.0, "Mortar Size": 0.0035,
                                          "Mortar Smooth": 0.35, "Bias": 0.0, "Brick Width": tile, "Row Height": tile,
                                          "Color1": (0.33, 0.115, 0.058), "Color2": (0.42, 0.155, 0.08),
                                          "Mortar": (0.28, 0.22, 0.17)},
                   offset=0.0, offset_frequency=1, squash=1.0, squash_frequency=1)
    mottle = t.noise(co, scale=14, detail=8, roughness=0.55)
    speck = t.noise(co, scale=220, detail=4)
    # gentle clay-firing variation within each tile (not stains)
    base = t.mix_color(t.map_range(mottle, 0.25, 0.75, 0.0, 0.35), (brick, "Color"), (0.27, 0.09, 0.045))
    base = t.mix_color(t.map_range(speck, 0.55, 0.75, 0, 0.25), base, (0.55, 0.36, 0.25))
    mortar = (brick, "Fac")
    # sealed terracotta: slight sheen on the tiles, matte grout, worn areas rougher
    rough = t.math("ADD", t.map_range(mottle, 0.2, 0.8, 0.38, 0.62), t.math("MULTIPLY", mortar, 0.4), clamp=True)
    h = t.math("ADD", t.math("MULTIPLY", mortar, -1.0), t.math("MULTIPLY", (speck, "Fac"), 0.15))
    bump = t.bump(h, strength=0.35, distance=0.0025)
    return t.surface(t.principled(base, rough, bump))


@cached
def wood(dark=(0.10, 0.045, 0.02), light=(0.30, 0.14, 0.065), roughness=0.42, scale=4.0, name="teak"):
    """Grain runs along local X; scale the object, not the texture."""
    t = Tree(name)
    co = t.coords("Object", scale=(0.6, 6.0, 6.0))
    distort = t.noise(co, scale=2.5, detail=6)
    wave = t.node("ShaderNodeTexWave", {"Vector": co, "Scale": scale, "Distortion": 7.0, "Detail": 4.0,
                                        "Detail Scale": 1.5, "Detail Roughness": 0.6},
                  wave_type="BANDS", bands_direction="X")
    fibres = t.noise(t.coords("Object", scale=(3, 140, 140)), scale=6, detail=8)
    g = t.math("ADD", t.math("MULTIPLY", (wave, "Fac"), 0.75), t.math("MULTIPLY", (fibres, "Fac"), 0.25))
    col = t.ramp(g, [(0.15, dark), (0.85, light)])
    col = t.mix_color(t.map_range(distort, 0.4, 0.6, 0.0, 0.2), col, dark)
    bump = t.bump((fibres, "Fac"), strength=0.08, distance=0.002)
    rough = t.map_range(fibres, 0.3, 0.7, roughness - 0.06, roughness + 0.08)
    return t.surface(t.principled(col, rough, bump, Coat_Weight=0.15, Coat_Roughness=0.25))


@cached
def powder_coat(color=(0.018, 0.017, 0.016), roughness=0.38, name="frame_black"):
    t = Tree(name)
    n = t.noise(t.coords("Object"), scale=400, detail=6)
    bump = t.bump((n, "Fac"), strength=0.04, distance=0.001)
    return t.surface(t.principled(color, t.map_range(n, 0.3, 0.7, roughness - 0.05, roughness + 0.08), bump))


@cached
def metal(color=(0.18, 0.12, 0.07), roughness=0.32, name="bronze"):
    t = Tree(name)
    n = t.noise(t.coords("Object"), scale=60, detail=8)
    rough = t.map_range(n, 0.3, 0.7, roughness - 0.08, roughness + 0.12)
    return t.surface(t.principled(color, rough, None, Metallic=1.0))


@cached
def glass(tint=(0.93, 0.975, 0.965), name="glass"):
    t = Tree(name)
    return t.surface(t.principled(tint, 0.0, None, Transmission_Weight=1.0, IOR=1.52))


@cached
def stone(color=(0.30, 0.29, 0.24), name="kota_stone"):
    t = Tree(name)
    co = t.coords("Object")
    n1 = t.noise(co, scale=6, detail=10, roughness=0.62)
    n2 = t.noise(co, scale=90, detail=6)
    col = t.mix_color(t.map_range(n1, 0.35, 0.65, 0, 1), tuple(c * 0.82 for c in color), color)
    rough = t.map_range(n2, 0.3, 0.7, 0.35, 0.6)
    bump = t.bump((n2, "Fac"), strength=0.05, distance=0.002)
    return t.surface(t.principled(col, rough, bump))


@cached
def emissive(color=(1.0, 0.78, 0.5), strength=3.0, name="glow"):
    t = Tree(name)
    e = t.node("ShaderNodeEmission", {"Color": color, "Strength": strength})
    return t.surface(e)


@cached
def matte(color=(0.2, 0.2, 0.2), roughness=0.8, name="matte"):
    t = Tree(name)
    return t.surface(t.principled(color, roughness))


def hazed(color, roughness=0.9, haze=(0.62, 0.6, 0.58), haze_strength=1.0, falloff=900.0,
          name="hazed", variation=0.15, scale=0.02):
    """Outdoor material with aerial perspective: blends to a haze emission
    with view distance (1 - e^(-d/falloff)). Cheap and convincing."""
    t = Tree(name)
    co = t.coords("Object")
    n = t.noise(co, scale=scale, detail=6)
    rnd = t.node("ShaderNodeObjectInfo")
    col = t.mix_color(t.map_range(n, 0.3, 0.7, 0, 1), tuple(c * (1 - variation) for c in color), color)
    col = t.mix_color(t.math("MULTIPLY", (rnd, "Random"), variation * 2), col, tuple(c * 0.75 for c in color))
    surf = t.principled(col, roughness)
    cam = t.node("ShaderNodeCameraData")
    d = t.math("DIVIDE", (cam, "View Distance"), falloff)
    f = t.math("SUBTRACT", 1.0, t.math("EXPONENT", t.math("MULTIPLY", d, -1.0)))
    em = t.node("ShaderNodeEmission", {"Color": haze, "Strength": haze_strength})
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, f)
    t.link(surf, mix.inputs[1])
    t.link(em, mix.inputs[2])
    return t.surface(mix)
