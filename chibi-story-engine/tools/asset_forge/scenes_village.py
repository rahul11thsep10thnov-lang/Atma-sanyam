"""Category C: Indian villages (15 designs)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

HZ = lambda sky="day", a=0.42, pal=None: haze(pal, SKY_COLOURS[sky][1], a)
TREES = ["tree-neem", "tree-banyan", "tree-coconut", "tree-peepal", "tree-areca"]


def build() -> list:
    E = []

    def env(n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), **kw):
        E.append(make_env(f"env-vil-{n:04d}", name, "VIL", sub, desc, ly, an, ro, list(habit), ["village", "rural", "india", *tags], aliases, stories, seed=200 + n, **kw))

    huts = ["bld-mud-hut", "bld-thatched-hut", "bld-hut-veranda", "bld-village-house", "bld-whitewash-house"]
    hz = lambda: HZ("day")

    ly, an, ro = scene(sky=("day", {"clouds": 4}), far=[At("mountain-green-hills", 500, 400, 1.2), At("mountain-terraced", 1500, 400, 1.2)], back=[Row("x", -100, 2100, 260, 410, 0.5, 20, ids=huts, seed=3, pal=hz())] + [Scatter(TREES, 7, (-100, 2050), (400, 420), (0.45, 0.6), 4, pal=hz())],
                       back_tint="background", ground=("dirt", FLOOR, {"profile": [(-400, 330), (1000, 320), (2400, 330)]}), mid=[At("bld-hut-veranda", 400, 335, 1.0), At("bld-village-well", 1500, 330, 0.9), At("bld-mud-hut", 1000, 340, 0.75), At("fence-bamboo", 1800, 215, 0.8)],
                       veg=[At("tree-banyan", 120, 335, 0.9), At("tree-coconut", 1800, 340, 0.9), Scatter(["grass-tuft", "grass-tall"], 12, (-100, 2050), (215, 330), (0.6, 1.0), 5), At("bush-tulsi", 650, 330, 0.9)], fg=[Scatter(["grass-tall", "bush-round"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=201)
    env(1, "Traditional Indian village", "general", "Mud and thatch huts around a well, with a banyan and coconut palms.", ["huts", "well", "banyan", "general"], ["भारतीय गाँव", "village"], ["panchatantra", "folk", "tenali_raman", "akbar_birbal"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=huts, seed=4, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[At("bld-hut-veranda", 260, 335, 1.0), At("bld-village-house", 1650, 335, 1.0), At("bld-thatched-hut", 960, 350, 0.7)], veg=[At("tree-banyan", 960, 215, 1.25)],
                       occl=[Shape("platform", 960, 200, 560, 56, "#c8b898")], fg=[Scatter(["grass-tall"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=202)
    env(2, "Village main square", "square", "The village square: a huge banyan with a stone platform, houses around it.", ["square", "banyan", "meeting", "platform"], ["गाँव का चौक", "village square"], ["panchatantra", "akbar_birbal", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Scatter(TREES, 8, (-100, 2050), (400, 420), (0.5, 0.65), 4, pal=hz())], ground=("dirt", FLOOR),
                       mid=[At("wall-mud", 300, 215, 1.0), At("wall-mud", 1650, 215, 1.0), At("bld-hut-veranda", 960, 335, 1.15), At("bush-tulsi", 640, 330, 1.0), Shape("charpai", 1300, 215, 300), Shape("haystack", 1620, 330, 0.9), Shape("pot", 470, 330, 1.0)],
                       veg=[At("tree-neem", 130, 340, 0.8)], fg=[Scatter(["grass-tuft"], 6, (-100, 2050), (-100, 20), (1.2, 1.6), 6)], seed=203)
    env(3, "Mud house courtyard", "courtyard", "A swept earthen courtyard with a charpai, tulsi plant and hay.", ["courtyard", "mud", "charpai", "tulsi", "hut"], ["मिट्टी के घर का आँगन", "courtyard"], ["folk", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), far=[At("mountain-green-hills", 960, 395, 1.5)], back=[Scatter(TREES, 6, (-100, 2050), (410, 430), (0.5, 0.6), 2, pal=hz())], ground=("dirt", FLOOR),
                       mid=[Row("x", -250, 700, 380, 335, 1.15, 0, ids=["bld-village-house", "bld-hut-veranda", "bld-whitewash-house"], seed=7), Row("x", 1250, 2250, 380, 335, 1.15, 0, ids=["bld-whitewash-house", "bld-mud-hut", "bld-village-house"], seed=8),
                            At("lamp-iron-lantern", 760, 330, 0.9), At("lamp-iron-lantern", 1180, 330, 0.9)], veg=[At("tree-neem", 960, 400, 0.6)], fg=[Scatter(["grass-tall"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=204)
    env(4, "Village street", "street", "A lane between two rows of houses, with lanterns and a neem tree at the end.", ["street", "lane", "houses", "lantern"], ["गाँव की गली", "village lane"], ["folk", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Row("x", -100, 2100, 240, 410, 0.5, 20, ids=huts, seed=5, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[At("bld-veg-stall", 300, 335, 1.0), At("bld-fruit-stall", 760, 335, 1.0), At("bld-grocery-stall", 1180, 335, 1.0), At("bld-cloth-stall", 1640, 335, 1.0)], veg=[At("tree-banyan", 1000, 400, 0.8), At("tree-neem", 120, 340, 0.8)],
                       occl=[Shape("sacks", 560, 120, 0.9, 4), Shape("barrel", 1480, 130, 0.9), Shape("pot", 980, 140, 0.9)], fg=[Scatter(["grass-tall"], 4, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=205)
    env(5, "Village marketplace", "market", "A weekly village bazaar of fruit, vegetable, grocery and cloth stalls under a banyan.", ["market", "bazaar", "stalls", "fruit", "vegetable"], ["गाँव का बाज़ार", "village market"], ["panchatantra", "akbar_birbal", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), far=[At("mountain-green-hills", 700, 400, 1.2)], back=[Scatter(TREES, 7, (-100, 2050), (400, 420), (0.5, 0.6), 4, pal=hz())], ground=("dirt", FLOOR),
                       mid=[At("bld-village-well", 960, 330, 1.5), At("bld-mud-hut", 300, 340, 0.9), At("bld-village-house", 1650, 340, 0.9), Shape("pot", 700, 330, 1.0), Shape("pot", 1240, 330, 0.9), At("bld-thatched-hut", 1900, 340, 0.8)],
                       veg=[At("tree-coconut", 120, 340, 0.95), At("tree-areca", 1900, 335, 0.9), At("bush-tulsi", 520, 330, 0.8)], fg=[Scatter(["grass-tuft", "grass-tall"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=206)
    env(6, "Village well", "well", "The village well with clay pots, surrounded by huts and palms.", ["well", "pots", "water", "palms"], ["गाँव का कुआँ", "village well"], ["panchatantra", "folk", "akbar_birbal"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 5}), far=[At("mountain-green-hills", 400, 400, 1.3), At("mountain-terraced", 1450, 400, 1.3)], back=[Row("x", -100, 2100, 130, 400, 0.5, 6, ids=["grass-wheat"], seed=3, pal=hz())],
                       back_tint="foliage", ground=("dirt", 300, {"profile": [(-400, 300), (2400, 300)]}), mid=[Row("x", -200, 2200, 150, 300, 1.0, 10, ids=["grass-wheat", "grass-millet"], seed=4), At("fence-farm-gate", 300, 210, 1.0), At("fence-rail", 1620, 205, 1.0), Shape("scarecrow", 960, 270, 1.1)],
                       veg=[At("tree-peepal", 1750, 320, 0.8), At("tree-neem", 140, 320, 0.7)], fg=[Row("x", -200, 2200, 120, -90, 1.1, 10, ids=["grass-wheat"], seed=5)], seed=207)
    env(7, "Agricultural fields", "fields", "Golden wheat and millet fields with a scarecrow and a farm gate.", ["fields", "wheat", "farm", "scarecrow", "crops", "harvest"], ["खेत", "farmland", "wheat field"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(TREES, 7, (-100, 2050), (400, 420), (0.5, 0.65), 3, pal=hz())], ground=("grass", FLOOR),
                       mid=[At("bld-hut-veranda", 900, 335, 1.35), At("bld-cattle-shed", 1650, 335, 0.8), At("fence-rail", 300, 210, 1.0), Shape("haystack", 100, 330, 1.0), Shape("pot", 560, 330, 0.9)], veg=[At("tree-mango", 1240, 335, 0.8), At("bush-tulsi", 700, 330, 0.9), Scatter(["grass-wheat"], 4, (-100, 400), (250, 300), (0.8, 1.0), 4)],
                       fg=[Scatter(["grass-tall", "flower-marigold"], 6, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=208)
    env(8, "Farmer's house", "farmhouse", "A farmer's veranda house with a cattle shed, hay and a vegetable patch.", ["farmhouse", "farmer", "house", "shed", "hay"], ["किसान का घर", "farmer's house"], ["panchatantra", "folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Row("x", -100, 2100, 260, 410, 0.5, 20, ids=huts, seed=9, pal=hz())], back_tint="background", ground=("mud", FLOOR),
                       mid=[At("bld-cattle-shed", 960, 330, 1.7), At("fence-cattle-pen", 300, 210, 1.1), At("fence-cattle-pen", 1650, 210, 1.1)], occl=[Shape("hay_roll", 540, 100, 1.1), Shape("hay_roll", 1380, 110, 1.0), Shape("barrel", 960, 120, 0.9)], veg=[At("tree-neem", 100, 340, 0.8)],
                       fg=[Scatter(["grass-dry"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=209)
    env(9, "Cattle shed", "shed", "An open cattle shed stacked with hay, with a pen on either side.", ["cattle", "shed", "hay", "farm", "stable", "cows"], ["गौशाला", "cattle shed"], ["panchatantra", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("day", {"clouds": 3}), back=[Row("x", -100, 2100, 260, 410, 0.5, 20, ids=huts, seed=11, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[Shape("platform", 960, 205, 900, 60, "#c8b898"), At("bld-mud-hut", 160, 340, 0.8), At("bld-village-house", 1780, 340, 0.8)], veg=[At("tree-banyan", 960, 260, 1.5)],
                       occl=[Shape("cushions", [620, 780, 940, 1100, 1260, 1420], 150)], fg=[Scatter(["grass-tall"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=210)
    env(10, "Panchayat meeting area", "panchayat", "The village council's banyan platform with seating mats for the elders.", ["panchayat", "council", "meeting", "banyan", "elders", "justice"], ["पंचायत", "panchayat"], ["panchatantra", "akbar_birbal", "tenali_raman", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), back=[Scatter(TREES, 6, (-100, 2050), (400, 420), (0.5, 0.6), 3, pal=hz())], ground=("dirt", FLOOR),
                       mid=[At("bld-whitewash-house", 1350, 335, 1.2), Shape("blackboard", 1350, 480, 300, 200), At("fence-picket", 300, 210, 1.0), Shape("flags", 1100, 800, 1600, 780, 40, 10)], veg=[At("tree-neem", 560, 340, 1.3), At("tree-neem", 100, 340, 0.8)],
                       occl=[Shape("cushions", [420, 560, 700, 840], 140, "#3a6ad8")], fg=[Scatter(["grass-tall", "flower-daisy"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=211)
    env(11, "Village school", "school", "A small open-air school under a neem tree, with a blackboard and floor mats.", ["school", "teacher", "students", "learning", "blackboard", "neem"], ["गाँव का स्कूल", "village school"], ["folk", "tenali_raman"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("day", {"clouds": 4}), back=[Row("x", -100, 2100, 260, 420, 0.5, 20, ids=huts, seed=12, pal=hz()), Scatter(TREES, 6, (-100, 2050), (410, 430), (0.5, 0.6), 3, pal=hz())], back_tint="background",
                       water={"top": 330.0, "front": False, "ripples": (120.0, 320.0), "n": 18}, ground=("grass", 200, {"profile": [(-400, 300), (300, 220), (600, 40), (1400, 30), (1900, 200), (2400, 290)]}),
                       mid=[Shape("ghat", 330, 215, 520, 5), At("bld-shikhara-temple", 1800, 230, 0.4)], veg=[At("tree-peepal", 120, 340, 0.9), At("tree-coconut", 1900, 235, 0.9), At("flower-lotus", 900, 90, 1.0), At("flower-lotus", 1100, 110, 0.8), At("water-lilypads", 760, 60, 1.0), At("grass-cattail", 1640, 215, 1.0)],
                       fg=[Scatter(["grass-reed-tall"], 4, (-100, 2050), (-120, 0), (0.9, 1.2), 6)], seed=212)
    env(12, "Village pond", "pond", "The village pond with stone ghat steps, lotus flowers, reeds and huts beyond.", ["pond", "water", "lotus", "ghat", "reeds", "village"], ["गाँव का तालाब", "village pond"], ["panchatantra", "folk", "jataka"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), back=[Row("x", -100, 2100, 280, 410, 0.5, 20, ids=huts, seed=13, pal=hz())], back_tint="background", ground=("dirt", FLOOR),
                       mid=[Shape("platform", 1300, 205, 620, 70, "#e8c870", "#c0392b"), At("bld-royal-tent", 380, 335, 0.9), At("lamp-string-lights", 960, 760, 1.3), At("lamp-string-lights", 960, 900, 1.3), At("bld-fruit-stall", 1760, 335, 0.8), Shape("drum", 700, 215, 1.1)],
                       veg=[At("tree-banyan", 120, 340, 0.8)], fg=[Scatter(["flower-marigold"], 7, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], fx=[Shape("flags", -100, 880, 2000, 880, 100, 20)], seed=213)
    env(13, "Village festival ground", "festival", "A festival ground with a stage, a striped tent, string lights, flags and marigolds.", ["festival", "celebration", "stage", "lights", "fair", "flags"], ["गाँव का मेला", "village festival"], ["folk", "tenali_raman", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Scatter(TREES, 6, (-100, 2050), (400, 420), (0.5, 0.6), 3, pal=hz())], ground=("mud", FLOOR),
                       mid=[At("bld-kiln", 1500, 335, 1.2), At("bld-hut-veranda", 400, 335, 1.1), Shape("wheel", 960, 215, 1.4)] + [Shape("pot", x, 330, s) for x, s in ((200, 1.0), (680, 0.9), (1160, 1.1), (1820, 0.9))], occl=[Shape("pot", 560, 90, 1.3), Shape("pot", 1330, 100, 1.2), Shape("pot", 1420, 90, 0.9)],
                       veg=[At("tree-neem", 100, 340, 0.8)], seed=214)
    env(14, "Potter's workshop", "workshop", "A potter's yard with a wheel, a kiln and rows of clay pots drying.", ["potter", "pots", "kiln", "workshop", "clay", "craft"], ["कुम्हार की कार्यशाला", "potter's workshop"], ["folk", "tenali_raman", "panchatantra"], ly, an, ro)

    ly, an, ro = scene(sky=("night", {"clouds": 1, "moon": (1480, 1000, 92), "stars": 100}), back=[Row("x", -100, 2100, 300, 410, 0.5, 20, ids=huts, seed=15, pal=haze(None, "#2a3a6c", 0.5))], back_tint="background", ground=("dirt", FLOOR),
                       mid=[At("bld-hut-veranda", 400, 335, 1.1), At("bld-village-house", 1500, 335, 1.0), At("bld-mud-hut", 1000, 345, 0.8), At("lamp-iron-lantern", 700, 330, 1.0), At("lamp-diya", 1250, 215, 1.4)], veg=[At("tree-neem", 120, 340, 0.9), At("tree-banyan", 1850, 335, 0.8)],
                       fx=[Shape("fireflies", 20), Shape("smoke", 420, 520), Shape("mist", 300, 3, col="#aab8d8", op=0.18)], fg=[Scatter(["grass-tall"], 4, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=215)
    env(15, "Village at night", "night", "A quiet village under the moon: lanterns, smoke from the hearths and fireflies.", ["night", "moon", "quiet", "lantern", "stars", "village"], ["रात का गाँव", "village night"], ["panchatantra", "folk", "vikram_betal"], ly, an, ro, lighting=["night", "moonlight", "evening"])
    return E
