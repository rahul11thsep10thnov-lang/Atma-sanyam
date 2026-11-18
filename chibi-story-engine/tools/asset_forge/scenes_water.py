"""Category D: rivers and water (15 designs)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

TREES = ["tree-oak", "tree-jamun", "tree-neem", "tree-mango", "tree-peepal"]
BANK = [(-400, 300), (250, 230), (560, 40), (1500, 40), (1850, 220), (2400, 300)]


def build() -> list:
    E = []

    def env(n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("aquatic", "ground"), **kw):
        E.append(make_env(f"env-wat-{n:04d}", name, "WAT", sub, desc, ly, an, ro, list(habit), ["water", *tags], aliases, stories, seed=300 + n, **kw))

    hz = lambda sky="day", a=0.42: haze(None, SKY_COLOURS[sky][1], a)
    fgr = lambda ids=("grass-reed-tall",): [Scatter(list(ids), 4, (-100, 2050), (-120, 0), (0.9, 1.2), 6)]

    ly, an, ro = scene(sky=("day", {"clouds": 4}), far=[At("mountain-blue-range", 960, 400, 1.6)], back=[Scatter(TREES, 9, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz())], water={"top": 340.0, "ripples": (120.0, 330.0), "n": 26},
                       ground=("grass", 200, {"profile": [(-400, 280), (200, 150), (500, 30), (1700, 30), (2100, 150), (2400, 270)]}), mid=[At("water-sailboat", 1250, 250, 0.9)], veg=[At("tree-banyan", 100, 285, 0.9), At("grass-cattail", 1900, 160, 1.0)], fg=fgr(), seed=301)
    env(1, "Wide flowing river", "river", "A broad river with a far bank, blue hills and a sailing boat.", ["river", "flowing", "boat", "bank"], ["चौड़ी नदी", "wide river"], ["panchatantra", "jataka", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 1}), back=[Scatter(["tree-oak", "tree-neem", "tree-bamboo", "tree-jamun"], 12, (-100, 2050), (380, 420), (0.5, 0.7), 2, pal=hz("morning"))], water={"top": 250.0, "front": False, "ripples": (130.0, 240.0), "n": 14},
                       ground=("moss", 200, {"profile": [(-400, 320), (400, 260), (760, 70), (1200, 60), (1600, 240), (2400, 300)]}), mid=[At("water-stepping-stones", 980, 90, 1.0), At("rock-mossy", 420, 255, 1.0), At("rock-mossy", 1650, 235, 0.9)],
                       veg=[At("tree-oak", 120, 330, 1.0), At("tree-bamboo", 1880, 300, 1.2), At("bush-fern", 640, 200, 0.9), At("bush-fern", 1450, 210, 0.9)], fg=[Scatter(["grass-fern-floor", "grass-moss"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)],
                       fx=[Shape("shafts", [300, 900, 1500], col="#fff6c8"), Shape("fireflies", 6)], seed=302)
    env(2, "Small forest stream", "stream", "A shallow forest stream with mossy stepping stones and fern banks.", ["stream", "brook", "forest", "stones", "fern"], ["जंगल की छोटी धारा", "forest stream"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), far=[At("mountain-green-hills", 700, 400, 1.3)], back=[Scatter(["tree-acacia", "tree-date", "tree-banyan"], 8, (-100, 2050), (390, 410), (0.5, 0.6), 2, pal=hz("noon"))], water={"top": 330.0, "ripples": (100.0, 320.0), "n": 22},
                       ground=("mud", 200, {"profile": [(-400, 280), (300, 160), (700, 20), (1500, 20), (1850, 150), (2400, 270)]}), mid=[At("rock-river", 1000, 200, 0.7), At("grass-weeds", 400, 160, 1.0)], veg=[At("tree-banyan", 100, 290, 1.0), At("tree-jamun", 1850, 250, 0.9), At("water-reeds", 1500, 90, 1.0), At("grass-cattail", 640, 80, 1.1)],
                       fg=fgr(), seed=303)
    env(3, "Crocodile river habitat", "crocodile", "A muddy river with sandbanks and reeds, the place where a crocodile would wait.", ["river", "crocodile", "mud", "bank", "reeds", "hunter"], ["मगरमच्छ की नदी", "crocodile river"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(["tree-neem", "tree-peepal", "tree-coconut", "tree-banyan"], 8, (-100, 2050), (390, 420), (0.5, 0.6), 3, pal=hz("morning"))], water={"top": 320.0, "ripples": (100.0, 310.0), "n": 18},
                       ground=("grass", 200, {"profile": [(-400, 300), (300, 230), (650, 50), (1450, 50), (1800, 220), (2400, 290)]}), mid=[At("bld-village-house", 120, 290, 0.5), At("water-lilypads", 900, 120, 1.2), At("flower-lotus", 1100, 160, 0.9), At("grass-cattail", 1600, 190, 1.0)],
                       veg=[At("tree-banyan", 1950, 225, 0.9), At("bush-tulsi", 320, 235, 0.8)], fg=fgr(), seed=304)
    env(4, "Peaceful village pond", "pond", "A still village pond with lilypads, lotus and cattails.", ["pond", "village", "lilypad", "lotus", "calm", "frog"], ["शांत गाँव का तालाब", "village pond"], ["panchatantra", "jataka", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("dawn", {"clouds": 4}), far=[At("mountain-blue-range", 960, 380, 1.6)], water={"top": 400.0, "ripples": (80.0, 390.0), "n": 30, "c1": "#f0b8c0", "c2": "#3a8ac0"},
                       ground=("moss", 100, {"profile": [(-400, 120), (2400, 120)]}), mid=[At("flower-lotus", 300, 140, 1.4), At("flower-lotus", 800, 200, 1.1), At("flower-lotus", 1250, 160, 1.3), At("flower-lotus-bud", 1600, 190, 1.0), At("flower-lotus", 1900, 150, 1.2), At("water-lilypads", 550, 130, 1.5), At("water-lilypads", 1450, 110, 1.4), At("flower-waterlily", 1050, 120, 1.0)],
                       veg=[At("grass-reed-tall", 80, 150, 1.0)], fg=[Scatter(["flower-lotus-bud", "water-lilypads"], 3, (-100, 2050), (-120, 0), (0.9, 1.2), 6)], fx=[Shape("mist", 300, 4, col="#f8e8f0", op=0.2)], seed=305)
    env(5, "Lotus lake", "lotus", "A dawn lake carpeted with lotus flowers and lilypads.", ["lake", "lotus", "dawn", "flowers", "swan", "sacred"], ["कमल की झील", "lotus lake"], ["panchatantra", "jataka"], ly, an, ro, lighting=["morning", "evening"])

    ly, an, ro = scene(sky=("day", {"clouds": 2}), far=[At("mountain-forested", 960, 400, 1.6)], back=[At("mountain-cliff", 1500, 330, 1.5), Scatter(["tree-pine", "tree-oak"], 7, (-100, 2050), (400, 420), (0.5, 0.6), 2, pal=hz())], water={"top": 150.0, "front": False, "ripples": (40.0, 140.0), "n": 16},
                       ground=("rock", 210, {"profile": [(-400, 340), (350, 300), (750, 60), (1350, 60), (1750, 290), (2400, 330)]}), mid=[At("water-waterfall", 1050, 160, 1.6), At("rock-boulder", 380, 290, 1.1), At("rock-boulder", 1700, 280, 1.0)], veg=[At("tree-oak", 120, 340, 1.0), At("tree-pine", 1950, 330, 1.0), At("bush-fern", 600, 260, 1.0)],
                       fx=[Shape("mist", 200, 3, col="#ffffff", op=0.3)], fg=[Scatter(["grass-moss", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=306)
    env(6, "Waterfall", "waterfall", "A tall waterfall dropping into a rocky pool with mist.", ["waterfall", "cascade", "pool", "rocks", "mist", "falls"], ["झरना", "waterfall"], ["panchatantra", "jataka", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-green-hills", 800, 400, 1.3)], back=[Scatter(["tree-banyan-ancient", "tree-banyan", "tree-peepal", "tree-mango"], 8, (-100, 2050), (400, 420), (0.55, 0.7), 2, pal=hz())], water={"top": 250.0, "front": False, "ripples": (100.0, 240.0), "n": 16},
                       ground=("grass", 215, {"profile": [(-400, 320), (500, 300), (900, 200), (1300, 50), (1600, 40), (2400, 50)]}), mid=[At("tree-banyan-ancient", 330, 305, 1.15), At("rock-river", 1000, 215, 0.8)], veg=[At("tree-peepal", 700, 295, 0.9), At("bush-berry-blue", 1100, 210, 0.9)], fg=fgr(), seed=307)
    env(7, "Riverbank with large trees", "riverbank-trees", "A grassy bank under huge old trees, the river beyond.", ["riverbank", "trees", "banyan", "shade", "river", "bank"], ["बड़े पेड़ों वाला नदी तट", "riverbank trees"], ["panchatantra", "jataka"], ly, an, ro, ("aquatic", "ground", "arboreal"))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), far=[At("mountain-cliff", 500, 400, 1.7), At("mountain-cliff", 1500, 400, 1.7)], back=[At("mountain-rocky", 960, 360, 1.6)], water={"top": 270.0, "ripples": (100.0, 260.0), "n": 18},
                       ground=("rock", 210, {"profile": [(-400, 340), (300, 300), (700, 40), (1700, 40), (2100, 280), (2400, 340)]}), mid=[At("rock-big", 300, 295, 1.1), At("rock-sandstone", 1700, 285, 1.1)], veg=[At("tree-gnarled", 150, 330, 0.9), At("bush-dry", 1900, 290, 0.9)], fg=[Scatter(["rock-small", "grass-dry"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=308)
    env(8, "Riverbank with rocky cliffs", "rocky-bank", "A river running between steep rocky cliffs at evening.", ["riverbank", "cliff", "rocks", "gorge", "river"], ["चट्टानी नदी तट", "rocky river bank"], ["panchatantra", "jataka"], ly, an, ro, lighting=["evening", "noon"])

    ly, an, ro = scene(sky=("mist", {"clouds": 3}), back=[Scatter(["tree-willow", "tree-bamboo", "tree-date"], 8, (-100, 2050), (380, 410), (0.5, 0.6), 2, pal=hz("mist", 0.5))], back_tint="background", water={"top": 215.0, "front": False, "ripples": (100.0, 205.0), "n": 14},
                       ground=("wet", 150, {"profile": [(-400, 210), (2400, 210)]}), mid=[At("grass-cattail", 200, 150, 1.4), At("grass-cattail", 700, 130, 1.2), At("grass-cattail", 1250, 140, 1.4), At("grass-cattail", 1800, 150, 1.2), At("water-reeds", 960, 110, 1.3), At("rock-river", 1500, 150, 0.8)],
                       veg=[At("tree-willow", 120, 215, 0.9), At("bush-fern", 1600, 200, 0.9)], fg=fgr(("grass-reed-tall", "grass-cattail")), fx=[Shape("mist", 400, 3, col="#e8f0f0", op=0.28)], seed=309)
    env(9, "Marshland", "marsh", "A misty marsh with cattails, reeds and low pools.", ["marsh", "swamp", "wetland", "reeds", "mist", "bog"], ["दलदली भूमि", "marshland"], ["panchatantra", "jataka"], ly, an, ro, ("aquatic", "ground"))

    ly, an, ro = scene(sky=("golden", {"clouds": 3}), back=[Scatter(["tree-pine", "tree-oak", "tree-deodar", "tree-fir-tall"], 11, (-100, 2050), (380, 420), (0.5, 0.7), 2, pal=hz("golden"))], water={"top": 290.0, "ripples": (100.0, 280.0), "n": 20},
                       ground=("forest", 215, {"profile": [(-400, 330), (300, 280), (650, 60), (1550, 60), (1900, 260), (2400, 330)]}), mid=[At("water-jetty", 1350, 160, 0.9), At("rock-mossy", 360, 285, 0.9)], veg=[At("tree-pine", 100, 330, 1.2), At("tree-oak", 1900, 300, 1.1), At("bush-berry-red", 560, 240, 0.9)], fg=fgr(("grass-tall", "grass-reed-tall")), seed=310)
    env(10, "Lakeside forest", "lakeside", "A calm lake ringed by forest, with a small wooden jetty.", ["lake", "forest", "jetty", "pines", "lakeside"], ["झील किनारे जंगल", "lakeside forest"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(wall=None, sky=("underwater", {"clouds": 0}), back=[Scatter(["water-seaweed", "rock-mossy"], 9, (-100, 2050), (160, 260), (0.6, 0.9), 2)], back_tint="background", ground=("sand", 170, {"profile": [(-400, 190), (2400, 170)]}),
                       mid=[At("rock-boulder", 300, 190, 1.2), At("rock-river", 1650, 180, 1.1), At("water-seaweed", 700, 175, 1.4), At("water-seaweed", 1250, 175, 1.2), At("water-fish", 900, 520, 1.0), At("water-fish", 1500, 640, 0.8), At("water-fish", 450, 700, 0.7)],
                       veg=[At("water-seaweed", 120, 190, 1.5), At("water-seaweed", 1900, 190, 1.4)], fx=[Shape("shafts", [200, 700, 1200, 1700], top=1260, bottom=170, w=180, col="#cdf6ff", op=0.2), At("water-bubbles", 1050, 260, 1.2), At("water-bubbles", 400, 330, 1.0)], seed=311, back_parallax=0.6)
    env(11, "Underwater river scene", "underwater", "The river bed seen from below: sandy floor, weed, rocks, fish and light shafts.", ["underwater", "river", "fish", "seaweed", "bed", "swim"], ["नदी के भीतर", "underwater river"], ["panchatantra", "jataka"], ly, an, ro, ("aquatic",), lighting=["noon", "evening"])

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), far=[At("mountain-forested", 960, 400, 1.6)], back=[Scatter(["tree-coconut", "tree-fanpalm", "tree-banana", "tree-areca"], 10, (-100, 2050), (390, 420), (0.5, 0.65), 2, pal=hz("morning"))], water={"top": 240.0, "front": False, "ripples": (100.0, 230.0), "n": 16},
                       ground=("wet", 200, {"profile": [(-400, 230), (500, 220), (900, 60), (1500, 70), (2000, 210), (2400, 230)]}), mid=[At("flower-lotus", 1050, 110, 1.0), At("water-lilypads", 750, 110, 1.2), At("grass-cattail", 220, 190, 1.2), At("water-reeds", 1700, 160, 1.2)], veg=[At("tree-banana", 130, 230, 1.0), At("tree-coconut", 1900, 220, 1.0), At("flower-orchid", 600, 215, 1.0), At("bush-hibiscus", 1450, 215, 1.0)],
                       fg=fgr(("grass-reed-tall", "grass-fern-floor")), fx=[Shape("mist", 200, 2, col="#f0fff0", op=0.2)], seed=312)
    env(12, "Tropical wetland", "tropical-wetland", "Palms, bananas and orchids around a shallow tropical lagoon.", ["wetland", "tropical", "palms", "lagoon", "orchid"], ["उष्णकटिबंधीय आर्द्रभूमि", "tropical wetland"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), far=[At("mountain-green-hills", 400, 400, 1.2)], back=[Scatter(["tree-oak", "tree-neem"], 5, (-100, 2050), (390, 410), (0.5, 0.6), 2, pal=hz("noon", 0.5))], water={"top": 280.0, "ripples": (100.0, 270.0), "n": 26},
                       ground=("grass", 200, {"profile": [(-400, 20), (500, 20), (760, 150), (960, 250), (1260, 150), (1500, 20), (2400, 20)]}), mid=[At("tree-banyan", 960, 255, 1.0), At("rock-river", 1100, 215, 0.6)], veg=[At("tree-mango", 800, 250, 0.7), At("grass-tall", 1100, 245, 1.0), At("bush-berry-red", 880, 255, 0.7)],
                       fg=fgr(), seed=313)
    env(13, "River island", "island", "A small tree-covered island in the middle of the river.", ["island", "river", "tree", "isolated", "refuge"], ["नदी का द्वीप", "river island"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(sky=("snow", {"clouds": 2}), far=[At("mountain-snow-peak", 600, 400, 1.8), At("mountain-himalaya", 1500, 400, 1.6)], back=[Scatter(["tree-pine-snow", "tree-fir-tall", "tree-deodar"], 8, (-100, 2050), (380, 410), (0.5, 0.6), 2, pal=hz("snow", 0.5))], water={"top": 270.0, "ripples": (100.0, 260.0), "n": 18, "c1": "#9fe0f0", "c2": "#2a78b0"},
                       ground=("stone", 210, {"profile": [(-400, 330), (350, 290), (700, 50), (1650, 50), (2000, 280), (2400, 330)]}), mid=[At("rock-snowy", 350, 290, 1.1), At("rock-snowy", 1700, 280, 1.0)], veg=[At("tree-pine-snow", 100, 330, 1.2), At("tree-fir-tall", 1900, 300, 1.2), At("bush-snow", 620, 250, 0.9)],
                       fg=[Scatter(["grass-snow", "rock-small"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=314)
    env(14, "Mountain lake", "mountain-lake", "A clear alpine lake below snow peaks, ringed by pines.", ["mountain", "lake", "snow", "alpine", "pines", "clear"], ["पहाड़ी झील", "mountain lake"], ["panchatantra", "jataka", "folk"], ly, an, ro, lighting=["noon", "morning"])

    ly, an, ro = scene(sky=("night", {"clouds": 2, "moon": (1400, 1000, 100), "stars": 120}), back=[Scatter(["tree-willow", "tree-oak", "tree-bamboo"], 9, (-100, 2050), (380, 410), (0.5, 0.6), 2, pal=haze(None, "#2a3a6c", 0.5))], back_tint="background", water={"top": 300.0, "ripples": (100.0, 290.0), "n": 22, "c1": "#6a8ac8", "c2": "#16286a"},
                       ground=("grass", 200, {"profile": [(-400, 300), (300, 230), (700, 40), (1600, 40), (1900, 230), (2400, 300)]}), mid=[At("rock-river", 400, 240, 1.0), At("water-jetty", 1350, 150, 0.9)], veg=[At("tree-willow", 120, 300, 1.0), At("tree-banyan", 1950, 230, 0.9), At("grass-cattail", 1700, 210, 1.0)],
                       fx=[Shape("fireflies", 24), Shape("mist", 250, 3, col="#aab8d8", op=0.2)], fg=fgr(), seed=315)
    env(15, "Moonlit riverbank", "moonlit", "A riverbank by moonlight with fireflies and mist over the water.", ["moon", "night", "river", "riverbank", "fireflies", "mist"], ["चाँदनी में नदी तट", "moonlit riverbank"], ["panchatantra", "vikram_betal", "jataka"], ly, an, ro, lighting=["night", "moonlight"])
    return E
