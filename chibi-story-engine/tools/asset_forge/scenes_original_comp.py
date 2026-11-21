"""Medium and close-up compositions of the seven original, hand-coded environments.

Their own drawing code cannot be recomposed, so each composition is a new arrangement of the same place built with the vector component
kit: same name, tags, ambience, habitats and anchor names and features (positions pulled together and scaled up, as for the generated
backgrounds), `composition_group` pointing at the original. The wide composition remains the original artwork.
"""
from __future__ import annotations

from .env_kit import At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

M = {"medium": (0.86, 1.12), "closeup": (0.66, 1.3)}            # pull toward the centre, anchor scale


def _anchors(orig, mode: str) -> dict:
    pull, sc = M[mode]
    out = {}
    for n, a in orig.anchors.items():
        d = {"x": a.x, "y": a.y, "order": a.order, "features": list(a.features)}
        if a.scale != 1.0 or "offstage" not in n:
            d["scale"] = round((a.scale or 1.0) * (sc if "offstage" not in n else 1.0), 3)
        if "offstage" not in n:
            d["x"] = round(960 + (a.x - 960) * pull, 1)
        out[n] = d
    return out


def build(library) -> list:
    specs = []
    hz = lambda c="#d9f2ff", a=0.4: haze(None, c, a)
    T = ["tree-oak", "tree-jamun", "tree-mango", "tree-neem"]

    def add(orig_id, mode, layers, aliases):
        o = library.environment(orig_id, 1)
        an, ro = _anchors(o, mode), o.default_anchor_by_role
        sp = make_env(f"{orig_id}-{mode}", f"{o.name} ({'medium' if mode == 'medium' else 'close-up'})", "ORG", mode, f"{o.description} {'Medium' if mode == 'medium' else 'Close-up'} composition: a new arrangement of the same place.",
                      layers, an, ro, list(o.compatibility.get("habitats", ["ground"])), list(o.tags), [*o.aliases, *aliases], [], seed=2000 + len(specs), composition=mode, group=orig_id,
                      ambience=o.compatibility.get("ambience"), lighting=list(o.lighting_presets))
        specs.append(sp)

    for mode in ("medium", "closeup"):
        k = 1.0 if mode == "medium" else 1.35
        # forest_river: the jamun tree, its branch over the water
        ly, _, _ = scene(sky=("day", {"clouds": 3}), back=[Scatter(T, 5, (-100, 2050), (400, 420), (0.55, 0.7), 3, pal=hz())] if mode == "medium" else [],
                         water={"top": 250.0, "front": False, "ripples": (80.0, 240.0), "n": 16}, ground=("grass", 210, {"profile": [(-400, 330), (700, 300), (1050, 150), (1250, 30), (2400, 30)]}),
                         mid=[At("tree-jamun", 640, 300, 2.1 * k)], veg=[At("bush-berry-blue", 330, 300, 1.2 * k), At("grass-cattail", 1750, 60, 1.2 * k)], fg=[Scatter(["grass-reed-tall"], 3, (-100, 2050), (-120, 0), (1.0, 1.4), 6)], seed=2101)
        add("forest_river_001", mode, ly, [f"jamun tree ({mode})"])
        # open river
        ly, _, _ = scene(sky=("day", {"clouds": 4}), far=[At("mountain-blue-range", 960, 400, 1.6)] if mode == "medium" else [], water={"top": 420.0, "ripples": (80.0, 410.0), "n": 30},
                         ground=("moss", 100, {"profile": [(-400, 120), (2400, 120)]}), mid=[At("water-sailboat", 1250, 300, 1.5 * k)] if mode == "medium" else [At("water-boat", 1100, 220, 1.7)],
                         fx=[Shape("wave_lines", 90, 400, 36)], fg=[Scatter(["water-lilypads"], 3, (-100, 2050), (-100, 0), (1.2, 1.7), 6)], seed=2102)
        add("river_open_001", mode, ly, [f"river ({mode})"])
        # crocodile home: rocks and a cave at dusk
        ly, _, _ = scene(sky=("sunset", {"clouds": 3}), far=[At("mountain-rocky", 700, 380, 1.8)] if mode == "medium" else [], back=[At("mountain-cliff", 900, 340, 1.8)],
                         water={"top": 250.0, "ripples": (60.0, 240.0), "n": 18}, ground=("rock", 130, {"profile": [(-400, 300), (500, 260), (700, 60), (1400, 60), (1700, 250), (2400, 300)]}),
                         mid=[At("rock-arch", 480, 280, 1.7 * k), At("rock-big", 1700, 270, 1.4 * k), At("rock-river", 1000, 120, 0.8)], veg=[At("bush-dry", 180, 300, 1.0)], seed=2103)
        add("crocodile_home_001", mode, ly, [f"crocodiles' cave ({mode})"])
        # forest clearing with a well
        ly, _, _ = scene(sky=("morning", {"clouds": 2}), back=[Scatter(T + ["tree-bamboo"], 8, (-100, 2050), (390, 420), (0.55, 0.7), 4, pal=hz("#fff0c8"))] if mode == "medium" else [],
                         ground=("forest", 215), mid=[At("bld-village-well", 1500, 215, 1.5 * k), At("rock-big", 430, 235, 1.6 * k), At("rock-mossy", 700, 230, 1.0)], veg=[At("tree-oak", 120, 240, 1.4 * k), At("tree-pine", 1900, 235, 1.3 * k)],
                         fx=[Shape("shafts", [500, 1100], col="#fff6c8")], fg=[Scatter(["grass-tall", "grass-fern-floor"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=2104)
        add("forest_well_001", mode, ly, [f"clearing with a well ({mode})"])
        # village lane with the dyer's vat
        ly, _, _ = scene(sky=("day", {"clouds": 3}), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=["bld-mud-hut", "bld-thatched-hut", "bld-village-house"], seed=3, pal=hz())] if mode == "medium" else [], ground=("dirt", 215),
                         mid=[At("bld-mud-hut", 380, 215, 1.5 * k), At("bld-village-house", 1050, 215, 1.2 * k), Shape("pot", 1560, 150, 2.4 * k), At("fence-bamboo", 1200, 215, 1.0)],
                         veg=[At("tree-neem", 120, 230, 1.2 * k)], fx=[Shape("flags", 250, 640, 1100, 600, 60, 8)], fg=[Scatter(["grass-tall"], 4, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=2105)
        add("village_001", mode, ly, [f"village lane ({mode})"])
        # farm field with the scarecrow
        ly, _, _ = scene(sky=("noon", {"clouds": 5}), far=[At("mountain-green-hills", 700, 400, 1.3)] if mode == "medium" else [], ground=("dirt", 300, {"profile": [(-400, 300), (2400, 300)]}),
                         mid=[Row("x", -200, 2200, 150 if mode == "medium" else 120, 300, 1.2 * k, 10, ids=["grass-wheat", "grass-millet"], seed=4), Shape("scarecrow", 820, 270, 1.6 * k)],
                         veg=[At("tree-peepal", 1850, 300, 1.2 * k)], fg=[Row("x", -200, 2200, 120, -90, 1.2, 10, ids=["grass-wheat"], seed=5)], seed=2106)
        add("farm_field_001", mode, ly, [f"fields with a scarecrow ({mode})"])
        # haveli courtyard
        ly, _, _ = scene(wall=("palace", {"panels": 1}), decor=[At("window-jharokha", 400, 600, 1.2 * k), At("window-jharokha", 1500, 600, 1.2 * k), At("lamp-hanging-brass", 960, 1000, 1.1)], ground=("tile", 215),
                         mid=[At("door-arched", 1080, 215, 1.6 * k), Shape("table", 640, 215, int(420 * k))], occl=[Shape("pot", 300, 100, 1.4), Shape("pot", 1650, 100, 1.2)],
                         veg=[At("bush-tulsi", 760, 215, 1.2 * k)], beams="#6a4a2a", seed=2107)
        add("mansion_001", mode, ly, [f"haveli courtyard ({mode})"])
    return specs
