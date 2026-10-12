"""Leaf, stem, pot and soil shaders. Leaves read per-part attributes
('var' for colour variation, 'dry' for wilting) written by geo.Builder."""
from .materials import cached
from .nodes import Tree


def _attr(t, name):
    a = t.node("ShaderNodeAttribute", attribute_name=name)
    return (a, "Fac")


@cached
def leaf(name, dark, light, roughness=0.4, translucency=0.3, pattern="plain", gloss_coat=0.0,
         dry_color=(0.36, 0.28, 0.08), variegation=None, margin=None):
    """UV: u across the blade (0..1, midrib at 0.5), v along it (0 base, 1 tip)."""
    t = Tree(name)
    uvn = t.node("ShaderNodeUVMap", uv_map="UVMap")
    sep = t.node("ShaderNodeSeparateXYZ")
    t.link(uvn, sep.inputs[0])
    u, v = (sep, "X"), (sep, "Y")
    var = _attr(t, "var")
    dry = _attr(t, "dry")
    across = t.math("ABSOLUTE", t.math("SUBTRACT", u, 0.5))  # 0 at midrib, 0.5 at margin

    base = t.mix_color(var, dark, light)
    # lighter towards the base and along the midrib
    midrib = t.math("SUBTRACT", 1.0, t.math("MULTIPLY", across, 60.0), clamp=True)
    base = t.mix_color(t.math("MULTIPLY", midrib, 0.5), base, tuple(min(1, c * 1.6 + 0.02) for c in light))
    # lateral veins: thin bands slanted towards the tip
    veins = t.node("ShaderNodeTexWave", {"Scale": 1.0, "Distortion": 0.6, "Detail": 1.0}, wave_type="BANDS", bands_direction="X")
    vec = t.node("ShaderNodeCombineXYZ")
    t.set(vec, "X", t.math("ADD", t.math("MULTIPLY", v, 26.0), t.math("MULTIPLY", across, -22.0)))
    t.link(vec, veins.inputs["Vector"])
    vein_mask = t.math("POWER", (veins, "Fac"), 6.0)
    base = t.mix_color(t.math("MULTIPLY", vein_mask, 0.25), base, tuple(c * 1.35 for c in light))

    if pattern == "snake":
        nz = t.node("ShaderNodeNoiseTexture" if False else "ShaderNodeTexNoise", {"Scale": 3.0, "Detail": 6.0})
        vec2 = t.node("ShaderNodeCombineXYZ")
        t.set(vec2, "X", t.math("MULTIPLY", u, 1.5))
        t.set(vec2, "Y", t.math("MULTIPLY", v, 1.0))
        t.link(vec2, nz.inputs["Vector"])
        bands = t.node("ShaderNodeTexWave", {"Scale": 1.0, "Distortion": 5.0, "Detail": 3.0, "Detail Scale": 2.0}, wave_type="BANDS", bands_direction="X")
        vec3 = t.node("ShaderNodeCombineXYZ")
        t.set(vec3, "X", t.math("ADD", t.math("MULTIPLY", v, 30.0), t.math("MULTIPLY", (nz, "Fac"), 4.0)))
        t.set(vec3, "Y", t.math("MULTIPLY", u, 3.0))
        t.link(vec3, bands.inputs["Vector"])
        band = t.map_range((bands, "Fac"), 0.45, 0.75, 0.0, 1.0)
        base = t.mix_color(band, base, (0.10, 0.14, 0.085))
    if variegation is not None:
        vn = t.node("ShaderNodeTexNoise", {"Scale": 4.0, "Detail": 8.0, "Distortion": 1.5})
        vec4 = t.node("ShaderNodeCombineXYZ")
        t.set(vec4, "X", t.math("MULTIPLY", u, 3.0))
        t.set(vec4, "Y", t.math("MULTIPLY", v, 1.2))
        t.set(vec4, "Z", t.math("MULTIPLY", var, 9.0))
        t.link(vec4, vn.inputs["Vector"])
        streak = t.map_range((vn, "Fac"), 0.58, 0.68, 0.0, 1.0)
        base = t.mix_color(streak, base, variegation)
    if margin is not None:
        edge = t.map_range(across, 0.42, 0.47, 0.0, 1.0)
        base = t.mix_color(edge, base, margin)

    # wilting: desaturate, yellow-brown from tips and margins
    tip = t.math("ADD", t.math("POWER", v, 3.0), t.math("MULTIPLY", across, 0.8))
    dried = t.math("MULTIPLY", dry, t.map_range(tip, 0.2, 1.0, 0.25, 1.0))
    hsv = t.node("ShaderNodeHueSaturation", {"Hue": 0.5, "Saturation": 1.0, "Value": 1.0, "Fac": 1.0})
    t.set(hsv, "Color", base)
    t.set(hsv, "Saturation", t.math("SUBTRACT", 1.0, t.math("MULTIPLY", dry, 0.45)))
    base = t.mix_color(dried, (hsv, "Color"), dry_color)

    fine = t.node("ShaderNodeTexNoise", {"Scale": 140.0, "Detail": 6.0})
    h = t.math("ADD", t.math("MULTIPLY", vein_mask, -0.6), t.math("MULTIPLY", (fine, "Fac"), 0.2))
    h = t.math("ADD", h, t.math("MULTIPLY", midrib, -0.8))
    bump = t.bump(h, strength=0.25, distance=0.0008)
    rough = t.math("ADD", roughness, t.math("MULTIPLY", dry, 0.25))
    p = t.principled(base, rough, bump, Coat_Weight=gloss_coat, Coat_Roughness=0.2)
    tr = t.node("ShaderNodeBsdfTranslucent")
    t.set(tr, "Color", t.mix_color(0.5, base, (0.5, 0.65, 0.12), "MULTIPLY"))
    t.set(tr, "Normal", bump)
    mix = t.node("ShaderNodeMixShader")
    t.set(mix, 0, translucency)
    t.link(p, mix.inputs[1])
    t.link(tr, mix.inputs[2])
    return t.surface(mix)


