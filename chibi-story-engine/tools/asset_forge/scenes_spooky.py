"""Category K: haunted and supernatural (12, scare levels 0/1/2) and L: roads and journeys (10)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

LP = lambda x, y, rx, col="#8af0b8", op=0.25: Shape("light_pool", x, y, rx, int(rx * 0.14), col, op)
BM = "#3a2a22"
T = ["tree-oak", "tree-neem", "tree-mango", "tree-peepal", "tree-jamun"]


def build() -> list:
    E = []

    def env(code, n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), **kw):
        E.append(make_env(f"env-{code.lower()}-{n:04d}", name, code, sub, desc, ly, an, ro, list(habit), tags, aliases, stories, seed=(1000 if code == "HNT" else 1100) + n, **kw))

    hz = lambda sky="day", a=0.42: haze(None, SKY_COLOURS[sky][1], a)
    hnt = lambda n, *a, **k: env("HNT", n, *a, **k)
    rod = lambda n, *a, **k: env("ROD", n, *a, **k)
    dk = lambda: haze(None, "#3a3050", 0.5)
    gr = lambda: [Scatter(["grass-dry", "grass-weeds"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]
    N = {"night": ("night", {"clouds": 2, "moon": (1400, 1000, 96), "stars": 100})}

    ly, an, ro = scene(sky=("haunted", {"clouds": 3, "moon": (1500, 1000, 90)}), back=[Scatter(["tree-haunted", "tree-bare", "tree-gnarled", "tree-hollow"], 10, (-100, 2050), (380, 420), (0.55, 0.75), 2, pal=dk())], back_tint="background", ground=("haunted", FLOOR), mid=[At("tree-haunted", 400, 335, 1.3), At("rock-mossy", 1050, 330, 1.0), At("tree-hollow", 1650, 335, 1.2)], veg=[At("tree-bare", 130, 340, 1.2), At("bush-dark", 800, 330, 1.0)],
                       fx=[Shape("mist", 300, 4, col="#8a7aa0", op=0.2)], scare=[Shape("eyes", 4, 330, 620), Shape("bats", 4)], scare2=[Shape("ghost", 1150, 420, 1.1), Shape("cobweb", 1750, 1100, 200)], fg=gr(), seed=1001, anchor_y=215)
    hnt(1, "Haunted forest", "forest", "A twisted dead-wood forest under a pale moon. Eyes and bats appear at scare 1, a ghost at scare 2.", ["haunted", "forest", "dead", "trees", "night", "ghost"], ["भुतहा जंगल", "haunted forest"], ["vikram_betal", "folk"], ly, an, ro, ("ground", "arboreal"), lighting=["night", "moonlight", "evening"])

    ly, an, ro = scene(wall=("haunted", {"panels": 1}), decor=[At("window-arched", 330, 620, 1.0), At("window-arched", 1590, 620, 1.0)], ground=("haunted", FLOOR), mid=[Shape("throne", 960, 345, 1.0, col="#8a7a5a", cushion="#4a2a3a"), Shape("pillar", 200, 335, 600, col="#8a8478"), Shape("pillar", 1720, 335, 600, col="#8a8478"), Shape("carpet", 700, 1220, 332, -150, "#4a2030", "#7a6a40")],
                       fx=[Shape("window_light", 330, 580, 140, 250, "#a0b0e0"), Shape("mist", 300, 3, col="#6a6a90", op=0.2)], scare=[Shape("cobweb", 160, 1100, 200), Shape("cobweb", 1760, 1100, 200), Shape("bats", 4, 800, 1100)], scare2=[Shape("ghost", 960, 430, 1.2), Shape("eyes", 3, 400, 700)], beams=BM, seed=1002)
    hnt(2, "Abandoned palace", "palace", "A ruined throne hall of broken light and dust; cobwebs and bats at scare 1, a ghostly king at scare 2.", ["abandoned", "palace", "ruin", "throne", "haunted", "dust"], ["उजड़ा महल", "abandoned palace"], ["vikram_betal", "folk", "arabian_nights"], ly, an, ro, ("ground",))

    ly, an, ro = scene(sky=("night", {"clouds": 2, "moon": (1400, 1000, 96), "stars": 80}), back=[Scatter(["tree-bare", "tree-gnarled", "tree-peepal"], 6, (-100, 2050), (380, 420), (0.55, 0.7), 2, pal=dk())], back_tint="background", ground=("dark", FLOOR), mid=[Shape("pyre", 960, 215, 1.0), At("tree-peepal", 300, 335, 1.3), At("rock-slab", 1550, 330, 1.0)], veg=[At("tree-bare", 130, 340, 1.1)],
                       fx=[Shape("mist", 300, 4, col="#7a7a9a", op=0.2)], scare=[Shape("smoke", 960, 480)], scare2=[Shape("ghost", 1500, 430, 1.0), Shape("eyes", 3, 330, 600)], fg=gr(), seed=1003)
    hnt(3, "Cremation ground", "cremation", "A bare riverside burning ground at night, shown without anything graphic: a pyre, a peepal tree, mist.", ["cremation", "shmashan", "night", "pyre", "vetala", "ghat"], ["श्मशान", "cremation ground"], ["vikram_betal"], ly, an, ro, lighting=["night", "evening"])

    ly, an, ro = scene(sky=("haunted", {"clouds": 3, "moon": (1500, 1000, 90)}), back=[At("tree-bare", 200, 400, 1.2), At("tree-bare", 1800, 400, 1.3)], back_tint="background", ground=("haunted", FLOOR), mid=[At("bld-haveli", 960, 335, 1.8), At("wall-stone", 330, 215, 1.0), At("wall-stone", 1620, 215, 1.0), At("door-iron-gate", 960, 215, 1.0)],
                       veg=[At("tree-gnarled", 130, 340, 1.2), At("bush-dark", 1800, 335, 1.0)], fx=[Shape("window_light", 800, 640, 60, 90, "#e8c860"), Shape("mist", 290, 3, col="#7a7a9a", op=0.2)], scare=[Shape("bats", 5)], scare2=[Shape("ghost", 1100, 600, 0.8), Shape("eyes", 2, 330, 520)], fg=gr(), seed=1004)
    hnt(4, "Haunted mansion", "mansion", "A tall old mansion behind a stone wall, one window glowing.", ["mansion", "haunted", "haveli", "night", "old", "window"], ["भुतहा हवेली", "haunted mansion"], ["folk", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(sky=("dusk", {"clouds": 3}), back=[Scatter(["tree-banyan", "tree-peepal", "tree-hollow"], 6, (-100, 2050), (380, 420), (0.55, 0.7), 2, pal=dk())], back_tint="background", ground=("moss", FLOOR), mid=[At("bld-shikhara-temple", 960, 335, 1.3), At("rock-mossy", 300, 330, 1.2), At("rock-slab", 1700, 330, 1.0), At("rock-cracked", 640, 330, 0.9)],
                       veg=[At("tree-banyan-ancient", 130, 340, 1.0), At("bush-fern", 1450, 330, 1.0)], fx=[Shape("mist", 290, 3, col="#8a8ab0", op=0.18)], scare=[Shape("bats", 4)], scare2=[Shape("eyes", 3, 340, 560)], fg=gr(), seed=1005)
    hnt(5, "Ruined temple", "ruined-temple", "A forgotten temple, cracked stones and creepers swallowing the shikhara.", ["ruin", "temple", "ancient", "overgrown", "forgotten", "stones"], ["खंडहर मंदिर", "ruined temple"], ["vikram_betal", "folk", "jataka"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 400, 1100, 1.4), At("rock-stalactite", 1500, 1130, 1.5)], ground=("haunted", 250), mid=[At("rock-big", 160, 260, 1.4), At("rock-crystal-cluster", 1500, 255, 1.2), At("rock-stalagmite", 900, 255, 1.1), At("lamp-magic-orb", 1050, 320, 0.8)],
                       fx=[LP(1050, 330, 600, "#a080f0", 0.3), Shape("mist", 270, 3, col="#6a5a9a", op=0.25)], scare=[Shape("eyes", 3, 300, 600)], scare2=[Shape("ghost", 1300, 430, 1.0), Shape("bats", 5, 700, 1100)], seed=1006, anchor_y=230)
    hnt(6, "Mysterious cave", "mysterious-cave", "A cave lit by a violet orb and crystals; unseen eyes watch from the dark.", ["mysterious", "cave", "orb", "crystal", "magic", "dark"], ["रहस्यमयी गुफा", "mysterious cave"], ["vikram_betal", "arabian_nights", "folk"], ly, an, ro, lighting=["night"])

    ly, an, ro = scene(sky=("night", {"clouds": 2, "moon": (1500, 1000, 100), "stars": 100}), back=[Scatter(["tree-bare", "tree-gnarled"], 6, (-100, 2050), (380, 420), (0.55, 0.7), 2, pal=dk())], back_tint="background", ground=("dark", FLOOR), mid=[Shape("graves", 9)] + [At("door-iron-gate", 960, 335, 1.2), At("wall-stone", 330, 215, 1.0), At("wall-stone", 1620, 215, 1.0)],
                       veg=[At("tree-bare", 130, 340, 1.2), At("bush-dark", 1800, 335, 1.0)], fx=[Shape("mist", 290, 4, col="#8a8ab0", op=0.2)], scare=[Shape("bats", 4)], scare2=[Shape("ghost", 1350, 430, 1.0), Shape("eyes", 3, 330, 520)], fg=[Scatter(["grass-dry"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1007)
    hnt(7, "Moonlit graveyard", "graveyard", "A fenced graveyard of leaning stones under the moon.", ["graveyard", "tombstones", "moon", "night", "iron gate", "mist"], ["चाँदनी में कब्रिस्तान", "moonlit graveyard"], ["folk", "vikram_betal"], ly, an, ro, lighting=["night", "moonlight"])

    ly, an, ro = scene(sky=("storm", {"clouds": 4}), back=[At("mountain-rocky", 960, 380, 1.8)], back_tint="background", ground=("rock", FLOOR), mid=[At("bld-fort-gate", 960, 335, 1.7), At("wall-battlement", 330, 215, 1.3), At("wall-battlement", 1650, 215, 1.3), At("bld-watchtower", 120, 335, 1.2), At("bld-watchtower", 1840, 335, 1.2), At("lamp-wall-torch", 740, 480, 1.0), At("lamp-wall-torch", 1180, 480, 1.0)],
                       veg=[At("tree-bare", 560, 335, 1.0)], fx=[Shape("mist", 300, 3, col="#7a7a9a", op=0.2)], scare=[Shape("bats", 5)], scare2=[Shape("eyes", 3, 500, 700)], fg=gr(), seed=1008)
    hnt(8, "Dark fortress", "fortress", "A black fortress gate with torches under a storm sky.", ["fortress", "dark", "fort", "gate", "storm", "villain"], ["अँधेरा किला", "dark fortress"], ["vikram_betal", "folk", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("dusk", {"clouds": 3}), back=[Scatter(["tree-bare", "tree-neem", "tree-mango"], 6, (-100, 2050), (380, 420), (0.55, 0.7), 2, pal=dk())], back_tint="background", ground=("dirt", FLOOR), mid=[At("bld-mud-hut", 380, 340, 1.1), At("bld-thatched-hut", 1050, 340, 1.0), At("bld-village-well", 1600, 335, 1.0), At("fence-bamboo", 1350, 215, 0.9)],
                       veg=[At("tree-bare", 130, 340, 1.2), At("bush-dry", 750, 330, 1.0)], fx=[Shape("mist", 290, 3, col="#8a8ab0", op=0.18)], scare=[Shape("bats", 3)], scare2=[Shape("eyes", 3, 330, 520), Shape("ghost", 1000, 430, 0.9)], fg=gr(), seed=1009)
    hnt(9, "Abandoned village", "abandoned-village", "Empty huts with sagging roofs and a dry well at dusk.", ["abandoned", "village", "empty", "huts", "dry", "eerie"], ["सुनसान गाँव", "abandoned village"], ["folk", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(sky=("night", {"clouds": 2, "moon": (1380, 1000, 100), "stars": 90}), back=[Scatter(["tree-willow", "tree-bare"], 7, (-100, 2050), (380, 410), (0.55, 0.7), 2, pal=dk())], back_tint="background", water={"top": 300.0, "ripples": (100.0, 290.0), "n": 18, "c1": "#5a7ab8", "c2": "#14245a"},
                       ground=("dark", 200, {"profile": [(-400, 300), (300, 230), (700, 40), (1600, 40), (1900, 230), (2400, 300)]}), mid=[At("rock-river", 400, 240, 1.0), At("tree-bare", 1950, 235, 1.1)], veg=[At("tree-willow", 120, 300, 1.0)], fx=[Shape("mist", 250, 4, col="#8a9ac0", op=0.22)], scare=[Shape("bats", 3)], scare2=[Shape("ghost", 1200, 330, 1.0)], fg=[Scatter(["grass-reed-tall"], 3, (-100, 2050), (-120, 0), (0.9, 1.2), 6)], seed=1010)
    hnt(10, "Ghostly riverbank", "ghost-river", "A moonlit riverbank wrapped in mist; a pale figure appears at scare 2.", ["ghost", "river", "mist", "moon", "bank", "night"], ["भूतिया नदी तट", "ghostly riverbank"], ["vikram_betal", "folk"], ly, an, ro, ("ground", "aquatic"), lighting=["night", "moonlight"])

    ly, an, ro = scene(sky=("magic", {"clouds": 3, "stars": 70}), back=[Scatter(["tree-magic", "tree-blossom", "tree-oak"], 9, (-100, 2050), (380, 420), (0.55, 0.7), 2, pal=haze(None, "#b070d0", 0.35))], ground=("moss", FLOOR), mid=[At("tree-magic", 400, 335, 1.3), At("rock-crystal-cluster", 960, 330, 1.2), At("tree-magic", 1600, 335, 1.2), At("flower-orchid", 700, 330, 1.2), At("bush-magic", 1250, 330, 1.0)],
                       veg=[At("tree-blossom", 130, 340, 1.1), At("flower-lily", 1800, 335, 1.0)], fx=[Shape("fireflies", 28, 240, 760, "#ffb0f0"), LP(960, 340, 700, "#e0a0ff", 0.3)], fg=[Scatter(["flower-bluebell", "flower-orchid", "grass-tall"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1011)
    hnt(11, "Magical forest clearing", "magic-clearing", "A glowing clearing of blossoming magic trees and crystals; fully child-friendly.", ["magic", "forest", "clearing", "fairy", "glow", "crystal"], ["जादुई वन", "magical clearing"], ["arabian_nights", "folk", "vikram_betal"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(wall=("dark", {"panels": 1}), decor=[At("window-slit", 330, 700, 1.0), At("window-slit", 1590, 700, 1.0), At("lamp-wall-torch", 700, 560, 1.0), At("lamp-wall-torch", 1220, 560, 1.0)], ground=("dark", FLOOR), mid=[Shape("throne", 960, 345, 1.4, col="#2a2a3a", cushion="#5a1a2a"), Shape("pillar", 200, 335, 620, col="#3a3a4a"), Shape("pillar", 1720, 335, 620, col="#3a3a4a"), Shape("carpet", 700, 1220, 332, -150, "#3a1020", "#5a5a8a")],
                       fx=[LP(700, 560, 360, "#8a6aff", 0.3), LP(1220, 560, 360, "#8a6aff", 0.3), Shape("mist", 300, 3, col="#5a4a8a", op=0.25)], scare=[Shape("eyes", 3, 700, 900), Shape("bats", 4, 800, 1100)], scare2=[Shape("ghost", 960, 460, 1.5), Shape("cobweb", 1760, 1100, 200)], beams=BM, seed=1012)
    hnt(12, "Supernatural throne room", "supernatural-throne", "A dark throne hall lit by violet torches, a spectral presence at scare 2.", ["throne", "supernatural", "dark", "spirit", "hall", "king"], ["अलौकिक सिंहासन कक्ष", "supernatural throne room"], ["vikram_betal", "singhasan_battisi", "folk"], ly, an, ro, ("ground",))

    # --------------------------------------------------------------------------------------------- L: roads
    hh = lambda: [Scatter(T, 8, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz())]
    path = lambda pts, w=240, col="#d8b888": Shape("path", pts, col, w)
    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T + ["tree-bamboo"], 12, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=hz("morning"))], ground=("forest", FLOOR), mid=[At("rock-mossy", 300, 330, 1.0), At("tree-oak", 1650, 335, 1.2)],
                       veg=[At("tree-oak", 120, 340, 1.2), At("bush-fern", 800, 330, 1.0), At("tree-bamboo", 1900, 330, 1.1)], fx=[Shape("shafts", [500, 1100, 1600], col="#fff6c8")], fg=[Scatter(["grass-fern-floor", "grass-tall"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1101)
    rod(1, "Forest pathway", "forest-path", "A dirt track winding between trees, light falling in shafts.", ["path", "forest", "trail", "journey", "trees", "walk"], ["जंगल की पगडंडी", "forest path"], ["panchatantra", "jataka", "vikram_betal"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-green-hills", 700, 400, 1.4)], back=hh(), ground=("dirt", FLOOR), mid=[At("bld-village-house", 300, 335, 0.9), At("bld-mud-hut", 1700, 340, 0.9), At("wall-mud", 1100, 215, 1.0), At("fence-bamboo", 600, 215, 1.0)], veg=[At("tree-neem", 120, 340, 1.0), At("tree-peepal", 1850, 335, 1.0)], fx=[Shape("milestone", 960, 215, 1.0)], fg=gr(), seed=1102)
    rod(2, "Village road", "village-road", "A wide village track with houses to either side and a milestone.", ["road", "village", "track", "milestone", "walk", "journey"], ["गाँव की सड़क", "village road"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-himalaya", 700, 400, 1.8)], back=[At("mountain-cliff", 1500, 330, 1.2)], ground=("rock", 270, {"profile": [(-400, 220), (700, 280), (1400, 320), (2400, 340)]}), mid=[At("rock-big", 200, 280, 1.3), At("rock-boulder", 1650, 330, 1.0), Shape("milestone", 960, 290, 1.0)], veg=[At("tree-pine", 140, 280, 1.2), At("bush-dry", 1000, 300, 1.0)], fg=gr(), seed=1103)
    rod(3, "Mountain road", "mountain-road", "A rising stony road cut into the mountainside.", ["road", "mountain", "climb", "rocky", "journey", "pass"], ["पहाड़ी सड़क", "mountain road"], ["panchatantra", "folk", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(sky=("golden", {"clouds": 3}), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=["bld-haveli", "bld-merchant-house", "bld-two-storey"], seed=8, pal=hz("golden"))], back_tint="background", ground=("cobble", FLOOR), mid=[At("wall-balustrade", 300, 215, 1.0), At("wall-balustrade", 1650, 215, 1.0), At("lamp-post", 560, 215, 1.0), At("lamp-post", 1350, 215, 1.0)],
                       veg=[At("tree-neem", 120, 340, 0.9)], fx=[Shape("flags", -100, 1000, 2000, 1000, 80, 22), Shape("banner", 700, 560, 120, 330, "#c0392b"), Shape("banner", 1250, 560, 120, 330, "#3a6ad8")], fg=[Scatter(["flower-marigold"], 7, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1104)
    rod(4, "Royal procession route", "procession", "A paved royal avenue with banners and flag garlands, ready for a procession.", ["royal", "procession", "avenue", "banners", "parade", "city"], ["शाही जुलूस मार्ग", "royal procession route"], ["akbar_birbal", "tenali_raman", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), far=[At("mountain-green-hills", 500, 400, 1.4), At("mountain-blue-range", 1500, 400, 1.5)], back=hh(), ground=("path", FLOOR, {"profile": [(-400, 300), (2400, 320)]}), mid=[At("rock-cairn", 400, 320, 1.0), Shape("signpost", 1500, 215, 1.0), At("tree-banyan", 1000, 335, 0.9)], veg=[At("tree-peepal", 130, 340, 1.2), At("bush-round", 1800, 335, 1.0)], fg=gr(), seed=1105)
    rod(5, "Ancient trade route", "trade-route", "A long dusty road through open country with a signpost and cairn.", ["trade", "route", "road", "signpost", "merchant", "journey"], ["प्राचीन व्यापार मार्ग", "ancient trade route"], ["akbar_birbal", "arabian_nights", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-blue-range", 960, 400, 1.5)], back=hh(), water={"top": 250.0, "front": False, "ripples": (80.0, 240.0), "n": 16}, ground=("grass", 215, {"profile": [(-400, 300), (300, 280), (600, 40), (1500, 40), (1750, 280), (2400, 300)]}), mid=[At("bld-stone-bridge", 1000, 275, 1.7)], veg=[At("tree-banyan", 130, 300, 1.0), At("tree-mango", 1900, 290, 0.9)], fg=[Scatter(["grass-reed-tall"], 3, (-100, 2050), (-120, 0), (0.9, 1.2), 6)], seed=1106)
    rod(6, "Bridge over river", "stone-bridge", "A stone arch bridge across a wide river.", ["bridge", "river", "stone", "crossing", "arch", "road"], ["नदी पर पुल", "bridge over river"], ["panchatantra", "jataka", "folk"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T + ["tree-bamboo"], 9, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=hz("morning"))], water={"top": 200.0, "front": False, "ripples": (60.0, 190.0), "n": 12}, ground=("moss", 215, {"profile": [(-400, 300), (300, 280), (700, 30), (1400, 30), (1800, 280), (2400, 300)]}), mid=[At("bld-wooden-bridge", 1000, 275, 1.6)], veg=[At("tree-bamboo", 130, 300, 1.2), At("bush-fern", 1850, 290, 1.0)], fg=[Scatter(["grass-fern-floor", "grass-tall"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1107)
    rod(7, "Wooden bridge", "wooden-bridge", "A rope-and-plank wooden bridge over a forest stream.", ["bridge", "wooden", "stream", "forest", "crossing", "planks"], ["लकड़ी का पुल", "wooden bridge"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=[At("mountain-dune-ridge", 600, 360, 1.7), At("mountain-mesa-range", 1500, 380, 1.4)], ground=("path", FLOOR, {"profile": [(-400, 300), (2400, 320)]}), mid=[At("rock-cairn", 700, 320, 1.0), At("bld-caravan-tent", 1500, 335, 0.8), At("tree-date", 1850, 340, 1.0)], veg=[At("bush-dry", 300, 330, 1.0)], fg=[Scatter(["grass-dry", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1108)
    rod(8, "Caravan route", "caravan-route", "A caravan road across dry country, with a camp ahead.", ["caravan", "route", "dry", "journey", "tent", "trade"], ["कारवाँ मार्ग", "caravan route"], ["arabian_nights", "akbar_birbal"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), back=[Scatter(T, 11, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=hz())], water={"top": 150.0, "front": False, "ripples": (40.0, 140.0), "n": 12}, ground=("forest", 215, {"profile": [(-400, 300), (500, 280), (800, 30), (1200, 30), (1500, 280), (2400, 300)]}), mid=[At("water-stepping-stones", 1000, 80, 1.3), At("rock-mossy", 380, 285, 1.0), At("rock-river", 1650, 280, 1.0)], veg=[At("tree-oak", 130, 300, 1.2), At("tree-jamun", 1880, 290, 1.1)], fg=[Scatter(["grass-fern-floor", "grass-tall"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1109)
    rod(9, "Forest crossing", "forest-crossing", "A shallow ford with stepping stones where the forest path meets a stream.", ["crossing", "ford", "stream", "forest", "stones", "path"], ["जंगल में पार जाने की जगह", "forest crossing"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "aquatic", "arboreal"))

    ly, an, ro = scene(sky=("golden", {"clouds": 3}), far=[At("mountain-green-hills", 500, 400, 1.2)], back=[At("bld-gopuram", 400, 400, 0.8), At("bld-palace", 1400, 400, 0.7)], back_tint="background", ground=("dirt", FLOOR), mid=[At("bld-fort-gate", 960, 335, 1.6), At("wall-battlement", 330, 215, 1.2), At("wall-battlement", 1650, 215, 1.2), At("bld-watchtower", 120, 335, 1.0), At("bld-watchtower", 1850, 335, 1.0)], veg=[At("tree-neem", 600, 340, 0.9)], fg=gr(), seed=1110)
    rod(10, "City entrance road", "city-entrance", "The road reaching a fortified city gate, watchtowers on either side.", ["city", "gate", "entrance", "road", "arrival", "fort"], ["नगर द्वार की सड़क", "city entrance road"], ["akbar_birbal", "tenali_raman", "arabian_nights", "vikram_betal"], ly, an, ro)
    return E
