"""Category M: special story environments (15)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape
from .scene_lib import haze, make_env, scene

LP = lambda x, y, rx, col="#ffcf70", op=0.3: Shape("light_pool", x, y, rx, int(rx * 0.14), col, op)
BM = "#6a4a2a"
T = ["tree-oak", "tree-neem", "tree-mango", "tree-peepal"]
PIL = lambda x, h=620, col="#f2e6cc": Shape("pillar", x, 335, h, 72, col)


def build() -> list:
    E = []

    def env(n, name, sub, desc, tags, aliases, stories, ly, an, ro, habit=("ground",), **kw):
        E.append(make_env(f"env-spc-{n:04d}", name, "SPC", sub, desc, ly, an, ro, list(habit), tags, aliases, stories, seed=1200 + n, **kw))

    hz = lambda sky="day", a=0.42: haze(None, SKY_COLOURS[sky][1], a)
    gr = lambda: [Scatter(["grass-dry", "grass-tuft"], 5, (-100, 2050), (-100, 20), (1.0, 1.5), 6)]

    ly, an, ro = scene(sky=("storm", {"clouds": 5}), far=[At("mountain-rocky", 500, 380, 1.6)], ground=("dirt", FLOOR), mid=[At("rock-big", 300, 335, 1.0), At("bld-royal-tent", 1500, 335, 0.9), Shape("banner", 800, 330, 100, 400, "#c0392b"), Shape("banner", 1150, 330, 100, 400, "#3a6ad8")], veg=[At("tree-bare", 130, 340, 1.1)],
                       fx=[Shape("smoke", 600, 500), Shape("smoke", 1300, 520, col="#b0a8a0")], fg=gr(), seed=1201)
    env(1, "Battlefield", "battlefield", "An open plain with tents, banners and smoke on the horizon; no figures or injuries shown.", ["battle", "battlefield", "war", "army", "banners", "plain"], ["युद्धक्षेत्र", "battlefield"], ["akbar_birbal", "folk", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("golden", {"clouds": 2}), back=[Scatter(T, 6, (-100, 2050), (390, 420), (0.5, 0.6), 2, pal=hz("golden"))], ground=("tile", FLOOR), mid=[Shape("platform", 960, 215, 700, 100, "#e8c870", "#c0392b"), At("door-trellis", 960, 335, 1.6), At("flower-marigold", 400, 330, 1.6), At("flower-marigold", 1500, 330, 1.6)],
                       fx=[At("lamp-string-lights", 960, 760, 1.4), Shape("flags", -100, 900, 2000, 900, 80, 20)], veg=[At("tree-mango", 120, 340, 1.0)], fg=[Scatter(["flower-marigold", "flower-rose"], 7, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=1202)
    env(2, "Royal wedding venue", "wedding", "A garlanded wedding mandap on a dais with marigolds and string lights.", ["wedding", "royal", "mandap", "marigold", "celebration", "garland"], ["शाही विवाह स्थल", "royal wedding venue"], ["akbar_birbal", "arabian_nights", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), back=[Scatter(T, 6, (-100, 2050), (390, 420), (0.5, 0.6), 2, pal=hz("evening"))], ground=("grass", FLOOR), mid=[At("bld-royal-tent", 400, 335, 1.0), Shape("platform", 1350, 215, 640, 80, "#e8c870", "#c0392b"), Shape("drum", 800, 215, 1.2), At("lamp-brazier", 1000, 215, 1.0)],
                       fx=[At("lamp-string-lights", 960, 780, 1.4), Shape("flags", -100, 940, 2000, 920, 90, 22)], veg=[At("tree-banyan", 120, 340, 0.9)], fg=[Scatter(["flower-marigold"], 6, (-100, 2050), (-100, 20), (1.1, 1.6), 6)], seed=1203)
    env(3, "Festival celebration ground", "festival", "A great festival ground with a stage, drums, tents, braziers and bunting.", ["festival", "celebration", "stage", "drum", "tent", "lights"], ["उत्सव स्थल", "festival ground"], ["folk", "akbar_birbal", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(wall=("palace", {"panels": 1}), decor=[At("window-jali", 300, 620, 1.0), At("window-jali", 1620, 620, 1.0), At("lamp-chandelier", 960, 1000, 1.0)], ground=("marble", FLOOR), mid=[Shape("throne", 960, 345, 1.0), Shape("platform", 960, 215, 640, 80, "#c8a870"), PIL(200), PIL(1720), Shape("carpet", 700, 1220, 332, -150, "#a8322a")], occl=[Shape("table", 500, 100, 260), Shape("table", 1420, 100, 260)],
                       fx=[LP(960, 580, 800)], beams=BM, seed=1204)
    env(4, "Royal trial courtroom", "courtroom", "A court of justice: the throne on a dais, a carpet down the middle and clerks' tables.", ["court", "trial", "justice", "throne", "judge", "royal"], ["राज दरबार (न्याय)", "royal courtroom"], ["akbar_birbal", "tenali_raman", "singhasan_battisi", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("noon", {"clouds": 3}), back=[Row("x", -100, 2100, 330, 410, 0.55, 20, ids=["bld-haveli", "bld-merchant-house", "bld-two-storey"], seed=9, pal=hz())], back_tint="background", ground=("cobble", FLOOR), mid=[Shape("platform", 960, 215, 700, 90, "#c8b898"), At("tree-banyan", 300, 335, 1.0), At("tree-peepal", 1700, 335, 1.0), At("lamp-post", 640, 215, 1.0), At("lamp-post", 1290, 215, 1.0)],
                       fx=[Shape("flags", -100, 980, 2000, 980, 80, 20)], fg=gr(), seed=1205)
    env(5, "Public gathering square", "public-square", "A town square with a raised platform for announcements, lamp posts and trees.", ["square", "public", "town", "gathering", "announcement", "platform"], ["सार्वजनिक चौक", "public square"], ["akbar_birbal", "tenali_raman", "folk"], ly, an, ro)

    ly, an, ro = scene(sky=("overcast", {"clouds": 4}), back=[At("mountain-rocky", 960, 380, 1.7)], back_tint="background", ground=("dirt", FLOOR), mid=[Shape("platform", 1300, 215, 560, 120, "#7a5a3a"), At("wall-stone", 300, 215, 1.0), At("bld-watchtower", 1750, 335, 1.0)], veg=[At("tree-bare", 130, 340, 1.1)],
                       fx=[Shape("mist", 300, 3, col="#a8a8b8", op=0.2)], fg=gr(), seed=1206)
    env(6, "Non-graphic execution ground", "judgement-ground", "A bare courtyard with a raised wooden platform under an overcast sky; nothing graphic is drawn.", ["justice", "sentence", "platform", "overcast", "ground", "punishment"], ["दण्ड स्थल", "judgement ground"], ["akbar_birbal", "singhasan_battisi", "arabian_nights"], ly, an, ro, lighting=["noon", "evening"])

    ly, an, ro = scene(wall=("royal", {"panels": 1}), decor=[At("window-jharokha", 300, 620, 1.0), At("window-jharokha", 1620, 620, 1.0), At("lamp-chandelier", 960, 1000, 1.2)], ground=("marble", FLOOR), mid=[Shape("throne", 960, 360, 1.5, col="#f0c84a", cushion="#a8322a"), Shape("platform", 960, 215, 760, 100, "#e8c870"), PIL(180, 640, "#e8d8a8"), PIL(1740, 640, "#e8d8a8"), Shape("carpet", 560, 1360, 332, -150, "#7a1a2a")],
                       occl=[Shape("banner", 300, 100, 110, 360, "#c0392b"), Shape("banner", 1620, 100, 110, 360, "#c0392b")], fx=[LP(960, 600, 900, "#ffe090", 0.35)], beams="#5a3a1a", seed=1207)
    env(7, "Royal coronation hall", "coronation", "A hall of gilded pillars, a golden throne on a high dais, crimson banners and chandeliers.", ["coronation", "throne", "royal", "hall", "gold", "ceremony"], ["राज्याभिषेक सभागार", "coronation hall"], ["singhasan_battisi", "akbar_birbal", "arabian_nights"], ly, an, ro)

    ly, an, ro = scene(sky=("evening", {"clouds": 3}), back=[Scatter(T, 8, (-100, 2050), (390, 420), (0.55, 0.65), 2, pal=hz("evening"))], ground=("dirt", FLOOR), mid=[At("tree-banyan-ancient", 960, 335, 1.5), Shape("platform", 960, 215, 700, 70, "#c8b898"), At("lamp-campfire", 960, 215, 1.0)],
                       occl=[Shape("cushions", [520, 680, 820, 1100, 1240, 1400], 140, "#c0392b")], veg=[At("tree-peepal", 120, 340, 1.0)], fx=[Shape("fireflies", 14, 250, 700)], fg=gr(), seed=1208)
    env(8, "Storytelling assembly", "storytelling", "People sit in a ring on mats around a fire under a great banyan at dusk: where tales are told.", ["storytelling", "assembly", "fire", "banyan", "audience", "evening"], ["कथा सभा", "storytelling assembly"], ["panchatantra", "vikram_betal", "arabian_nights", "folk"], ly, an, ro, ("ground", "arboreal"), lighting=["evening", "night"])

    ly, an, ro = scene(sky=("noon", {"clouds": 2}), back=[Scatter(T, 7, (-100, 2050), (390, 420), (0.5, 0.6), 2, pal=hz())], ground=("stone", FLOOR), mid=[At("bld-mandapa", 960, 335, 1.5), At("bld-palace", 330, 335, 0.8), At("bld-mandapa", 1700, 335, 0.8)], occl=[Shape("blackboard", 960, 100, 260, 170), Shape("cushions", [700, 840, 1080, 1220], 120, "#3a6ad8")],
                       veg=[At("tree-banyan", 110, 340, 0.8), At("tree-peepal", 1860, 340, 0.9)], fg=gr(), seed=1209)
    env(9, "Ancient university", "university", "A Nalanda-like campus of pillared halls and teaching pavilions around a green court.", ["university", "learning", "scholars", "campus", "pillars", "ancient"], ["प्राचीन विश्वविद्यालय", "ancient university"], ["hitopadesha", "panchatantra", "tenali_raman"], ly, an, ro)

    ly, an, ro = scene(sky=("magic", {"clouds": 4, "stars": 60}), far=[At("mountain-snow-peak", 600, 400, 1.8), At("mountain-himalaya", 1500, 400, 1.7)], back=[At("bld-palace", 960, 400, 1.3), Scatter(["tree-magic", "tree-blossom"], 6, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=haze(None, "#d090e0", 0.4))], ground=("moss", FLOOR),
                       mid=[At("bld-gopuram", 400, 335, 1.0), At("bld-shikhara-temple", 1550, 335, 0.9), At("rock-crystal-cluster", 960, 335, 1.2)], veg=[At("tree-blossom", 130, 340, 1.1), At("tree-magic", 1850, 340, 1.1)], fx=[Shape("fireflies", 30, 260, 900, "#ffd0f0"), LP(960, 350, 800, "#e0a0ff", 0.3)], fg=[Scatter(["flower-orchid", "flower-lily"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1210)
    env(10, "Magical kingdom", "magical-kingdom", "A fairy-tale kingdom: domed palace, glowing crystals, blossoming trees under an enchanted sky.", ["magic", "kingdom", "fantasy", "palace", "crystal", "fairy"], ["जादुई राज्य", "magical kingdom"], ["arabian_nights", "vikram_betal", "singhasan_battisi", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("golden", {"clouds": 6}), far=[], back=[At("cloud-sunset", 300, 340, 2.0), At("cloud-sunset-streak", 1400, 360, 2.2)], back_tint="background", ground=("marble", 300, {"profile": [(-400, 300), (2400, 300)]}), mid=[At("bld-palace", 960, 305, 1.6), PIL(300, 560, "#fff6e0"), PIL(1620, 560, "#fff6e0"), At("lamp-magic-orb", 640, 305, 1.2), At("lamp-magic-orb", 1280, 305, 1.2)],
                       veg=[At("tree-blossom", 130, 310, 1.0), At("tree-magic", 1860, 310, 1.0)], fx=[LP(960, 320, 1000, "#fff0b0", 0.35), Shape("mist", 280, 5, col="#fff6e8", op=0.3)], fg=[Scatter(["cloud-puff"], 4, (-100, 2050), (-60, 0), (1.0, 1.6), 5)], seed=1211)
    env(11, "Celestial palace", "celestial", "A palace of gold and white marble among clouds, lit by floating orbs.", ["celestial", "heaven", "palace", "clouds", "gods", "indra"], ["स्वर्ग का महल", "celestial palace"], ["vikram_betal", "singhasan_battisi", "arabian_nights", "folk"], ly, an, ro, lighting=["morning", "evening"])

    ly, an, ro = scene(sky=("spring", {"clouds": 3}), back=[Scatter(["tree-blossom", "tree-oak", "tree-mango"], 7, (-100, 2050), (390, 420), (0.55, 0.65), 2, pal=hz("spring"))], ground=("meadow", FLOOR), mid=[At("water-fountain", 960, 335, 1.5), At("bush-hedge", 330, 215, 1.4), At("bush-hedge", 1600, 215, 1.4)] + [At("flower-rose", x, 330, 1.3) for x in (560, 1380)] + [At("flower-tulip", x, 330, 1.2) for x in (700, 1230)],
                       veg=[At("tree-blossom", 120, 340, 1.1), At("tree-blossom", 1860, 340, 1.1), At("bush-hydrangea", 800, 330, 1.0)], fg=[Scatter(["flower-tulip", "flower-lavender", "flower-daisy"], 8, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1212)
    env(12, "Fantasy garden", "fantasy-garden", "A royal garden of fountains, hedges, roses and tulips in permanent spring.", ["garden", "fantasy", "fountain", "roses", "spring", "royal"], ["कल्पित उद्यान", "fantasy garden"], ["arabian_nights", "akbar_birbal", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), far=[At("mountain-forested", 500, 400, 1.7)], back=[Scatter(T + ["tree-pine"], 12, (-100, 2050), (390, 420), (0.55, 0.7), 2, pal=hz("morning"))], ground=("grass", FLOOR), mid=[At("bld-royal-tent", 400, 335, 1.1), At("bush-berry-red", 1100, 330, 1.0), At("rock-mossy", 1700, 330, 1.0), At("tree-oak", 1400, 335, 1.2)], veg=[At("tree-banyan", 120, 340, 1.0), At("grass-tall", 800, 330, 1.2)],
                       fx=[Shape("flags", 100, 700, 700, 740, 30, 8), Shape("shafts", [900, 1500], col="#fff6c8")], fg=[Scatter(["grass-tall", "bush-round"], 6, (-100, 2050), (-100, 20), (1.0, 1.5), 6)], seed=1213)
    env(13, "Royal hunting grounds", "hunting-ground", "Wooded meadow with a royal camp tent, pennants and berry thickets.", ["hunting", "royal", "forest", "tent", "meadow", "camp"], ["शाही शिकारगाह", "royal hunting grounds"], ["panchatantra", "akbar_birbal", "jataka", "folk"], ly, an, ro, ("ground", "arboreal"))

    ly, an, ro = scene(sky=("morning", {"clouds": 3}), far=[At("mountain-blue-range", 1500, 400, 1.3)], back=[At("bld-merchant-house", 250, 400, 0.6), At("bld-two-storey", 650, 400, 0.6)], back_tint="background", water={"top": 280.0, "ripples": (100.0, 270.0), "n": 20},
                       ground=("wood", 215, {"profile": [(-400, 215), (900, 215), (1200, 60), (2400, 60)]}), mid=[At("water-jetty", 1500, 120, 1.3), At("water-sailboat", 1750, 250, 1.1), At("water-boat", 1300, 220, 0.8), At("bld-shop", 300, 215, 0.9), Shape("sacks", 650, 215, 1.0, 4), Shape("barrel", 820, 215, 1.0)],
                       veg=[At("tree-coconut", 120, 220, 1.0)], fx=[Shape("flags", -100, 960, 1100, 900, 60, 12)], seed=1214)
    env(14, "Ancient port", "port", "A wooden quay with ships, barrels and sacks, warehouses behind.", ["port", "harbour", "ship", "quay", "trade", "sea"], ["प्राचीन बन्दरगाह", "ancient port"], ["arabian_nights", "folk"], ly, an, ro, ("ground", "aquatic"))

    ly, an, ro = scene(wall=("marble", {"panels": 1}), decor=[At("lamp-chandelier", 400, 1000, 1.0), At("lamp-chandelier", 960, 1000, 1.2), At("lamp-chandelier", 1520, 1000, 1.0), At("window-triple", 300, 620, 1.0), At("window-triple", 1620, 620, 1.0)], ground=("marble", FLOOR), mid=[Shape("carpet", 560, 1360, 332, -150, "#3a2a8a"), PIL(150, 640, "#f6f0e2"), PIL(500, 640, "#f6f0e2"), PIL(1420, 640, "#f6f0e2"), PIL(1770, 640, "#f6f0e2"), Shape("throne", 960, 350, 1.0)],
                       occl=[Shape("banner", 300, 100, 110, 360, "#3a6ad8"), Shape("banner", 1620, 100, 110, 360, "#3a6ad8")], fx=[LP(960, 600, 900, "#fff0b0", 0.3)], beams="#8a7a5a", seed=1215)
    env(15, "Grand ceremonial hall", "grand-hall", "A vast marble hall with four rows of pillars, three chandeliers and a long carpet.", ["hall", "ceremony", "grand", "marble", "chandelier", "palace"], ["भव्य समारोह कक्ष", "grand ceremonial hall"], ["akbar_birbal", "arabian_nights", "singhasan_battisi"], ly, an, ro)
    return E
