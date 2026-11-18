"""Category G: temples and hermitages (15) and H: markets (12)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

T = ["tree-neem", "tree-peepal", "tree-banyan", "tree-coconut", "tree-mango"]


def build() -> list:
    E = []

    def env(code, n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), **kw):
        E.append(make_env(f"env-{code.lower()}-{n:04d}", name, code, sub, desc, ly, an, ro, list(habit), tags, aliases, stories, seed=(600 if code == "TMP" else 700) + n, **kw))

    hz = lambda sky="day", a=0.42: haze(None, SKY_COLOURS[sky][1], a)
    tmp = lambda n, *a, **k: env("TMP", n, *a, **k)
    mkt = lambda n, *a, **k: env("MKT", n, *a, **k)
    gr = lambda: [Scatter(["grass-tuft", "flower-marigold"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]
    lamps = [At("lamp-deepstambh", 330, 215, 1.0), At("lamp-deepstambh", 1590, 215, 1.0)]

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), far=[At("mountain-green-hills", 700, 400, 1.3)], back=[Scatter(T, 8, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz("morning"))], ground=("stone", FLOOR), mid=[At("bld-shikhara-temple", 960, 335, 1.5), Shape("stairs", 960, 215, 700, 4)] + lamps,
                       veg=[At("tree-peepal", 100, 340, 1.0), At("tree-coconut", 1850, 340, 1.0)], fg=gr(), seed=601)
    tmp(1, "Ancient Indian temple exterior", "exterior", "A stone shikhara temple on a stepped platform with lamp towers.", ["temple", "shikhara", "exterior", "stone", "steps", "ancient"], ["प्राचीन मंदिर", "temple exterior"], ["vikram_betal", "panchatantra", "folk"], ly, an, ro)

    ly, an, ro = scene(wall=("temple", {"panels": 1}), decor=[At("window-jali", 300, 520, 1.0), At("window-jali", 1620, 520, 1.0), At("lamp-wall-torch", 700, 560, 0.9), At("lamp-wall-torch", 1220, 560, 0.9)], ground=("marble", FLOOR), mid=[Shape("altar", 960, 335, 1.3), Shape("pillar", 200, 335, 560), Shape("pillar", 1720, 335, 560)],
                       occl=[At("lamp-diya", 700, 120, 1.4), At("lamp-diya", 1220, 120, 1.4)], fx=[Shape("light_pool", 960, 560, 700, 98, "#ffcf70", 0.3)], seed=602)
    tmp(2, "Temple interior", "interior", "The sanctum: an altar with an idol, lamps and carved pillars.", ["temple", "interior", "altar", "idol", "lamps", "sanctum"], ["मंदिर का गर्भगृह", "temple interior"], ["vikram_betal", "folk"], ly, an, ro, ("ground",))

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[At("bld-gopuram", 300, 380, 0.9), At("bld-shikhara-temple", 1550, 380, 0.7)], back_tint="background", ground=("stone", FLOOR), mid=[At("bld-mandapa", 960, 335, 1.3), At("wall-balustrade", 300, 215, 1.0), At("wall-balustrade", 1650, 215, 1.0)] + lamps, veg=[At("tree-peepal", 130, 340, 0.9)], fg=gr(), seed=603)
    tmp(3, "Temple courtyard", "courtyard", "A paved temple courtyard with a pillared hall and lamp towers.", ["temple", "courtyard", "mandapa", "paved", "pillars", "worship"], ["मंदिर का प्रांगण", "temple courtyard"], ["vikram_betal", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T, 6, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz("morning"))], ground=("stone", FLOOR), mid=[At("bld-gopuram", 960, 335, 1.6), At("door-temple", 960, 215, 1.0)], veg=[At("tree-banyan", 110, 340, 0.9)], occl=[Shape("stairs", 960, 100, 720, 3)], fx=[], fg=[Scatter(["flower-marigold"], 6, (-100, 2050), (-100, 20), (1.0, 1.4), 6)] + [], seed=604)
    tmp(4, "Temple entrance", "gate", "The towering gopuram gateway with its great carved door.", ["temple", "entrance", "gopuram", "gate", "door", "pilgrim"], ["मंदिर का द्वार", "temple gate"], ["vikram_betal", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), back=[Scatter(T, 8, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz())], ground=("grass", FLOOR), mid=[At("bld-shrine", 1450, 335, 1.0), At("bush-hedge", 400, 215, 1.4), At("bush-hedge", 1000, 215, 1.0)] + [At("flower-jasmine", x, 330, 1.0) for x in (300, 700, 1150)] + [At("flower-rose", 900, 330, 1.1)],
                       veg=[At("tree-mango", 130, 340, 1.0), At("bush-hibiscus", 1800, 335, 1.0), Shape("pot", 700, 330, 1.0)], fg=[Scatter(["flower-marigold", "flower-hibiscus", "grass-tall"], 7, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=605)
    tmp(5, "Temple garden", "garden", "A flowering garden around a small shrine: jasmine, roses, hibiscus.", ["temple", "garden", "flowers", "shrine", "jasmine", "peaceful"], ["मंदिर का बगीचा", "temple garden"], ["folk", "panchatantra"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("snow", {"clouds": 2}), far=[At("mountain-himalaya", 960, 400, 1.9)], back=[Scatter(["tree-pine", "tree-deodar"], 6, (-100, 2050), (380, 400), (0.5, 0.6), 2, pal=hz("snow"))], ground=("stone", FLOOR), mid=[At("bld-monastery", 960, 335, 1.5), At("bld-stupa", 1700, 335, 0.9)], veg=[At("tree-pine", 120, 340, 1.2)],
                       fx=[Shape("flags", -100, 800, 1000, 760, 50, 14)], fg=[Scatter(["grass-dry", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=606)
    tmp(6, "Buddhist monastery", "monastery", "A tiered monastery and a white stupa under the mountains, prayer flags overhead.", ["buddhist", "monastery", "stupa", "monk", "mountain", "flags"], ["बौद्ध मठ", "buddhist monastery"], ["jataka"], ly, an, ro)

    ly, an, ro = scene(wall=("royal", {"panels": 1}), decor=[At("window-round", 400, 560, 1.0), At("window-round", 1520, 560, 1.0), At("lamp-hanging-brass", 700, 1000, 1.0), At("lamp-hanging-brass", 1220, 1000, 1.0)], ground=("wood", FLOOR), mid=[Shape("buddha", 960, 335, 1.3), Shape("pillar", 200, 335, 560), Shape("pillar", 1720, 335, 560)],
                       occl=[Shape("cushions", [520, 700, 1220, 1400], 100, "#e6b93c")], fx=[Shape("light_pool", 960, 560, 700, 98, "#ffcf70", 0.3)], seed=607)
    tmp(7, "Buddhist prayer hall", "prayer-hall", "A prayer hall: a golden Buddha, red pillars, cushions and brass lamps.", ["buddhist", "prayer", "hall", "monk", "meditation", "golden"], ["बौद्ध प्रार्थना कक्ष", "prayer hall"], ["jataka"], ly, an, ro, ("ground",))

    ly, an, ro = scene(sky=("morning", {"clouds": 2}), back=[Scatter(["tree-banyan", "tree-bamboo", "tree-mango", "tree-peepal"], 11, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=hz("morning"))], ground=("dirt", FLOOR), mid=[At("bld-thatched-hut", 1400, 340, 1.0), At("lamp-campfire", 800, 215, 1.0), At("fence-bamboo", 300, 215, 1.0)],
                       veg=[At("tree-banyan", 110, 340, 1.0), At("bush-tulsi", 1100, 330, 1.0), Shape("pot", 1700, 330, 1.0)], fg=gr(), fx=[Shape("shafts", [500, 1100], col="#fff6c8")], seed=608)
    tmp(8, "Forest hermitage", "hermitage", "A leaf-thatched hut among forest trees, a sacred fire burning in front.", ["hermitage", "forest", "sage", "hut", "fire", "ashram"], ["वन आश्रम", "forest hermitage"], ["panchatantra", "jataka", "vikram_betal"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("golden", {"clouds": 2}), back=[Scatter(T, 9, (-100, 2050), (390, 420), (0.55, 0.65), 2, pal=hz("golden"))], ground=("dirt", FLOOR), mid=[At("bld-hut-veranda", 1000, 335, 1.2), At("wall-mud", 300, 215, 1.0), At("wall-mud", 1760, 215, 1.0), At("bush-tulsi", 500, 330, 1.0), Shape("pot", 1550, 330, 1.0)],
                       veg=[At("tree-banyan", 130, 340, 0.9), At("flower-marigold", 700, 330, 1.0), At("tree-coconut", 1870, 340, 1.0)], fg=gr(), seed=609)
    tmp(9, "Sage's ashram", "ashram", "A peaceful ashram with a veranda hut, tulsi and a low mud wall.", ["ashram", "sage", "rishi", "hut", "tulsi", "school"], ["ऋषि का आश्रम", "sage's ashram"], ["panchatantra", "vikram_betal", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("dawn", {"clouds": 3, "sun": (900, 560, 74)}), back=[Scatter(["tree-banyan", "tree-peepal", "tree-neem"], 9, (-100, 2050), (390, 420), (0.55, 0.65), 2, pal=hz("dawn"))], ground=("moss", FLOOR), mid=[At("rock-slab", 960, 330, 1.6), At("rock-mossy", 380, 330, 1.0), At("rock-mossy", 1560, 330, 1.0), At("lamp-diya", 860, 345, 1.0)],
                       veg=[At("tree-banyan", 120, 340, 1.1)], fx=[Shape("shafts", [700, 1300], col="#fff0c0"), Shape("mist", 340, 3, col="#fff4e0", op=0.2)], fg=[Scatter(["grass-moss", "flower-lotus-bud"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=610)
    tmp(10, "Meditation area", "meditation", "A mossy rock platform under old trees, lit by the first light.", ["meditation", "yoga", "dawn", "calm", "sage", "rock"], ["ध्यान स्थल", "meditation spot"], ["jataka", "panchatantra"], ly, an, ro, ("ground", "arboreal"), lighting=["morning", "evening"])

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Scatter(T, 8, (-100, 2050), (390, 420), (0.5, 0.6), 2, pal=hz("noon"))], ground=("stone", FLOOR), mid=[At("bld-mandapa", 960, 335, 1.7), At("bld-mandapa", 250, 335, 0.9), At("bld-mandapa", 1700, 335, 0.9)], occl=[Shape("cushions", [760, 880, 1000, 1120], 150, "#3a6ad8"), Shape("blackboard", 960, 100, 240, 160)],
                       veg=[At("tree-banyan", 110, 340, 0.8)], fg=gr(), seed=611)
    tmp(11, "Ancient learning centre", "gurukul", "Open pillared halls where students sit on mats before a teacher: a gurukul.", ["gurukul", "school", "learning", "teacher", "pillars", "university"], ["गुरुकुल", "ancient learning centre"], ["panchatantra", "hitopadesha", "tenali_raman", "akbar_birbal"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T, 8, (-100, 2050), (390, 420), (0.5, 0.65), 2, pal=hz("morning"))], ground=("stone", FLOOR), mid=[At("tree-banyan-ancient", 960, 335, 1.5), Shape("platform", 960, 215, 760, 70, "#c8b898"), At("lamp-diya", 700, 290, 1.4), At("lamp-diya", 1220, 290, 1.4)],
                       veg=[At("tree-peepal", 120, 340, 1.0), At("flower-marigold", 1750, 335, 1.0)], fg=gr(), seed=612)
    tmp(12, "Sacred tree courtyard", "sacred-tree", "A courtyard built around an ancient sacred banyan with an offering platform.", ["sacred", "tree", "banyan", "courtyard", "offering", "worship"], ["पवित्र वृक्ष", "sacred tree"], ["jataka", "vikram_betal", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), back=[At("bld-shikhara-temple", 1450, 400, 0.7), Scatter(T, 5, (-100, 2050), (390, 420), (0.5, 0.65), 2, pal=hz("evening"))], water={"top": 280.0, "front": False, "ripples": (100.0, 270.0), "n": 16}, ground=("stone", 215, {"profile": [(-400, 300), (300, 230), (600, 50), (1500, 50), (1800, 220), (2400, 300)]}),
                       mid=[Shape("ghat", 330, 215, 520, 5), At("flower-lotus", 900, 130, 1.0), At("flower-lotus", 1150, 150, 0.9), At("water-lilypads", 760, 80, 1.0), At("lamp-deepstambh", 1900, 225, 1.0)], veg=[At("tree-peepal", 100, 335, 1.0)], fg=[Scatter(["grass-reed-tall"], 3, (-100, 2050), (-120, 0), (0.9, 1.2), 6)], seed=613)
    tmp(13, "Temple pond", "pond", "A stone-stepped temple tank with lotuses and a lamp pillar.", ["temple", "pond", "tank", "steps", "lotus", "evening"], ["मंदिर का कुण्ड", "temple pond"], ["folk", "jataka"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("snow", {"clouds": 2}), far=[At("mountain-snow-peak", 500, 380, 2.0), At("mountain-himalaya", 1500, 380, 2.0)], ground=("rock", 260, {"profile": [(-400, 260), (2400, 260)]}), mid=[At("bld-monastery", 900, 265, 1.4), At("bld-stupa", 1650, 265, 1.0), At("rock-cairn", 300, 265, 1.0)],
                       veg=[At("tree-pine-snow", 110, 270, 1.2)], fx=[Shape("flags", 100, 620, 1100, 800, 60, 16), Shape("mist", 300, 3, col="#ffffff", op=0.18)], fg=[Scatter(["grass-snow", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=614)
    tmp(14, "Mountain monastery", "mountain-monastery", "A remote monastery on a rocky shoulder among snow peaks.", ["monastery", "mountain", "snow", "remote", "buddhist", "stupa"], ["पर्वतीय मठ", "mountain monastery"], ["jataka", "folk"], ly, an, ro, lighting=["morning", "noon", "evening"])

    ly, an, ro = scene(sky=("day", {"clouds": 3}), back=[Scatter(T, 7, (-100, 2050), (390, 420), (0.5, 0.65), 2, pal=hz())], ground=("dirt", FLOOR), mid=[At("bld-shrine", 960, 335, 1.6), At("lamp-diya", 800, 215, 1.2), At("lamp-diya", 1120, 215, 1.2), Shape("pot", 560, 330, 1.0)],
                       veg=[At("tree-peepal", 300, 340, 1.4), At("tree-neem", 1750, 340, 1.0), At("flower-marigold", 1350, 335, 1.0)], fg=gr(), seed=615)
    tmp(15, "Village shrine", "village-shrine", "A small roadside village shrine under a peepal tree with offerings.", ["shrine", "village", "peepal", "offering", "roadside", "worship"], ["गाँव का मंदिर", "village shrine"], ["folk", "panchatantra", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    # ------------------------------------------------------------------------------------------ H: markets
    sky = lambda: ("day", {"clouds": 2})
    ly, an, ro = scene(sky=sky(), back=[Row("x", -100, 2100, 300, 410, 0.55, 20, ids=["bld-haveli", "bld-merchant-house", "bld-two-storey"], seed=3, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[At("bld-cloth-stall", 300, 335, 1.0), At("bld-grocery-stall", 800, 335, 1.0), At("bld-jewellery-shop", 1300, 335, 1.0), At("bld-fruit-stall", 1760, 335, 1.0)], occl=[Shape("sacks", 600, 110, 0.9, 4), Shape("barrel", 1500, 120, 0.9)], fx=[Shape("flags", -100, 980, 2000, 980, 80, 20)], veg=[At("tree-banyan", 1000, 400, 0.7)], seed=701)
    mkt(1, "Ancient Indian bazaar", "bazaar", "A crowded old bazaar of cloth, grocery, jewellery and fruit stalls under bunting.", ["bazaar", "market", "stalls", "merchant", "bunting", "ancient"], ["प्राचीन बाज़ार", "ancient bazaar"], ["akbar_birbal", "tenali_raman", "arabian_nights", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T, 6, (-100, 2050), (400, 420), (0.5, 0.6), 2, pal=hz("morning"))], ground=("dirt", FLOOR), mid=[At("bld-fruit-stall", 380, 335, 1.2), At("bld-fruit-stall", 960, 335, 1.2), At("bld-fruit-stall", 1540, 335, 1.2), At("tree-banana", 1900, 340, 0.8), At("tree-mango", 100, 340, 0.8)],
                       occl=[Shape("sacks", 700, 100, 0.9, 4), Shape("barrel", 1300, 110, 0.9)], fg=gr(), seed=702)
    mkt(2, "Fruit market", "fruit", "Three fruit stalls piled with mangoes, bananas and melons.", ["fruit", "market", "stall", "mango", "banana", "seller"], ["फल बाज़ार", "fruit market"], ["panchatantra", "akbar_birbal", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=sky(), back=[Row("x", -100, 2100, 280, 410, 0.55, 20, ids=["bld-village-house", "bld-whitewash-house"], seed=4, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[At("bld-veg-stall", 330, 335, 1.2), At("bld-veg-stall", 960, 335, 1.2), At("bld-veg-stall", 1590, 335, 1.2)], occl=[Shape("sacks", 650, 100, 1.0, 4), Shape("barrel", 1300, 110, 0.9), Shape("pot", 1000, 120, 0.9)], fg=gr(), seed=703)
    mkt(3, "Vegetable market", "vegetable", "Vegetable stalls with baskets and sacks in front of village houses.", ["vegetable", "market", "stall", "baskets", "greens", "seller"], ["सब्ज़ी मंडी", "vegetable market"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(sky=sky(), back=[Row("x", -100, 2100, 300, 410, 0.55, 20, ids=["bld-haveli", "bld-merchant-house"], seed=5, pal=hz())], back_tint="background", ground=("cobble", FLOOR),
                       mid=[At("bld-cloth-stall", 300, 335, 1.2), At("bld-cloth-stall", 960, 335, 1.2), At("bld-cloth-stall", 1620, 335, 1.2)], fx=[Shape("flags", -100, 900, 2000, 900, 100, 20)], occl=[Shape("sacks", 960, 100, 0.8, 3)], seed=704)
    mkt(4, "Cloth market", "cloth", "Stalls of coloured cloth and silks under hanging bunting.", ["cloth", "market", "silk", "weaver", "textile", "stall"], ["कपड़ा बाज़ार", "cloth market"], ["akbar_birbal", "tenali_raman", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(wall=("palace", {"panels": 1}), decor=[At("window-jali", 300, 600, 1.0), At("window-jali", 1620, 600, 1.0)], ground=("tile", FLOOR), mid=[At("bld-jewellery-shop", 960, 335, 1.6), Shape("table", 400, 335, 420), Shape("table", 1520, 335, 420)], occl=[Shape("chest", 700, 100, 1.0), Shape("coins", 1300, 100, 1.0)], fx=[Shape("light_pool", 960, 600, 700, 98, "#fff0c0", 0.3)], seed=705)
    mkt(5, "Jewellery shop", "jeweller", "A jeweller's shop interior with a counter, tables, chests and gold coins.", ["jewellery", "shop", "gold", "merchant", "counter", "treasure"], ["जौहरी की दुकान", "jewellery shop"], ["akbar_birbal", "arabian_nights", "tenali_raman"], ly, an, ro, ("ground",))

    ly, an, ro = scene(wall=("wood", {"panels": 1}), decor=[At("window-slit", 300, 700, 1.0), At("window-slit", 1620, 700, 1.0)], ground=("wood", FLOOR), mid=[Shape("sacks", 300, 335, 1.3, 6), Shape("sacks", 1550, 335, 1.3, 6), Shape("barrel", 900, 335, 1.2), Shape("barrel", 1050, 335, 1.0), Shape("shelf", 960, 600, 360)], occl=[Shape("chest", 700, 100, 1.2)], seed=706,
                       beams="#6a4a2a")
    mkt(6, "Merchant warehouse", "warehouse", "A timber warehouse stacked with sacks, barrels and chests.", ["warehouse", "merchant", "storage", "sacks", "barrels", "trade"], ["व्यापारी का गोदाम", "merchant warehouse"], ["akbar_birbal", "arabian_nights", "folk"], ly, an, ro, ("ground",))

    ly, an, ro = scene(wall=("white", {"panels": 1}), decor=[At("window-arched", 300, 620, 1.0), At("window-arched", 1620, 620, 1.0)], ground=("wood", FLOOR), mid=[Shape("shelf", 400, 335, 468), Shape("shelf", 1520, 335, 468), Shape("table", 960, 335, 588), Shape("sacks", 1000, 335, 0.9, 3), Shape("pot", 700, 335, 1.0)], occl=[Shape("barrel", 1300, 100, 1.0)], seed=707, beams="#6a4a2a")
    mkt(7, "Traditional grocery shop", "grocery", "A grocer's shop: shelves of jars, sacks of grain and a counter.", ["grocery", "shop", "grain", "shelves", "counter", "village"], ["किराना दुकान", "grocery shop"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground",))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), back=[Scatter(T, 6, (-100, 2050), (400, 420), (0.5, 0.6), 2, pal=hz())], ground=("grass", FLOOR), mid=[At("bld-royal-tent", 400, 335, 0.9), At("bld-fruit-stall", 1000, 335, 1.0), At("bld-cloth-stall", 1550, 335, 1.0), Shape("platform", 1900, 215, 400, 60, "#e8c870", "#c0392b")],
                       fx=[Shape("flags", -100, 920, 2000, 900, 100, 22), At("lamp-string-lights", 960, 760, 1.3)], veg=[At("tree-banyan", 100, 340, 0.9)], fg=[Scatter(["flower-marigold", "grass-tall"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=708)
    mkt(8, "Village fair", "fair", "A village fair with a striped tent, stalls, stage and string lights.", ["fair", "mela", "village", "stalls", "tent", "celebration"], ["गाँव का मेला", "village fair"], ["folk", "tenali_raman", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=[At("mountain-dune-ridge", 800, 400, 1.4)], back=[At("bld-caravan-tent", 300, 400, 0.6), At("bld-caravan-tent", 1700, 400, 0.6)], back_tint="background", ground=("sand", FLOOR), mid=[At("bld-caravan-tent", 500, 335, 1.0), At("bld-caravan-tent", 1500, 335, 1.0), At("bld-fruit-stall", 1000, 335, 0.9), At("lamp-campfire", 960, 215, 1.0)],
                       veg=[At("tree-date", 100, 335, 1.0), At("tree-date", 1850, 335, 1.0)], occl=[Shape("sacks", 700, 100, 1.0, 4), Shape("barrel", 1300, 110, 0.9)], fg=[Scatter(["grass-dry", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=709)
    mkt(9, "Caravan trading station", "caravan", "A trading camp of caravan tents and stalls around a fire, with date palms.", ["caravan", "trading", "camp", "desert", "tents", "merchant"], ["कारवाँ पड़ाव", "caravan station"], ["arabian_nights", "akbar_birbal"], ly, an, ro)

    ly, an, ro = scene(sky=sky(), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=["bld-haveli", "bld-merchant-house", "bld-two-storey", "bld-shop"], seed=6, pal=hz())], back_tint="background", ground=("cobble", FLOOR),
                       mid=[At("bld-shop", 250, 335, 1.1), At("bld-shop", 1700, 335, 1.1), At("lamp-post", 700, 215, 1.0), At("lamp-post", 1250, 215, 1.0), At("bld-veg-stall", 960, 335, 0.8)], veg=[At("tree-neem", 130, 340, 0.7)], fx=[Shape("flags", -100, 1000, 2000, 1000, 80, 20)], seed=710)
    mkt(10, "Market street", "street", "A cobbled market street lined with shops and lamp posts.", ["street", "market", "shops", "cobble", "town", "lamp"], ["बाज़ार की गली", "market street"], ["akbar_birbal", "tenali_raman", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(wall=("marble", {"panels": 1}), decor=[At("window-jharokha", 300, 620, 1.0), At("window-jharokha", 1620, 620, 1.0), At("lamp-chandelier", 960, 1000, 1.0)], ground=("tile", FLOOR), mid=[At("door-arched", 1620, 335, 1.0), Shape("table", 600, 335, 504), Shape("chest", 1200, 335, 1.0), Shape("shelf", 300, 335, 360)],
                       occl=[Shape("cushions", [760, 960, 1160], 110, "#c0392b")], seed=711)
    mkt(11, "Merchant residence", "merchant-home", "A rich merchant's house: marble hall, jharokha windows, chest and tables.", ["merchant", "residence", "home", "wealthy", "hall", "marble"], ["व्यापारी की हवेली", "merchant residence"], ["akbar_birbal", "arabian_nights", "tenali_raman"], ly, an, ro, ("ground",))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), far=[At("mountain-blue-range", 500, 400, 1.2)], back=[At("bld-merchant-house", 300, 400, 0.6), At("bld-two-storey", 700, 400, 0.6)], back_tint="background", water={"top": 300.0, "ripples": (100.0, 290.0), "n": 18},
                       ground=("wood", 215, {"profile": [(-400, 215), (1000, 215), (1250, 60), (2400, 60)]}), mid=[At("water-jetty", 1550, 120, 1.2), At("water-boat", 1850, 100, 1.0), At("bld-shop", 300, 215, 0.9), Shape("sacks", 700, 215, 1.0, 4), Shape("barrel", 900, 215, 1.0)],
                       veg=[At("tree-coconut", 100, 220, 1.0)], fg=[], seed=712)
    mkt(12, "Harbour trading market", "harbour", "A quayside market: wooden jetty, boats, barrels, sacks and warehouses.", ["harbour", "port", "trade", "boat", "quay", "market"], ["बन्दरगाह बाज़ार", "harbour market"], ["arabian_nights", "folk"], ly, an, ro, ("ground", "aquatic"))
    return E
