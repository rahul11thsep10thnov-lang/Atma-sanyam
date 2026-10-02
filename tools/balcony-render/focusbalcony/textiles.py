"""Woven materials: cane webbing (with real holes), linen, block-print
cotton, handloom stripes, dhurrie rug."""
from .materials import cached
from .nodes import Tree


def _uv_scaled(t, sx, sy):
    uvn = t.node("ShaderNodeUVMap", uv_map="UVMap")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(uvn, sep.inputs[0])
    return t.math("MULTIPLY", (sep, "X"), sx), t.math("MULTIPLY", (sep, "Y"), sy)


def _band(t, coord, half_width):
    """1 inside a strand of width 2*half_width centred on each integer+0.5."""
    d = t.math("ABSOLUTE", t.math("SUBTRACT", t.math("FRACT", coord), 0.5))
    return t.map_range(d, half_width, half_width * 0.6, 0.0, 1.0)


@cached
def cane_webbing(name="cane_webbing", density=55.0, color=(0.42, 0.29, 0.14)):
    """Classic octagonal Vienna-straw weave. UVs are in metres; `density`
    = cells per metre. Holes are genuinely transparent."""
    t = Tree(name)
    x, y = _uv_scaled(t, density, density)
    s = 0.7071
    xd = t.math("MULTIPLY", t.math("ADD", x, y), s)
    yd = t.math("MULTIPLY", t.math("SUBTRACT", x, y), s)
    b1, b2 = _band(t, x, 0.13), _band(t, y, 0.13)
    b3, b4 = _band(t, xd, 0.1), _band(t, yd, 0.1)
    cover = t.math("MAXIMUM", t.math("MAXIMUM", b1, b2), t.math("MAXIMUM", b3, b4))
    var = t.noise(t.coords("Object"), scale=30, detail=4)
    col = t.mix_color(t.map_range(var, 0.3, 0.7, 0, 1), tuple(c * 0.72 for c in color), color)
    col = t.mix_color(t.math("MULTIPLY", b3, 0.25), col, tuple(c * 1.15 for c in color))
    height = t.math("ADD", t.math("ADD", b1, b2), t.math("MULTIPLY", t.math("ADD", b3, b4), 0.7))
    bump = t.bump(height, 0.5, 0.0012)
    p = t.principled(col, 0.5, bump, Coat_Weight=0.25, Coat_Roughness=0.3)
    tr = t.node("ShaderNodeBsdfTransparent")
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, cover)
    t.link(tr, mix.inputs[1])
    t.link(p, mix.inputs[2])
    return t.surface(mix)


@cached
def rattan_strip(name="rattan_strip", color=(0.45, 0.31, 0.15)):
    """Wrapped rattan on frame joints: fine bands across the tube."""
    t = Tree(name)
    x, y = _uv_scaled(t, 1.0, 260.0)
    w = _band(t, y, 0.42)
    var = t.noise(t.coords("Object"), scale=40, detail=4)
    col = t.mix_color(t.map_range(var, 0.3, 0.7, 0, 1), tuple(c * 0.75 for c in color), color)
    return t.surface(t.principled(col, 0.45, t.bump(w, 0.6, 0.001), Coat_Weight=0.3))


@cached
def linen(name="linen", color=(0.74, 0.70, 0.62), sheen=0.5):
    t = Tree(name)
    co = t.coords("Object", scale=(1, 1, 1))
    w1 = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(700, 700, 700)), "Scale": 1.0, "Distortion": 1.2, "Detail": 2.0},
                wave_type="BANDS", bands_direction="X")
    w2 = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(700, 700, 700)), "Scale": 1.0, "Distortion": 1.2, "Detail": 2.0},
                wave_type="BANDS", bands_direction="Y")
    slub = t.noise(t.coords("Object", scale=(4, 60, 4)), scale=8, detail=6)
    weave = t.math("MULTIPLY", (w1, "Fac"), (w2, "Fac"))
    col = t.mix_color(t.map_range(slub, 0.45, 0.7, 0, 0.35), color, tuple(c * 0.86 for c in color))
    bump = t.bump(t.math("ADD", weave, t.math("MULTIPLY", (slub, "Fac"), 0.4)), 0.3, 0.0007)
    return t.surface(t.principled(col, 0.92, bump, Sheen_Weight=sheen, Sheen_Roughness=0.4))