@cached
def stem(name="stem", color=(0.08, 0.14, 0.04), roughness=0.45):
    t = Tree(name)
    var = _attr(t, "var")
    n = t.noise(t.coords("Object"), scale=80, detail=4)
    col = t.mix_color(var, tuple(c * 0.8 for c in color), tuple(min(1, c * 1.25) for c in color))
    return t.surface(t.principled(col, roughness, t.bump((n, "Fac"), 0.1, 0.001)))


@cached
def terracotta_pot(name="terracotta_pot", color=(0.38, 0.14, 0.065)):
    t = Tree(name)
    co = t.coords("Object")
    gen = t.node("ShaderNodeTexCoord")
    sepz = t.node("ShaderNodeSeparateXYZ")
    t.link((gen, "Generated"), sepz.inputs[0])
    z = (sepz, "Z")
    mottle = t.noise(co, scale=14, detail=8, roughness=0.6)
    fine = t.noise(co, scale=300, detail=6)
    col = t.mix_color(t.map_range(mottle, 0.3, 0.7, 0, 1), tuple(c * 0.78 for c in color), color)
    # mineral bloom: whitish efflorescence near the base and in patches
    salt = t.noise(co, scale=6, detail=10, roughness=0.7)
    bloom = t.math("MULTIPLY", t.map_range(salt, 0.52, 0.7, 0, 1), t.math("SUBTRACT", 1.0, t.math("MULTIPLY", z, 1.6), clamp=True))
    col = t.mix_color(t.math("MULTIPLY", bloom, 0.55), col, (0.55, 0.45, 0.38))
    bump = t.bump((fine, "Fac"), 0.2, 0.0015)
    return t.surface(t.principled(col, t.map_range(fine, 0.3, 0.7, 0.78, 0.95), bump))


@cached
def glazed_pot(name="glazed_pot", color=(0.75, 0.72, 0.66), roughness=0.18):
    t = Tree(name)
    co = t.coords("Object")
    n = t.noise(co, scale=8, detail=6)
    speck = t.noise(co, scale=420, detail=2)
    col = t.mix_color(t.map_range(n, 0.4, 0.6, 0, 0.25), color, tuple(c * 0.85 for c in color))
    col = t.mix_color(t.map_range(speck, 0.66, 0.7, 0, 0.6), col, (0.12, 0.1, 0.08))
    bump = t.bump((n, "Fac"), 0.03, 0.002)
    return t.surface(t.principled(col, roughness, bump, Coat_Weight=0.4, Coat_Roughness=0.08))


@cached
def soil(name="soil"):
    t = Tree(name)
    co = t.coords("Object")
    vor = t.node("ShaderNodeTexVoronoi", {"Vector": co, "Scale": 140.0})
    n = t.noise(co, scale=40, detail=8)
    col = t.mix_color(t.map_range(n, 0.3, 0.7, 0, 1), (0.028, 0.017, 0.01), (0.06, 0.04, 0.025))
    col = t.mix_color(t.map_range((vor, "Distance"), 0.0, 0.25, 0.4, 0.0), col, (0.22, 0.18, 0.14))  # perlite flecks
    bump = t.bump(t.math("ADD", (vor, "Distance"), t.math("MULTIPLY", (n, "Fac"), 0.5)), 0.8, 0.003)
    return t.surface(t.principled(col, 0.95, bump))
