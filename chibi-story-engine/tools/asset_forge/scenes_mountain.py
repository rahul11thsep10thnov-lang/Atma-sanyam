"""Category E (mountains and hills, 12) and F (caves, 10)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

PINES = ["tree-pine", "tree-deodar", "tree-fir-tall"]


def build() -> list:
    E = []

    def env(n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), code="MTN", **kw):
        E.append(make_env(f"env-{code.lower()}-{n:04d}", name, code, sub, desc, ly, an, ro, list(habit), tags, aliases, stories, seed=(400 if code == "MTN" else 500) + n, **kw))

    hz = lambda sky="day", a=0.45: haze(None, SKY_COLOURS[sky][1], a)
    gr = lambda: [Scatter(["rock-small", "grass-dry", "grass-moss"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]

    ly, an, ro = scene(sky=("snow", {"clouds": 2}), far=[At("mountain-snow-peak", 400, 380, 2.0), At("mountain-himalaya", 1500, 380, 2.0)], back=[At("mountain-snow-peak", 960, 340, 1.5), Scatter(["tree-pine-snow", "tree-fir-tall"], 8, (-100, 2050), (330, 360), (0.5, 0.6), 2, pal=hz("snow"))],
                       ground=("snow", FLOOR), mid=[At("rock-snowy", 380, 335, 1.2), At("rock-snowy", 1650, 330, 1.0)], veg=[At("tree-pine-snow", 120, 340, 1.3), At("bush-snow", 1100, 330, 0.9)], fg=[Scatter(["grass-snow", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=401)
    env(1, "Snow-covered mountains", "snow", "Towering snow peaks above a snowy plateau with frosted pines.", ["mountain", "snow", "peaks", "cold", "himalaya", "ice"], ["बर्फीले पहाड़", "snow mountains"], ["panchatantra", "folk"], ly, an, ro, lighting=["noon", "morning", "evening"])

    ly, an, ro = scene(sky=("spring", {"clouds": 5}), far=[At("mountain-green-hills", 500, 400, 1.6), At("mountain-green-hills", 1500, 400, 1.6)], back=[At("mountain-green-hills", 960, 380, 1.4), Scatter(["tree-oak", "tree-neem"], 10, (-100, 2050), (380, 410), (0.45, 0.6), 2, pal=hz("spring"))],
                       ground=("meadow", FLOOR, {"profile": [(-400, 300), (700, 360), (1400, 300), (2400, 340)]}), mid=[At("tree-oak", 400, 330, 1.0), At("rock-mossy", 1500, 320, 0.9), At("flower-daisy", 1000, 330, 1.2)], veg=[At("tree-mango", 1850, 335, 1.0), Scatter(["flower-buttercup", "flower-dandelion", "grass-clover"], 12, (-100, 2050), (230, 330), (0.7, 1.1), 3)],
                       fg=[Scatter(["flower-buttercup", "grass-tall"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=402)
    env(2, "Green rolling hills", "hills", "Soft green hills dotted with flowers and a few trees.", ["hills", "green", "meadow", "rolling", "pasture", "flowers"], ["हरी पहाड़ियाँ", "green hills"], ["panchatantra", "folk", "jataka"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("overcast", {"clouds": 4}), far=[At("mountain-rocky", 400, 380, 2.0), At("mountain-rocky", 1500, 380, 2.0)], back=[At("mountain-cliff", 960, 330, 1.7)], ground=("rock", FLOOR), mid=[At("rock-big", 360, 330, 1.2), At("rock-boulder-angular", 1650, 330, 1.2), At("rock-cracked", 1050, 335, 0.9)],
                       veg=[At("tree-gnarled", 140, 340, 1.0), At("bush-dry", 1850, 335, 0.9)], fg=gr(), seed=403)
    env(3, "Rocky mountain range", "rocky", "Bare grey rocky ranges under a heavy sky.", ["mountain", "rocky", "range", "grey", "barren", "crags"], ["चट्टानी पर्वतमाला", "rocky range"], ["panchatantra", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), far=[At("mountain-rocky", 300, 380, 2.0), At("mountain-himalaya", 1600, 380, 2.0)], ground=("rock", 260, {"profile": [(-400, 210), (900, 260), (1100, 260), (2400, 210)]}),
                       mid=[At("rock-big", 100, 270, 1.6), At("rock-big", 1850, 270, 1.6), At("rock-cairn", 1100, 260, 1.0), At("grass-dry", 800, 255, 1.0)], veg=[At("bush-dry", 600, 260, 0.9), At("tree-gnarled", 1450, 270, 0.9)],
                       fx=[Shape("flags", -100, 700, 1000, 640, 40, 14)], fg=gr(), seed=404)
    env(4, "Mountain pass", "pass", "A narrow pass between two rocky walls, with a cairn and prayer flags.", ["pass", "mountain", "narrow", "travel", "cairn", "flags"], ["पहाड़ी दर्रा", "mountain pass"], ["panchatantra", "folk", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), far=[At("mountain-himalaya", 960, 400, 2.2)], back=[At("mountain-forested", 400, 380, 1.5), At("mountain-forested", 1500, 380, 1.5), Scatter(PINES, 9, (-100, 2050), (370, 400), (0.5, 0.65), 2, pal=hz("morning"))], ground=("forest", FLOOR),
                       mid=[At("bld-hut-veranda", 1500, 335, 0.9), At("fence-bamboo", 1000, 215, 1.0)], veg=[At("tree-deodar", 140, 340, 1.2), At("tree-pine", 700, 335, 1.0), At("flower-marigold", 1100, 330, 1.0)], fg=[Scatter(["grass-tall", "flower-lavender"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=405)
    env(5, "Himalayan foothills", "foothills", "Forested foothills with deodar and pine under the great snow range.", ["foothills", "himalaya", "deodar", "pine", "range", "hermit"], ["हिमालय की तलहटी", "himalayan foothills"], ["panchatantra", "folk", "jataka"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-himalaya", 700, 400, 1.8)], back=[At("mountain-terraced", 1300, 380, 1.5), At("bld-whitewash-house", 300, 400, 0.45), At("bld-whitewash-house", 700, 410, 0.4)], ground=("dirt", FLOOR),
                       mid=[At("bld-whitewash-house", 400, 335, 1.0), At("bld-village-house", 1000, 335, 1.0), At("bld-thatched-hut", 1650, 340, 0.9), At("wall-stone", 1250, 215, 1.0)], veg=[At("tree-deodar", 110, 340, 1.0), At("tree-pine", 1900, 335, 1.0), At("bush-hydrangea", 700, 330, 0.9)],
                       fg=gr(), seed=406)
    env(6, "Mountain village", "village", "A hill village of whitewashed houses on terraced slopes.", ["mountain", "village", "terraces", "houses", "hill", "himalaya"], ["पहाड़ी गाँव", "mountain village"], ["folk", "panchatantra"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), far=[At("mountain-himalaya", 960, 400, 1.9)], back=[At("mountain-cliff", 1300, 340, 1.4)], ground=("rock", 250, {"profile": [(-400, 250), (2400, 250)]}), mid=[At("bld-monastery", 1050, 255, 1.5), At("rock-big", 200, 260, 1.3), At("rock-slab", 1800, 255, 1.0)],
                       veg=[At("tree-pine", 150, 260, 1.0)], fx=[Shape("flags", 100, 560, 1000, 760, 50, 14)], fg=gr(), seed=407)
    env(7, "Hilltop monastery", "monastery-hill", "A monastery on a bare ridge above the valley, prayer flags in the wind.", ["monastery", "hilltop", "buddhist", "ridge", "flags", "temple"], ["पहाड़ी मठ", "hilltop monastery"], ["jataka", "folk"], ly, an, ro, lighting=["evening", "morning", "noon"])

    ly, an, ro = scene(sky=("day", {"clouds": 2}), far=[At("mountain-rocky", 700, 400, 1.8)], back=[At("mountain-cliff", 960, 330, 1.9)], ground=("rock", FLOOR), mid=[At("rock-arch", 960, 330, 1.7), At("rock-big", 300, 335, 1.0), At("rock-stalagmite", 1700, 330, 0.8)],
                       veg=[At("bush-dry", 160, 335, 0.9)], decor=[], fx=[Shape("mist", 330, 3, col="#d8d4dc", op=0.18)], fg=gr(), seed=408)
    env(8, "Mountain caves", "cave-mouth", "A rocky hillside with a cave opening in the cliff face.", ["mountain", "cave", "entrance", "cliff", "rocks", "den"], ["पहाड़ी गुफा", "mountain cave mouth"], ["panchatantra", "jataka", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(sky=("golden", {"clouds": 3}), far=[At("mountain-forested", 600, 400, 1.7)], back=[At("mountain-cliff", 1350, 330, 1.7), Scatter(PINES + ["tree-oak"], 9, (-100, 2050), (370, 410), (0.5, 0.65), 2, pal=hz("golden"))], ground=("forest", 260, {"profile": [(-400, 260), (2400, 260)]}),
                       mid=[At("tree-gnarled", 300, 265, 1.2), At("tree-pine", 1100, 260, 1.4), At("rock-mossy", 1650, 262, 1.0)], veg=[At("tree-deodar", 100, 270, 1.3), At("bush-fern", 700, 260, 1.0), At("bush-berry-red", 1850, 262, 0.9)], fg=gr(), seed=409)
    env(9, "Cliffside forest", "cliffside", "Trees clinging to a steep slope along a rocky cliff.", ["cliff", "forest", "slope", "pines", "ledge", "mountain"], ["चट्टान के किनारे जंगल", "cliffside forest"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-forested", 400, 400, 1.7)], back=[At("mountain-cliff", 1100, 340, 1.8), Scatter(PINES, 6, (-100, 2050), (380, 410), (0.5, 0.6), 2, pal=hz())], water={"top": 150.0, "front": False, "ripples": (40.0, 140.0), "n": 14},
                       ground=("rock", 220, {"profile": [(-400, 340), (350, 300), (700, 60), (1400, 60), (1750, 290), (2400, 330)]}), mid=[At("water-waterfall", 1000, 160, 2.0), At("rock-boulder", 320, 300, 1.0)], veg=[At("tree-pine", 120, 340, 1.2), At("tree-oak", 1900, 330, 1.0), At("bush-fern", 620, 260, 1.0)],
                       fx=[Shape("mist", 220, 3, col="#ffffff", op=0.3)], fg=gr(), seed=410)
    env(10, "Waterfall mountain", "waterfall-mountain", "A great waterfall tumbling down a mountain wall into a rocky basin.", ["waterfall", "mountain", "cascade", "cliff", "pool"], ["पहाड़ी झरना", "waterfall mountain"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-himalaya", 960, 400, 1.9)], back=[At("mountain-green-hills", 450, 380, 1.4), At("mountain-green-hills", 1550, 380, 1.4), Scatter(["tree-oak", "tree-pine"], 9, (-100, 2050), (370, 400), (0.5, 0.65), 2, pal=hz())],
                       ground=("meadow", FLOOR, {"profile": [(-400, 330), (960, 300), (2400, 330)]}), mid=[At("tree-oak", 400, 330, 1.1), At("rock-mossy", 1500, 320, 1.0), At("flower-bluebell", 1000, 320, 1.0)], veg=[At("tree-pine", 120, 335, 1.2), At("bush-berry-blue", 1800, 330, 0.9), Scatter(["flower-lavender", "flower-poppy", "grass-clover"], 12, (-100, 2050), (230, 330), (0.7, 1.1), 3)], fg=gr(), seed=411)
    env(11, "Mountain valley", "valley", "A wide green valley between mountain walls, wildflowers in the meadow.", ["valley", "meadow", "mountain", "flowers", "grazing", "wide"], ["पहाड़ी घाटी", "mountain valley"], ["panchatantra", "folk", "jataka"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("dawn", {"clouds": 4, "sun": (960, 470, 86)}), far=[At("mountain-snow-peak", 300, 380, 2.0), At("mountain-himalaya", 1550, 380, 2.0)], back=[At("mountain-blue-range", 960, 350, 1.6)], ground=("meadow", FLOOR, {"profile": [(-400, 300), (2400, 300)]}),
                       mid=[At("rock-mossy", 400, 310, 1.0), At("tree-pine", 1650, 320, 1.2)], veg=[At("tree-deodar", 110, 330, 1.3), At("flower-marigold", 1100, 315, 1.0), At("bush-round", 800, 315, 0.9)], fx=[Shape("mist", 340, 3, col="#ffe6d0", op=0.22)], fg=gr(), seed=412)
    env(12, "Sunrise mountain landscape", "sunrise", "First light on snow peaks, mist lying in the foothills.", ["sunrise", "mountain", "dawn", "peaks", "mist", "morning"], ["सूर्योदय का पहाड़", "mountain sunrise"], ["panchatantra", "folk", "jataka"], ly, an, ro, lighting=["morning", "evening"])

    # ---------------------------------------------------------------------------------------------- F: caves
    cave_floor = ("rock", 250, {"profile": [(-400, 260), (2400, 250)]})
    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 300, 1100, 1.3), At("rock-stalactite", 1000, 1150, 1.5), At("rock-stalactite", 1700, 1120, 1.2)], ground=cave_floor, mid=[At("rock-big", 200, 260, 1.5), At("rock-boulder", 1700, 260, 1.3), At("rock-stalagmite", 900, 255, 1.1)],
                       fx=[Shape("shafts", [1500], top=1260, bottom=250, w=260, col="#fff3c0", op=0.2), Shape("light_pool", 1560, 260, 280, "#fff3c0", 0.4)], fg=gr(), seed=501, anchor_y=230)
    env(1, "Natural rocky cave", "rocky", "A large natural cave with stalactites and a shaft of daylight.", ["cave", "rock", "stalactite", "light", "shelter", "natural"], ["प्राकृतिक चट्टानी गुफा", "rocky cave"], ["panchatantra", "jataka", "folk"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 400, 1100, 1.4), At("rock-stalactite", 1300, 1130, 1.6)], ground=("dark", 250), mid=[At("rock-big", 100, 260, 1.5), At("rock-stalagmite", 1000, 255, 1.2), At("rock-stalagmite", 1600, 255, 1.0)],
                       fx=[Shape("mist", 270, 3, col="#4a4a6a", op=0.3), Shape("light_pool", 400, 260, 300, "#e8b050", 0.25)], seed=502, anchor_y=230)
    env(2, "Dark underground cave", "dark", "A deep, dark cavern lit only by a small ember glow.", ["cave", "dark", "underground", "deep", "night", "gloomy"], ["अँधेरी भूमिगत गुफा", "dark cave"], ["panchatantra", "vikram_betal"], ly, an, ro, code="CAV", lighting=["night"])

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 500, 1100, 1.3), At("rock-stalactite", 1500, 1120, 1.3)], ground=cave_floor, mid=[Shape("chest", 700, 258, 1.4), Shape("chest", 1200, 258, 1.1), Shape("coins", 960, 258, 1.5), Shape("coins", 1500, 258, 1.3), At("rock-gold-ore", 200, 260, 1.4), At("rock-gold-ore", 1800, 260, 1.3)],
                       fx=[Shape("light_pool", 960, 300, 700, "#ffd060", 0.4), Shape("light_pool", 1500, 280, 400, "#ffd060", 0.3)], seed=503, anchor_y=230)
    env(3, "Treasure cave", "treasure", "A cave with chests, heaped coins and gold-veined rock, glowing in torchlight.", ["treasure", "gold", "cave", "chest", "coins", "hidden"], ["खजाने की गुफा", "treasure cave"], ["panchatantra", "arabian_nights", "folk"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 400, 1080, 1.2)], ground=("mud", 250), mid=[At("rock-big", 120, 260, 1.7), At("rock-big", 1820, 260, 1.7), Shape("haystack", 960, 255, 1.0), At("grass-dry", 650, 255, 1.2), At("grass-dry", 1350, 255, 1.1)],
                       fx=[Shape("light_pool", 1000, 270, 500, "#fff3c0", 0.25)], fg=gr(), seed=504, anchor_y=230)
    env(4, "Bear's den", "den", "A bear's den: a low cave floored with dry grass and moss.", ["den", "bear", "cave", "animal", "lair", "winter"], ["भालू की माँद", "bear's den"], ["panchatantra", "jataka"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("mud", {"dado": False, "floor_y": 235}), back=[At("tree-bare", 300, 1000, 1.6), At("tree-bare", 1500, 1100, 1.8)], ground=("mud", 250), mid=[At("rock-small", 300, 255, 1.2), At("rock-small", 1600, 255, 1.0), At("grass-weeds", 900, 255, 1.0)],
                       fx=[Shape("light_pool", 400, 260, 300, "#fff3c0", 0.3)], fg=[Scatter(["grass-weeds", "rock-small"], 6, (-100, 2050), (-100, 20), (1.0, 1.6), 6)], seed=505, anchor_y=230)
    env(5, "Animal burrow", "burrow", "A burrow under the earth: rounded tunnel walls, roots and soft light from the exit.", ["burrow", "hole", "underground", "rabbit", "fox", "earth"], ["जानवर का बिल", "burrow"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "burrow"), code="CAV")

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 300, 1100, 1.4), At("rock-stalactite", 1500, 1130, 1.4)], ground=("dark", 250), mid=[At("rock-boulder", 160, 260, 1.4), At("rock-slab", 1700, 255, 1.0), At("rock-cracked", 960, 255, 1.0)],
                       fx=[Shape("light_pool", 800, 260, 400, "#c0f0a0", 0.18)], scare=[Shape("eyes", 3, 300, 600)], seed=506, anchor_y=230)
    env(6, "Snake cave", "snake", "A damp cave with cracked rocks and a dark crevice, a home for snakes.", ["snake", "cave", "damp", "crevice", "cobra", "lair"], ["साँप की गुफा", "snake cave"], ["panchatantra", "jataka"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("crystal", {"dado": False, "floor_y": 235}), back=[At("rock-crystal-cluster", 300, 900, 1.6), At("rock-crystal-spikes", 1600, 950, 1.5), At("rock-stalactite", 960, 1130, 1.4)], ground=("dark", 250), mid=[At("rock-crystal-cluster", 400, 255, 1.7), At("rock-crystal-cluster", 1500, 255, 2.0), At("rock-crystal-spikes", 960, 255, 1.4), At("lamp-magic-orb", 1050, 300, 1.0)],
                       fx=[Shape("light_pool", 960, 300, 800, "#8ad6f0", 0.3), Shape("fireflies", 14, 300, 900, "#a0f0ff")], seed=507, anchor_y=230)
    env(7, "Magical crystal cave", "crystal", "A cave of glowing crystal clusters and floating motes of light.", ["crystal", "magic", "cave", "glow", "gems", "fantasy"], ["जादुई क्रिस्टल गुफा", "crystal cave"], ["arabian_nights", "vikram_betal", "folk"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("stone", {"dado": False, "floor_y": 235}), back=[At("lamp-wall-torch", 400, 560, 1.0), At("lamp-wall-torch", 1500, 560, 1.0), At("door-arched", 960, 255, 1.0)], ground=("stone", 250), mid=[At("rock-slab", 160, 255, 1.0), At("rock-small", 1750, 255, 1.2)], fx=[Shape("light_pool", 400, 560, 360, "#ffb050", 0.4), Shape("light_pool", 1500, 560, 360, "#ffb050", 0.4)], seed=508, anchor_y=230)
    env(8, "Underground passage", "passage", "A stone-lined underground passage lit by wall torches.", ["passage", "tunnel", "underground", "torch", "secret", "corridor"], ["भूमिगत सुरंग", "underground passage"], ["vikram_betal", "arabian_nights", "folk"], ly, an, ro, code="CAV")

    ly, an, ro = scene(wall=("cave", {"dado": False, "floor_y": 235}), water={"top": 220.0, "front": False, "ripples": (100.0, 210.0), "n": 12, "c1": "#7fb8c8", "c2": "#1f4f78"}, back=[At("rock-stalactite", 400, 1100, 1.4), At("rock-stalactite", 1400, 1120, 1.5)],
                       ground=("rock", 180, {"profile": [(-400, 280), (600, 270), (900, 60), (1900, 60), (2400, 280)]}), mid=[At("rock-big", 160, 285, 1.4), At("rock-stalagmite", 1750, 150, 1.0)], fx=[Shape("shafts", [1400], top=1260, bottom=220, w=300, col="#fff3c0", op=0.2)], seed=509, anchor_y=230)
    env(9, "Riverside cave", "riverside", "A cavern opening to an underground stream running along its floor.", ["cave", "river", "water", "stream", "cavern", "riverside"], ["नदी किनारे गुफा", "riverside cave"], ["panchatantra", "jataka"], ly, an, ro, ("ground", "aquatic"), code="CAV")

    ly, an, ro = scene(wall=("haunted", {"dado": False, "floor_y": 235}), back=[At("rock-stalactite", 400, 1100, 1.4), At("rock-stalactite", 1400, 1120, 1.5)], ground=("haunted", 250), mid=[At("rock-slab", 160, 255, 1.1), Shape("chest", 1500, 258, 1.2), Shape("light_pool", 960, 270, 360, "#8af0b8", 0.25)],
                       decor=[], fx=[Shape("mist", 270, 3, col="#5a5a8a", op=0.3)], scare=[Shape("ghost", 1300, 420, 1.0), Shape("eyes", 2, 400, 800), Shape("bats", 3)], seed=510, anchor_y=230)
    env(10, "Haunted underground chamber", "haunted-chamber", "A cold crypt-like chamber; the ghost and eyes appear only at higher scare levels.", ["haunted", "chamber", "crypt", "ghost", "underground", "spooky"], ["भुतहा तहखाना", "haunted chamber"], ["vikram_betal", "folk"], ly, an, ro, code="CAV", lighting=["night"])
    return E