@cached
def block_print(name="block_print", ground=(0.04, 0.07, 0.2), motif=(0.62, 0.6, 0.52), density=14.0):
    """Hand block-printed cotton (booti motif on a dyed ground)."""
    t = Tree(name)
    co = t.coords("Object", scale=(density, density, density))
    vor = t.node("ShaderNodeTexVoronoi", {"Vector": co, "Scale": 1.0, "Randomness": 0.15})
    dot = t.map_range((vor, "Distance"), 0.16, 0.12, 0.0, 1.0)
    ring = t.math("MULTIPLY", t.map_range((vor, "Distance"), 0.27, 0.25, 0.0, 1.0), t.map_range((vor, "Distance"), 0.2, 0.22, 0.0, 1.0))
    smudge = t.noise(t.coords("Object"), scale=60, detail=6)
    m = t.math("MULTIPLY", t.math("MAXIMUM", dot, ring), t.map_range(smudge, 0.3, 0.6, 0.7, 1.0))
    col = t.mix_color(m, ground, motif)
    w = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(600, 600, 600)), "Scale": 1.0, "Distortion": 1.0}, wave_type="BANDS")
    return t.surface(t.principled(col, 0.9, t.bump((w, "Fac"), 0.2, 0.0006), Sheen_Weight=0.3))


@cached
def handloom_stripes(name="handloom", colors=((0.55, 0.38, 0.12), (0.7, 0.66, 0.56), (0.12, 0.05, 0.03)), width=0.03):
    t = Tree(name)
    tc = t.node("ShaderNodeTexCoord")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link((tc, "Object"), sep.inputs[0])
    st = t.math("FRACT", t.math("DIVIDE", (sep, "X"), width * 4))
    c = t.mix_color(t.math("GREATER_THAN", st, 0.5), colors[0], colors[1])
    c = t.mix_color(t.math("LESS_THAN", st, 0.08), c, colors[2])
    w = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(500, 500, 500)), "Scale": 1.0, "Distortion": 1.0}, wave_type="BANDS")
    return t.surface(t.principled(c, 0.92, t.bump((w, "Fac"), 0.3, 0.0008), Sheen_Weight=0.4))


@cached
def dhurrie(name="dhurrie"):
    """Flat-woven cotton rug: cream field, indigo and rust bands, border."""
    t = Tree(name)
    uvn = t.node("ShaderNodeUVMap", uv_map="UVMap")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(uvn, sep.inputs[0])
    u, v = (sep, "X"), (sep, "Y")
    edge = t.math("MINIMUM", t.math("MINIMUM", u, t.math("SUBTRACT", 1.0, u)), t.math("MINIMUM", v, t.math("SUBTRACT", 1.0, v)))
    cream, indigo, rust = (0.62, 0.56, 0.45), (0.05, 0.08, 0.2), (0.38, 0.1, 0.04)
    col = t.mix_color(t.map_range(edge, 0.06, 0.055, 0, 1), cream, indigo)
    col = t.mix_color(t.math("MULTIPLY", t.map_range(edge, 0.085, 0.08, 0, 1), t.map_range(edge, 0.06, 0.065, 0, 1)), col, rust)
    bands = t.math("FRACT", t.math("MULTIPLY", v, 9.0))
    inner = t.map_range(edge, 0.1, 0.105, 0, 1)
    stripe = t.math("MULTIPLY", t.math("MULTIPLY", t.map_range(bands, 0.42, 0.44, 0, 1), t.map_range(bands, 0.58, 0.56, 0, 1)), inner)
    col = t.mix_color(stripe, col, indigo)
    thin = t.math("MULTIPLY", t.math("MULTIPLY", t.map_range(bands, 0.47, 0.48, 0, 1), t.map_range(bands, 0.53, 0.52, 0, 1)), inner)
    col = t.mix_color(thin, col, rust)
    slub = t.noise(t.coords("Object"), scale=30, detail=6)
    col = t.mix_color(t.map_range(slub, 0.4, 0.7, 0, 0.25), col, tuple(c * 0.8 for c in cream))
    w = t.node("ShaderNodeTexWave", {"Vector": t.coords("Object", scale=(260, 260, 260)), "Scale": 1.0, "Distortion": 1.5, "Detail": 3.0},
               wave_type="BANDS", bands_direction="Y")
    return t.surface(t.principled(col, 0.95, t.bump((w, "Fac"), 0.5, 0.0015), Sheen_Weight=0.3))
