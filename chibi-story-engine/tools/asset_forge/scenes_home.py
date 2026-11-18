"""Category I: houses and interiors (15) and J: deserts (10)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

T = ["tree-neem", "tree-peepal", "tree-mango", "tree-coconut"]
WIN = lambda x, y=520, w=140, h=250, c="#9ad0f0": Shape("window_light", x, y, w, h, c)
LP = lambda x, y, rx, col="#ffcf70", op=0.3: Shape("light_pool", x, y, rx, int(rx * 0.14), col, op)
BM = "#6a4a2a"


def build() -> list:
    E = []

    def env(code, n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), **kw):
        E.append(make_env(f"env-{code.lower()}-{n:04d}", name, code, sub, desc, ly, an, ro, list(habit), tags, aliases, stories, seed=(800 if code == "HOU" else 900) + n, **kw))

    hz = lambda sky="day", a=0.42: haze(None, SKY_COLOURS[sky][1], a)
    hou = lambda n, *a, **k: env("HOU", n, *a, **k)
    des = lambda n, *a, **k: env("DES", n, *a, **k)
    gr = lambda: [Scatter(["grass-tuft", "flower-marigold"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), back=[Scatter(T, 7, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz())], ground=("dirt", FLOOR), mid=[At("bld-village-house", 960, 335, 1.7), At("wall-whitewash", 300, 215, 1.0), At("wall-whitewash", 1700, 215, 1.0), At("bush-tulsi", 560, 330, 1.0)], veg=[At("tree-neem", 120, 340, 1.0), At("tree-coconut", 1870, 340, 1.0)], fg=gr(), seed=801)
    hou(1, "Traditional Indian house exterior", "exterior", "A whitewashed house with arched windows, a compound wall and a tulsi plant.", ["house", "exterior", "whitewash", "home", "tulsi", "compound"], ["भारतीय घर का बाहरी भाग", "house exterior"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(wall=("white", {"panels": 1}), decor=[At("window-arched", 330, 620, 1.0), At("window-arched", 1590, 620, 1.0)], ground=("wood", FLOOR), mid=[Shape("bed", 960, 335, 420), Shape("shelf", 330, 335, 300, 380), Shape("pot", 1500, 335, 1.2)], occl=[Shape("rugs", 960, 100, 700, 30)], beams=BM, fx=[WIN(330, 580), WIN(1590, 580)], seed=802)
    hou(2, "Traditional house interior", "interior", "A simple home room: bed, shelf, water pot and a rug under timber beams.", ["house", "interior", "room", "home", "bed", "family"], ["घर का भीतरी भाग", "house interior"], ["folk", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(wall=("palace", {"panels": 1}), decor=[At("window-jharokha", 330, 620, 1.0), At("window-jharokha", 1590, 620, 1.0), At("lamp-hanging-brass", 960, 1000, 1.0)], ground=("tile", FLOOR), mid=[Shape("carpet", 700, 1220, 335, -90, "#7a3a2a"), Shape("table", 960, 335, 440), Shape("chest", 1500, 335, 1.2), Shape("shelf", 330, 335, 320, 420)], occl=[Shape("cushions", [700, 860, 1060, 1220], 110, "#c0392b")], seed=803)
    hou(3, "Merchant's home", "merchant-home", "A merchant's well-furnished room with jharokha windows, ledger table and strongbox.", ["merchant", "home", "wealthy", "chest", "table", "house"], ["व्यापारी का घर", "merchant's home"], ["akbar_birbal", "arabian_nights", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T, 7, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz("morning"))], ground=("mud", FLOOR), mid=[At("bld-hut-veranda", 960, 335, 1.5), At("fence-bamboo", 300, 215, 1.0), Shape("haystack", 1650, 330, 1.2), Shape("charpai", 480, 215, 300), At("bld-cattle-shed", 1900, 335, 0.5)], veg=[At("tree-mango", 130, 340, 1.0), At("bush-tulsi", 760, 330, 1.0)], fg=gr(), seed=804)
    hou(4, "Farmer's home", "farmer-home", "A farmer's veranda house with haystack, charpai and a bamboo fence.", ["farmer", "home", "farm", "hut", "hay", "village"], ["किसान का घर", "farmer's home"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(wall=("royal", {"panels": 1}), decor=[At("window-triple", 330, 600, 1.0), At("window-triple", 1590, 600, 1.0), At("lamp-candelabra", 1000, 335, 0.9)], ground=("marble", FLOOR), mid=[Shape("bed", 960, 335, 500, "#e6b93c", "#fff6e0"), Shape("table", 400, 335, 340), Shape("shelf", 1600, 335, 300, 380)], occl=[Shape("cushions", [600, 760, 1160, 1320], 110, "#e6b93c")], fx=[LP(960, 600, 800)], seed=805, beams="#5a3a1a")
    hou(5, "Royal guest room", "guest-room", "A guest chamber: gilded bed, tall windows, a table and cushions.", ["guest", "room", "royal", "bed", "chamber", "palace"], ["शाही अतिथि कक्ष", "royal guest room"], ["akbar_birbal", "arabian_nights", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(wall=("white", {"panels": 1}), decor=[At("window-shutters", 330, 620, 1.0), At("window-arched", 1590, 620, 1.0)], ground=("wood", FLOOR), mid=[At("lamp-diya", 960, 335, 1.5), Shape("shelf", 400, 335, 340, 430), Shape("table", 1450, 335, 360), At("bush-tulsi", 700, 335, 0.9), Shape("pot", 1200, 335, 1.0)], occl=[Shape("rugs", 960, 100, 600, 30, "#c9783c")], beams=BM, seed=806)
    hou(6, "Brahmin's residence", "brahmin-home", "A scholar's modest home with a manuscript shelf, lamp and tulsi.", ["brahmin", "scholar", "home", "books", "lamp", "priest"], ["ब्राह्मण का घर", "brahmin residence"], ["tenali_raman", "panchatantra", "hitopadesha", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(wall=("mud", {"panels": 1}), decor=[At("window-slit", 330, 620, 1.0)], ground=("mud", FLOOR), mid=[Shape("rugs", 960, 335, 500, 30, "#8a6a3a"), At("lamp-campfire", 960, 335, 0.9), Shape("pot", 400, 335, 1.2), At("bush-tulsi", 1550, 335, 0.9), Shape("shelf", 1700, 335, 240, 340)], fx=[LP(960, 340, 500, "#ff9a30", 0.35)], seed=807, beams=BM)
    hou(7, "Sage's hut", "sage-hut", "Inside a sage's hut: a mat, a small fire, water pots and a few books.", ["sage", "hut", "hermit", "fire", "mat", "simple"], ["ऋषि की कुटिया", "sage's hut"], ["panchatantra", "vikram_betal", "jataka", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(T, 6, (-100, 2050), (400, 420), (0.5, 0.65), 2, pal=hz("morning"))], ground=("grass", FLOOR), mid=[At("bld-cattle-shed", 960, 335, 1.6), At("fence-cattle-pen", 300, 215, 1.1), At("fence-cattle-pen", 1650, 215, 1.1)], occl=[Shape("hay_roll", 700, 100, 1.0), Shape("barrel", 1300, 110, 0.9)], veg=[At("tree-neem", 120, 340, 0.9)], fg=gr(), seed=808)
    hou(8, "Animal shelter", "shelter", "An open-sided shelter with a pen and hay rolls for animals.", ["shelter", "animals", "barn", "hay", "pen", "stable"], ["पशु आश्रय", "animal shelter"], ["panchatantra", "jataka"], ly, an, ro)

    ly, an, ro = scene(wall=("mud", {"panels": 1}), decor=[At("window-slit", 1590, 620, 1.0)], ground=("mud", FLOOR), mid=[Shape("stove", 700, 335, 1.2), Shape("shelf", 330, 335, 300, 400), Shape("pot", 1100, 335, 1.2), Shape("pot", 1260, 335, 0.9), Shape("table", 1500, 335, 320)], occl=[Shape("pot", 960, 100, 1.2)], fx=[LP(700, 360, 520, "#ff9a30", 0.35), Shape("smoke", 700, 650)], beams=BM, seed=809)
    hou(9, "Kitchen", "kitchen", "A hearth kitchen: clay stove with smoke, pots, a shelf and a table.", ["kitchen", "cooking", "stove", "pots", "hearth", "food"], ["रसोई", "kitchen"], ["folk", "tenali_raman", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(wall=("palace", {"panels": 1}), decor=[At("window-arched", 330, 620, 1.0), At("window-arched", 1590, 620, 1.0), At("lamp-hanging-brass", 960, 1000, 1.0)], ground=("wood", FLOOR), mid=[Shape("table", 960, 335, 640, 120), Shape("pot", 760, 460, 0.6), Shape("pot", 1160, 460, 0.6)], occl=[Shape("cushions", [640, 780, 960, 1140, 1280], 110, "#3a6ad8")], seed=810, beams=BM)
    hou(10, "Dining room", "dining", "A long low dining table with floor cushions and brass lamps.", ["dining", "food", "table", "feast", "family", "cushions"], ["भोजन कक्ष", "dining room"], ["akbar_birbal", "tenali_raman", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(wall=("blue", {"panels": 1}), decor=[At("window-round", 1590, 620, 1.0)], ground=("wood", FLOOR), mid=[Shape("bed", 800, 335, 480), Shape("shelf", 1400, 335, 260, 360), Shape("chest", 1650, 335, 1.0), At("lamp-candle", 1100, 335, 1.3)], occl=[Shape("rugs", 960, 100, 600, 30, "#3a6ad8")], fx=[LP(800, 380, 600, "#ffe8a0", 0.2)], beams=BM, seed=811)
    hou(11, "Bedroom", "bedroom", "A bedroom with a wooden bed, a chest and a candle.", ["bedroom", "bed", "sleep", "night", "room", "chest"], ["शयनकक्ष", "bedroom"], ["panchatantra", "folk", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(wall=("dark", {"panels": 1}), decor=[At("window-slit", 330, 700, 1.0), At("window-slit", 1590, 700, 1.0)], ground=("wood", FLOOR), mid=[Shape("sacks", 300, 335, 1.2, 5), Shape("barrel", 800, 335, 1.2), Shape("barrel", 960, 335, 1.0), Shape("chest", 1250, 335, 1.4), Shape("shelf", 1650, 335, 300, 420)], occl=[Shape("pot", 600, 100, 1.2)], fx=[Shape("cobweb", 160, 1100, 170)], beams=BM, seed=812)
    hou(12, "Storage room", "storage", "A dim storeroom of sacks, barrels, chests and shelves.", ["storage", "store", "sacks", "barrels", "chests", "godown"], ["भंडार कक्ष", "storage room"], ["panchatantra", "arabian_nights", "folk"], ly, an, ro)

    ly, an, ro = scene(wall=("wood", {"panels": 1}), decor=[At("window-arched", 330, 620, 1.0), At("window-arched", 1590, 620, 1.0)], ground=("wood", FLOOR), mid=[Shape("shelf", 330, 335, 360, 440), Shape("shelf", 1560, 335, 360, 440), Shape("table", 960, 335, 420), At("lamp-candelabra", 960, 480, 0.8)], occl=[Shape("rugs", 960, 100, 700, 30, "#7a3a2a")], fx=[WIN(330, 580), WIN(1590, 580)], beams=BM, seed=813)
    hou(13, "Study room", "study", "A study with full shelves, a writing table and candlelight.", ["study", "books", "scholar", "writing", "library", "scribe"], ["अध्ययन कक्ष", "study room"], ["tenali_raman", "hitopadesha", "akbar_birbal", "vikram_betal"], ly, an, ro)

    ly, an, ro = scene(wall=("brick", {"panels": 1}), decor=[At("window-barred", 330, 700, 1.0)], ground=("stone", FLOOR), mid=[Shape("table", 500, 335, 480), At("bld-kiln", 1500, 335, 0.9), Shape("wheel", 1100, 335, 1.2), Shape("anvil", 800, 335, 1.2)], occl=[Shape("barrel", 300, 100, 1.0), Shape("sacks", 1350, 100, 1.0, 3)], fx=[LP(1500, 360, 500, "#ff7a2a", 0.35)], beams=BM, seed=814)
    hou(14, "Workshop", "workshop", "A craftsman's workshop with an anvil, a wheel, a kiln and a work table.", ["workshop", "craftsman", "anvil", "kiln", "tools", "smith"], ["कार्यशाला", "workshop"], ["tenali_raman", "folk", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Scatter(T, 5, (-100, 2050), (400, 420), (0.5, 0.6), 2, pal=hz("noon"))], ground=("tile", FLOOR), mid=[At("wall-whitewash", 330, 215, 1.0), At("wall-whitewash", 1620, 215, 1.0), At("door-arched", 960, 335, 1.2), At("wall-balustrade", 960, 215, 1.0), At("bush-hedge", 650, 215, 1.0), At("flower-jasmine", 1350, 330, 1.2)], veg=[At("tree-mango", 140, 340, 1.0), At("flower-rose", 800, 330, 1.2), At("bush-hibiscus", 1800, 335, 1.0)], occl=[Shape("pot", 1100, 100, 1.2), Shape("pot", 560, 100, 1.0)], fg=gr(), seed=815)
    hou(15, "Courtyard with garden", "courtyard-garden", "A tiled courtyard garden with roses, jasmine and potted plants inside a whitewashed wall.", ["courtyard", "garden", "flowers", "tile", "home", "haveli"], ["बगीचे वाला आँगन", "courtyard garden"], ["akbar_birbal", "arabian_nights", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    # --------------------------------------------------------------------------------------------- J: deserts
    dune = lambda: [At("mountain-dune-ridge", 500, 360, 1.6), At("mountain-dune-ridge", 1500, 360, 1.8)]
    gd = lambda: [Scatter(["grass-dry", "rock-small", "bush-dry"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]
    ly, an, ro = scene(sky=("desert", {"clouds": 1, "sun": (1450, 920, 90)}), far=dune(), ground=("sand", FLOOR), mid=[At("rock-sandstone", 400, 335, 1.0), At("bush-dry", 1100, 330, 1.0), At("tree-acacia", 1700, 340, 0.8)], veg=[At("bush-cactus", 150, 335, 1.0)], fg=gd(), seed=901)
    des(1, "Sandy desert", "sand", "Open sand under a white sun, a few rocks and a thorny acacia.", ["desert", "sand", "sun", "dry", "barren", "heat"], ["रेगिस्तान", "sandy desert"], ["arabian_nights", "akbar_birbal", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 2}), far=[At("mountain-dune-ridge", 300, 340, 2.0), At("mountain-dune-ridge", 1100, 340, 2.2), At("mountain-dune-ridge", 1800, 340, 2.0)], back=[At("mountain-dune-ridge", 700, 300, 1.4)], ground=("sand", FLOOR), mid=[At("rock-sandstone", 1500, 335, 0.9)], veg=[At("bush-dry", 300, 335, 1.0)], fg=gd(), seed=902)
    des(2, "Desert dunes", "dunes", "Wave after wave of dunes under a pale sky.", ["dunes", "desert", "sand", "waves", "wind", "wide"], ["रेत के टीले", "desert dunes"], ["arabian_nights", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=[At("mountain-dune-ridge", 600, 380, 1.5)], water={"top": 260.0, "front": False, "ripples": (100.0, 250.0), "n": 12}, ground=("sand", 215, {"profile": [(-400, 280), (500, 240), (850, 60), (1350, 60), (1700, 230), (2400, 280)]}),
                       mid=[At("tree-date", 500, 235, 1.3), At("tree-date", 1450, 235, 1.2), At("tree-date", 1650, 230, 1.0), At("bush-agave", 250, 270, 1.0)], veg=[At("grass-cattail", 1000, 70, 1.0), At("tree-fanpalm", 1850, 235, 1.0)], fg=gd(), seed=903)
    des(3, "Desert oasis", "oasis", "A small pool ringed by date palms in the middle of the sand.", ["oasis", "palms", "water", "desert", "dates", "refuge"], ["मरुद्यान", "desert oasis"], ["arabian_nights", "akbar_birbal"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=dune(), ground=("sand", FLOOR), mid=[At("bld-mud-hut", 400, 340, 1.1), At("bld-round-hut", 1050, 340, 1.1), At("bld-thatched-hut", 1650, 340, 1.0), At("bld-village-well", 760, 335, 0.9), At("wall-mud", 1300, 215, 1.0)], veg=[At("tree-babul", 130, 340, 1.0), At("bush-cactus", 1850, 335, 0.9)], fg=gd(), seed=904)
    des(4, "Desert village", "village", "A few mud and thatch huts around a well on dry ground.", ["desert", "village", "huts", "well", "mud", "dry"], ["रेगिस्तानी गाँव", "desert village"], ["folk", "akbar_birbal", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=[At("mountain-mesa-range", 700, 380, 1.8), At("mountain-rocky", 1600, 380, 1.5)], back=[At("rock-mesa", 1000, 350, 1.5)], ground=("rock", FLOOR), mid=[At("rock-sandstone", 350, 335, 1.3), At("rock-arch", 1250, 335, 1.0), At("rock-cracked", 1750, 335, 1.0)], veg=[At("bush-dry", 750, 335, 1.0), At("bush-cactus", 120, 340, 1.0)], fg=gd(), seed=905)
    des(5, "Rocky dry landscape", "rocky", "Cracked ground, mesas and sandstone arches.", ["rocky", "dry", "mesa", "badland", "arid", "stones"], ["चट्टानी सूखा इलाका", "rocky dry land"], ["folk", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=[At("mountain-rocky", 800, 380, 1.5)], back=[Scatter(["tree-acacia", "tree-babul", "bush-dry"], 10, (-100, 2050), (390, 410), (0.5, 0.65), 2)], ground=("sand", FLOOR), mid=[At("tree-babul", 400, 335, 1.2), At("tree-acacia", 1050, 335, 1.2), At("bush-prickly-pear", 1600, 330, 1.0), At("fence-thorn", 750, 215, 1.0)], veg=[At("tree-gnarled", 120, 340, 1.0), At("bush-agave", 1850, 335, 1.0)], fg=gd(), seed=906)
    des(6, "Thorn forest", "thorn", "Scrub of thorny babul and acacia with prickly pear.", ["thorn", "scrub", "forest", "babul", "dry", "prickly"], ["काँटेदार जंगल", "thorn forest"], ["panchatantra", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("evening", {"clouds": 2}), far=dune(), ground=("sand", FLOOR), mid=[At("rock-cairn", 1500, 335, 1.0), At("bld-caravan-tent", 500, 335, 0.8), At("rock-sandstone", 1850, 335, 1.0)], veg=[At("tree-date", 140, 340, 1.0), At("bush-dry", 1000, 330, 1.0)], occl=[Shape("sacks", 800, 100, 1.0, 3)], fg=gd(), seed=907)
    des(7, "Caravan route", "route", "A track across dunes marked by cairns and a resting tent at evening.", ["caravan", "route", "trade", "desert", "journey", "camel"], ["कारवाँ का रास्ता", "desert caravan route"], ["arabian_nights", "akbar_birbal"], ly, an, ro, lighting=["evening", "noon"])

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=["bld-mud-hut", "bld-round-hut", "bld-merchant-house"], seed=7, pal=hz("desert"))], back_tint="background", ground=("sand", FLOOR), mid=[At("bld-caravan-tent", 350, 335, 1.0), At("bld-cloth-stall", 900, 335, 1.0), At("bld-fruit-stall", 1400, 335, 1.0), At("bld-caravan-tent", 1800, 335, 0.9)], veg=[At("tree-date", 130, 340, 1.0)],
                       occl=[Shape("sacks", 650, 100, 1.0, 4), Shape("barrel", 1150, 110, 0.9)], fx=[Shape("flags", -100, 960, 2000, 960, 80, 20)], fg=gd(), seed=908)
    des(8, "Desert marketplace", "market", "A market of tents and stalls among mud buildings and date palms.", ["desert", "market", "stalls", "tents", "trade", "bazaar"], ["रेगिस्तानी बाज़ार", "desert market"], ["arabian_nights", "akbar_birbal"], ly, an, ro)

    ly, an, ro = scene(sky=("desert", {"clouds": 1}), far=dune(), back=[At("bld-fort-gate", 300, 400, 0.8)], ground=("sand", FLOOR), mid=[At("bld-fort-gate", 960, 335, 1.6), At("wall-battlement", 330, 215, 1.2), At("wall-battlement", 1650, 215, 1.2), At("bld-watchtower", 100, 335, 1.0), At("bld-watchtower", 1850, 335, 1.0)], veg=[At("bush-dry", 600, 330, 1.0)], fg=gd(), seed=909)
    des(9, "Desert fort", "fort", "A sandstone fort gate with battlements and watchtowers at the edge of the dunes.", ["fort", "desert", "gate", "battlement", "watchtower", "sandstone"], ["रेगिस्तानी किला", "desert fort"], ["akbar_birbal", "arabian_nights", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("night", {"clouds": 1, "moon": (1380, 1000, 100), "stars": 140}), far=[At("mountain-dune-ridge", 500, 360, 1.6), At("mountain-dune-ridge", 1500, 360, 1.8)], ground=("sand", FLOOR), mid=[At("rock-sandstone", 400, 335, 1.0), At("lamp-campfire", 1200, 215, 1.1), At("bld-caravan-tent", 1600, 335, 0.8)], veg=[At("tree-date", 140, 340, 1.0)], fx=[Shape("mist", 300, 2, col="#aab8d8", op=0.12)], fg=gd(), seed=910)
    des(10, "Moonlit desert", "moonlit", "Cold blue dunes under the moon, a small campfire burning.", ["desert", "night", "moon", "stars", "campfire", "dunes"], ["चाँदनी में रेगिस्तान", "moonlit desert"], ["arabian_nights", "folk", "vikram_betal"], ly, an, ro, lighting=["night", "moonlight"])
    return E
