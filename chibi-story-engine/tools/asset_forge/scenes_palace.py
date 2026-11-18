"""Category B: royal courts and palaces (15 designs)."""
from __future__ import annotations

from .env_kit import FLOOR, SKY_COLOURS, At, Row, Scatter, Shape, ground_anchors
from .scene_lib import haze, make_env, scene

PIL = lambda x, h=760, w=80, **k: Shape("pillar", x, FLOOR - 4, h, w, **k)
WIN = lambda x, y=520, w=140, h=250, c="#9ad0f0": Shape("window_light", x, y, w, h, c)
BAN = lambda x, c="#c0392b", y=560, h=330: Shape("banner", x, y, 120, h, c)


def build() -> list:
    E = []

    def env(n, name, sub, desc, tags, aliases, stories, ly, an, roles, habit=("ground",), **kw):
        E.append(make_env(f"env-pal-{n:04d}", name, "PAL", sub, desc, ly, an, roles, list(habit), ["palace", "royal", *tags], aliases, stories, seed=100 + n, **kw))

    # 1 grand royal courtroom
    ly, an, ro = scene(wall=("palace", {}), decor=[WIN(330), WIN(1590), WIN(960 - 380, 540, 110, 220), WIN(960 + 380, 540, 110, 220), BAN(620), BAN(1300), Shape("arch", 960, FLOOR, 320, 480)],
                       ground=("marble", FLOOR), beams="#6a4a2a",
                       mid=[Shape("carpet", 700, 1220, 332, -150), At("lamp-chandelier", 960, 900, 1.1)] + [PIL(x) for x in (150, 470, 1450, 1770)] + [Shape("throne", 960, 350, 1.1)],
                       fx=[Shape("shafts", [330, 1590], w=120)], seed=101)
    env(1, "Grand royal courtroom", "court", "A tall marble courtroom with a carpeted aisle, banners, pillars and a golden throne.", ["court", "courtroom", "throne", "hall", "darbar", "king"], ["शाही दरबार", "royal court", "दरबार"], ["akbar_birbal", "tenali_raman", "vikram_betal", "singhasan_battisi"], ly, an, ro)

    # 2 emperor's throne hall
    ly, an, ro = scene(wall=("royal", {}), decor=[BAN(300, "#e6b93c"), BAN(1620, "#e6b93c"), Shape("arch", 960, FLOOR, 520, 640, "#e6b93c", "#1a0c14")], ground=("marble", FLOOR),
                       mid=[Shape("carpet", 560, 1360, 332, -150, "#7a1a2a"), Shape("throne", 960, 360, 1.5), At("lamp-brazier", 520, 330, 1.2), At("lamp-brazier", 1400, 330, 1.2)] + [PIL(x, 800, 96, ornate=True, col="#e6d6a8") for x in (120, 420, 1500, 1800)],
                       fx=[Shape("shafts", [960], w=300, op=0.1, col="#ffd080")], beams="#3a1a1a", seed=102)
    env(2, "Emperor's throne hall", "throne_hall", "A vast hall in crimson and gold, with a monumental throne between braziers.", ["throne", "emperor", "hall", "grand", "court"], ["सम्राट का सिंहासन कक्ष", "emperor's hall"], ["akbar_birbal", "arabian_nights"], ly, an, ro)

    # 3 king's private audience chamber
    ly, an, ro = scene(wall=("wood", {}), decor=[WIN(1500, 520, 150, 260), Shape("arch", 330, FLOOR, 260, 400, "#c8a070", "#2a1810"), At("lamp-hanging-brass", 960, 880, 1.0), BAN(960, "#3a6ad8", 600, 260)],
                       ground=("wood", FLOOR), mid=[Shape("rugs", 960, 250, 760, 80, "#a8322a"), Shape("shelf", 330, 335, 300, 520), Shape("table", 1300, 335, 360, 130, "#7a4a2a"),
                                                    Shape("throne", 960, 345, 0.8, col="#c9a030", cushion="#3a6ad8"), At("lamp-candelabra", 1560, 335, 1.2)], beams="#5a3a1a", seed=103)
    env(3, "King's private audience chamber", "audience", "A smaller wood-panelled chamber with a modest throne, shelves and a writing table.", ["audience", "chamber", "private", "king", "room", "indoor"], ["राजा का निजी कक्ष", "private chamber"], ["tenali_raman", "akbar_birbal", "folk"], ly, an, ro)

    # 4 royal darbar with ministers
    ly, an, ro = scene(wall=("palace", {}), decor=[Shape("arch", 330, FLOOR, 240, 400), Shape("arch", 630, FLOOR, 240, 400), Shape("arch", 1290, FLOOR, 240, 400), Shape("arch", 1590, FLOOR, 240, 400), BAN(960, "#c0392b", 600, 280)],
                       ground=("marble", FLOOR), mid=[Shape("carpet", 600, 1320, 332, -150, "#3a2a8a"), Shape("throne", 960, 350, 1.0)] +
                       [Shape("rugs", x, 160, 300, 60, "#c0392b") for x in (330, 600, 1320, 1590)] + [PIL(x, 740) for x in (150, 1770)] + [At("lamp-standing-torch", 470, 335, 1.0), At("lamp-standing-torch", 1450, 335, 1.0)], seed=104)
    env(4, "Royal Darbar with ministers", "darbar", "The king's darbar with seating mats along the aisle where ministers sit.", ["darbar", "ministers", "court", "assembly", "hall", "seating"], ["दरबार", "darbar"], ["akbar_birbal", "tenali_raman", "singhasan_battisi", "panchatantra"], ly, an, ro)

    # 5 royal assembly hall
    ly, an, ro = scene(wall=("marble", {}), decor=[Shape("arch", 960, FLOOR, 360, 520), WIN(380), WIN(1540)], ground=("marble", FLOOR), beams="#8a6a4a",
                       mid=[PIL(x, 860, 90) for x in (-40, 230, 500, 1420, 1690, 1960)] + [At("lamp-chandelier", 540, 960, 0.9), At("lamp-chandelier", 1380, 960, 0.9), Shape("carpet", 760, 1160, 332, -150, "#a8322a")],
                       fx=[Shape("shafts", [380, 1540])], seed=105)
    env(5, "Royal assembly hall", "assembly", "A wide hall of marble pillars and chandeliers for the king's assembly.", ["assembly", "hall", "marble", "pillars", "chandelier"], ["सभा भवन", "assembly hall"], ["singhasan_battisi", "akbar_birbal"], ly, an, ro)

    # 6 palace entrance hall
    ly, an, ro = scene(wall=("palace", {}), decor=[At("door-palace-great", 960, FLOOR, 1.5), WIN(380, 540, 130, 230), WIN(1540, 540, 130, 230), BAN(220, "#3a6ad8"), BAN(1700, "#3a6ad8")], ground=("marble", FLOOR),
                       mid=[At("lamp-standing-torch", 640, 335, 1.0), At("lamp-standing-torch", 1280, 335, 1.0), Shape("statue", 300, 335, 1.0), Shape("statue", 1620, 335, 1.0), Shape("carpet", 800, 1120, 332, -150, "#a8322a")], beams="#6a4a2a", seed=106)
    env(6, "Palace entrance hall", "entrance", "The grand doorway of a palace with statues and torches either side.", ["entrance", "door", "gate", "hall", "statue"], ["महल का प्रवेश द्वार", "palace entrance"], ["arabian_nights", "folk"], ly, an, ro)

    # 7 palace corridor
    ly, an, ro = scene(wall=("marble", {}), decor=[Shape("arch", x, FLOOR, 230, 420, "#f0e0b8", "#3a2a30") for x in (110, 420, 730, 1040, 1350, 1660, 1970)] + [At("lamp-hanging-brass", x, 900, 0.9) for x in (265, 885, 1505)],
                       ground=("tile", FLOOR), mid=[Shape("carpet", 700, 1220, 332, -150, "#3a2a8a")] + [At("lamp-wall-torch", x, 560, 0.9) for x in (110, 730, 1350)], beams="#7a5a3a", seed=107)
    env(7, "Palace corridor", "corridor", "A long palace corridor lined with arches, hanging lamps and a runner carpet.", ["corridor", "passage", "arches", "indoor"], ["महल का गलियारा", "palace corridor"], ["vikram_betal", "arabian_nights"], ly, an, ro)

    # 8 palace garden
    ly, an, ro = scene(sky=("day", {"clouds": 4}), back=[Scatter(["tree-poplar", "tree-mango"], 10, (-200, 2150), (410, 430), (0.45, 0.6), 1, pal=haze(None, "#d9f2ff", 0.4))], far=[At("bld-palace", 960, 395, 0.9), At("bld-mansion-domes", 380, 400, 0.6)],
                       ground=("grass", FLOOR), mid=[At("water-fountain", 960, 215, 1.1), At("bush-hedge", 460, 215, 1.0), At("bush-hedge", 1460, 215, 1.0), At("fence-iron", 200, 210, 0.7), At("fence-iron", 1750, 210, 0.7)],
                       veg=[Scatter(["flower-rose", "flower-tulip", "flower-lily", "flower-marigold"], 16, (-100, 2050), (225, 330), (0.6, 1.0), 3), Scatter(["bush-rose", "bush-jasmine"], 5, (-100, 2050), (240, 330), (0.8, 1.1), 4), At("tree-blossom", 100, 330, 0.9)],
                       fg=[Scatter(["flower-patch", "bush-rose"], 5, (-100, 2050), (-100, 20), (1.1, 1.6), 5)], far_tint="background", seed=108)
    env(8, "Palace garden", "garden", "A formal palace garden with a fountain, hedges and rose beds before the palace.", ["garden", "fountain", "flowers", "outdoor", "hedge"], ["महल का बाग़", "palace garden"], ["arabian_nights", "tenali_raman", "folk"], ly, an, ro, habit=("ground", "arboreal"))

    # 9 royal balcony
    ly, an, ro = scene(sky=("sunset", {"clouds": 4, "sun": (1500, 560, 90)}), far=[At("mountain-blue-range", 700, 400, 1.3), At("mountain-blue-range", 1700, 400, 1.0)],
                       back=[Row("bld-village-house", -200, 2200, 230, 420, 0.4, 20, ids=["bld-village-house", "bld-whitewash-house", "bld-shikhara-temple"], seed=2, pal=haze({"roof": "#b8503a"}, "#ffd6a2", 0.5))], back_tint="background",
                       ground=("marble", FLOOR), mid=[At("bld-mandapa", 960, 330, 0.0001)], occl=[At("wall-balustrade", 300, 180, 1.1), At("wall-balustrade", 960, 180, 1.1), At("wall-balustrade", 1620, 180, 1.1), PIL(60, 860, 80), PIL(1860, 860, 80)], seed=109)
    env(9, "Royal balcony", "balcony", "A marble balcony above the city at sunset, with distant houses and hills.", ["balcony", "terrace", "city", "view", "sunset", "outdoor"], ["शाही छज्जा", "royal balcony"], ["arabian_nights", "tenali_raman"], ly, an, ro)

    # 10 queen's chamber
    ly, an, ro = scene(wall=("blue", {}), decor=[At("window-jharokha", 1480, 430, 1.3), At("window-jali", 400, 470, 1.4), At("lamp-hanging-brass", 960, 900, 1.0)], ground=("wood", FLOOR),
                       mid=[Shape("bed", 1000, 335, 400, "#c9a030", "#f6d8e0"), Shape("rugs", 700, 170, 600, 70, "#d86a8a"), At("lamp-candelabra", 420, 335, 1.2), At("bush-tulsi", 1650, 330, 0.9), Shape("shelf", 220, 335, 240, 420)], beams="#7a4a3a", seed=110)
    env(10, "Queen's chamber", "queen", "A soft blue chamber with a jharokha window, a decorated bed and flowers.", ["queen", "chamber", "bedroom", "room", "indoor", "jharokha"], ["रानी का कक्ष", "queen's chamber"], ["arabian_nights", "folk"], ly, an, ro)

    # 11 royal bedroom
    ly, an, ro = scene(wall=("royal", {}), decor=[WIN(1560, 520, 130, 240, "#6a7ad0"), Shape("arch", 340, FLOOR, 240, 420, "#e6b93c", "#1a0c14"), At("lamp-chandelier", 960, 930, 0.8)], ground=("wood", FLOOR),
                       mid=[Shape("bed", 960, 335, 560, "#e6b93c", "#7a2a48")] + [PIL(x, 600, 40, col="#c9a030") for x in (680, 1240)] + [Shape("chest", 400, 335, 1.0), At("lamp-candle", 1650, 335, 1.3), Shape("rugs", 960, 170, 800, 70, "#e6b93c")], beams="#3a1a1a", seed=111)
    env(11, "Royal bedroom", "bedroom", "A royal bedroom with a four-poster bed, a chest and candlelight.", ["bedroom", "bed", "royal", "room", "indoor", "night"], ["शाही शयनकक्ष", "royal bedroom"], ["arabian_nights", "folk", "vikram_betal"], ly, an, ro)

    # 12 palace dining hall
    ly, an, ro = scene(wall=("palace", {}), decor=[WIN(330, 520, 150, 250), WIN(1590, 520, 150, 250), BAN(960, "#e6b93c", 600, 260)], ground=("marble", FLOOR), beams="#6a4a2a",
                       mid=[Shape("table", 960, 335, 1100, 150, "#7a4a2a", cloth="#f6ecd8"), At("lamp-candelabra", 700, 440, 0.8), At("lamp-candelabra", 1220, 440, 0.8)] + [At("lamp-chandelier", x, 960, 0.9) for x in (560, 1360)] +
                       [Shape("rugs", x, 165, 200, 50, "#c0392b") for x in (440, 700, 1220, 1480)] + [PIL(x, 740) for x in (100, 1820)], seed=112)
    env(12, "Palace dining hall", "dining", "A long feast table beneath chandeliers, with cushions along both sides.", ["dining", "feast", "table", "hall", "food", "banquet"], ["महल का भोजन कक्ष", "royal dining hall"], ["tenali_raman", "akbar_birbal", "arabian_nights"], ly, an, ro)

    # 13 royal treasury
    ly, an, ro = scene(wall=("dark", {"dado": False}), decor=[At("door-iron-gate", 960, FLOOR, 1.0), At("window-barred", 360, 560, 1.3), At("window-barred", 1560, 560, 1.3), At("lamp-wall-torch", 600, 520, 1.1), At("lamp-wall-torch", 1320, 520, 1.1)], ground=("stone", FLOOR),
                       mid=[Shape("chest", 330, 335, 1.2), Shape("chest", 1620, 335, 1.2), Shape("coins", 520, 335, 1.3), Shape("coins", 1420, 335, 1.2), Shape("shelf", 170, 335, 200, 420, "#5a3a1a"), Shape("shelf", 1760, 335, 200, 420, "#5a3a1a")],
                       fx=[Shape("shafts", [960], w=200, op=0.08, col="#ffcf70"), Shape("mist", 350, 3, col="#ffd890", op=0.12)], seed=113)
    env(13, "Royal treasury", "treasury", "A dark stone vault of chests and heaps of gold coins lit by torches.", ["treasury", "treasure", "gold", "vault", "chest", "coins", "dark"], ["शाही खज़ाना", "treasury"], ["arabian_nights", "tenali_raman", "folk"], ly, an, ro)

    # 14 palace courtyard
    ly, an, ro = scene(sky=("noon", {"clouds": 3}), back=[Row("bld-haveli", 0, 1920, 760, 400, 0.55, 0, ids=["bld-haveli", "bld-mansion-domes"], seed=5, pal={})], back_tint="background",
                       ground=("tile", FLOOR), mid=[At("water-fountain", 960, 215, 1.0), At("wall-whitewash", 260, 215, 0.8), At("wall-whitewash", 1660, 215, 0.8), At("bld-mandapa", 960, 330, 0.0001)] + [At("tree-poplar", x, 330, 0.6) for x in (140, 1780)] + [At("bush-hedge", 620, 215, 0.8), At("bush-hedge", 1300, 215, 0.8)],
                       occl=[PIL(x, 740, 76) for x in (-30, 1950)], fg=[Scatter(["flower-marigold", "bush-jasmine"], 4, (-100, 2050), (-100, 20), (1.1, 1.5), 4)], seed=114)
    env(14, "Palace courtyard", "courtyard", "A paved palace courtyard with a fountain and the mansion walls rising behind.", ["courtyard", "fountain", "mansion", "outdoor", "tiles"], ["महल का आँगन", "palace courtyard"], ["arabian_nights", "folk"], ly, an, ro)

    # 15 ornate ancient throne room
    ly, an, ro = scene(wall=("stone", {}), decor=[Shape("arch", 960, FLOOR, 640, 700, "#c8a070", "#10080c"), At("lamp-wall-torch", 380, 560, 1.2), At("lamp-wall-torch", 1540, 560, 1.2), Shape("statue", 560, 330, 1.2), Shape("statue", 1360, 330, 1.2)],
                       ground=("stone", FLOOR), mid=[Shape("throne", 960, 350, 1.3, col="#9a7a30", cushion="#5a1a2a")] + [PIL(x, 820, 104, col="#c8b890", ornate=True) for x in (140, 420, 1500, 1780)] + [At("lamp-brazier", 700, 330, 1.0), At("lamp-brazier", 1220, 330, 1.0)],
                       fx=[Shape("mist", 350, 3, col="#ffd890", op=0.1)], beams="#3a2a1a", seed=115)
    env(15, "Ornate ancient throne room", "ancient", "An ancient stone throne room with carved pillars, statues and flickering braziers.", ["throne", "ancient", "stone", "ruins", "room", "king"], ["प्राचीन सिंहासन कक्ष", "ancient throne room"], ["vikram_betal", "singhasan_battisi", "arabian_nights"], ly, an, ro)
    return E
